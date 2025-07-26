#!/usr/bin/env python3
"""
Web Content Scraper for IGCSE Educational Resources

This script scrapes educational content from open educational resources (OER)
like Khan Academy, CK-12, and other educational websites using Firecrawl.

Usage:
    python collect_web_content.py --config config/content_sources.json
    python collect_web_content.py --url https://example.com --source-type khan_academy
"""

import os
import sys
import json
import hashlib
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from urllib.parse import urlparse, urljoin

# Add the parent directory to the path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    import requests
    from supabase import create_client, Client
    from firecrawl import FirecrawlApp
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install supabase firecrawl-py requests")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/content_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ContentSource:
    """Configuration for a content source"""
    url: str
    source_type: str
    subject: Optional[str] = None
    syllabus_code: Optional[str] = None
    difficulty_level: Optional[int] = None
    max_pages: int = 10
    delay_seconds: float = 1.0
    include_patterns: List[str] = None
    exclude_patterns: List[str] = None

class ContentScraper:
    """Main content scraper class"""
    
    def __init__(self, supabase_url: str, supabase_key: str, firecrawl_api_key: str):
        """Initialize the scraper with API credentials"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.firecrawl = FirecrawlApp(api_key=firecrawl_api_key)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def generate_content_hash(self, content: str) -> str:
        """Generate SHA-256 hash of content to prevent duplicates"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def is_duplicate_content(self, content_hash: str) -> bool:
        """Check if content already exists in database"""
        try:
            result = self.supabase.table('raw_content_sources').select('id').eq('content_hash', content_hash).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error checking for duplicate content: {e}")
            return False
    
    def scrape_single_url(self, url: str, source_config: ContentSource) -> Optional[Dict[str, Any]]:
        """Scrape content from a single URL"""
        try:
            logger.info(f"Scraping URL: {url}")
            
            # Use Firecrawl to scrape the content
            scrape_result = self.firecrawl.scrape_url(
                url,
                params={
                    'formats': ['markdown', 'html'],
                    'onlyMainContent': True,
                    'waitFor': 2000,  # Wait 2 seconds for dynamic content
                    'timeout': 30000  # 30 second timeout
                }
            )
            
            if not scrape_result.get('success', False):
                logger.error(f"Failed to scrape {url}: {scrape_result.get('error', 'Unknown error')}")
                return None
            
            # Extract the content
            markdown_content = scrape_result.get('data', {}).get('markdown', '')
            html_content = scrape_result.get('data', {}).get('html', '')
            
            if not markdown_content and not html_content:
                logger.warning(f"No content extracted from {url}")
                return None
            
            # Prefer markdown, fallback to HTML
            raw_text = markdown_content if markdown_content else html_content
            
            # Generate content hash
            content_hash = self.generate_content_hash(raw_text)
            
            # Check for duplicates
            if self.is_duplicate_content(content_hash):
                logger.info(f"Duplicate content found for {url}, skipping")
                return None
            
            # Prepare metadata
            metadata = {
                'subject': source_config.subject,
                'syllabus_code': source_config.syllabus_code,
                'difficulty_level': source_config.difficulty_level,
                'scraped_at': datetime.now().isoformat(),
                'session_id': self.session_id,
                'content_length': len(raw_text),
                'has_markdown': bool(markdown_content),
                'has_html': bool(html_content)
            }
            
            # Add any additional metadata from the scrape result
            if 'title' in scrape_result.get('data', {}):
                metadata['title'] = scrape_result['data']['title']
            
            return {
                'source_url': url,
                'source_type': source_config.source_type,
                'raw_text': raw_text,
                'metadata': metadata,
                'content_hash': content_hash,
                'file_size_bytes': len(raw_text.encode('utf-8'))
            }
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None
    
    def save_content_to_database(self, content_data: Dict[str, Any]) -> bool:
        """Save scraped content to the database"""
        try:
            result = self.supabase.table('raw_content_sources').insert(content_data).execute()
            if result.data:
                logger.info(f"Saved content from {content_data['source_url']} to database")
                return True
            else:
                logger.error(f"Failed to save content to database: {result}")
                return False
        except Exception as e:
            logger.error(f"Error saving content to database: {e}")
            return False
    
    def scrape_from_config(self, config_path: str) -> Dict[str, int]:
        """Scrape content based on configuration file"""
        stats = {'total': 0, 'success': 0, 'failed': 0, 'duplicates': 0}
        
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            sources = config.get('sources', [])
            logger.info(f"Loaded {len(sources)} content sources from config")
            
            for source_config_dict in sources:
                source_config = ContentSource(**source_config_dict)
                stats['total'] += 1
                
                content_data = self.scrape_single_url(source_config.url, source_config)
                
                if content_data is None:
                    stats['failed'] += 1
                    continue
                
                if self.save_content_to_database(content_data):
                    stats['success'] += 1
                else:
                    stats['failed'] += 1
                
                # Add delay between requests to be respectful
                import time
                time.sleep(source_config.delay_seconds)
            
        except Exception as e:
            logger.error(f"Error processing config file {config_path}: {e}")
        
        return stats
    
    def scrape_single_source(self, url: str, source_type: str, **kwargs) -> bool:
        """Scrape a single URL with provided parameters"""
        source_config = ContentSource(
            url=url,
            source_type=source_type,
            **kwargs
        )
        
        content_data = self.scrape_single_url(url, source_config)
        
        if content_data is None:
            return False
        
        return self.save_content_to_database(content_data)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Scrape educational content from web sources')
    parser.add_argument('--config', help='Path to configuration file')
    parser.add_argument('--url', help='Single URL to scrape')
    parser.add_argument('--source-type', help='Type of source (khan_academy, ck12, etc.)')
    parser.add_argument('--subject', help='Subject name')
    parser.add_argument('--syllabus-code', help='Syllabus code')
    parser.add_argument('--difficulty-level', type=int, help='Difficulty level (1-5)')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for admin operations
    firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')
    
    if not all([supabase_url, supabase_key, firecrawl_api_key]):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, FIRECRAWL_API_KEY")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize scraper
    scraper = ContentScraper(supabase_url, supabase_key, firecrawl_api_key)
    
    if args.config:
        # Scrape from configuration file
        stats = scraper.scrape_from_config(args.config)
        logger.info(f"Scraping completed. Stats: {stats}")
    elif args.url and args.source_type:
        # Scrape single URL
        success = scraper.scrape_single_source(
            url=args.url,
            source_type=args.source_type,
            subject=args.subject,
            syllabus_code=args.syllabus_code,
            difficulty_level=args.difficulty_level
        )
        if success:
            logger.info(f"Successfully scraped {args.url}")
        else:
            logger.error(f"Failed to scrape {args.url}")
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == '__main__':
    main()
