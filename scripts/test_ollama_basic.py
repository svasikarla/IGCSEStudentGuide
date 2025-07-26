#!/usr/bin/env python3
"""
Basic Test Script for Ollama Integration

This script tests the basic functionality of Ollama with your Gemma 3 4B model
before proceeding with the full implementation.

Usage:
    python scripts/test_ollama_basic.py
"""

import os
import sys
import asyncio
import json
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_ollama_connection():
    """Test basic Ollama connection and model availability"""
    print("🔍 Testing Ollama connection...")
    
    try:
        import ollama
        client = ollama.Client(host='http://localhost:11434')
        
        # List available models
        models = client.list()
        available_models = [model['name'] for model in models['models']]
        
        print(f"✅ Ollama is running")
        print(f"📋 Available models: {available_models}")
        
        # Check if Gemma 3 4B is available
        if 'gemma3:4b' in available_models:
            print("✅ Gemma 3 4B model is available")
            return True
        else:
            print("❌ Gemma 3 4B model not found")
            print("💡 Please run: ollama pull gemma3:4b")
            return False
            
    except ImportError:
        print("❌ Ollama Python package not installed")
        print("💡 Please run: pip install ollama")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Ollama: {e}")
        print("💡 Please ensure Ollama is running: ollama serve")
        return False

def test_basic_generation():
    """Test basic text generation"""
    print("\n🧪 Testing basic text generation...")
    
    try:
        import ollama
        client = ollama.Client(host='http://localhost:11434')
        
        # Test simple generation
        response = client.chat(
            model='gemma3:4b',
            messages=[
                {'role': 'user', 'content': 'What is photosynthesis? Explain in exactly 2 sentences.'}
            ]
        )
        
        result = response['message']['content']
        print(f"✅ Basic generation successful")
        print(f"📝 Response: {result[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Basic generation failed: {e}")
        return False

def test_json_generation():
    """Test JSON-formatted generation (critical for our system)"""
    print("\n🧪 Testing JSON generation...")
    
    try:
        import ollama
        client = ollama.Client(host='http://localhost:11434')
        
        prompt = """Create a simple multiple choice question about basic mathematics for Grade 9 students.

Respond with valid JSON only:
{
    "question_text": "Your question here",
    "options": {
        "A": "First option",
        "B": "Second option", 
        "C": "Third option",
        "D": "Fourth option"
    },
    "correct_answer": "A",
    "explanation": "Explanation of why this answer is correct"
}"""
        
        response = client.chat(
            model='gemma3:4b',
            messages=[
                {'role': 'system', 'content': 'You are an expert educator. Respond with valid JSON only.'},
                {'role': 'user', 'content': prompt}
            ]
        )
        
        result = response['message']['content']
        print(f"📝 Raw response: {result}")
        
        # Try to extract and parse JSON
        start_idx = result.find('{')
        end_idx = result.rfind('}') + 1
        
        if start_idx != -1 and end_idx != 0:
            json_content = result[start_idx:end_idx]
            parsed_json = json.loads(json_content)
            
            print(f"✅ JSON generation successful")
            print(f"📋 Question: {parsed_json.get('question_text', 'N/A')}")
            print(f"🎯 Correct Answer: {parsed_json.get('correct_answer', 'N/A')}")
            
            # Validate structure
            required_fields = ['question_text', 'options', 'correct_answer', 'explanation']
            missing_fields = [field for field in required_fields if field not in parsed_json]
            
            if missing_fields:
                print(f"⚠️ Missing fields: {missing_fields}")
                return False
            else:
                print(f"✅ All required fields present")
                return True
        else:
            print(f"❌ No valid JSON found in response")
            return False
            
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        return False
    except Exception as e:
        print(f"❌ JSON generation failed: {e}")
        return False

def test_environment_variables():
    """Test environment variables setup"""
    print("\n🔍 Testing environment variables...")
    
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_KEY'
    ]
    
    optional_vars = [
        'OLLAMA_HOST',
        'OLLAMA_DEFAULT_MODEL',
        'QUESTION_GENERATION_ENABLED'
    ]
    
    all_good = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * 20}")  # Hide sensitive values
        else:
            print(f"❌ {var}: Not set")
            all_good = False
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️ {var}: Not set (using default)")
    
    return all_good

def test_database_connection():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv('.env.local')
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Missing Supabase credentials")
            return False
        
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        
        # Test basic query
        result = supabase.table('subjects').select('id, name').limit(3).execute()
        
        if result.data:
            print(f"✅ Database connection successful")
            print(f"📋 Found {len(result.data)} subjects")
            return True
        else:
            print(f"⚠️ Database connected but no subjects found")
            return True
            
    except ImportError:
        print("❌ Supabase Python package not installed")
        print("💡 Please run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def main():
    """Run all basic tests"""
    print("🚀 Starting Ollama Basic Tests")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Ollama Connection", test_ollama_connection),
        ("Database Connection", test_database_connection),
        ("Basic Generation", test_basic_generation),
        ("JSON Generation", test_json_generation)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 TEST SUMMARY")
    print(f"{'='*50}")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Ready to proceed with full implementation.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements-ollama.txt")
        print("2. Run database schema update in Supabase SQL Editor")
        print("3. Test question generation: python scripts/ollama_question_generator.py status")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Please fix the issues before proceeding.")
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
