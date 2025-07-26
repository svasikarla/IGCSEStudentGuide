#!/usr/bin/env python3
"""
Quality Validation Module for Generated Questions

This module provides comprehensive quality validation for generated quiz questions
and exam papers to ensure they meet IGCSE educational standards.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .base_models import QuizQuestion, ExamQuestion, ExamPaper, QuestionType
from .logging_config import setup_logging

logger = setup_logging()

class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    severity: ValidationSeverity
    message: str
    field: str
    suggestion: Optional[str] = None

@dataclass
class ValidationResult:
    """Result of quality validation"""
    is_valid: bool
    quality_score: float  # 0.0 to 1.0
    issues: List[ValidationIssue]
    
    @property
    def has_critical_issues(self) -> bool:
        """Check if there are any critical issues"""
        return any(issue.severity == ValidationSeverity.CRITICAL for issue in self.issues)
    
    @property
    def has_errors(self) -> bool:
        """Check if there are any errors"""
        return any(issue.severity == ValidationSeverity.ERROR for issue in self.issues)

class QuestionQualityValidator:
    """Validates the quality of generated questions"""
    
    def __init__(self):
        # Quality thresholds
        self.min_question_length = 20
        self.max_question_length = 500
        self.min_explanation_length = 30
        self.max_explanation_length = 1000
        self.required_options_count = 4
        
        # Common words that indicate poor quality
        self.poor_quality_indicators = [
            "i don't know", "not sure", "maybe", "probably", "i think",
            "lorem ipsum", "placeholder", "example", "test question"
        ]
        
        # Academic vocabulary indicators (positive)
        self.academic_indicators = [
            "analyze", "evaluate", "compare", "contrast", "explain", "describe",
            "calculate", "determine", "identify", "classify", "interpret"
        ]
    
    def validate_quiz_question(self, question: QuizQuestion) -> ValidationResult:
        """Validate a quiz question comprehensively"""
        issues = []
        quality_score = 1.0
        
        # Validate question text
        issues.extend(self._validate_question_text(question.question_text))
        
        # Validate options for multiple choice
        if question.question_type == QuestionType.MULTIPLE_CHOICE:
            issues.extend(self._validate_multiple_choice_options(question.options, question.correct_answer))
        
        # Validate explanation
        issues.extend(self._validate_explanation(question.explanation))
        
        # Validate correct answer
        issues.extend(self._validate_correct_answer(question.correct_answer, question.question_type, question.options))
        
        # Check for academic quality
        issues.extend(self._validate_academic_quality(question.question_text, question.explanation))
        
        # Calculate quality score based on issues
        quality_score = self._calculate_quality_score(issues)
        
        # Determine if valid (no critical issues or errors)
        is_valid = not any(issue.severity in [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR] for issue in issues)
        
        return ValidationResult(
            is_valid=is_valid,
            quality_score=quality_score,
            issues=issues
        )
    
    def validate_exam_question(self, question: ExamQuestion) -> ValidationResult:
        """Validate an exam question"""
        issues = []
        quality_score = 1.0
        
        # Validate question text (exam questions should be longer and more detailed)
        if len(question.question_text.strip()) < 30:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message="Exam question text is too short",
                field="question_text",
                suggestion="Exam questions should be at least 30 characters long"
            ))
        
        # Validate marks allocation
        if not 1 <= question.marks <= 20:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message=f"Invalid marks allocation: {question.marks}",
                field="marks",
                suggestion="Marks should be between 1 and 20"
            ))
        
        # Validate answer text
        if len(question.answer_text.strip()) < 20:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message="Answer text is too short",
                field="answer_text",
                suggestion="Provide a detailed marking scheme or model answer"
            ))
        
        # Check for academic quality
        issues.extend(self._validate_academic_quality(question.question_text, question.answer_text))
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(issues)
        
        # Determine if valid
        is_valid = not any(issue.severity in [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR] for issue in issues)
        
        return ValidationResult(
            is_valid=is_valid,
            quality_score=quality_score,
            issues=issues
        )
    
    def validate_exam_paper(self, exam_paper: ExamPaper) -> ValidationResult:
        """Validate an entire exam paper"""
        issues = []
        
        # Validate basic structure
        if not exam_paper.questions:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                message="Exam paper has no questions",
                field="questions"
            ))
            return ValidationResult(is_valid=False, quality_score=0.0, issues=issues)
        
        # Validate marks distribution
        total_calculated_marks = sum(q.marks for q in exam_paper.questions)
        if total_calculated_marks != exam_paper.total_marks:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message=f"Marks mismatch: calculated {total_calculated_marks}, expected {exam_paper.total_marks}",
                field="total_marks"
            ))
        
        # Validate individual questions
        question_scores = []
        for i, question in enumerate(exam_paper.questions):
            result = self.validate_exam_question(question)
            question_scores.append(result.quality_score)
            
            # Add question-specific issues with context
            for issue in result.issues:
                issues.append(ValidationIssue(
                    severity=issue.severity,
                    message=f"Question {i+1}: {issue.message}",
                    field=f"questions[{i}].{issue.field}",
                    suggestion=issue.suggestion
                ))
        
        # Calculate overall quality score
        if question_scores:
            avg_question_quality = sum(question_scores) / len(question_scores)
            # Adjust for structural issues
            structure_penalty = len([i for i in issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]]) * 0.1
            quality_score = max(0.0, avg_question_quality - structure_penalty)
        else:
            quality_score = 0.0
        
        # Determine if valid
        is_valid = not any(issue.severity in [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR] for issue in issues)
        
        return ValidationResult(
            is_valid=is_valid,
            quality_score=quality_score,
            issues=issues
        )
    
    def _validate_question_text(self, text: str) -> List[ValidationIssue]:
        """Validate question text quality"""
        issues = []
        
        if not text or not text.strip():
            issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                message="Question text is empty",
                field="question_text"
            ))
            return issues
        
        text_clean = text.strip()
        
        # Length validation
        if len(text_clean) < self.min_question_length:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message=f"Question text too short ({len(text_clean)} chars, minimum {self.min_question_length})",
                field="question_text",
                suggestion="Provide more detailed question text"
            ))
        
        if len(text_clean) > self.max_question_length:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                message=f"Question text very long ({len(text_clean)} chars, maximum {self.max_question_length})",
                field="question_text",
                suggestion="Consider breaking into multiple questions"
            ))
        
        # Check for question mark
        if not text_clean.endswith('?') and not any(word in text_clean.lower() for word in ['calculate', 'determine', 'find', 'show']):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                message="Question text should end with a question mark or be a clear instruction",
                field="question_text",
                suggestion="Add '?' or use clear instructional language"
            ))
        
        # Check for poor quality indicators
        text_lower = text_clean.lower()
        for indicator in self.poor_quality_indicators:
            if indicator in text_lower:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    message=f"Contains poor quality indicator: '{indicator}'",
                    field="question_text",
                    suggestion="Remove placeholder or uncertain language"
                ))
        
        return issues
    
    def _validate_multiple_choice_options(self, options: Optional[Dict[str, str]], correct_answer: str) -> List[ValidationIssue]:
        """Validate multiple choice options"""
        issues = []
        
        if not options:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                message="Multiple choice question missing options",
                field="options"
            ))
            return issues
        
        # Check option count
        if len(options) < self.required_options_count:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message=f"Insufficient options ({len(options)}, required {self.required_options_count})",
                field="options",
                suggestion="Provide 4 distinct options (A, B, C, D)"
            ))
        
        # Check option labels
        expected_labels = ['A', 'B', 'C', 'D'][:len(options)]
        for label in expected_labels:
            if label not in options:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    message=f"Missing option label '{label}'",
                    field="options",
                    suggestion="Use standard labels A, B, C, D"
                ))
        
        # Check correct answer validity
        if correct_answer not in options:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                message=f"Correct answer '{correct_answer}' not found in options",
                field="correct_answer",
                suggestion="Ensure correct answer matches one of the option labels"
            ))
        
        # Check for duplicate options
        option_texts = list(options.values())
        if len(option_texts) != len(set(option_texts)):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message="Duplicate option texts found",
                field="options",
                suggestion="Ensure all options are distinct"
            ))
        
        # Check option length
        for label, text in options.items():
            if not text or len(text.strip()) < 3:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    message=f"Option {label} is too short",
                    field="options",
                    suggestion="Provide meaningful option text"
                ))
        
        return issues
    
    def _validate_explanation(self, explanation: str) -> List[ValidationIssue]:
        """Validate explanation quality"""
        issues = []
        
        if not explanation or not explanation.strip():
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                message="Explanation is missing",
                field="explanation",
                suggestion="Provide detailed explanation of the correct answer"
            ))
            return issues
        
        explanation_clean = explanation.strip()
        
        # Length validation
        if len(explanation_clean) < self.min_explanation_length:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                message=f"Explanation too short ({len(explanation_clean)} chars, minimum {self.min_explanation_length})",
                field="explanation",
                suggestion="Provide more detailed explanation"
            ))
        
        if len(explanation_clean) > self.max_explanation_length:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                message=f"Explanation very long ({len(explanation_clean)} chars, maximum {self.max_explanation_length})",
                field="explanation",
                suggestion="Consider condensing the explanation"
            ))
        
        return issues
    
    def _validate_correct_answer(self, correct_answer: str, question_type: QuestionType, options: Optional[Dict[str, str]]) -> List[ValidationIssue]:
        """Validate correct answer"""
        issues = []
        
        if not correct_answer or not correct_answer.strip():
            issues.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                message="Correct answer is missing",
                field="correct_answer"
            ))
            return issues
        
        if question_type == QuestionType.MULTIPLE_CHOICE and options:
            if correct_answer not in options:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Correct answer '{correct_answer}' not in options",
                    field="correct_answer"
                ))
        
        return issues
    
    def _validate_academic_quality(self, question_text: str, explanation_text: str) -> List[ValidationIssue]:
        """Validate academic quality of content"""
        issues = []
        
        combined_text = f"{question_text} {explanation_text}".lower()
        
        # Check for academic vocabulary
        academic_count = sum(1 for indicator in self.academic_indicators if indicator in combined_text)
        if academic_count == 0:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.INFO,
                message="Consider using more academic vocabulary",
                field="academic_quality",
                suggestion="Include words like 'analyze', 'evaluate', 'explain', etc."
            ))
        
        # Check for proper capitalization
        if question_text and not question_text[0].isupper():
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                message="Question should start with capital letter",
                field="question_text",
                suggestion="Capitalize the first letter"
            ))
        
        return issues
    
    def _calculate_quality_score(self, issues: List[ValidationIssue]) -> float:
        """Calculate quality score based on validation issues"""
        base_score = 1.0
        
        # Deduct points based on issue severity
        for issue in issues:
            if issue.severity == ValidationSeverity.CRITICAL:
                base_score -= 0.3
            elif issue.severity == ValidationSeverity.ERROR:
                base_score -= 0.2
            elif issue.severity == ValidationSeverity.WARNING:
                base_score -= 0.1
            elif issue.severity == ValidationSeverity.INFO:
                base_score -= 0.05
        
        return max(0.0, min(1.0, base_score))
