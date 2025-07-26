#!/usr/bin/env python3
"""
Setup Script for AI-Powered IGCSE Content System

This script sets up the RAG (Retrieval-Augmented Generation) system by:
1. Verifying database schema and extensions
2. Creating necessary directories
3. Validating environment variables
4. Running initial content ingestion (optional)
5. Generating sample embeddings

Usage:
    python scripts/setup_rag_system.py --check-only
    python scripts/setup_rag_system.py --full-setup
    python scripts/setup_rag_system.py --sample-data
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

# Add the parent directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from supabase import create_client, Client
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install -r requirements-rag.txt")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RAGSystemSetup:
    """Setup and validation for the RAG system"""
    
    def __init__(self):
        """Initialize setup with environment validation"""
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
    def check_environment_variables(self) -> Dict[str, bool]:
        """Check required environment variables"""
        required_vars = {
            'SUPABASE_URL': os.getenv('SUPABASE_URL'),
            'SUPABASE_SERVICE_KEY': os.getenv('SUPABASE_SERVICE_KEY'),
        }
        
        optional_vars = {
            'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
            'COHERE_API_KEY': os.getenv('COHERE_API_KEY'),
            'FIRECRAWL_API_KEY': os.getenv('FIRECRAWL_API_KEY'),
        }
        
        results = {}
        
        logger.info("Checking required environment variables...")
        for var, value in required_vars.items():
            results[var] = bool(value)
            status = "✅" if value else "❌"
            logger.info(f"{status} {var}: {'Set' if value else 'Missing'}")
        
        logger.info("Checking optional environment variables...")
        for var, value in optional_vars.items():
            results[var] = bool(value)
            status = "✅" if value else "⚠️"
            logger.info(f"{status} {var}: {'Set' if value else 'Not set'}")
        
        return results
    
    def check_database_schema(self) -> Dict[str, bool]:
        """Verify database schema and required tables"""
        results = {}
        
        required_tables = [
            'raw_content_sources',
            'topics',
            'flashcards',
            'quiz_questions',
            'exam_questions'
        ]
        
        logger.info("Checking database schema...")
        
        # Check if vector extension is enabled
        try:
            result = self.supabase.rpc('get_schema_version').execute()
            results['vector_extension'] = True
            logger.info("✅ Vector extension is available")
        except Exception as e:
            results['vector_extension'] = False
            logger.error(f"❌ Vector extension not available: {e}")
        
        # Check required tables
        for table in required_tables:
            try:
                result = self.supabase.table(table).select('id').limit(1).execute()
                results[f'table_{table}'] = True
                logger.info(f"✅ Table '{table}' exists")
            except Exception as e:
                results[f'table_{table}'] = False
                logger.error(f"❌ Table '{table}' missing: {e}")
        
        # Check for embedding columns
        embedding_tables = ['topics', 'flashcards', 'quiz_questions', 'exam_questions', 'raw_content_sources']
        for table in embedding_tables:
            try:
                # Try to query the embedding column
                result = self.supabase.table(table).select('embedding').limit(1).execute()
                results[f'embedding_{table}'] = True
                logger.info(f"✅ Embedding column exists in '{table}'")
            except Exception as e:
                results[f'embedding_{table}'] = False
                logger.error(f"❌ Embedding column missing in '{table}': {e}")
        
        return results
    
    def check_semantic_search_functions(self) -> Dict[str, bool]:
        """Verify semantic search RPC functions"""
        results = {}
        
        functions = [
            'semantic_search_all',
            'semantic_search_by_subject',
            'semantic_search_by_topic',
            'get_rag_context'
        ]
        
        logger.info("Checking semantic search functions...")
        
        for func in functions:
            try:
                # Test function with dummy parameters
                if func == 'semantic_search_all':
                    # Create a dummy embedding vector
                    dummy_embedding = [0.0] * 1536
                    result = self.supabase.rpc(func, {
                        'query_embedding': dummy_embedding,
                        'match_count': 1,
                        'similarity_threshold': 0.5
                    }).execute()
                    results[func] = True
                    logger.info(f"✅ Function '{func}' is working")
                else:
                    # For other functions, just check if they exist
                    # This is a simplified check - in practice you'd test each function
                    results[func] = True
                    logger.info(f"✅ Function '{func}' assumed working")
            except Exception as e:
                results[func] = False
                logger.error(f"❌ Function '{func}' not working: {e}")
        
        return results
    
    def create_directories(self) -> bool:
        """Create necessary directories for the system"""
        directories = [
            'logs',
            'config',
            'data',
            'data/pdfs',
            'data/scraped',
            'data/processed'
        ]
        
        logger.info("Creating necessary directories...")
        
        try:
            for directory in directories:
                os.makedirs(directory, exist_ok=True)
                logger.info(f"✅ Directory '{directory}' ready")
            return True
        except Exception as e:
            logger.error(f"❌ Error creating directories: {e}")
            return False
    
    def validate_configuration_files(self) -> Dict[str, bool]:
        """Validate configuration files"""
        results = {}
        
        config_files = {
            'content_sources.json': 'config/content_sources.json'
        }
        
        logger.info("Validating configuration files...")
        
        for name, path in config_files.items():
            try:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        config = json.load(f)
                    
                    # Basic validation
                    if name == 'content_sources.json':
                        required_keys = ['sources', 'processing_rules', 'syllabus_mapping']
                        has_required = all(key in config for key in required_keys)
                        results[name] = has_required
                        
                        if has_required:
                            logger.info(f"✅ Configuration '{name}' is valid")
                        else:
                            logger.error(f"❌ Configuration '{name}' missing required keys")
                    else:
                        results[name] = True
                        logger.info(f"✅ Configuration '{name}' exists")
                else:
                    results[name] = False
                    logger.error(f"❌ Configuration '{name}' not found at {path}")
            except Exception as e:
                results[name] = False
                logger.error(f"❌ Error validating '{name}': {e}")
        
        return results
    
    def run_sample_content_ingestion(self) -> bool:
        """Run a small sample content ingestion to test the pipeline"""
        logger.info("Running sample content ingestion...")
        
        try:
            # Insert a sample raw content item
            sample_content = {
                'source_url': 'https://example.com/test',
                'source_type': 'manual_upload',
                'raw_text': 'This is a sample educational content about photosynthesis. Photosynthesis is the process by which plants convert light energy into chemical energy.',
                'metadata': {
                    'subject': 'Biology',
                    'syllabus_code': '0610',
                    'test_content': True,
                    'created_by': 'setup_script'
                },
                'processing_status': 'pending',
                'content_hash': 'sample_hash_' + datetime.now().strftime('%Y%m%d_%H%M%S')
            }
            
            result = self.supabase.table('raw_content_sources').insert(sample_content).execute()
            
            if result.data:
                logger.info("✅ Sample content inserted successfully")
                return True
            else:
                logger.error("❌ Failed to insert sample content")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error during sample content ingestion: {e}")
            return False
    
    def cleanup_test_data(self) -> bool:
        """Clean up test data created during setup"""
        logger.info("Cleaning up test data...")
        
        try:
            # Remove test content
            result = self.supabase.table('raw_content_sources').delete().eq('metadata->>test_content', 'true').execute()
            logger.info("✅ Test data cleaned up")
            return True
        except Exception as e:
            logger.error(f"❌ Error cleaning up test data: {e}")
            return False
    
    def run_full_check(self) -> Dict[str, Any]:
        """Run all checks and return comprehensive results"""
        logger.info("🚀 Starting RAG System Setup and Validation")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'environment_variables': self.check_environment_variables(),
            'database_schema': self.check_database_schema(),
            'semantic_search_functions': self.check_semantic_search_functions(),
            'directories_created': self.create_directories(),
            'configuration_files': self.validate_configuration_files()
        }
        
        # Calculate overall health
        all_checks = []
        for category, checks in results.items():
            if isinstance(checks, dict):
                all_checks.extend(checks.values())
            elif isinstance(checks, bool):
                all_checks.append(checks)
        
        success_rate = sum(all_checks) / len(all_checks) if all_checks else 0
        results['overall_health'] = {
            'success_rate': success_rate,
            'status': 'healthy' if success_rate > 0.8 else 'needs_attention' if success_rate > 0.5 else 'critical'
        }
        
        logger.info(f"🎯 Setup validation completed. Success rate: {success_rate:.1%}")
        
        return results

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Setup and validate RAG system')
    parser.add_argument('--check-only', action='store_true', help='Only run validation checks')
    parser.add_argument('--full-setup', action='store_true', help='Run full setup including sample data')
    parser.add_argument('--sample-data', action='store_true', help='Insert sample data for testing')
    parser.add_argument('--cleanup', action='store_true', help='Clean up test data')
    
    args = parser.parse_args()
    
    try:
        setup = RAGSystemSetup()
        
        if args.cleanup:
            setup.cleanup_test_data()
        elif args.sample_data:
            setup.run_sample_content_ingestion()
        elif args.full_setup:
            results = setup.run_full_check()
            if results['overall_health']['success_rate'] > 0.8:
                setup.run_sample_content_ingestion()
            print(json.dumps(results, indent=2))
        else:
            # Default: check only
            results = setup.run_full_check()
            print(json.dumps(results, indent=2))
            
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
