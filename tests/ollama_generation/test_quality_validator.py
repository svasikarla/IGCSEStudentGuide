#!/usr/bin/env python3
"""
Unit tests for the quality validator
"""

import pytest
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.ollama_generation.quality_validator import (
    QuestionQualityValidator, ValidationSeverity, ValidationIssue, ValidationResult
)
from scripts.ollama_generation.base_models import (
    QuizQuestion, ExamQuestion, ExamPaper, QuestionType, GenerationMethod
)

class TestQuestionQualityValidator:
    """Test cases for QuestionQualityValidator"""
    
    @pytest.fixture
    def validator(self):
        """Create validator instance"""
        return QuestionQualityValidator()
    
    @pytest.fixture
    def valid_quiz_question(self):
        """Create a valid quiz question for testing"""
        return QuizQuestion(
            question_text="What is the process by which plants make their own food using sunlight?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={
                "A": "Photosynthesis",
                "B": "Respiration", 
                "C": "Transpiration",
                "D": "Germination"
            },
            correct_answer="A",
            explanation="Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce glucose and oxygen.",
            difficulty_level=3,
            points=1,
            generation_method=GenerationMethod.OLLAMA_GEMMA,
            generation_model="gemma3:9b"
        )
    
    @pytest.fixture
    def valid_exam_question(self):
        """Create a valid exam question for testing"""
        return ExamQuestion(
            question_text="Explain the process of photosynthesis, including the reactants and products. Describe how light intensity affects the rate of photosynthesis.",
            marks=8,
            answer_text="Photosynthesis is the process where plants convert light energy into chemical energy. The equation is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. Light intensity affects the rate up to a saturation point where other factors become limiting.",
            explanation="Students should mention the equation, reactants (CO2, H2O, light), products (glucose, oxygen), and the relationship with light intensity including limiting factors.",
            question_order=1,
            generation_method=GenerationMethod.OLLAMA_GEMMA,
            generation_model="gemma3:9b"
        )
    
    def test_validate_valid_quiz_question(self, validator, valid_quiz_question):
        """Test validation of a valid quiz question"""
        result = validator.validate_quiz_question(valid_quiz_question)
        
        assert result.is_valid
        assert result.quality_score > 0.7
        assert not result.has_critical_issues
        assert not result.has_errors
    
    def test_validate_quiz_question_empty_text(self, validator):
        """Test validation with empty question text"""
        question = QuizQuestion(
            question_text="",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
            correct_answer="A",
            explanation="Test explanation"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_critical_issues
        assert any(issue.severity == ValidationSeverity.CRITICAL for issue in result.issues)
    
    def test_validate_quiz_question_short_text(self, validator):
        """Test validation with too short question text"""
        question = QuizQuestion(
            question_text="Short?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
            correct_answer="A",
            explanation="Test explanation"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("too short" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_missing_options(self, validator):
        """Test validation with missing options"""
        question = QuizQuestion(
            question_text="What is the capital of France?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options=None,
            correct_answer="A",
            explanation="Paris is the capital of France"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_critical_issues
        assert any("missing options" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_insufficient_options(self, validator):
        """Test validation with insufficient options"""
        question = QuizQuestion(
            question_text="What is the capital of France?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Paris", "B": "London"},
            correct_answer="A",
            explanation="Paris is the capital of France"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("insufficient options" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_invalid_correct_answer(self, validator):
        """Test validation with correct answer not in options"""
        question = QuizQuestion(
            question_text="What is the capital of France?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Paris", "B": "London", "C": "Berlin", "D": "Madrid"},
            correct_answer="E",  # Not in options
            explanation="Paris is the capital of France"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_critical_issues
        assert any("not found in options" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_duplicate_options(self, validator):
        """Test validation with duplicate option texts"""
        question = QuizQuestion(
            question_text="What is the capital of France?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Paris", "B": "Paris", "C": "Berlin", "D": "Madrid"},  # Duplicate
            correct_answer="A",
            explanation="Paris is the capital of France"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("duplicate" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_short_explanation(self, validator):
        """Test validation with too short explanation"""
        question = QuizQuestion(
            question_text="What is the capital of France?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Paris", "B": "London", "C": "Berlin", "D": "Madrid"},
            correct_answer="A",
            explanation="Paris."  # Too short
        )
        
        result = validator.validate_quiz_question(question)
        
        # Should still be valid but with warnings
        assert result.is_valid  # Short explanation is warning, not error
        assert any("explanation too short" in issue.message.lower() for issue in result.issues)
    
    def test_validate_quiz_question_poor_quality_indicators(self, validator):
        """Test validation with poor quality indicators"""
        question = QuizQuestion(
            question_text="I don't know what the capital of France is, maybe it's something?",
            question_type=QuestionType.MULTIPLE_CHOICE,
            options={"A": "Paris", "B": "London", "C": "Berlin", "D": "Madrid"},
            correct_answer="A",
            explanation="I think Paris is probably the answer but I'm not sure"
        )
        
        result = validator.validate_quiz_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("poor quality indicator" in issue.message.lower() for issue in result.issues)
    
    def test_validate_valid_exam_question(self, validator, valid_exam_question):
        """Test validation of a valid exam question"""
        result = validator.validate_exam_question(valid_exam_question)
        
        assert result.is_valid
        assert result.quality_score > 0.7
        assert not result.has_critical_issues
        assert not result.has_errors
    
    def test_validate_exam_question_short_text(self, validator):
        """Test validation of exam question with short text"""
        question = ExamQuestion(
            question_text="Short question?",
            marks=5,
            answer_text="Short answer",
            explanation="Short explanation",
            question_order=1
        )
        
        result = validator.validate_exam_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("too short" in issue.message.lower() for issue in result.issues)
    
    def test_validate_exam_question_invalid_marks(self, validator):
        """Test validation of exam question with invalid marks"""
        question = ExamQuestion(
            question_text="This is a longer question that meets the minimum length requirement for exam questions.",
            marks=25,  # Too high
            answer_text="This is a detailed answer that explains the concept thoroughly.",
            explanation="Additional explanation for marking",
            question_order=1
        )
        
        result = validator.validate_exam_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("invalid marks" in issue.message.lower() for issue in result.issues)
    
    def test_validate_exam_question_short_answer(self, validator):
        """Test validation of exam question with short answer"""
        question = ExamQuestion(
            question_text="This is a longer question that meets the minimum length requirement for exam questions.",
            marks=5,
            answer_text="Short",  # Too short
            explanation="Additional explanation",
            question_order=1
        )
        
        result = validator.validate_exam_question(question)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("answer text is too short" in issue.message.lower() for issue in result.issues)
    
    def test_validate_exam_paper_valid(self, validator, valid_exam_question):
        """Test validation of a valid exam paper"""
        exam_paper = ExamPaper(
            title="IGCSE Biology: Photosynthesis Test",
            instructions="Answer ALL questions. Show all working clearly.",
            duration_minutes=60,
            total_marks=8,
            questions=[valid_exam_question],
            topic_id="test-topic-id",
            subject_name="Biology"
        )
        
        result = validator.validate_exam_paper(exam_paper)
        
        assert result.is_valid
        assert result.quality_score > 0.7
        assert not result.has_critical_issues
    
    def test_validate_exam_paper_no_questions(self, validator):
        """Test validation of exam paper with no questions"""
        exam_paper = ExamPaper(
            title="Empty Exam",
            instructions="No questions available",
            duration_minutes=60,
            total_marks=0,
            questions=[],
            topic_id="test-topic-id",
            subject_name="Biology"
        )
        
        result = validator.validate_exam_paper(exam_paper)
        
        assert not result.is_valid
        assert result.has_critical_issues
        assert result.quality_score == 0.0
    
    def test_validate_exam_paper_marks_mismatch(self, validator, valid_exam_question):
        """Test validation of exam paper with marks mismatch"""
        exam_paper = ExamPaper(
            title="IGCSE Biology: Photosynthesis Test",
            instructions="Answer ALL questions.",
            duration_minutes=60,
            total_marks=10,  # Doesn't match question marks (8)
            questions=[valid_exam_question],
            topic_id="test-topic-id",
            subject_name="Biology"
        )
        
        result = validator.validate_exam_paper(exam_paper)
        
        assert not result.is_valid
        assert result.has_errors
        assert any("marks mismatch" in issue.message.lower() for issue in result.issues)
    
    def test_calculate_quality_score_no_issues(self, validator):
        """Test quality score calculation with no issues"""
        issues = []
        score = validator._calculate_quality_score(issues)
        assert score == 1.0
    
    def test_calculate_quality_score_with_issues(self, validator):
        """Test quality score calculation with various issues"""
        issues = [
            ValidationIssue(ValidationSeverity.CRITICAL, "Critical issue", "field1"),
            ValidationIssue(ValidationSeverity.ERROR, "Error issue", "field2"),
            ValidationIssue(ValidationSeverity.WARNING, "Warning issue", "field3"),
            ValidationIssue(ValidationSeverity.INFO, "Info issue", "field4")
        ]
        
        score = validator._calculate_quality_score(issues)
        
        # Should be 1.0 - 0.3 - 0.2 - 0.1 - 0.05 = 0.35
        assert score == 0.35
    
    def test_calculate_quality_score_minimum_zero(self, validator):
        """Test quality score doesn't go below zero"""
        issues = [
            ValidationIssue(ValidationSeverity.CRITICAL, "Critical 1", "field1"),
            ValidationIssue(ValidationSeverity.CRITICAL, "Critical 2", "field2"),
            ValidationIssue(ValidationSeverity.CRITICAL, "Critical 3", "field3"),
            ValidationIssue(ValidationSeverity.CRITICAL, "Critical 4", "field4")
        ]
        
        score = validator._calculate_quality_score(issues)
        assert score == 0.0

if __name__ == '__main__':
    pytest.main([__file__])
