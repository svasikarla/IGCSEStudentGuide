#!/usr/bin/env python3
"""
Pytest configuration and fixtures for Ollama generation tests
"""

import pytest
import os
import sys
from unittest.mock import Mock, AsyncMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

@pytest.fixture(scope="session")
def test_config():
    """Test configuration"""
    return {
        "supabase_url": "https://test.supabase.co",
        "supabase_key": "test_key",
        "ollama_host": "http://localhost:11434",
        "test_topic_id": "test-topic-123",
        "test_subject": "Mathematics"
    }

@pytest.fixture
def mock_environment(monkeypatch):
    """Mock environment variables"""
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "test_service_key")
    monkeypatch.setenv("OLLAMA_HOST", "http://localhost:11434")
    monkeypatch.setenv("OLLAMA_DEFAULT_MODEL", "gemma3:9b")

@pytest.fixture
def sample_ollama_response():
    """Sample Ollama response for testing"""
    return {
        'message': {
            'content': '''
            {
                "questions": [
                    {
                        "question_text": "What is the quadratic formula?",
                        "question_type": "multiple_choice",
                        "options": {
                            "A": "x = (-b ± √(b²-4ac)) / 2a",
                            "B": "x = (-b ± √(b²+4ac)) / 2a", 
                            "C": "x = (b ± √(b²-4ac)) / 2a",
                            "D": "x = (-b ± √(b²-4ac)) / a"
                        },
                        "correct_answer": "A",
                        "explanation": "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a, which is used to solve quadratic equations of the form ax² + bx + c = 0.",
                        "difficulty_level": 3,
                        "points": 1,
                        "tags": ["quadratic", "formula", "algebra"]
                    }
                ]
            }
            '''
        }
    }

@pytest.fixture
def sample_exam_response():
    """Sample exam paper response for testing"""
    return {
        'message': {
            'content': '''
            {
                "title": "IGCSE Mathematics: Quadratic Equations",
                "instructions": "Answer ALL questions. Show all working clearly.",
                "duration_minutes": 60,
                "total_marks": 20,
                "questions": [
                    {
                        "question_text": "Solve the quadratic equation x² - 5x + 6 = 0 using factorization. Show all steps clearly.",
                        "marks": 4,
                        "answer_text": "x² - 5x + 6 = 0. Factoring: (x - 2)(x - 3) = 0. Therefore x = 2 or x = 3.",
                        "explanation": "Students should show factorization steps and identify both solutions.",
                        "question_order": 1,
                        "question_type": "structured"
                    },
                    {
                        "question_text": "A ball is thrown upward with initial velocity 20 m/s. Its height h(t) = -5t² + 20t + 1. Find when the ball hits the ground.",
                        "marks": 6,
                        "answer_text": "Set h(t) = 0: -5t² + 20t + 1 = 0. Using quadratic formula: t = (-20 ± √(400+20))/(-10) = (-20 ± √420)/(-10). t ≈ 4.05 seconds (taking positive value).",
                        "explanation": "Students should set up equation correctly, apply quadratic formula, and interpret the physical meaning.",
                        "question_order": 2,
                        "question_type": "application"
                    }
                ]
            }
            '''
        }
    }

# Pytest markers for different test types
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test (requires external services)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Add unit marker to all tests by default
        if not any(marker.name in ['integration', 'slow'] for marker in item.iter_markers()):
            item.add_marker(pytest.mark.unit)
