#!/usr/bin/env python3
"""
Question Generation Scheduler

Automated scheduling system for generating questions using Ollama + Gemma.
Supports cron-like scheduling and intelligent generation based on usage patterns.
"""

import asyncio
import json
import logging
import os
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .batch_generator import BatchQuestionGenerator, BatchGenerationConfig, run_scheduled_generation
from .base_models import GenerationConfig
from .logging_config import setup_logging

logger = setup_logging()

@dataclass
class SchedulerConfig:
    """Configuration for the scheduler"""
    enabled: bool = True
    frequency: str = "daily"  # daily, weekly, hourly
    start_time: str = "02:00"  # HH:MM format
    max_runtime_minutes: int = 120  # Maximum time for generation session
    subjects_rotation: List[str] = None  # Rotate through subjects
    config_file_path: str = "config/generation/scheduler_config.json"
    
    def __post_init__(self):
        if self.subjects_rotation is None:
            self.subjects_rotation = [
                "Mathematics", "Physics", "Chemistry", "Biology", 
                "English Language", "Geography", "History"
            ]

class QuestionGenerationScheduler:
    """Intelligent scheduler for question generation"""
    
    def __init__(self, supabase_url: str, supabase_key: str, 
                 scheduler_config: Optional[SchedulerConfig] = None):
        """Initialize scheduler"""
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.config = scheduler_config or SchedulerConfig()
        
        # Load configuration from file if it exists
        self._load_config()
        
        # Initialize batch generator
        self.batch_generator = None
        self._init_batch_generator()
        
        # Scheduling state
        self.is_running = False
        self.current_subject_index = 0
        self.last_run_date = None
        
        logger.info(f"✅ QuestionGenerationScheduler initialized")
    
    def _load_config(self):
        """Load configuration from file"""
        if os.path.exists(self.config.config_file_path):
            try:
                with open(self.config.config_file_path, 'r') as f:
                    config_data = json.load(f)
                
                # Update scheduler config
                if 'scheduler' in config_data:
                    for key, value in config_data['scheduler'].items():
                        if hasattr(self.config, key):
                            setattr(self.config, key, value)
                
                logger.info(f"Configuration loaded from {self.config.config_file_path}")
                
            except Exception as e:
                logger.warning(f"Could not load scheduler config: {e}")
    
    def _init_batch_generator(self):
        """Initialize batch generator with current config"""
        try:
            # Load batch and generation configs
            batch_config = BatchGenerationConfig()
            generation_config = GenerationConfig()
            
            if os.path.exists(self.config.config_file_path):
                with open(self.config.config_file_path, 'r') as f:
                    config_data = json.load(f)
                
                # Update batch config
                if 'batch' in config_data:
                    for key, value in config_data['batch'].items():
                        if hasattr(batch_config, key):
                            setattr(batch_config, key, value)
                
                # Update generation config
                if 'generation' in config_data:
                    for key, value in config_data['generation'].items():
                        if hasattr(generation_config, key):
                            setattr(generation_config, key, value)
            
            self.batch_generator = BatchQuestionGenerator(
                self.supabase_url,
                self.supabase_key,
                batch_config,
                generation_config
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize batch generator: {e}")
            raise
    
    async def run_scheduled_generation(self) -> Dict[str, Any]:
        """Run scheduled question generation"""
        if self.is_running:
            logger.warning("Generation already running, skipping this cycle")
            return {"status": "skipped", "reason": "already_running"}
        
        self.is_running = True
        start_time = datetime.now()
        
        try:
            logger.info("🚀 Starting scheduled question generation")
            
            # Check if we should run today
            if self.last_run_date and self.last_run_date.date() == start_time.date():
                logger.info("Generation already completed today, skipping")
                return {"status": "skipped", "reason": "already_completed_today"}
            
            # Determine which subject to focus on (rotation)
            if self.config.subjects_rotation:
                current_subject = self.config.subjects_rotation[self.current_subject_index]
                self.current_subject_index = (self.current_subject_index + 1) % len(self.config.subjects_rotation)
                logger.info(f"Focusing on subject: {current_subject}")
            else:
                current_subject = None
                logger.info("Processing all subjects")
            
            # Run generation
            if current_subject:
                result = await self.batch_generator.run_subject_generation(current_subject)
            else:
                result = await self.batch_generator.run_priority_generation(max_topics=20)
            
            # Update tracking
            self.last_run_date = start_time
            
            # Prepare result summary
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            summary = {
                "status": "completed",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "subject_focus": current_subject,
                "topics_processed": result.total_topics_processed,
                "successful_generations": result.successful_generations,
                "failed_generations": result.failed_generations,
                "questions_generated": result.total_questions_generated,
                "average_quality": result.average_quality_score,
                "errors": result.errors[:5]  # Limit error list
            }
            
            logger.info(f"✅ Scheduled generation completed: {summary}")
            
            # Save run summary
            self._save_run_summary(summary)
            
            return summary
            
        except Exception as e:
            error_msg = f"Scheduled generation failed: {e}"
            logger.error(error_msg)
            
            return {
                "status": "failed",
                "error": error_msg,
                "start_time": start_time.isoformat(),
                "end_time": datetime.now().isoformat()
            }
        
        finally:
            self.is_running = False
    
    def _save_run_summary(self, summary: Dict[str, Any]):
        """Save run summary to file"""
        try:
            # Create logs directory
            os.makedirs("logs/generation", exist_ok=True)
            
            # Save daily summary
            date_str = datetime.now().strftime("%Y%m%d")
            summary_file = f"logs/generation/run_summary_{date_str}.json"
            
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2)
            
            logger.debug(f"Run summary saved to {summary_file}")
            
        except Exception as e:
            logger.warning(f"Could not save run summary: {e}")
    
    def setup_schedule(self):
        """Setup generation schedule based on configuration"""
        if not self.config.enabled:
            logger.info("Scheduler is disabled")
            return
        
        # Clear existing schedules
        schedule.clear()
        
        if self.config.frequency == 'daily':
            schedule.every().day.at(self.config.start_time).do(
                lambda: asyncio.run(self.run_scheduled_generation())
            )
            logger.info(f"Scheduled daily generation at {self.config.start_time}")
        
        elif self.config.frequency == 'weekly':
            # Schedule for Sunday at specified time
            schedule.every().sunday.at(self.config.start_time).do(
                lambda: asyncio.run(self.run_scheduled_generation())
            )
            logger.info(f"Scheduled weekly generation on Sunday at {self.config.start_time}")
        
        elif self.config.frequency == 'hourly':
            schedule.every().hour.do(
                lambda: asyncio.run(self.run_scheduled_generation())
            )
            logger.info("Scheduled hourly generation")
        
        else:
            logger.error(f"Unknown frequency: {self.config.frequency}")
    
    def run_scheduler_loop(self):
        """Run the scheduler loop"""
        logger.info("🕐 Question generation scheduler started")
        
        # Setup schedule
        self.setup_schedule()
        
        # Reset daily count at start
        if self.batch_generator:
            self.batch_generator.reset_daily_count()
        
        while True:
            try:
                # Check for scheduled jobs
                schedule.run_pending()
                
                # Check if we need to reset daily count
                current_time = datetime.now()
                if (self.last_run_date and 
                    self.last_run_date.date() < current_time.date() and 
                    self.batch_generator):
                    self.batch_generator.reset_daily_count()
                    logger.info("New day detected, reset daily generation count")
                
                # Sleep for a minute before checking again
                time.sleep(60)
                
            except KeyboardInterrupt:
                logger.info("Scheduler stopped by user")
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    async def run_manual_generation(self, subject: Optional[str] = None, 
                                  max_topics: Optional[int] = None) -> Dict[str, Any]:
        """Run manual generation outside of schedule"""
        logger.info(f"Running manual generation - Subject: {subject}, Max topics: {max_topics}")
        
        try:
            if subject:
                result = await self.batch_generator.run_subject_generation(subject)
            else:
                result = await self.batch_generator.run_priority_generation(max_topics or 10)
            
            summary = {
                "status": "completed",
                "type": "manual",
                "timestamp": datetime.now().isoformat(),
                "subject_filter": subject,
                "max_topics": max_topics,
                "topics_processed": result.total_topics_processed,
                "successful_generations": result.successful_generations,
                "failed_generations": result.failed_generations,
                "questions_generated": result.total_questions_generated,
                "average_quality": result.average_quality_score,
                "errors": result.errors
            }
            
            logger.info(f"Manual generation completed: {summary}")
            return summary
            
        except Exception as e:
            error_msg = f"Manual generation failed: {e}"
            logger.error(error_msg)
            return {"status": "failed", "error": error_msg}
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        next_run = None
        if schedule.jobs:
            next_run = schedule.next_run().isoformat() if schedule.next_run() else None
        
        daily_stats = {}
        if self.batch_generator:
            daily_stats = self.batch_generator.get_daily_stats()
        
        return {
            "enabled": self.config.enabled,
            "frequency": self.config.frequency,
            "start_time": self.config.start_time,
            "is_running": self.is_running,
            "last_run_date": self.last_run_date.isoformat() if self.last_run_date else None,
            "next_run": next_run,
            "current_subject_index": self.current_subject_index,
            "subjects_rotation": self.config.subjects_rotation,
            "daily_stats": daily_stats
        }
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update scheduler configuration"""
        try:
            # Update config object
            for key, value in new_config.items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            
            # Save to file
            os.makedirs(os.path.dirname(self.config.config_file_path), exist_ok=True)
            
            config_data = {
                "scheduler": {
                    "enabled": self.config.enabled,
                    "frequency": self.config.frequency,
                    "start_time": self.config.start_time,
                    "max_runtime_minutes": self.config.max_runtime_minutes,
                    "subjects_rotation": self.config.subjects_rotation
                }
            }
            
            # Merge with existing config if file exists
            if os.path.exists(self.config.config_file_path):
                with open(self.config.config_file_path, 'r') as f:
                    existing_config = json.load(f)
                existing_config.update(config_data)
                config_data = existing_config
            
            with open(self.config.config_file_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            # Reinitialize batch generator with new config
            self._init_batch_generator()
            
            # Update schedule
            self.setup_schedule()
            
            logger.info("Scheduler configuration updated")
            
        except Exception as e:
            logger.error(f"Failed to update scheduler config: {e}")
            raise
