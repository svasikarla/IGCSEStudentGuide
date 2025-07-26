#!/usr/bin/env python3
"""
Unit tests for the core Ollama question generator
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.ollama_generation.core_generator import OllamaQuestionGenerator
from scripts.ollama_generation.base_models import (
    GenerationConfig, TopicInfo, QuizQuestion, ExamQuestion, 
    QuestionType, GenerationMethod
)

class TestOllamaQuestionGenerator:
    """Test cases for OllamaQuestionGenerator"""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client"""
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            'id': 'test-topic-id',
            'title': 'Test Topic',
            'description': 'Test description',
            'difficulty_level': 3,
            'syllabus_code': 'TEST001',
            'learning_objectives': ['Objective 1', 'Objective 2'],
            'subjects': {'name': 'Mathematics'}
        }
        return mock_client
    
    @pytest.fixture
    def mock_ollama_client(self):
        """Mock Ollama client"""
        mock_client = Mock()
        mock_client.list.return_value = {
            'models': [{'name': 'gemma3:9b'}, {'name': 'gemma3:2b'}]
        }
        return mock_client
    
    @pytest.fixture
    def generator(self, mock_supabase_client, mock_ollama_client):
        """Create generator instance with mocked clients"""
        with patch('scripts.ollama_generation.core_generator.create_client', return_value=mock_supabase_client), \
             patch('scripts.ollama_generation.core_generator.ollama.Client', return_value=mock_ollama_client):
            
            config = GenerationConfig(model='gemma3:9b')
            generator = OllamaQuestionGenerator(
                'test_url', 'test_key', 'http://localhost:11434', config
            )
            generator.supabase = mock_supabase_client
            generator.ollama_client = mock_ollama_client
            return generator
    
    @pytest.fixture
    def sample_topic_info(self):
        """Sample topic info for testing"""
        return TopicInfo(
            id='test-topic-id',
            title='Photosynthesis',
            subject_name='Biology',
            difficulty_level=3,
            syllabus_code='BIO001',
            description='Process by which plants make food',
            learning_objectives=['Understand photosynthesis process', 'Identify factors affecting photosynthesis']
        )
    
    def test_initialization(self, generator):
        """Test generator initialization"""
        assert generator.config.model == 'gemma3:9b'
        assert generator.config.temperature == 0.7
        assert generator.config.max_tokens == 2000
    
    @pytest.mark.asyncio
    async def test_get_topic_info_success(self, generator, mock_supabase_client):
        """Test successful topic info retrieval"""
        topic_info = await generator.get_topic_info('test-topic-id')
        
        assert topic_info is not None
        assert topic_info.id == 'test-topic-id'
        assert topic_info.title == 'Test Topic'
        assert topic_info.subject_name == 'Mathematics'
        assert topic_info.difficulty_level == 3
    
    @pytest.mark.asyncio
    async def test_get_topic_info_not_found(self, generator, mock_supabase_client):
        """Test topic info retrieval when topic not found"""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
        
        topic_info = await generator.get_topic_info('nonexistent-id')
        assert topic_info is None
    
    def test_create_quiz_prompt(self, generator, sample_topic_info):
        """Test quiz prompt creation"""
        prompt = generator._create_quiz_prompt(sample_topic_info, 5)
        
        assert 'Photosynthesis' in prompt
        assert 'Biology' in prompt
        assert 'BIO001' in prompt
        assert '5' in prompt
        assert 'multiple choice' in prompt.lower()
        assert 'JSON' in prompt
    
    def test_create_exam_prompt(self, generator, sample_topic_info):
        """Test exam prompt creation"""
        prompt = generator._create_exam_prompt(sample_topic_info, 50)
        
        assert 'Photosynthesis' in prompt
        assert 'Biology' in prompt
        assert '50' in prompt
        assert 'exam' in prompt.lower()
        assert 'JSON' in prompt
    
    @pytest.mark.asyncio
    async def test_call_ollama_success(self, generator, mock_ollama_client):
        """Test successful Ollama API call"""
        mock_response = {
            'message': {
                'content': '{"questions": [{"question_text": "Test question?", "correct_answer": "A"}]}'
            }
        }
        mock_ollama_client.chat.return_value = mock_response
        
        result = await generator._call_ollama("Test prompt")
        
        assert result is not None
        assert 'questions' in result
        mock_ollama_client.chat.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_ollama_retry_logic(self, generator, mock_ollama_client):
        """Test Ollama retry logic on failure"""
        # First two calls fail, third succeeds
        mock_ollama_client.chat.side_effect = [
            Exception("Connection error"),
            Exception("Timeout error"),
            {'message': {'content': '{"success": true}'}}
        ]
        
        result = await generator._call_ollama("Test prompt")
        
        assert result is not None
        assert mock_ollama_client.chat.call_count == 3
    
    @pytest.mark.asyncio
    async def test_call_ollama_all_retries_fail(self, generator, mock_ollama_client):
        """Test Ollama when all retries fail"""
        mock_ollama_client.chat.side_effect = Exception("Persistent error")
        
        result = await generator._call_ollama("Test prompt")
        
        assert result is None
        assert mock_ollama_client.chat.call_count == generator.config.max_retries
    
    def test_extract_json_from_response_success(self, generator):
        """Test successful JSON extraction"""
        response = 'Some text before {"questions": [{"test": "data"}]} some text after'
        
        result = generator._extract_json_from_response(response)
        
        assert result is not None
        assert 'questions' in result
        assert result['questions'][0]['test'] == 'data'
    
    def test_extract_json_from_response_no_json(self, generator):
        """Test JSON extraction when no JSON present"""
        response = 'This is just plain text with no JSON'
        
        result = generator._extract_json_from_response(response)
        
        assert result is None
    
    def test_extract_json_from_response_invalid_json(self, generator):
        """Test JSON extraction with invalid JSON"""
        response = 'Some text {"invalid": json,} more text'
        
        result = generator._extract_json_from_response(response)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_generate_quiz_questions_success(self, generator, sample_topic_info, mock_ollama_client):
        """Test successful quiz question generation"""
        mock_response = {
            'message': {
                'content': '''
                {
                    "questions": [
                        {
                            "question_text": "What is photosynthesis?",
                            "question_type": "multiple_choice",
                            "options": {"A": "Process of making food", "B": "Process of breathing", "C": "Process of growth", "D": "Process of reproduction"},
                            "correct_answer": "A",
                            "explanation": "Photosynthesis is the process by which plants make food using sunlight.",
                            "difficulty_level": 3,
                            "points": 1,
                            "tags": ["photosynthesis", "biology"]
                        }
                    ]
                }
                '''
            }
        }
        mock_ollama_client.chat.return_value = mock_response
        
        questions = await generator.generate_quiz_questions(sample_topic_info, 1)
        
        assert len(questions) == 1
        assert questions[0].question_text == "What is photosynthesis?"
        assert questions[0].question_type == QuestionType.MULTIPLE_CHOICE
        assert questions[0].correct_answer == "A"
        assert questions[0].generation_method == GenerationMethod.OLLAMA_GEMMA
        assert questions[0].generation_model == 'gemma3:9b'
    
    @pytest.mark.asyncio
    async def test_generate_quiz_questions_ollama_failure(self, generator, sample_topic_info, mock_ollama_client):
        """Test quiz generation when Ollama fails"""
        mock_ollama_client.chat.side_effect = Exception("Ollama error")
        
        questions = await generator.generate_quiz_questions(sample_topic_info, 1)
        
        assert len(questions) == 0
    
    @pytest.mark.asyncio
    async def test_generate_quiz_questions_invalid_response(self, generator, sample_topic_info, mock_ollama_client):
        """Test quiz generation with invalid response format"""
        mock_response = {
            'message': {
                'content': '{"invalid": "response format"}'
            }
        }
        mock_ollama_client.chat.return_value = mock_response
        
        questions = await generator.generate_quiz_questions(sample_topic_info, 1)
        
        assert len(questions) == 0
    
    @pytest.mark.asyncio
    async def test_save_quiz_to_database_success(self, generator, sample_topic_info, mock_supabase_client):
        """Test successful quiz saving to database"""
        # Mock successful quiz creation
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = [
            {'id': 'quiz-id-123'}
        ]
        
        # Mock successful questions insertion
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = [
            {'id': 'question-id-1'}
        ]
        
        # Create sample questions
        questions = [
            QuizQuestion(
                question_text="Test question?",
                question_type=QuestionType.MULTIPLE_CHOICE,
                options={"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
                correct_answer="A",
                explanation="Test explanation",
                generation_method=GenerationMethod.OLLAMA_GEMMA,
                generation_model='gemma3:9b'
            )
        ]
        
        quiz_id = await generator.save_quiz_to_database(sample_topic_info, questions)
        
        assert quiz_id == 'quiz-id-123'
        assert mock_supabase_client.table.call_count >= 2  # Called for quiz and questions
    
    @pytest.mark.asyncio
    async def test_save_quiz_to_database_failure(self, generator, sample_topic_info, mock_supabase_client):
        """Test quiz saving failure"""
        # Mock failed quiz creation
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value.data = None
        
        questions = [
            QuizQuestion(
                question_text="Test question?",
                question_type=QuestionType.MULTIPLE_CHOICE,
                options={"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
                correct_answer="A",
                explanation="Test explanation"
            )
        ]
        
        quiz_id = await generator.save_quiz_to_database(sample_topic_info, questions)
        
        assert quiz_id is None

# Integration tests
class TestOllamaQuestionGeneratorIntegration:
    """Integration tests that require actual Ollama and database connections"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_end_to_end_quiz_generation(self):
        """End-to-end test of quiz generation (requires actual services)"""
        # This test would require actual Ollama and Supabase connections
        # Skip if not in integration test environment
        pytest.skip("Integration test - requires actual services")
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_end_to_end_exam_generation(self):
        """End-to-end test of exam generation (requires actual services)"""
        # This test would require actual Ollama and Supabase connections
        pytest.skip("Integration test - requires actual services")

if __name__ == '__main__':
    pytest.main([__file__])
