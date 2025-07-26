#!/usr/bin/env python3
"""
Embedding Generation Service for IGCSE Educational Content

This service generates vector embeddings for educational content using various
embedding models (OpenAI, Cohere, or local models) with batch processing
capabilities for cost optimization.

Usage:
    python embedding_service.py --generate-missing
    python embedding_service.py --table topics --batch-size 50
    python embedding_service.py --content-id <uuid> --table flashcards
"""

import os
import sys
import json
import argparse
import logging
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    import openai
    import cohere
    from supabase import create_client, Client
    import tiktoken
    import numpy as np
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install openai cohere supabase tiktoken numpy")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/embedding_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EmbeddingProvider(Enum):
    """Supported embedding providers"""
    OPENAI = "openai"
    COHERE = "cohere"
    LOCAL = "local"

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation"""
    provider: EmbeddingProvider
    model: str
    dimensions: int
    max_tokens: int
    batch_size: int
    rate_limit_rpm: int  # Requests per minute

class EmbeddingService:
    """Main embedding generation service"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize the service with Supabase credentials"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Initialize embedding providers
        self.providers = {}
        self._init_providers()
        
        # Default configurations for different providers
        self.configs = {
            EmbeddingProvider.OPENAI: EmbeddingConfig(
                provider=EmbeddingProvider.OPENAI,
                model="text-embedding-ada-002",
                dimensions=1536,
                max_tokens=8191,
                batch_size=100,
                rate_limit_rpm=3000
            ),
            EmbeddingProvider.COHERE: EmbeddingConfig(
                provider=EmbeddingProvider.COHERE,
                model="embed-english-v3.0",
                dimensions=1024,
                max_tokens=512,
                batch_size=96,
                rate_limit_rpm=1000
            )
        }
        
        # Token encoder for text length estimation
        self.encoding = tiktoken.encoding_for_model("gpt-4")
        
        # Rate limiting
        self.last_request_time = 0
        self.request_count = 0
        self.request_window_start = time.time()
    
    def _init_providers(self):
        """Initialize embedding providers based on available API keys"""
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            openai.api_key = openai_key
            self.providers[EmbeddingProvider.OPENAI] = True
            logger.info("OpenAI embedding provider initialized")
        
        cohere_key = os.getenv('COHERE_API_KEY')
        if cohere_key:
            self.providers[EmbeddingProvider.COHERE] = cohere.Client(cohere_key)
            logger.info("Cohere embedding provider initialized")
        
        if not self.providers:
            logger.warning("No embedding providers available. Set OPENAI_API_KEY or COHERE_API_KEY")
    
    def get_available_provider(self) -> Optional[EmbeddingProvider]:
        """Get the first available embedding provider"""
        if EmbeddingProvider.OPENAI in self.providers:
            return EmbeddingProvider.OPENAI
        elif EmbeddingProvider.COHERE in self.providers:
            return EmbeddingProvider.COHERE
        return None
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))
    
    def truncate_text(self, text: str, max_tokens: int) -> str:
        """Truncate text to fit within token limit"""
        tokens = self.encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        truncated_tokens = tokens[:max_tokens]
        return self.encoding.decode(truncated_tokens)
    
    async def rate_limit_wait(self, config: EmbeddingConfig):
        """Implement rate limiting"""
        current_time = time.time()
        
        # Reset counter if window has passed
        if current_time - self.request_window_start >= 60:
            self.request_count = 0
            self.request_window_start = current_time
        
        # Check if we need to wait
        if self.request_count >= config.rate_limit_rpm:
            wait_time = 60 - (current_time - self.request_window_start)
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
                self.request_count = 0
                self.request_window_start = time.time()
        
        self.request_count += 1
    
    async def generate_embedding_openai(self, text: str, config: EmbeddingConfig) -> Optional[List[float]]:
        """Generate embedding using OpenAI API"""
        try:
            await self.rate_limit_wait(config)
            
            # Truncate text if necessary
            truncated_text = self.truncate_text(text, config.max_tokens)
            
            response = await openai.Embedding.acreate(
                model=config.model,
                input=truncated_text
            )
            
            return response['data'][0]['embedding']
            
        except Exception as e:
            logger.error(f"Error generating OpenAI embedding: {e}")
            return None
    
    async def generate_embedding_cohere(self, text: str, config: EmbeddingConfig) -> Optional[List[float]]:
        """Generate embedding using Cohere API"""
        try:
            await self.rate_limit_wait(config)
            
            # Truncate text if necessary
            truncated_text = self.truncate_text(text, config.max_tokens)
            
            client = self.providers[EmbeddingProvider.COHERE]
            response = client.embed(
                texts=[truncated_text],
                model=config.model,
                input_type="search_document"
            )
            
            return response.embeddings[0]
            
        except Exception as e:
            logger.error(f"Error generating Cohere embedding: {e}")
            return None
    
    async def generate_embedding(self, text: str, provider: Optional[EmbeddingProvider] = None) -> Optional[List[float]]:
        """Generate embedding using specified or default provider"""
        if not text or not text.strip():
            return None
        
        if provider is None:
            provider = self.get_available_provider()
        
        if provider not in self.providers:
            logger.error(f"Provider {provider} not available")
            return None
        
        config = self.configs[provider]
        
        if provider == EmbeddingProvider.OPENAI:
            return await self.generate_embedding_openai(text, config)
        elif provider == EmbeddingProvider.COHERE:
            return await self.generate_embedding_cohere(text, config)
        
        return None
    
    async def generate_embeddings_batch(self, texts: List[str], provider: Optional[EmbeddingProvider] = None) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in batch"""
        if provider is None:
            provider = self.get_available_provider()
        
        if provider not in self.providers:
            logger.error(f"Provider {provider} not available")
            return [None] * len(texts)
        
        config = self.configs[provider]
        embeddings = []
        
        # Process in batches to respect rate limits
        for i in range(0, len(texts), config.batch_size):
            batch = texts[i:i + config.batch_size]
            batch_embeddings = []
            
            for text in batch:
                embedding = await self.generate_embedding(text, provider)
                batch_embeddings.append(embedding)
                
                # Small delay between requests in batch
                await asyncio.sleep(0.1)
            
            embeddings.extend(batch_embeddings)
            
            # Longer delay between batches
            if i + config.batch_size < len(texts):
                await asyncio.sleep(1.0)
        
        return embeddings
    
    def get_content_for_embedding(self, table: str, row: Dict[str, Any]) -> str:
        """Extract text content for embedding based on table type"""
        if table == 'topics':
            # Combine title, description, and content
            parts = []
            if row.get('title'):
                parts.append(f"Title: {row['title']}")
            if row.get('description'):
                parts.append(f"Description: {row['description']}")
            if row.get('content'):
                parts.append(f"Content: {row['content']}")
            return '\n\n'.join(parts)
        
        elif table == 'flashcards':
            # Combine front and back content
            front = row.get('front_content', '')
            back = row.get('back_content', '')
            return f"Question: {front}\nAnswer: {back}"
        
        elif table == 'quiz_questions':
            # Combine question, options, and explanation
            parts = [f"Question: {row.get('question_text', '')}"]
            if row.get('options'):
                options = row['options']
                if isinstance(options, list):
                    parts.append(f"Options: {', '.join(options)}")
                elif isinstance(options, dict):
                    parts.append(f"Options: {', '.join(options.values())}")
            if row.get('explanation'):
                parts.append(f"Explanation: {row['explanation']}")
            return '\n'.join(parts)
        
        elif table == 'exam_questions':
            # Combine question text and explanation
            parts = [f"Question: {row.get('question_text', '')}"]
            if row.get('explanation'):
                parts.append(f"Explanation: {row['explanation']}")
            return '\n'.join(parts)
        
        elif table == 'raw_content_sources':
            # Use raw text directly
            return row.get('raw_text', '')
        
        return ''
    
    async def update_embeddings_for_table(self, table: str, batch_size: int = 50, content_id: Optional[str] = None) -> Dict[str, int]:
        """Update embeddings for all items in a table that don't have embeddings"""
        stats = {'total': 0, 'updated': 0, 'failed': 0, 'skipped': 0}
        
        try:
            # Build query
            query = self.supabase.table(table).select('*')
            
            if content_id:
                # Update specific item
                query = query.eq('id', content_id)
            else:
                # Update items without embeddings
                query = query.is_('embedding', 'null')
            
            result = query.execute()
            items = result.data
            
            stats['total'] = len(items)
            logger.info(f"Found {stats['total']} items in {table} without embeddings")
            
            # Process in batches
            for i in range(0, len(items), batch_size):
                batch = items[i:i + batch_size]
                
                # Extract content for embedding
                texts = []
                valid_items = []
                
                for item in batch:
                    content = self.get_content_for_embedding(table, item)
                    if content and content.strip():
                        texts.append(content)
                        valid_items.append(item)
                    else:
                        stats['skipped'] += 1
                
                if not texts:
                    continue
                
                # Generate embeddings
                logger.info(f"Generating embeddings for batch {i//batch_size + 1} ({len(texts)} items)")
                embeddings = await self.generate_embeddings_batch(texts)
                
                # Update database
                for item, embedding in zip(valid_items, embeddings):
                    if embedding:
                        try:
                            self.supabase.table(table).update({
                                'embedding': embedding,
                                'updated_at': datetime.now().isoformat()
                            }).eq('id', item['id']).execute()
                            
                            stats['updated'] += 1
                        except Exception as e:
                            logger.error(f"Error updating embedding for {item['id']}: {e}")
                            stats['failed'] += 1
                    else:
                        stats['failed'] += 1
                
                # Progress update
                logger.info(f"Processed {min(i + batch_size, len(items))}/{len(items)} items")
        
        except Exception as e:
            logger.error(f"Error updating embeddings for {table}: {e}")
        
        return stats
    
    async def generate_missing_embeddings(self, tables: Optional[List[str]] = None) -> Dict[str, Dict[str, int]]:
        """Generate embeddings for all tables that are missing them"""
        if tables is None:
            tables = ['topics', 'flashcards', 'quiz_questions', 'exam_questions', 'raw_content_sources']
        
        all_stats = {}
        
        for table in tables:
            logger.info(f"Processing table: {table}")
            stats = await self.update_embeddings_for_table(table)
            all_stats[table] = stats
            logger.info(f"Completed {table}: {stats}")
        
        return all_stats

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Generate embeddings for educational content')
    parser.add_argument('--generate-missing', action='store_true', help='Generate embeddings for all missing content')
    parser.add_argument('--table', help='Specific table to process')
    parser.add_argument('--content-id', help='Specific content ID to process')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size for processing')
    parser.add_argument('--provider', choices=['openai', 'cohere'], help='Embedding provider to use')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not all([supabase_url, supabase_key]):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize service
    service = EmbeddingService(supabase_url, supabase_key)
    
    # Check if any providers are available
    if not service.providers:
        logger.error("No embedding providers available. Set OPENAI_API_KEY or COHERE_API_KEY")
        sys.exit(1)
    
    async def run_embedding_generation():
        provider = None
        if args.provider:
            provider = EmbeddingProvider(args.provider)
        
        if args.generate_missing:
            # Generate embeddings for all missing content
            stats = await service.generate_missing_embeddings()
            logger.info(f"Embedding generation completed: {stats}")
        elif args.table:
            # Process specific table
            stats = await service.update_embeddings_for_table(
                args.table, 
                args.batch_size, 
                args.content_id
            )
            logger.info(f"Processed {args.table}: {stats}")
        else:
            parser.print_help()
    
    # Run the async processing
    asyncio.run(run_embedding_generation())

if __name__ == '__main__':
    main()
