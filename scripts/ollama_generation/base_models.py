#!/usr/bin/env python3
"""
Base Models and Data Classes for Ollama Question Generation

This module defines the core data structures and base classes used throughout
the Ollama question generation system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from enum import Enum
import uuid

class QuestionType(Enum):
    """Supported question types"""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"

class GenerationMethod(Enum):
    """Generation methods for tracking"""
    MANUAL = "manual"
    OLLAMA_GEMMA = "ollama_gemma"
    OPENAI = "openai"
    GOOGLE = "google"

class DifficultyLevel(Enum):
    """Difficulty levels for questions"""
    VERY_EASY = 1
    EASY = 2
    MEDIUM = 3
    HARD = 4
    VERY_HARD = 5

@dataclass
class GenerationConfig:
    """Configuration for question generation"""
    model: str = "gemma3:4b"  # Updated to use your available model
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout_seconds: int = 120
    max_retries: int = 3
    batch_size: int = 10

    # Quality thresholds
    min_question_length: int = 20
    max_question_length: int = 500
    min_explanation_length: int = 30
    required_options_count: int = 4

@dataclass
class TopicInfo:
    """Information about a topic for context"""
    id: str
    title: str
    subject_name: str
    difficulty_level: int
    syllabus_code: str
    description: str
    learning_objectives: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate topic information"""
        if not self.id or not self.title or not self.subject_name:
            raise ValueError("Topic ID, title, and subject name are required")
        
        if not 1 <= self.difficulty_level <= 5:
            raise ValueError("Difficulty level must be between 1 and 5")

@dataclass
class QuizQuestion:
    """Represents a quiz question"""
    question_text: str
    question_type: QuestionType
    correct_answer: str
    explanation: str
    points: int = 1
    difficulty_level: int = 3
    options: Optional[Dict[str, str]] = None
    hint: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    # Generation metadata
    generation_method: GenerationMethod = GenerationMethod.OLLAMA_GEMMA
    generation_model: Optional[str] = None
    generation_timestamp: Optional[datetime] = None
    quality_score: Optional[float] = None
    
    def __post_init__(self):
        """Validate question data"""
        if not self.question_text or len(self.question_text.strip()) < 10:
            raise ValueError("Question text must be at least 10 characters")
        
        if not self.correct_answer:
            raise ValueError("Correct answer is required")
        
        if not self.explanation or len(self.explanation.strip()) < 10:
            raise ValueError("Explanation must be at least 10 characters")
        
        if self.question_type == QuestionType.MULTIPLE_CHOICE:
            if not self.options or len(self.options) < 2:
                raise ValueError("Multiple choice questions must have at least 2 options")
        
        if not 1 <= self.points <= 10:
            raise ValueError("Points must be between 1 and 10")
        
        if not 1 <= self.difficulty_level <= 5:
            raise ValueError("Difficulty level must be between 1 and 5")
        
        # Set generation timestamp if not provided
        if self.generation_timestamp is None:
            self.generation_timestamp = datetime.now()

@dataclass
class ExamQuestion:
    """Represents an exam paper question"""
    question_text: str
    marks: int
    answer_text: str
    explanation: str
    question_order: int
    question_type: str = "structured"
    
    # Generation metadata
    generation_method: GenerationMethod = GenerationMethod.OLLAMA_GEMMA
    generation_model: Optional[str] = None
    generation_timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate exam question data"""
        if not self.question_text or len(self.question_text.strip()) < 20:
            raise ValueError("Exam question text must be at least 20 characters")
        
        if not self.answer_text or len(self.answer_text.strip()) < 10:
            raise ValueError("Answer text must be at least 10 characters")
        
        if not 1 <= self.marks <= 20:
            raise ValueError("Marks must be between 1 and 20")
        
        if self.question_order < 1:
            raise ValueError("Question order must be positive")
        
        # Set generation timestamp if not provided
        if self.generation_timestamp is None:
            self.generation_timestamp = datetime.now()

@dataclass
class ExamPaper:
    """Represents a complete exam paper"""
    title: str
    instructions: str
    duration_minutes: int
    total_marks: int
    questions: List[ExamQuestion]
    
    # Metadata
    topic_id: str
    subject_name: str
    difficulty_level: int = 3
    generation_method: GenerationMethod = GenerationMethod.OLLAMA_GEMMA
    generation_timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate exam paper data"""
        if not self.title or not self.instructions:
            raise ValueError("Title and instructions are required")
        
        if not self.questions:
            raise ValueError("Exam paper must have at least one question")
        
        if self.duration_minutes < 10:
            raise ValueError("Duration must be at least 10 minutes")
        
        if self.total_marks < 1:
            raise ValueError("Total marks must be positive")
        
        # Validate that question marks sum to total marks
        calculated_marks = sum(q.marks for q in self.questions)
        if calculated_marks != self.total_marks:
            raise ValueError(f"Question marks ({calculated_marks}) don't match total marks ({self.total_marks})")
        
        # Set generation timestamp if not provided
        if self.generation_timestamp is None:
            self.generation_timestamp = datetime.now()

@dataclass
class GenerationResult:
    """Result of a generation operation"""
    success: bool
    items_generated: int
    error_message: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    quality_scores: List[float] = field(default_factory=list)
    
    @property
    def average_quality_score(self) -> Optional[float]:
        """Calculate average quality score"""
        if not self.quality_scores:
            return None
        return sum(self.quality_scores) / len(self.quality_scores)

@dataclass
class GenerationStats:
    """Statistics for generation operations"""
    start_time: datetime
    end_time: Optional[datetime] = None
    topics_processed: int = 0
    questions_generated: int = 0
    exams_generated: int = 0
    successful_generations: int = 0
    failed_generations: int = 0
    errors: List[str] = field(default_factory=list)
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate duration in seconds"""
        if self.end_time is None:
            return None
        return (self.end_time - self.start_time).total_seconds()
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        total = self.successful_generations + self.failed_generations
        if total == 0:
            return 0.0
        return (self.successful_generations / total) * 100

class BaseGenerator:
    """Base class for all generators"""
    
    def __init__(self, config: GenerationConfig):
        self.config = config
        self.stats = GenerationStats(start_time=datetime.now())
    
    def validate_config(self) -> bool:
        """Validate generator configuration"""
        if not self.config.model:
            raise ValueError("Model name is required")
        
        if not 0.0 <= self.config.temperature <= 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")
        
        if self.config.max_tokens < 100:
            raise ValueError("Max tokens must be at least 100")
        
        if self.config.timeout_seconds < 10:
            raise ValueError("Timeout must be at least 10 seconds")
        
        return True
    
    def update_stats(self, success: bool, items_count: int = 0, error: str = None):
        """Update generation statistics"""
        if success:
            self.stats.successful_generations += 1
            self.stats.questions_generated += items_count
        else:
            self.stats.failed_generations += 1
            if error:
                self.stats.errors.append(error)
    
    def finalize_stats(self):
        """Finalize statistics at end of generation"""
        self.stats.end_time = datetime.now()
