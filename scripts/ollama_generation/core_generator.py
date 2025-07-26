#!/usr/bin/env python3
"""
Core Question Generator using Ollama + Gemma

This module contains the main generator class that interfaces with Ollama
to generate IGCSE quiz questions and exam papers.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

import ollama
from supabase import create_client, Client

from .base_models import (
    GenerationConfig, TopicInfo, QuizQuestion, ExamQuestion, ExamPaper,
    QuestionType, GenerationMethod, GenerationResult, BaseGenerator
)
from .logging_config import setup_logging

logger = setup_logging()

class OllamaQuestionGenerator(BaseGenerator):
    """Main class for generating questions using Ollama + Gemma"""
    
    def __init__(self, supabase_url: str, supabase_key: str, 
                 ollama_host: str = "http://localhost:11434",
                 config: Optional[GenerationConfig] = None):
        """Initialize the generator"""
        self.config = config or GenerationConfig()
        super().__init__(self.config)
        
        # Initialize clients
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.ollama_client = ollama.Client(host=ollama_host)
        
        # Verify connections
        self._verify_connections()
        
        logger.info(f"✅ OllamaQuestionGenerator initialized with model: {self.config.model}")
        logger.info(f"Using Ollama host: {ollama_host}")
    
    def _verify_connections(self) -> bool:
        """Verify Ollama and database connections"""
        try:
            # Test Ollama connection
            models = self.ollama_client.list()

            # Handle different response formats
            if hasattr(models, 'models'):
                model_list = models.models
            elif isinstance(models, dict) and 'models' in models:
                model_list = models['models']
            else:
                model_list = models

            # Extract model names safely
            available_models = []
            for model in model_list:
                if hasattr(model, 'model'):
                    available_models.append(model.model)
                elif isinstance(model, dict) and 'name' in model:
                    available_models.append(model['name'])
                elif isinstance(model, dict) and 'model' in model:
                    available_models.append(model['model'])
                else:
                    available_models.append(str(model))
            
            if self.config.model not in available_models:
                logger.warning(f"⚠️ Model {self.config.model} not found. Available: {available_models}")
            else:
                logger.info(f"✅ Model {self.config.model} is available")
            
            # Test database connection
            result = self.supabase.table('subjects').select('id').limit(1).execute()
            
            logger.info("✅ All connections verified successfully")
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Connection verification failed: {e}")
            # Don't raise error, just warn - the actual generation will test the connection
            return False
    
    async def get_topic_info(self, topic_id: str) -> Optional[TopicInfo]:
        """Fetch topic information from database"""
        try:
            result = self.supabase.table('topics').select(
                'id, title, description, difficulty_level, syllabus_code, learning_objectives, subjects(name)'
            ).eq('id', topic_id).single().execute()
            
            if not result.data:
                logger.error(f"Topic {topic_id} not found")
                return None
            
            topic_data = result.data
            return TopicInfo(
                id=topic_data['id'],
                title=topic_data['title'],
                subject_name=topic_data['subjects']['name'],
                difficulty_level=topic_data['difficulty_level'],
                syllabus_code=topic_data.get('syllabus_code', ''),
                description=topic_data.get('description', ''),
                learning_objectives=topic_data.get('learning_objectives', [])
            )
            
        except Exception as e:
            logger.error(f"Error fetching topic info: {e}")
            return None
    
    def _create_quiz_prompt(self, topic_info: TopicInfo, question_count: int) -> str:
        """Create prompt for quiz question generation"""
        learning_objectives_text = ""
        if topic_info.learning_objectives:
            learning_objectives_text = f"\nLearning Objectives:\n" + "\n".join(f"- {obj}" for obj in topic_info.learning_objectives)
        
        return f"""You are an expert IGCSE {topic_info.subject_name} educator creating quiz questions for Grade 9-10 students.

Topic: {topic_info.title}
Subject: {topic_info.subject_name}
Difficulty Level: {topic_info.difficulty_level}/5
Syllabus Code: {topic_info.syllabus_code}
Description: {topic_info.description}{learning_objectives_text}

Create {question_count} high-quality multiple choice questions that:
1. Test understanding of key concepts in {topic_info.title}
2. Are appropriate for IGCSE Grade 9-10 level
3. Have 4 clear, distinct options (A, B, C, D)
4. Include detailed explanations for the correct answer
5. Vary in difficulty within the specified level
6. Use proper academic language and terminology

Respond with valid JSON only:
{{
    "questions": [
        {{
            "question_text": "Clear, specific question text that tests understanding",
            "question_type": "multiple_choice",
            "options": {{
                "A": "First option",
                "B": "Second option", 
                "C": "Third option",
                "D": "Fourth option"
            }},
            "correct_answer": "A",
            "explanation": "Detailed explanation of why this answer is correct and why others are wrong",
            "difficulty_level": {topic_info.difficulty_level},
            "points": 1,
            "tags": ["relevant", "topic", "tags"]
        }}
    ]
}}

Ensure all questions are factually accurate, educationally valuable, and aligned with IGCSE curriculum standards."""

    def _create_exam_prompt(self, topic_info: TopicInfo, total_marks: int) -> str:
        """Create prompt for exam paper generation"""
        # Calculate question distribution based on marks
        if total_marks == 20:
            distribution = [
                {"marks": 2, "count": 5, "type": "short_answer"},
                {"marks": 5, "count": 2, "type": "structured"}
            ]
        else:  # 50 marks
            distribution = [
                {"marks": 2, "count": 5, "type": "short_answer"},
                {"marks": 5, "count": 4, "type": "structured"},
                {"marks": 10, "count": 2, "type": "extended"}
            ]
        
        return f"""You are an expert IGCSE {topic_info.subject_name} examiner creating a formal exam paper.

Topic: {topic_info.title}
Subject: {topic_info.subject_name}
Total Marks: {total_marks}
Difficulty Level: {topic_info.difficulty_level}/5
Syllabus Code: {topic_info.syllabus_code}

Create exam questions with this distribution:
{json.dumps(distribution, indent=2)}

Requirements:
1. Questions must be appropriate for IGCSE Grade 9-10 level
2. Include clear mark allocations and instructions
3. Provide detailed marking schemes/model answers
4. Cover different aspects of {topic_info.title}
5. Use proper exam paper formatting and language
6. Ensure questions test different cognitive levels (knowledge, understanding, application, analysis)

Respond with valid JSON only:
{{
    "title": "IGCSE {topic_info.subject_name}: {topic_info.title}",
    "instructions": "Answer ALL questions. Show all working clearly. Write your answers in the spaces provided.",
    "duration_minutes": {60 if total_marks == 20 else 90},
    "total_marks": {total_marks},
    "questions": [
        {{
            "question_text": "Question text with clear instructions and any diagrams described",
            "marks": 5,
            "answer_text": "Detailed marking scheme with acceptable answers and mark allocation",
            "explanation": "Additional guidance for marking and common student errors to watch for",
            "question_order": 1,
            "question_type": "structured"
        }}
    ]
}}

Ensure all questions are academically rigorous and align with IGCSE assessment objectives."""

    async def _call_ollama(self, prompt: str) -> Optional[str]:
        """Make API call to Ollama with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                start_time = time.time()
                
                response = self.ollama_client.chat(
                    model=self.config.model,
                    messages=[
                        {"role": "system", "content": "You are an expert IGCSE educator. Respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    options={
                        "temperature": self.config.temperature,
                        "num_predict": self.config.max_tokens,
                    }
                )
                
                generation_time = time.time() - start_time
                logger.debug(f"Ollama response received in {generation_time:.2f}s")
                
                return response['message']['content']
                
            except Exception as e:
                logger.warning(f"Ollama call attempt {attempt + 1} failed: {e}")
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"All Ollama call attempts failed")
                    return None
        
        return None

    def _extract_json_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON from Ollama response with improved error handling"""
        try:
            # Find JSON boundaries
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1

            if start_idx == -1 or end_idx == 0:
                logger.error("No JSON found in response")
                return None

            json_content = response[start_idx:end_idx]

            # Try to parse as-is first
            try:
                return json.loads(json_content)
            except json.JSONDecodeError:
                # If that fails, try to clean up common issues
                cleaned_json = self._clean_json_content(json_content)
                return json.loads(cleaned_json)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.debug(f"Response content: {response[:500]}...")
            return None
        except Exception as e:
            logger.error(f"Error extracting JSON: {e}")
            return None

    def _clean_json_content(self, json_content: str) -> str:
        """Clean up common JSON formatting issues"""
        import re

        # Remove trailing commas before closing braces/brackets
        json_content = re.sub(r',(\s*})', r'\1', json_content)
        json_content = re.sub(r',(\s*])', r'\1', json_content)

        # Remove any text after the last closing brace
        last_brace = json_content.rfind('}')
        if last_brace != -1:
            json_content = json_content[:last_brace + 1]

        return json_content

    async def generate_quiz_questions(self, topic_info: TopicInfo, 
                                    question_count: int = 10) -> List[QuizQuestion]:
        """Generate quiz questions for a topic"""
        logger.info(f"Generating {question_count} quiz questions for: {topic_info.title}")
        
        try:
            # Use smaller batches for better reliability with larger requests
            batch_size = min(5, question_count)  # Max 5 questions per batch
            all_questions = []

            remaining_questions = question_count
            batch_num = 1

            while remaining_questions > 0:
                current_batch_size = min(batch_size, remaining_questions)
                logger.info(f"Generating batch {batch_num}: {current_batch_size} questions")

                # Create prompt for this batch
                prompt = self._create_quiz_prompt(topic_info, current_batch_size)

                # Call Ollama
                response = await self._call_ollama(prompt)
                if not response:
                    logger.warning(f"No response for batch {batch_num}")
                    break

                # Parse response
                result = self._extract_json_from_response(response)
                if not result or 'questions' not in result:
                    logger.warning(f"Invalid response format for batch {batch_num}")
                    break

                # Convert to QuizQuestion objects
                batch_questions = []
                for i, q_data in enumerate(result['questions']):
                    try:
                        question = QuizQuestion(
                            question_text=q_data['question_text'],
                            question_type=QuestionType.MULTIPLE_CHOICE,
                            options=q_data.get('options', {}),
                            correct_answer=q_data['correct_answer'],
                            explanation=q_data['explanation'],
                            difficulty_level=q_data.get('difficulty_level', topic_info.difficulty_level),
                            points=q_data.get('points', 1),
                            tags=q_data.get('tags', []),
                            generation_method=GenerationMethod.OLLAMA_GEMMA,
                            generation_model=self.config.model
                        )
                        batch_questions.append(question)

                    except Exception as e:
                        logger.warning(f"Failed to create question {i+1} in batch {batch_num}: {e}")
                        continue

                all_questions.extend(batch_questions)
                remaining_questions -= len(batch_questions)
                batch_num += 1

                logger.info(f"Batch {batch_num-1} completed: {len(batch_questions)} questions generated")

                # Small delay between batches to avoid overwhelming the model
                if remaining_questions > 0:
                    await asyncio.sleep(2)

            logger.info(f"✅ Generated {len(all_questions)} valid questions total")
            self.update_stats(True, len(all_questions))
            return all_questions
            
        except Exception as e:
            logger.error(f"Error generating quiz questions: {e}")
            self.update_stats(False, 0, str(e))
            return []

    async def generate_exam_paper(self, topic_info: TopicInfo, total_marks: int = 50) -> Optional[ExamPaper]:
        """Generate exam paper for a topic"""
        logger.info(f"Generating exam paper for: {topic_info.title} ({total_marks} marks)")

        try:
            # For larger exam papers, use multiple attempts with different mark distributions
            max_attempts = 3
            questions = []

            for attempt in range(max_attempts):
                logger.info(f"Exam generation attempt {attempt + 1}/{max_attempts}")

                # Create prompt
                prompt = self._create_exam_prompt(topic_info, total_marks)

                # Call Ollama
                response = await self._call_ollama(prompt)
                if not response:
                    logger.warning(f"No response on attempt {attempt + 1}")
                    continue

                # Parse response
                result = self._extract_json_from_response(response)
                if not result:
                    logger.warning(f"Invalid response format on attempt {attempt + 1}")
                    continue

                # Convert to ExamQuestion objects
                attempt_questions = []
                total_marks_check = 0

                for i, q_data in enumerate(result.get('questions', [])):
                    try:
                        # Validate required fields
                        if not all(key in q_data for key in ['question_text', 'marks', 'answer_text']):
                            logger.warning(f"Question {i+1} missing required fields")
                            continue

                        question = ExamQuestion(
                            question_text=q_data['question_text'],
                            marks=q_data['marks'],
                            answer_text=q_data['answer_text'],
                            explanation=q_data.get('explanation', ''),
                            question_order=q_data.get('question_order', len(attempt_questions) + 1),
                            question_type=q_data.get('question_type', 'structured'),
                            generation_method=GenerationMethod.OLLAMA_GEMMA,
                            generation_model=self.config.model
                        )
                        attempt_questions.append(question)
                        total_marks_check += question.marks

                    except Exception as e:
                        logger.warning(f"Failed to create exam question {i+1}: {e}")
                        continue

                # Check if we have valid questions and reasonable mark distribution
                if attempt_questions and abs(total_marks_check - total_marks) <= total_marks * 0.2:  # Within 20%
                    questions = attempt_questions
                    logger.info(f"✅ Successful generation on attempt {attempt + 1}: {len(questions)} questions, {total_marks_check} marks")
                    break
                else:
                    logger.warning(f"Attempt {attempt + 1} failed: {len(attempt_questions)} questions, {total_marks_check} marks (target: {total_marks})")

            if not questions:
                logger.error("No valid questions generated for exam paper after all attempts")
                return None

            # Calculate actual total marks from questions
            actual_total_marks = sum(q.marks for q in questions)

            # Create ExamPaper object
            exam_paper = ExamPaper(
                title=result.get('title', f"{topic_info.subject_name}: {topic_info.title}"),
                instructions=result.get('instructions', 'Answer ALL questions. Show all working clearly.'),
                duration_minutes=result.get('duration_minutes', 60 if actual_total_marks <= 20 else 90),
                total_marks=actual_total_marks,  # Use actual marks, not target
                questions=questions,
                topic_id=topic_info.id,
                subject_name=topic_info.subject_name,
                difficulty_level=topic_info.difficulty_level,
                generation_method=GenerationMethod.OLLAMA_GEMMA
            )

            logger.info(f"✅ Generated exam paper with {len(questions)} questions")
            self.update_stats(True, len(questions))
            return exam_paper

        except Exception as e:
            logger.error(f"Error generating exam paper: {e}")
            self.update_stats(False, 0, str(e))
            return None

    async def save_quiz_to_database(self, topic_info: TopicInfo, questions: List[QuizQuestion]) -> Optional[str]:
        """Save generated quiz questions to database"""
        try:
            # Create quiz record
            quiz_data = {
                'topic_id': topic_info.id,
                'title': f"{topic_info.title} - Generated Quiz",
                'description': f"Auto-generated quiz for {topic_info.title} using Ollama + Gemma",
                'quiz_type': 'practice',
                'difficulty_level': topic_info.difficulty_level,
                'randomize_questions': True,
                'show_correct_answers': True,
                'is_published': True,
                'created_at': datetime.now().isoformat()
            }

            quiz_result = self.supabase.table('quizzes').insert(quiz_data).execute()

            if not quiz_result.data:
                raise Exception("Failed to create quiz record")

            quiz_id = quiz_result.data[0]['id']

            # Prepare question data
            question_data = []
            for i, question in enumerate(questions):
                question_record = {
                    'quiz_id': quiz_id,
                    'question_text': question.question_text,
                    'question_type': question.question_type.value,
                    'options': question.options,
                    'correct_answer': question.correct_answer,
                    'explanation': question.explanation,
                    'points': question.points,
                    'display_order': i + 1,
                    'generation_method': question.generation_method.value,
                    'generation_model': question.generation_model,
                    'generation_timestamp': question.generation_timestamp.isoformat(),
                    'quality_score': question.quality_score,
                    'created_at': datetime.now().isoformat()
                }
                question_data.append(question_record)

            # Save questions in batches
            batch_size = 50
            for i in range(0, len(question_data), batch_size):
                batch = question_data[i:i + batch_size]
                questions_result = self.supabase.table('quiz_questions').insert(batch).execute()

                if not questions_result.data:
                    raise Exception(f"Failed to save question batch {i//batch_size + 1}")

            logger.info(f"✅ Saved quiz '{quiz_data['title']}' with {len(questions)} questions")
            return quiz_id

        except Exception as e:
            logger.error(f"Error saving quiz to database: {e}")
            return None

    async def save_exam_paper_to_database(self, exam_paper: ExamPaper) -> Optional[str]:
        """Save generated exam paper to database"""
        try:
            # Save as a special quiz type for exam papers
            quiz_data = {
                'topic_id': exam_paper.topic_id,
                'title': exam_paper.title,
                'description': f"Exam paper generated using Ollama + Gemma\nInstructions: {exam_paper.instructions}",
                'quiz_type': 'mock_exam',
                'difficulty_level': exam_paper.difficulty_level,
                'time_limit_minutes': exam_paper.duration_minutes,
                'randomize_questions': False,
                'show_correct_answers': False,
                'is_published': True,
                'created_at': datetime.now().isoformat()
            }

            quiz_result = self.supabase.table('quizzes').insert(quiz_data).execute()

            if not quiz_result.data:
                raise Exception("Failed to create exam paper record")

            quiz_id = quiz_result.data[0]['id']

            # Convert exam questions to quiz question format
            question_data = []
            for question in exam_paper.questions:
                question_record = {
                    'quiz_id': quiz_id,
                    'question_text': question.question_text,
                    'question_type': 'essay',  # Exam questions are typically essay/structured
                    'options': None,
                    'correct_answer': question.answer_text,
                    'explanation': question.explanation,
                    'points': question.marks,
                    'display_order': question.question_order,
                    'generation_method': question.generation_method.value,
                    'generation_model': question.generation_model,
                    'generation_timestamp': question.generation_timestamp.isoformat(),
                    'created_at': datetime.now().isoformat()
                }
                question_data.append(question_record)

            # Save questions
            questions_result = self.supabase.table('quiz_questions').insert(question_data).execute()

            if not questions_result.data:
                raise Exception("Failed to save exam questions")

            logger.info(f"✅ Saved exam paper '{exam_paper.title}' with {len(exam_paper.questions)} questions")
            return quiz_id

        except Exception as e:
            logger.error(f"Error saving exam paper to database: {e}")
            return None
