#!/usr/bin/env python3
"""
Integration Test Script for Ollama Question Generation

This script tests the complete integration of the Ollama question generation system
with real Ollama and database connections. Use this to verify the system works
end-to-end before deploying to production.

Usage:
    python scripts/test_ollama_integration.py --full-test
    python scripts/test_ollama_integration.py --quick-test
    python scripts/test_ollama_integration.py --test-topic <topic-id>
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from scripts.ollama_generation.core_generator import OllamaQuestionGenerator
from scripts.ollama_generation.batch_generator import BatchQuestionGenerator
from scripts.ollama_generation.quality_validator import QuestionQualityValidator
from scripts.ollama_generation.base_models import GenerationConfig
from scripts.ollama_generation.logging_config import setup_logging

# Load environment
load_dotenv('.env.local')
logger = setup_logging()

class OllamaIntegrationTester:
    """Integration tester for Ollama question generation system"""
    
    def __init__(self):
        """Initialize integration tester"""
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing required environment variables")
        
        self.test_results = {
            'timestamp': datetime.now().isoformat(),
            'tests': {},
            'overall_status': 'unknown'
        }
        
        logger.info("🧪 Ollama Integration Tester initialized")
    
    async def test_system_connectivity(self) -> Dict[str, Any]:
        """Test basic system connectivity"""
        logger.info("Testing system connectivity...")
        
        test_result = {
            'name': 'system_connectivity',
            'status': 'unknown',
            'details': {}
        }
        
        try:
            # Test Ollama connection
            try:
                import ollama
                client = ollama.Client(host=self.ollama_host)
                models = client.list()
                
                test_result['details']['ollama'] = {
                    'status': 'connected',
                    'available_models': [model['name'] for model in models['models']],
                    'model_count': len(models['models'])
                }
                
                # Check for required models
                model_names = [model['name'] for model in models['models']]
                required_models = ['gemma3:2b', 'gemma3:9b']
                missing_models = [model for model in required_models if model not in model_names]
                
                if missing_models:
                    test_result['details']['ollama']['missing_models'] = missing_models
                    test_result['details']['ollama']['warning'] = f"Missing recommended models: {missing_models}"
                
            except Exception as e:
                test_result['details']['ollama'] = {
                    'status': 'error',
                    'error': str(e)
                }
            
            # Test database connection
            try:
                from supabase import create_client
                supabase = create_client(self.supabase_url, self.supabase_key)
                
                # Test basic query
                result = supabase.table('subjects').select('id, name').limit(3).execute()
                
                test_result['details']['database'] = {
                    'status': 'connected',
                    'sample_subjects': len(result.data) if result.data else 0
                }
                
                # Test helper functions
                try:
                    counts_result = supabase.rpc('get_topic_question_counts').limit(5).execute()
                    test_result['details']['database']['helper_functions'] = 'working'
                    test_result['details']['database']['sample_topics'] = len(counts_result.data) if counts_result.data else 0
                except Exception as e:
                    test_result['details']['database']['helper_functions'] = f'error: {e}'
                
            except Exception as e:
                test_result['details']['database'] = {
                    'status': 'error',
                    'error': str(e)
                }
            
            # Determine overall status
            ollama_ok = test_result['details']['ollama']['status'] == 'connected'
            db_ok = test_result['details']['database']['status'] == 'connected'
            
            if ollama_ok and db_ok:
                test_result['status'] = 'passed'
            else:
                test_result['status'] = 'failed'
            
            logger.info(f"Connectivity test: {test_result['status']}")
            return test_result
            
        except Exception as e:
            test_result['status'] = 'error'
            test_result['error'] = str(e)
            logger.error(f"Connectivity test error: {e}")
            return test_result
    
    async def test_single_question_generation(self, topic_id: Optional[str] = None) -> Dict[str, Any]:
        """Test generation of a single quiz question"""
        logger.info("Testing single question generation...")
        
        test_result = {
            'name': 'single_question_generation',
            'status': 'unknown',
            'details': {}
        }
        
        try:
            # Initialize generator
            config = GenerationConfig(model='gemma3:9b')
            generator = OllamaQuestionGenerator(
                self.supabase_url, 
                self.supabase_key, 
                self.ollama_host, 
                config
            )
            
            # Get a test topic
            if not topic_id:
                # Find a topic to test with
                from supabase import create_client
                supabase = create_client(self.supabase_url, self.supabase_key)
                result = supabase.table('topics').select('id, title, subjects(name)').limit(1).execute()
                
                if not result.data:
                    raise Exception("No topics found in database")
                
                topic_id = result.data[0]['id']
                test_result['details']['test_topic'] = {
                    'id': topic_id,
                    'title': result.data[0]['title'],
                    'subject': result.data[0]['subjects']['name']
                }
            
            # Get topic info
            topic_info = await generator.get_topic_info(topic_id)
            if not topic_info:
                raise Exception(f"Could not retrieve topic info for {topic_id}")
            
            test_result['details']['topic_info'] = {
                'title': topic_info.title,
                'subject': topic_info.subject_name,
                'difficulty': topic_info.difficulty_level
            }
            
            # Generate questions
            start_time = datetime.now()
            questions = await generator.generate_quiz_questions(topic_info, 2)
            generation_time = (datetime.now() - start_time).total_seconds()
            
            test_result['details']['generation'] = {
                'requested_count': 2,
                'generated_count': len(questions),
                'generation_time_seconds': generation_time
            }
            
            if not questions:
                test_result['status'] = 'failed'
                test_result['details']['error'] = 'No questions generated'
                return test_result
            
            # Validate questions
            validator = QuestionQualityValidator()
            validation_results = []
            
            for i, question in enumerate(questions):
                validation = validator.validate_quiz_question(question)
                validation_results.append({
                    'question_index': i,
                    'is_valid': validation.is_valid,
                    'quality_score': validation.quality_score,
                    'issue_count': len(validation.issues),
                    'has_errors': validation.has_errors
                })
            
            test_result['details']['validation'] = {
                'total_questions': len(questions),
                'valid_questions': sum(1 for v in validation_results if v['is_valid']),
                'average_quality': sum(v['quality_score'] for v in validation_results) / len(validation_results),
                'results': validation_results
            }
            
            # Test database saving (optional - creates test data)
            if len(questions) > 0 and all(v['is_valid'] for v in validation_results):
                try:
                    # Add quality scores to questions
                    for i, question in enumerate(questions):
                        question.quality_score = validation_results[i]['quality_score']
                    
                    quiz_id = await generator.save_quiz_to_database(topic_info, questions)
                    test_result['details']['database_save'] = {
                        'success': quiz_id is not None,
                        'quiz_id': quiz_id
                    }
                except Exception as e:
                    test_result['details']['database_save'] = {
                        'success': False,
                        'error': str(e)
                    }
            
            # Determine test status
            if (len(questions) > 0 and 
                all(v['is_valid'] for v in validation_results) and
                test_result['details']['validation']['average_quality'] > 0.6):
                test_result['status'] = 'passed'
            else:
                test_result['status'] = 'failed'
            
            logger.info(f"Single question generation test: {test_result['status']}")
            return test_result
            
        except Exception as e:
            test_result['status'] = 'error'
            test_result['error'] = str(e)
            logger.error(f"Single question generation test error: {e}")
            return test_result
    
    async def test_exam_paper_generation(self, topic_id: Optional[str] = None) -> Dict[str, Any]:
        """Test generation of an exam paper"""
        logger.info("Testing exam paper generation...")
        
        test_result = {
            'name': 'exam_paper_generation',
            'status': 'unknown',
            'details': {}
        }
        
        try:
            # Initialize generator
            config = GenerationConfig(model='gemma3:9b')
            generator = OllamaQuestionGenerator(
                self.supabase_url, 
                self.supabase_key, 
                self.ollama_host, 
                config
            )
            
            # Get topic (reuse from previous test if available)
            if not topic_id:
                from supabase import create_client
                supabase = create_client(self.supabase_url, self.supabase_key)
                result = supabase.table('topics').select('id, title, subjects(name)').limit(1).execute()
                
                if not result.data:
                    raise Exception("No topics found in database")
                
                topic_id = result.data[0]['id']
            
            # Get topic info
            topic_info = await generator.get_topic_info(topic_id)
            if not topic_info:
                raise Exception(f"Could not retrieve topic info for {topic_id}")
            
            # Generate exam paper
            start_time = datetime.now()
            exam_paper = await generator.generate_exam_paper(topic_info, 20)  # 20 marks for faster testing
            generation_time = (datetime.now() - start_time).total_seconds()
            
            test_result['details']['generation'] = {
                'target_marks': 20,
                'generation_time_seconds': generation_time,
                'success': exam_paper is not None
            }
            
            if not exam_paper:
                test_result['status'] = 'failed'
                test_result['details']['error'] = 'No exam paper generated'
                return test_result
            
            test_result['details']['exam_paper'] = {
                'title': exam_paper.title,
                'total_marks': exam_paper.total_marks,
                'duration_minutes': exam_paper.duration_minutes,
                'question_count': len(exam_paper.questions),
                'questions': [
                    {
                        'order': q.question_order,
                        'marks': q.marks,
                        'type': q.question_type
                    } for q in exam_paper.questions
                ]
            }
            
            # Validate exam paper
            validator = QuestionQualityValidator()
            validation = validator.validate_exam_paper(exam_paper)
            
            test_result['details']['validation'] = {
                'is_valid': validation.is_valid,
                'quality_score': validation.quality_score,
                'issue_count': len(validation.issues),
                'has_errors': validation.has_errors,
                'has_critical_issues': validation.has_critical_issues
            }
            
            # Determine test status
            if validation.is_valid and validation.quality_score > 0.6:
                test_result['status'] = 'passed'
            else:
                test_result['status'] = 'failed'
            
            logger.info(f"Exam paper generation test: {test_result['status']}")
            return test_result
            
        except Exception as e:
            test_result['status'] = 'error'
            test_result['error'] = str(e)
            logger.error(f"Exam paper generation test error: {e}")
            return test_result
    
    async def test_batch_generation(self) -> Dict[str, Any]:
        """Test batch generation functionality"""
        logger.info("Testing batch generation...")
        
        test_result = {
            'name': 'batch_generation',
            'status': 'unknown',
            'details': {}
        }
        
        try:
            # Initialize batch generator
            batch_generator = BatchQuestionGenerator(self.supabase_url, self.supabase_key)
            
            # Run a small batch generation test
            start_time = datetime.now()
            result = await batch_generator.run_priority_generation(max_topics=2)
            generation_time = (datetime.now() - start_time).total_seconds()
            
            test_result['details']['batch_result'] = {
                'topics_processed': result.total_topics_processed,
                'successful_generations': result.successful_generations,
                'failed_generations': result.failed_generations,
                'questions_generated': result.total_questions_generated,
                'average_quality': result.average_quality_score,
                'processing_time_seconds': generation_time,
                'error_count': len(result.errors)
            }
            
            # Determine test status
            if result.successful_generations > 0 and result.total_questions_generated > 0:
                test_result['status'] = 'passed'
            elif result.total_topics_processed == 0:
                test_result['status'] = 'skipped'
                test_result['details']['reason'] = 'No topics needed generation'
            else:
                test_result['status'] = 'failed'
            
            logger.info(f"Batch generation test: {test_result['status']}")
            return test_result
            
        except Exception as e:
            test_result['status'] = 'error'
            test_result['error'] = str(e)
            logger.error(f"Batch generation test error: {e}")
            return test_result
    
    async def run_full_test_suite(self, test_topic_id: Optional[str] = None) -> Dict[str, Any]:
        """Run the complete integration test suite"""
        logger.info("🚀 Starting full integration test suite...")
        
        # Run all tests
        tests = [
            self.test_system_connectivity(),
            self.test_single_question_generation(test_topic_id),
            self.test_exam_paper_generation(test_topic_id),
            self.test_batch_generation()
        ]
        
        results = await asyncio.gather(*tests, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                test_name = ['connectivity', 'single_question', 'exam_paper', 'batch'][i]
                self.test_results['tests'][test_name] = {
                    'status': 'error',
                    'error': str(result)
                }
            else:
                self.test_results['tests'][result['name']] = result
        
        # Determine overall status
        statuses = [test.get('status', 'error') for test in self.test_results['tests'].values()]
        
        if all(status == 'passed' for status in statuses):
            self.test_results['overall_status'] = 'passed'
        elif any(status == 'passed' for status in statuses):
            self.test_results['overall_status'] = 'partial'
        else:
            self.test_results['overall_status'] = 'failed'
        
        # Generate summary
        self.test_results['summary'] = {
            'total_tests': len(self.test_results['tests']),
            'passed': sum(1 for status in statuses if status == 'passed'),
            'failed': sum(1 for status in statuses if status == 'failed'),
            'errors': sum(1 for status in statuses if status == 'error'),
            'skipped': sum(1 for status in statuses if status == 'skipped')
        }
        
        logger.info(f"✅ Integration test suite completed: {self.test_results['overall_status']}")
        return self.test_results
    
    async def run_quick_test(self, test_topic_id: Optional[str] = None) -> Dict[str, Any]:
        """Run a quick connectivity and basic generation test"""
        logger.info("🏃 Running quick integration test...")
        
        # Run essential tests only
        connectivity_result = await self.test_system_connectivity()
        self.test_results['tests']['connectivity'] = connectivity_result
        
        if connectivity_result['status'] == 'passed':
            generation_result = await self.test_single_question_generation(test_topic_id)
            self.test_results['tests']['single_question'] = generation_result
            
            if generation_result['status'] == 'passed':
                self.test_results['overall_status'] = 'passed'
            else:
                self.test_results['overall_status'] = 'partial'
        else:
            self.test_results['overall_status'] = 'failed'
        
        logger.info(f"Quick test completed: {self.test_results['overall_status']}")
        return self.test_results
    
    def save_test_results(self, filename: Optional[str] = None):
        """Save test results to file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"logs/generation/integration_test_{timestamp}.json"
        
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        logger.info(f"Test results saved to: {filename}")

async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Ollama Integration Tester')
    parser.add_argument('--full-test', action='store_true', help='Run full test suite')
    parser.add_argument('--quick-test', action='store_true', help='Run quick test')
    parser.add_argument('--test-topic', help='Specific topic ID to test with')
    parser.add_argument('--save-results', help='Save results to specific file')
    
    args = parser.parse_args()
    
    if not args.full_test and not args.quick_test:
        parser.print_help()
        return
    
    try:
        tester = OllamaIntegrationTester()
        
        if args.full_test:
            results = await tester.run_full_test_suite(args.test_topic)
        else:
            results = await tester.run_quick_test(args.test_topic)
        
        # Display results
        print("\n" + "="*60)
        print("INTEGRATION TEST RESULTS")
        print("="*60)
        print(f"Overall Status: {results['overall_status'].upper()}")
        print(f"Timestamp: {results['timestamp']}")
        
        if 'summary' in results:
            summary = results['summary']
            print(f"\nSummary:")
            print(f"  Total Tests: {summary['total_tests']}")
            print(f"  Passed: {summary['passed']}")
            print(f"  Failed: {summary['failed']}")
            print(f"  Errors: {summary['errors']}")
            print(f"  Skipped: {summary['skipped']}")
        
        print(f"\nDetailed Results:")
        for test_name, test_result in results['tests'].items():
            status = test_result.get('status', 'unknown')
            print(f"  {test_name}: {status.upper()}")
            if status == 'error' and 'error' in test_result:
                print(f"    Error: {test_result['error']}")
        
        # Save results
        if args.save_results:
            tester.save_test_results(args.save_results)
        else:
            tester.save_test_results()
        
        # Exit with appropriate code
        if results['overall_status'] == 'passed':
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
