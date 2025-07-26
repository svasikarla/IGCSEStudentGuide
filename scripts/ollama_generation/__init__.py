"""
Ollama Question Generation Module

This module provides standalone question generation capabilities using
local Ollama + Gemma models for the IGCSE Study Guide application.
"""

__version__ = "1.0.0"
__author__ = "IGCSE Study Guide Team"

from .core_generator import OllamaQuestionGenerator
from .batch_generator import BatchQuestionGenerator
from .quality_validator import QuestionQualityValidator
from .scheduler import QuestionGenerationScheduler
from .base_models import (
    GenerationConfig,
    TopicInfo,
    QuizQuestion,
    ExamQuestion,
    ExamPaper,
    QuestionType,
    GenerationMethod
)

__all__ = [
    'OllamaQuestionGenerator',
    'BatchQuestionGenerator', 
    'QuestionQualityValidator',
    'QuestionGenerationScheduler',
    'GenerationConfig',
    'TopicInfo',
    'QuizQuestion',
    'ExamQuestion',
    'ExamPaper',
    'QuestionType',
    'GenerationMethod'
]
