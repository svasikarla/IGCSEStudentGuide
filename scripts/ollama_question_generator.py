#!/usr/bin/env python3
"""
Ollama Question Generator - Main CLI Interface

This is the main command-line interface for the Ollama + Gemma question generation system.
It provides commands for generating questions, managing schedules, and monitoring the system.

Usage Examples:
    # Generate quiz questions for a specific topic
    python scripts/ollama_question_generator.py generate-quiz --topic-id <uuid> --count 10
    
    # Generate exam paper for a topic
    python scripts/ollama_question_generator.py generate-exam --topic-id <uuid> --marks 50
    
    # Batch generate for all topics in a subject
    python scripts/ollama_question_generator.py batch-generate --subject Mathematics --count 10
    
    # Start the scheduler
    python scripts/ollama_question_generator.py scheduler --start --frequency daily
    
    # Check system status
    python scripts/ollama_question_generator.py status
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Import our modules
from scripts.ollama_generation.core_generator import OllamaQuestionGenerator
from scripts.ollama_generation.batch_generator import BatchQuestionGenerator
from scripts.ollama_generation.scheduler import QuestionGenerationScheduler
from scripts.ollama_generation.quality_validator import QuestionQualityValidator
from scripts.ollama_generation.base_models import GenerationConfig
from scripts.ollama_generation.logging_config import setup_logging

# Load environment variables
load_dotenv('.env.local')

# Setup logging
logger = setup_logging()

class OllamaQuestionGeneratorCLI:
    """Main CLI class for Ollama question generation"""
    
    def __init__(self):
        """Initialize CLI"""
        # Load environment variables
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        
        if not self.supabase_url or not self.supabase_key:
            logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY")
            sys.exit(1)
        
        # Create logs directory
        os.makedirs('logs/generation', exist_ok=True)
        
        logger.info("🚀 Ollama Question Generator CLI initialized")
    
    async def generate_quiz(self, topic_id: str, count: int = 10, model: str = 'gemma3:4b') -> bool:
        """Generate quiz questions for a specific topic"""
        try:
            logger.info(f"Generating {count} quiz questions for topic: {topic_id}")
            
            # Initialize generator
            config = GenerationConfig(model=model)
            generator = OllamaQuestionGenerator(self.supabase_url, self.supabase_key, self.ollama_host, config)
            
            # Get topic info
            topic_info = await generator.get_topic_info(topic_id)
            if not topic_info:
                logger.error(f"Topic {topic_id} not found")
                return False
            
            # Generate questions
            questions = await generator.generate_quiz_questions(topic_info, count)
            if not questions:
                logger.error("Failed to generate questions")
                return False
            
            # Validate questions
            validator = QuestionQualityValidator()
            valid_questions = []
            
            for i, question in enumerate(questions):
                result = validator.validate_quiz_question(question)
                if result.is_valid:
                    question.quality_score = result.quality_score
                    valid_questions.append(question)
                    logger.info(f"Question {i+1}: Valid (Quality: {result.quality_score:.2f})")
                else:
                    logger.warning(f"Question {i+1}: Invalid - {[issue.message for issue in result.issues]}")
            
            if not valid_questions:
                logger.error("No valid questions generated")
                return False
            
            # Save to database
            quiz_id = await generator.save_quiz_to_database(topic_info, valid_questions)
            if quiz_id:
                logger.info(f"✅ Successfully saved quiz {quiz_id} with {len(valid_questions)} questions")
                return True
            else:
                logger.error("Failed to save quiz to database")
                return False
                
        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return False
    
    async def generate_exam(self, topic_id: str, marks: int = 50, model: str = 'gemma3:4b') -> bool:
        """Generate exam paper for a specific topic"""
        try:
            logger.info(f"Generating exam paper for topic: {topic_id} ({marks} marks)")
            
            # Initialize generator
            config = GenerationConfig(model=model)
            generator = OllamaQuestionGenerator(self.supabase_url, self.supabase_key, self.ollama_host, config)
            
            # Get topic info
            topic_info = await generator.get_topic_info(topic_id)
            if not topic_info:
                logger.error(f"Topic {topic_id} not found")
                return False
            
            # Generate exam paper
            exam_paper = await generator.generate_exam_paper(topic_info, marks)
            if not exam_paper:
                logger.error("Failed to generate exam paper")
                return False
            
            # Validate exam paper
            validator = QuestionQualityValidator()
            result = validator.validate_exam_paper(exam_paper)
            
            if not result.is_valid:
                logger.warning(f"Exam paper validation issues: {[issue.message for issue in result.issues]}")
                if result.has_critical_issues:
                    logger.error("Exam paper has critical issues, not saving")
                    return False
            
            logger.info(f"Exam paper quality score: {result.quality_score:.2f}")
            
            # Save to database
            paper_id = await generator.save_exam_paper_to_database(exam_paper)
            if paper_id:
                logger.info(f"✅ Successfully saved exam paper {paper_id}")
                return True
            else:
                logger.error("Failed to save exam paper to database")
                return False
                
        except Exception as e:
            logger.error(f"Error generating exam paper: {e}")
            return False
    
    async def batch_generate(self, subject: Optional[str] = None, count: int = 10, 
                           max_topics: Optional[int] = None) -> bool:
        """Run batch generation"""
        try:
            logger.info(f"Starting batch generation - Subject: {subject}, Count per topic: {count}")
            
            # Initialize batch generator
            batch_generator = BatchQuestionGenerator(self.supabase_url, self.supabase_key)
            
            # Run generation
            if subject:
                result = await batch_generator.run_subject_generation(subject)
            else:
                result = await batch_generator.run_priority_generation(max_topics or 10)
            
            # Display results
            logger.info(f"Batch generation results:")
            logger.info(f"  Topics processed: {result.total_topics_processed}")
            logger.info(f"  Successful: {result.successful_generations}")
            logger.info(f"  Failed: {result.failed_generations}")
            logger.info(f"  Questions generated: {result.total_questions_generated}")
            logger.info(f"  Average quality: {result.average_quality_score:.2f}")
            logger.info(f"  Processing time: {result.processing_time_seconds:.1f}s")
            
            if result.errors:
                logger.warning(f"Errors encountered: {result.errors[:3]}")
            
            return result.successful_generations > 0
            
        except Exception as e:
            logger.error(f"Error in batch generation: {e}")
            return False
    
    async def check_status(self) -> Dict[str, Any]:
        """Check system status"""
        try:
            status = {
                "timestamp": datetime.now().isoformat(),
                "ollama_status": "unknown",
                "database_status": "unknown",
                "available_models": [],
                "topic_counts": {}
            }
            
            # Check Ollama status
            try:
                import ollama
                client = ollama.Client(host=self.ollama_host)
                models = client.list()
                status["ollama_status"] = "healthy"
                status["available_models"] = [model['name'] for model in models['models']]
            except Exception as e:
                status["ollama_status"] = f"error: {e}"
            
            # Check database status
            try:
                from supabase import create_client
                supabase = create_client(self.supabase_url, self.supabase_key)
                result = supabase.rpc('get_topic_question_counts').limit(5).execute()
                status["database_status"] = "healthy"
                status["sample_topics"] = len(result.data) if result.data else 0
            except Exception as e:
                status["database_status"] = f"error: {e}"
            
            # Display status
            logger.info("=== System Status ===")
            logger.info(f"Ollama: {status['ollama_status']}")
            logger.info(f"Database: {status['database_status']}")
            logger.info(f"Available models: {status['available_models']}")
            
            return status
            
        except Exception as e:
            logger.error(f"Error checking status: {e}")
            return {"error": str(e)}
    
    def start_scheduler(self, frequency: str = 'daily', start_time: str = '02:00'):
        """Start the question generation scheduler"""
        try:
            logger.info(f"Starting scheduler - Frequency: {frequency}, Start time: {start_time}")
            
            from scripts.ollama_generation.scheduler import QuestionGenerationScheduler, SchedulerConfig
            
            # Create scheduler config
            config = SchedulerConfig(
                enabled=True,
                frequency=frequency,
                start_time=start_time
            )
            
            # Initialize and start scheduler
            scheduler = QuestionGenerationScheduler(self.supabase_url, self.supabase_key, config)
            scheduler.run_scheduler_loop()
            
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
    
    async def run_manual_scheduler(self, subject: Optional[str] = None, max_topics: Optional[int] = None):
        """Run scheduler manually once"""
        try:
            from scripts.ollama_generation.scheduler import QuestionGenerationScheduler
            
            scheduler = QuestionGenerationScheduler(self.supabase_url, self.supabase_key)
            result = await scheduler.run_manual_generation(subject, max_topics)
            
            logger.info(f"Manual scheduler result: {result}")
            return result.get('status') == 'completed'
            
        except Exception as e:
            logger.error(f"Manual scheduler error: {e}")
            return False

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description='Ollama + Gemma Question Generator for IGCSE Study Guide',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Generate quiz command
    quiz_parser = subparsers.add_parser('generate-quiz', help='Generate quiz questions for a topic')
    quiz_parser.add_argument('--topic-id', required=True, help='Topic ID (UUID)')
    quiz_parser.add_argument('--count', type=int, default=10, help='Number of questions to generate')
    quiz_parser.add_argument('--model', default='gemma3:4b', help='Ollama model to use')
    
    # Generate exam command
    exam_parser = subparsers.add_parser('generate-exam', help='Generate exam paper for a topic')
    exam_parser.add_argument('--topic-id', required=True, help='Topic ID (UUID)')
    exam_parser.add_argument('--marks', type=int, default=50, help='Total marks for exam paper')
    exam_parser.add_argument('--model', default='gemma3:4b', help='Ollama model to use')
    
    # Batch generate command
    batch_parser = subparsers.add_parser('batch-generate', help='Batch generate questions')
    batch_parser.add_argument('--subject', help='Subject name to focus on')
    batch_parser.add_argument('--count', type=int, default=10, help='Questions per topic')
    batch_parser.add_argument('--max-topics', type=int, help='Maximum topics to process')
    
    # Scheduler commands
    scheduler_parser = subparsers.add_parser('scheduler', help='Manage question generation scheduler')
    scheduler_parser.add_argument('--start', action='store_true', help='Start the scheduler')
    scheduler_parser.add_argument('--run-once', action='store_true', help='Run scheduler once manually')
    scheduler_parser.add_argument('--frequency', choices=['daily', 'weekly', 'hourly'], default='daily')
    scheduler_parser.add_argument('--start-time', default='02:00', help='Start time (HH:MM)')
    scheduler_parser.add_argument('--subject', help='Subject filter for manual run')
    scheduler_parser.add_argument('--max-topics', type=int, help='Max topics for manual run')
    
    # Status command
    subparsers.add_parser('status', help='Check system status')
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize CLI
    cli = OllamaQuestionGeneratorCLI()
    
    # Execute command
    try:
        if args.command == 'generate-quiz':
            success = asyncio.run(cli.generate_quiz(args.topic_id, args.count, args.model))
            sys.exit(0 if success else 1)
        
        elif args.command == 'generate-exam':
            success = asyncio.run(cli.generate_exam(args.topic_id, args.marks, args.model))
            sys.exit(0 if success else 1)
        
        elif args.command == 'batch-generate':
            success = asyncio.run(cli.batch_generate(args.subject, args.count, args.max_topics))
            sys.exit(0 if success else 1)
        
        elif args.command == 'scheduler':
            if args.start:
                cli.start_scheduler(args.frequency, args.start_time)
            elif args.run_once:
                success = asyncio.run(cli.run_manual_scheduler(args.subject, args.max_topics))
                sys.exit(0 if success else 1)
            else:
                scheduler_parser.print_help()
        
        elif args.command == 'status':
            status = asyncio.run(cli.check_status())
            print(json.dumps(status, indent=2))
        
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
