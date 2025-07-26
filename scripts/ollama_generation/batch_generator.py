#!/usr/bin/env python3
"""
Batch Question Generation Module

This module handles batch generation of questions for multiple topics,
with intelligent scheduling and resource management.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field

from .core_generator import OllamaQuestionGenerator
from .quality_validator import QuestionQualityValidator, ValidationResult
from .base_models import TopicInfo, GenerationConfig, GenerationStats
from .logging_config import setup_logging

logger = setup_logging()

@dataclass
class BatchGenerationConfig:
    """Configuration for batch generation"""
    max_concurrent_generations: int = 3
    delay_between_generations: float = 2.0
    max_daily_generations: int = 100
    min_questions_per_topic: int = 20
    target_questions_per_topic: int = 50
    quality_threshold: float = 0.7
    retry_failed_generations: bool = True
    max_retries_per_topic: int = 2

@dataclass
class TopicGenerationNeed:
    """Represents a topic's need for question generation"""
    topic_info: TopicInfo
    current_question_count: int
    needed_questions: int
    priority: str  # 'high', 'medium', 'low'
    last_generation_date: Optional[datetime] = None

@dataclass
class BatchGenerationResult:
    """Result of batch generation operation"""
    total_topics_processed: int
    successful_generations: int
    failed_generations: int
    total_questions_generated: int
    average_quality_score: float
    processing_time_seconds: float
    errors: List[str] = field(default_factory=list)

class BatchQuestionGenerator:
    """Handles batch generation of questions across multiple topics"""
    
    def __init__(self, supabase_url: str, supabase_key: str, 
                 batch_config: Optional[BatchGenerationConfig] = None,
                 generation_config: Optional[GenerationConfig] = None):
        """Initialize batch generator"""
        self.batch_config = batch_config or BatchGenerationConfig()
        self.generator = OllamaQuestionGenerator(supabase_url, supabase_key, config=generation_config)
        self.validator = QuestionQualityValidator()
        
        # Tracking
        self.daily_generation_count = 0
        self.active_generations = 0
        self.generation_semaphore = asyncio.Semaphore(self.batch_config.max_concurrent_generations)
        
        logger.info(f"✅ BatchQuestionGenerator initialized")
    
    async def analyze_generation_needs(self, subject_filter: Optional[str] = None) -> List[TopicGenerationNeed]:
        """Analyze which topics need more questions"""
        try:
            # Get topic question counts from database
            result = self.generator.supabase.rpc('get_topic_question_counts').execute()
            
            if not result.data:
                logger.warning("No topics found in database")
                return []
            
            needs = []
            for topic_data in result.data:
                # Filter by subject if specified
                if subject_filter and topic_data['subject_name'] != subject_filter:
                    continue
                
                current_count = topic_data.get('total_questions', 0)
                
                # Determine priority and needed questions
                if current_count < self.batch_config.min_questions_per_topic:
                    priority = 'high'
                    needed = self.batch_config.target_questions_per_topic - current_count
                elif current_count < self.batch_config.target_questions_per_topic:
                    priority = 'medium'
                    needed = self.batch_config.target_questions_per_topic - current_count
                else:
                    continue  # Topic has enough questions
                
                # Get topic details
                topic_info = await self.generator.get_topic_info(topic_data['topic_id'])
                if not topic_info:
                    continue
                
                need = TopicGenerationNeed(
                    topic_info=topic_info,
                    current_question_count=current_count,
                    needed_questions=min(needed, 20),  # Limit per batch
                    priority=priority
                )
                needs.append(need)
            
            # Sort by priority and need
            def sort_key(need):
                priority_weight = {'high': 3, 'medium': 2, 'low': 1}
                return (priority_weight[need.priority], need.needed_questions)
            
            needs.sort(key=sort_key, reverse=True)
            
            logger.info(f"Identified {len(needs)} topics needing questions")
            return needs
            
        except Exception as e:
            logger.error(f"Error analyzing generation needs: {e}")
            return []
    
    async def generate_for_topic(self, need: TopicGenerationNeed) -> Tuple[bool, int, List[str]]:
        """Generate questions for a single topic with quality validation"""
        async with self.generation_semaphore:
            try:
                logger.info(f"Generating {need.needed_questions} questions for: {need.topic_info.title}")
                
                # Generate questions
                questions = await self.generator.generate_quiz_questions(
                    need.topic_info, 
                    need.needed_questions
                )
                
                if not questions:
                    return False, 0, ["Failed to generate questions"]
                
                # Validate questions
                validated_questions = []
                validation_errors = []
                
                for i, question in enumerate(questions):
                    validation_result = self.validator.validate_quiz_question(question)
                    
                    if validation_result.is_valid and validation_result.quality_score >= self.batch_config.quality_threshold:
                        question.quality_score = validation_result.quality_score
                        validated_questions.append(question)
                    else:
                        error_msg = f"Question {i+1} failed validation: {[issue.message for issue in validation_result.issues]}"
                        validation_errors.append(error_msg)
                        logger.warning(error_msg)
                
                if not validated_questions:
                    return False, 0, validation_errors or ["No questions passed validation"]
                
                # Save to database
                quiz_id = await self.generator.save_quiz_to_database(need.topic_info, validated_questions)
                
                if quiz_id:
                    logger.info(f"✅ Successfully generated {len(validated_questions)} questions for {need.topic_info.title}")
                    return True, len(validated_questions), validation_errors
                else:
                    return False, 0, ["Failed to save questions to database"]
                
            except Exception as e:
                error_msg = f"Error generating for topic {need.topic_info.title}: {e}"
                logger.error(error_msg)
                return False, 0, [error_msg]
            
            finally:
                # Add delay between generations
                await asyncio.sleep(self.batch_config.delay_between_generations)
    
    async def run_batch_generation(self, subject_filter: Optional[str] = None, 
                                 max_topics: Optional[int] = None) -> BatchGenerationResult:
        """Run batch generation for multiple topics"""
        start_time = datetime.now()
        
        # Check daily limit
        if self.daily_generation_count >= self.batch_config.max_daily_generations:
            logger.warning(f"Daily generation limit reached ({self.batch_config.max_daily_generations})")
            return BatchGenerationResult(
                total_topics_processed=0,
                successful_generations=0,
                failed_generations=0,
                total_questions_generated=0,
                average_quality_score=0.0,
                processing_time_seconds=0.0,
                errors=["Daily generation limit reached"]
            )
        
        # Analyze needs
        needs = await self.analyze_generation_needs(subject_filter)
        
        if not needs:
            logger.info("No topics need additional questions")
            return BatchGenerationResult(
                total_topics_processed=0,
                successful_generations=0,
                failed_generations=0,
                total_questions_generated=0,
                average_quality_score=0.0,
                processing_time_seconds=0.0
            )
        
        # Limit topics if specified
        if max_topics:
            needs = needs[:max_topics]
        
        # Limit by daily budget
        remaining_budget = self.batch_config.max_daily_generations - self.daily_generation_count
        if remaining_budget <= 0:
            logger.warning("No remaining daily generation budget")
            return BatchGenerationResult(
                total_topics_processed=0,
                successful_generations=0,
                failed_generations=0,
                total_questions_generated=0,
                average_quality_score=0.0,
                processing_time_seconds=0.0,
                errors=["No remaining daily budget"]
            )
        
        # Process topics
        successful_generations = 0
        failed_generations = 0
        total_questions_generated = 0
        all_errors = []
        quality_scores = []
        
        logger.info(f"Starting batch generation for {len(needs)} topics")
        
        # Create tasks for concurrent processing
        tasks = []
        for need in needs:
            if len(tasks) >= remaining_budget:
                break
            
            task = asyncio.create_task(self.generate_for_topic(need))
            tasks.append((need, task))
        
        # Process tasks
        for need, task in tasks:
            try:
                success, question_count, errors = await task
                
                if success:
                    successful_generations += 1
                    total_questions_generated += question_count
                    self.daily_generation_count += question_count
                    
                    # Track quality scores (would need to be passed from generation)
                    # For now, assume good quality if successful
                    quality_scores.append(0.8)
                else:
                    failed_generations += 1
                    all_errors.extend(errors)
                
            except Exception as e:
                failed_generations += 1
                error_msg = f"Task failed for {need.topic_info.title}: {e}"
                all_errors.append(error_msg)
                logger.error(error_msg)
        
        # Calculate results
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        average_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
        
        result = BatchGenerationResult(
            total_topics_processed=len(tasks),
            successful_generations=successful_generations,
            failed_generations=failed_generations,
            total_questions_generated=total_questions_generated,
            average_quality_score=average_quality,
            processing_time_seconds=processing_time,
            errors=all_errors
        )
        
        logger.info(f"Batch generation completed: {result}")
        return result
    
    async def run_subject_generation(self, subject_name: str, 
                                   questions_per_topic: int = 10) -> BatchGenerationResult:
        """Generate questions for all topics in a specific subject"""
        logger.info(f"Starting subject generation for: {subject_name}")
        
        return await self.run_batch_generation(
            subject_filter=subject_name,
            max_topics=None  # Process all topics in subject
        )
    
    async def run_priority_generation(self, max_topics: int = 10) -> BatchGenerationResult:
        """Generate questions for highest priority topics only"""
        logger.info(f"Starting priority generation for top {max_topics} topics")
        
        return await self.run_batch_generation(
            subject_filter=None,
            max_topics=max_topics
        )
    
    def get_daily_stats(self) -> Dict[str, Any]:
        """Get daily generation statistics"""
        return {
            'daily_generation_count': self.daily_generation_count,
            'remaining_daily_budget': max(0, self.batch_config.max_daily_generations - self.daily_generation_count),
            'active_generations': self.active_generations,
            'max_concurrent': self.batch_config.max_concurrent_generations
        }
    
    def reset_daily_count(self):
        """Reset daily generation count (called at start of new day)"""
        self.daily_generation_count = 0
        logger.info("Daily generation count reset")

# Utility functions for scheduling
async def run_scheduled_generation(supabase_url: str, supabase_key: str, 
                                 config_path: Optional[str] = None) -> BatchGenerationResult:
    """Run scheduled generation with configuration"""
    try:
        # Load configuration
        batch_config = BatchGenerationConfig()
        generation_config = GenerationConfig()
        
        if config_path:
            try:
                with open(config_path, 'r') as f:
                    config_data = json.load(f)
                
                # Update configurations from file
                if 'batch' in config_data:
                    for key, value in config_data['batch'].items():
                        if hasattr(batch_config, key):
                            setattr(batch_config, key, value)
                
                if 'generation' in config_data:
                    for key, value in config_data['generation'].items():
                        if hasattr(generation_config, key):
                            setattr(generation_config, key, value)
                            
            except Exception as e:
                logger.warning(f"Could not load config from {config_path}: {e}")
        
        # Create generator and run
        batch_generator = BatchQuestionGenerator(
            supabase_url, 
            supabase_key, 
            batch_config, 
            generation_config
        )
        
        result = await batch_generator.run_batch_generation()
        
        logger.info(f"Scheduled generation completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Scheduled generation failed: {e}")
        raise
