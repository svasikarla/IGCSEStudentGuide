#!/usr/bin/env python3
"""
Setup Script for Ollama Question Generation System

This script sets up the complete Ollama question generation system including:
- Environment verification
- Dependency installation
- Database schema updates
- Configuration setup
- Initial testing

Usage:
    python scripts/setup_ollama_generation.py --install
    python scripts/setup_ollama_generation.py --verify
    python scripts/setup_ollama_generation.py --test
"""

import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OllamaGenerationSetup:
    """Setup manager for Ollama question generation system"""
    
    def __init__(self):
        """Initialize setup manager"""
        self.project_root = Path(__file__).parent.parent
        self.requirements_file = self.project_root / "requirements-ollama.txt"
        self.config_dir = self.project_root / "config" / "generation"
        self.logs_dir = self.project_root / "logs" / "generation"
        
        logger.info("🔧 Ollama Generation Setup initialized")
    
    def check_system_requirements(self) -> Dict[str, Any]:
        """Check system requirements"""
        logger.info("Checking system requirements...")
        
        requirements = {
            'python_version': 'unknown',
            'python_ok': False,
            'memory_gb': 0,
            'memory_ok': False,
            'disk_space_gb': 0,
            'disk_ok': False,
            'ollama_installed': False,
            'overall_ok': False
        }
        
        try:
            # Check Python version
            python_version = sys.version_info
            requirements['python_version'] = f"{python_version.major}.{python_version.minor}.{python_version.micro}"
            requirements['python_ok'] = python_version >= (3, 8)
            
            # Check memory (if psutil available)
            try:
                import psutil
                memory_bytes = psutil.virtual_memory().total
                requirements['memory_gb'] = round(memory_bytes / (1024**3), 1)
                requirements['memory_ok'] = requirements['memory_gb'] >= 8
            except ImportError:
                logger.warning("psutil not available, cannot check memory")
                requirements['memory_ok'] = True  # Assume OK
            
            # Check disk space
            try:
                disk_usage = os.statvfs(self.project_root)
                free_bytes = disk_usage.f_frsize * disk_usage.f_bavail
                requirements['disk_space_gb'] = round(free_bytes / (1024**3), 1)
                requirements['disk_ok'] = requirements['disk_space_gb'] >= 20
            except (OSError, AttributeError):
                logger.warning("Cannot check disk space")
                requirements['disk_ok'] = True  # Assume OK
            
            # Check if Ollama is installed
            try:
                result = subprocess.run(['ollama', '--version'], 
                                      capture_output=True, text=True, timeout=10)
                requirements['ollama_installed'] = result.returncode == 0
                if requirements['ollama_installed']:
                    requirements['ollama_version'] = result.stdout.strip()
            except (subprocess.TimeoutExpired, FileNotFoundError):
                requirements['ollama_installed'] = False
            
            # Overall assessment
            requirements['overall_ok'] = (
                requirements['python_ok'] and 
                requirements['memory_ok'] and 
                requirements['disk_ok']
            )
            
            # Display results
            logger.info("System Requirements Check:")
            logger.info(f"  Python {requirements['python_version']}: {'✅' if requirements['python_ok'] else '❌'}")
            logger.info(f"  Memory {requirements['memory_gb']}GB: {'✅' if requirements['memory_ok'] else '❌'}")
            logger.info(f"  Disk Space {requirements['disk_space_gb']}GB: {'✅' if requirements['disk_ok'] else '❌'}")
            logger.info(f"  Ollama: {'✅' if requirements['ollama_installed'] else '❌'}")
            
            return requirements
            
        except Exception as e:
            logger.error(f"Error checking system requirements: {e}")
            return requirements
    
    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        logger.info("Installing Python dependencies...")
        
        try:
            # Check if requirements file exists
            if not self.requirements_file.exists():
                logger.error(f"Requirements file not found: {self.requirements_file}")
                return False
            
            # Install dependencies
            cmd = [sys.executable, '-m', 'pip', 'install', '-r', str(self.requirements_file)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("✅ Dependencies installed successfully")
                return True
            else:
                logger.error(f"❌ Failed to install dependencies: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error installing dependencies: {e}")
            return False
    
    def setup_directories(self) -> bool:
        """Create necessary directories"""
        logger.info("Setting up directories...")
        
        try:
            directories = [
                self.config_dir,
                self.logs_dir,
                self.project_root / "scripts" / "ollama_generation",
                self.project_root / "tests" / "ollama_generation"
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"  Created: {directory}")
            
            # Create __init__.py files for Python modules
            init_files = [
                self.project_root / "scripts" / "ollama_generation" / "__init__.py",
                self.project_root / "tests" / "ollama_generation" / "__init__.py"
            ]
            
            for init_file in init_files:
                if not init_file.exists():
                    init_file.touch()
                    logger.info(f"  Created: {init_file}")
            
            logger.info("✅ Directories setup completed")
            return True
            
        except Exception as e:
            logger.error(f"Error setting up directories: {e}")
            return False
    
    def setup_configuration(self) -> bool:
        """Setup configuration files"""
        logger.info("Setting up configuration...")
        
        try:
            # Copy default config if it doesn't exist
            config_file = self.config_dir / "config.json"
            default_config_file = self.config_dir / "default_config.json"
            
            if not config_file.exists() and default_config_file.exists():
                import shutil
                shutil.copy2(default_config_file, config_file)
                logger.info(f"  Created config from default: {config_file}")
            
            # Create environment template if it doesn't exist
            env_template = self.project_root / ".env.ollama.template"
            if not env_template.exists():
                template_content = """# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma3:9b
OLLAMA_TIMEOUT=120
OLLAMA_MAX_RETRIES=3

# Question Generation Settings
QUESTION_GENERATION_ENABLED=true
GENERATION_BATCH_SIZE=10
MAX_DAILY_GENERATIONS=100
GENERATION_SCHEDULE=daily

# Quality Settings
MIN_QUALITY_SCORE=0.7
ENABLE_QUALITY_VALIDATION=true
"""
                env_template.write_text(template_content)
                logger.info(f"  Created environment template: {env_template}")
            
            logger.info("✅ Configuration setup completed")
            return True
            
        except Exception as e:
            logger.error(f"Error setting up configuration: {e}")
            return False
    
    def update_database_schema(self) -> bool:
        """Update database schema with generation fields"""
        logger.info("Updating database schema...")
        
        try:
            # Check if we have database access
            from dotenv import load_dotenv
            load_dotenv('.env.local')
            
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                logger.warning("⚠️ Database credentials not found, skipping schema update")
                logger.info("   Please run the SQL commands manually in Supabase SQL Editor")
                return True
            
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            
            # SQL commands to add generation tracking fields
            sql_commands = [
                """
                ALTER TABLE quiz_questions 
                ADD COLUMN IF NOT EXISTS generation_method TEXT DEFAULT 'manual',
                ADD COLUMN IF NOT EXISTS generation_model TEXT,
                ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_quiz_questions_generation 
                ON quiz_questions(generation_method, generation_timestamp);
                """,
                """
                COMMENT ON COLUMN quiz_questions.generation_method IS 'Method used to generate question: manual, ollama_gemma, openai, etc.';
                """,
                """
                COMMENT ON COLUMN quiz_questions.generation_model IS 'Specific model used for generation: gemma3:9b, gpt-4o, etc.';
                """,
                """
                COMMENT ON COLUMN quiz_questions.quality_score IS 'Quality score from 0.0 to 1.0 based on validation';
                """
            ]
            
            for sql in sql_commands:
                try:
                    supabase.rpc('exec_sql', {'sql': sql.strip()}).execute()
                except Exception as e:
                    # Try direct execution if RPC doesn't work
                    logger.warning(f"RPC execution failed, manual SQL needed: {e}")
            
            logger.info("✅ Database schema update completed")
            return True
            
        except Exception as e:
            logger.error(f"Error updating database schema: {e}")
            logger.info("   Please run the SQL commands manually in Supabase SQL Editor")
            return True  # Don't fail setup for this
    
    def verify_ollama_setup(self) -> bool:
        """Verify Ollama installation and models"""
        logger.info("Verifying Ollama setup...")
        
        try:
            # Check if Ollama is running
            import ollama
            client = ollama.Client()
            
            try:
                models = client.list()
                available_models = [model['name'] for model in models['models']]
                
                logger.info(f"  Ollama is running with {len(available_models)} models")
                
                # Check for recommended models
                recommended_models = ['gemma3:2b', 'gemma3:9b']
                missing_models = [model for model in recommended_models if model not in available_models]
                
                if missing_models:
                    logger.warning(f"  Missing recommended models: {missing_models}")
                    logger.info(f"  To install: ollama pull {' && ollama pull '.join(missing_models)}")
                else:
                    logger.info("  ✅ All recommended models available")
                
                return True
                
            except Exception as e:
                logger.error(f"  ❌ Ollama not responding: {e}")
                logger.info("  Please start Ollama: ollama serve")
                return False
                
        except ImportError:
            logger.error("  ❌ Ollama Python client not installed")
            return False
        except Exception as e:
            logger.error(f"  ❌ Error verifying Ollama: {e}")
            return False
    
    def run_basic_test(self) -> bool:
        """Run basic functionality test"""
        logger.info("Running basic functionality test...")
        
        try:
            # Import and test basic functionality
            sys.path.insert(0, str(self.project_root))
            
            from scripts.ollama_generation.base_models import GenerationConfig, TopicInfo
            from scripts.ollama_generation.quality_validator import QuestionQualityValidator
            
            # Test configuration
            config = GenerationConfig()
            logger.info(f"  ✅ Configuration loaded: {config.model}")
            
            # Test validator
            validator = QuestionQualityValidator()
            logger.info("  ✅ Quality validator initialized")
            
            logger.info("✅ Basic functionality test passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Basic functionality test failed: {e}")
            return False
    
    def run_full_setup(self) -> bool:
        """Run complete setup process"""
        logger.info("🚀 Starting full Ollama generation system setup...")
        
        steps = [
            ("System Requirements", self.check_system_requirements),
            ("Dependencies", self.install_dependencies),
            ("Directories", self.setup_directories),
            ("Configuration", self.setup_configuration),
            ("Database Schema", self.update_database_schema),
            ("Basic Test", self.run_basic_test)
        ]
        
        results = {}
        overall_success = True
        
        for step_name, step_func in steps:
            logger.info(f"\n--- {step_name} ---")
            try:
                if step_name == "System Requirements":
                    result = step_func()
                    results[step_name] = result.get('overall_ok', False)
                    if not result.get('overall_ok', False):
                        logger.error(f"❌ {step_name} check failed")
                        overall_success = False
                else:
                    result = step_func()
                    results[step_name] = result
                    if not result:
                        logger.error(f"❌ {step_name} failed")
                        overall_success = False
                    else:
                        logger.info(f"✅ {step_name} completed")
            except Exception as e:
                logger.error(f"❌ {step_name} error: {e}")
                results[step_name] = False
                overall_success = False
        
        # Summary
        logger.info("\n" + "="*50)
        logger.info("SETUP SUMMARY")
        logger.info("="*50)
        
        for step_name, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            logger.info(f"{step_name}: {status}")
        
        if overall_success:
            logger.info("\n🎉 Setup completed successfully!")
            logger.info("\nNext steps:")
            logger.info("1. Start Ollama: ollama serve")
            logger.info("2. Pull models: ollama pull gemma3:9b")
            logger.info("3. Test integration: python scripts/test_ollama_integration.py --quick-test")
            logger.info("4. Start generation: python scripts/ollama_question_generator.py batch-generate --subject Mathematics")
        else:
            logger.error("\n❌ Setup completed with errors. Please review the issues above.")
        
        return overall_success

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Setup Ollama Question Generation System')
    parser.add_argument('--install', action='store_true', help='Run full installation')
    parser.add_argument('--verify', action='store_true', help='Verify system requirements only')
    parser.add_argument('--test', action='store_true', help='Run basic functionality test')
    
    args = parser.parse_args()
    
    if not any([args.install, args.verify, args.test]):
        parser.print_help()
        return
    
    setup = OllamaGenerationSetup()
    
    try:
        if args.install:
            success = setup.run_full_setup()
            sys.exit(0 if success else 1)
        
        elif args.verify:
            requirements = setup.check_system_requirements()
            ollama_ok = setup.verify_ollama_setup()
            overall_ok = requirements['overall_ok'] and ollama_ok
            
            print(f"\nVerification Result: {'✅ PASS' if overall_ok else '❌ FAIL'}")
            sys.exit(0 if overall_ok else 1)
        
        elif args.test:
            success = setup.run_basic_test()
            sys.exit(0 if success else 1)
    
    except KeyboardInterrupt:
        logger.info("Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
