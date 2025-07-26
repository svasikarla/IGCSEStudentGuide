#!/usr/bin/env python3
"""
AI Content Processing Engine for IGCSE Educational Resources

This script processes raw content from the staging table using LLM APIs to generate
structured educational content (topics, flashcards, questions) and creates vector
embeddings for semantic search.

Usage:
    python process_raw_content.py --process-pending
    python process_raw_content.py --content-id <uuid>
    python process_raw_content.py --batch-size 10
"""

import os
import sys
import json
import argparse
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    import openai
    from supabase import create_client, Client
    import tiktoken
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install openai supabase tiktoken")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ai_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ContentType(Enum):
    """Types of content that can be generated"""
    TOPIC = "topic"
    FLASHCARD = "flashcard"
    QUIZ_QUESTION = "quiz_question"
    EXAM_QUESTION = "exam_question"

@dataclass
class ProcessingResult:
    """Result of content processing"""
    success: bool
    content_type: ContentType
    generated_items: List[Dict[str, Any]]
    embedding: Optional[List[float]] = None
    error_message: Optional[str] = None

class AIContentProcessor:
    """Main AI content processing class"""
    
    def __init__(self, supabase_url: str, supabase_key: str, openai_api_key: str):
        """Initialize the processor with API credentials"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        openai.api_key = openai_api_key
        self.encoding = tiktoken.encoding_for_model("gpt-4")
        
        # Processing configuration
        self.max_tokens_per_request = 4000
        self.embedding_model = "text-embedding-ada-002"
        self.generation_model = "gpt-4"
        
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))
    
    def chunk_content(self, content: str, max_tokens: int = 3000) -> List[str]:
        """Split content into chunks that fit within token limits"""
        sentences = content.split('. ')
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            test_chunk = current_chunk + ". " + sentence if current_chunk else sentence
            if self.count_tokens(test_chunk) > max_tokens:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                else:
                    # Single sentence is too long, split it
                    words = sentence.split()
                    for i in range(0, len(words), 100):  # Rough word-based chunking
                        chunk_words = words[i:i+100]
                        chunks.append(' '.join(chunk_words))
                    current_chunk = ""
            else:
                current_chunk = test_chunk
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI API"""
        try:
            response = await openai.Embedding.acreate(
                model=self.embedding_model,
                input=text
            )
            return response['data'][0]['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None
    
    async def generate_topics_from_content(self, content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate topic content from raw text"""
        subject = metadata.get('subject', 'General')
        syllabus_code = metadata.get('syllabus_code', '')
        
        prompt = f"""
        You are an expert IGCSE {subject} educator. Based on the following educational content, 
        create structured topic information suitable for IGCSE students.
        
        Subject: {subject}
        Syllabus Code: {syllabus_code}
        
        Content:
        {content[:2000]}  # Limit content to avoid token limits
        
        Generate a JSON response with the following structure:
        {{
            "topics": [
                {{
                    "title": "Topic Title",
                    "description": "Brief description of the topic",
                    "content": "Detailed explanation suitable for IGCSE level",
                    "difficulty_level": 1-5,
                    "estimated_study_time_minutes": 30,
                    "learning_objectives": ["objective1", "objective2"],
                    "key_concepts": ["concept1", "concept2"]
                }}
            ]
        }}
        
        Ensure content is:
        - Appropriate for IGCSE Grade 9-10 level
        - Clear and educational
        - Aligned with {subject} curriculum
        - Between 200-1000 words per topic
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.generation_model,
                messages=[
                    {"role": "system", "content": "You are an expert IGCSE educator creating educational content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
            return result_json.get('topics', [])
            
        except Exception as e:
            logger.error(f"Error generating topics: {e}")
            return []
    
    async def generate_flashcards_from_content(self, content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate flashcards from raw text"""
        subject = metadata.get('subject', 'General')
        
        prompt = f"""
        Create IGCSE {subject} flashcards from the following content. 
        Generate clear, concise question-answer pairs suitable for spaced repetition learning.
        
        Content:
        {content[:2000]}
        
        Generate a JSON response:
        {{
            "flashcards": [
                {{
                    "front_content": "Question or term",
                    "back_content": "Answer or definition",
                    "card_type": "basic",
                    "difficulty_level": 1-5,
                    "tags": ["tag1", "tag2"],
                    "hint": "Optional hint"
                }}
            ]
        }}
        
        Create 5-10 flashcards focusing on key concepts, definitions, and important facts.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.generation_model,
                messages=[
                    {"role": "system", "content": "You are an expert educator creating flashcards for IGCSE students."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
            return result_json.get('flashcards', [])
            
        except Exception as e:
            logger.error(f"Error generating flashcards: {e}")
            return []
    
    async def generate_quiz_questions_from_content(self, content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate quiz questions from raw text"""
        subject = metadata.get('subject', 'General')
        
        prompt = f"""
        Create IGCSE {subject} quiz questions from the following content.
        Generate multiple choice and short answer questions.
        
        Content:
        {content[:2000]}
        
        Generate a JSON response:
        {{
            "questions": [
                {{
                    "question_text": "Question text",
                    "question_type": "multiple_choice" or "short_answer",
                    "options": ["A", "B", "C", "D"] or null,
                    "correct_answer": "Correct answer",
                    "explanation": "Explanation of the answer",
                    "difficulty_level": 1-5,
                    "points": 1-5
                }}
            ]
        }}
        
        Create 3-7 questions covering key concepts from the content.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.generation_model,
                messages=[
                    {"role": "system", "content": "You are an expert educator creating quiz questions for IGCSE students."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            result_json = json.loads(result_text)
            return result_json.get('questions', [])
            
        except Exception as e:
            logger.error(f"Error generating quiz questions: {e}")
            return []
    
    async def process_single_content(self, content_id: str) -> ProcessingResult:
        """Process a single content item"""
        try:
            # Fetch content from database
            result = self.supabase.table('raw_content_sources').select('*').eq('id', content_id).execute()
            
            if not result.data:
                return ProcessingResult(
                    success=False,
                    content_type=ContentType.TOPIC,
                    generated_items=[],
                    error_message=f"Content not found: {content_id}"
                )
            
            content_item = result.data[0]
            raw_text = content_item['raw_text']
            metadata = content_item['metadata'] or {}
            
            logger.info(f"Processing content {content_id}: {len(raw_text)} characters")
            
            # Generate embedding for the raw content
            embedding = await self.generate_embedding(raw_text[:8000])  # Limit for embedding API
            
            # Determine what type of content to generate based on source type and length
            source_type = content_item['source_type']
            content_length = len(raw_text)
            
            generated_items = []
            
            # Generate topics (always)
            topics = await self.generate_topics_from_content(raw_text, metadata)
            for topic in topics:
                topic['source_content_id'] = content_id
                topic['content_type'] = 'topic'
            generated_items.extend(topics)
            
            # Generate flashcards if content is substantial
            if content_length > 500:
                flashcards = await self.generate_flashcards_from_content(raw_text, metadata)
                for flashcard in flashcards:
                    flashcard['source_content_id'] = content_id
                    flashcard['content_type'] = 'flashcard'
                generated_items.extend(flashcards)
            
            # Generate quiz questions if content is educational
            if source_type in ['khan_academy', 'ck12', 'cambridge_resource']:
                questions = await self.generate_quiz_questions_from_content(raw_text, metadata)
                for question in questions:
                    question['source_content_id'] = content_id
                    question['content_type'] = 'quiz_question'
                generated_items.extend(questions)
            
            # Update the raw content with embedding
            if embedding:
                self.supabase.table('raw_content_sources').update({
                    'embedding': embedding,
                    'processing_status': 'processed',
                    'processed_at': datetime.now().isoformat(),
                    'processing_notes': f"Generated {len(generated_items)} items"
                }).eq('id', content_id).execute()
            
            return ProcessingResult(
                success=True,
                content_type=ContentType.TOPIC,
                generated_items=generated_items,
                embedding=embedding
            )
            
        except Exception as e:
            logger.error(f"Error processing content {content_id}: {e}")
            
            # Update status to failed
            self.supabase.table('raw_content_sources').update({
                'processing_status': 'failed',
                'processing_notes': f"Processing error: {str(e)}"
            }).eq('id', content_id).execute()
            
            return ProcessingResult(
                success=False,
                content_type=ContentType.TOPIC,
                generated_items=[],
                error_message=str(e)
            )
    
    async def save_generated_content(self, items: List[Dict[str, Any]], subject_id: str) -> Dict[str, int]:
        """Save generated content items to appropriate tables"""
        stats = {'topics': 0, 'flashcards': 0, 'quiz_questions': 0, 'errors': 0}
        
        for item in items:
            try:
                content_type = item.get('content_type')
                
                if content_type == 'topic':
                    # Save to topics table
                    topic_data = {
                        'subject_id': subject_id,
                        'title': item.get('title'),
                        'description': item.get('description'),
                        'content': item.get('content'),
                        'difficulty_level': item.get('difficulty_level', 1),
                        'estimated_study_time_minutes': item.get('estimated_study_time_minutes', 30),
                        'learning_objectives': item.get('learning_objectives', []),
                        'is_published': False,  # Require manual review
                        'slug': self.generate_slug(item.get('title', ''))
                    }
                    
                    # Generate embedding for topic content
                    if item.get('content'):
                        embedding = await self.generate_embedding(item['content'])
                        if embedding:
                            topic_data['embedding'] = embedding
                    
                    result = self.supabase.table('topics').insert(topic_data).execute()
                    if result.data:
                        stats['topics'] += 1
                    
                elif content_type == 'flashcard':
                    # Find or create a topic for this flashcard
                    topic_id = await self.find_or_create_topic_for_flashcard(item, subject_id)
                    
                    flashcard_data = {
                        'topic_id': topic_id,
                        'front_content': item.get('front_content'),
                        'back_content': item.get('back_content'),
                        'card_type': item.get('card_type', 'basic'),
                        'difficulty_level': item.get('difficulty_level', 1),
                        'tags': item.get('tags', []),
                        'hint': item.get('hint')
                    }
                    
                    # Generate embedding for flashcard
                    combined_content = f"{item.get('front_content', '')} {item.get('back_content', '')}"
                    embedding = await self.generate_embedding(combined_content)
                    if embedding:
                        flashcard_data['embedding'] = embedding
                    
                    result = self.supabase.table('flashcards').insert(flashcard_data).execute()
                    if result.data:
                        stats['flashcards'] += 1
                
                # Add more content types as needed...
                
            except Exception as e:
                logger.error(f"Error saving generated item: {e}")
                stats['errors'] += 1
        
        return stats
    
    def generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title"""
        import re
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    async def find_or_create_topic_for_flashcard(self, flashcard: Dict[str, Any], subject_id: str) -> str:
        """Find existing topic or create a new one for flashcard"""
        # Simple implementation - create a general topic
        # In practice, you might want more sophisticated topic matching
        
        topic_title = "General Concepts"
        
        # Check if general topic exists
        result = self.supabase.table('topics').select('id').eq('subject_id', subject_id).eq('title', topic_title).execute()
        
        if result.data:
            return result.data[0]['id']
        else:
            # Create new general topic
            topic_data = {
                'subject_id': subject_id,
                'title': topic_title,
                'description': 'General concepts and definitions',
                'content': 'This topic contains general concepts and definitions.',
                'slug': 'general-concepts',
                'is_published': False
            }
            
            result = self.supabase.table('topics').insert(topic_data).execute()
            return result.data[0]['id']

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Process raw content using AI')
    parser.add_argument('--process-pending', action='store_true', help='Process all pending content')
    parser.add_argument('--content-id', help='Process specific content by ID')
    parser.add_argument('--batch-size', type=int, default=5, help='Number of items to process in batch')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    openai_api_key = os.getenv('OPENAI_API_KEY')
    
    if not all([supabase_url, supabase_key, openai_api_key]):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize processor
    processor = AIContentProcessor(supabase_url, supabase_key, openai_api_key)
    
    async def run_processing():
        if args.process_pending:
            # Process pending content in batches
            logger.info("Processing pending content...")
            # Implementation would fetch pending items and process them
            # This is a simplified version
            pass
        elif args.content_id:
            # Process specific content
            result = await processor.process_single_content(args.content_id)
            if result.success:
                logger.info(f"Successfully processed content {args.content_id}: {len(result.generated_items)} items generated")
            else:
                logger.error(f"Failed to process content {args.content_id}: {result.error_message}")
        else:
            parser.print_help()
    
    # Run the async processing
    asyncio.run(run_processing())

if __name__ == '__main__':
    main()
