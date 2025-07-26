#!/usr/bin/env python3
"""
PDF Content Parser for IGCSE Educational Resources

This script extracts text content from PDF files, particularly Cambridge past papers
and other educational PDF resources, and stores them in the raw_content_sources table.

Usage:
    python collect_pdf_content.py --directory /path/to/pdfs
    python collect_pdf_content.py --file /path/to/single.pdf --subject Mathematics
"""

import os
import sys
import json
import hashlib
import argparse
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path

# Add the parent directory to the path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    import pdfplumber
    from supabase import create_client, Client
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install pdfplumber supabase")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/pdf_parser.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PDFContentParser:
    """Main PDF content parser class"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize the parser with Supabase credentials"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Patterns for extracting metadata from filenames and content
        self.subject_patterns = {
            'mathematics': r'(?i)(math|mathematics|0580)',
            'physics': r'(?i)(physics|0625)',
            'chemistry': r'(?i)(chemistry|0620)',
            'biology': r'(?i)(biology|0610)',
            'economics': r'(?i)(economics|0455)',
            'english': r'(?i)(english|0500)',
        }
        
        self.paper_patterns = {
            'syllabus_code': r'(\d{4})',  # 4-digit codes like 0580, 0625
            'year': r'(20\d{2})',  # Years like 2020, 2021
            'session': r'(?i)(summer|winter|march|may|october|november)',
            'paper_number': r'(?i)paper\s*(\d+)',
            'variant': r'(?i)variant\s*(\d+)',
        }
    
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
    
    def extract_metadata_from_filename(self, filename: str) -> Dict[str, Any]:
        """Extract metadata from PDF filename"""
        metadata = {}
        filename_lower = filename.lower()
        
        # Extract subject
        for subject, pattern in self.subject_patterns.items():
            if re.search(pattern, filename_lower):
                metadata['subject'] = subject.title()
                break
        
        # Extract syllabus code
        syllabus_match = re.search(self.paper_patterns['syllabus_code'], filename)
        if syllabus_match:
            metadata['syllabus_code'] = syllabus_match.group(1)
        
        # Extract year
        year_match = re.search(self.paper_patterns['year'], filename)
        if year_match:
            metadata['year'] = int(year_match.group(1))
        
        # Extract session
        session_match = re.search(self.paper_patterns['session'], filename)
        if session_match:
            metadata['session'] = session_match.group(1).lower()
        
        # Extract paper number
        paper_match = re.search(self.paper_patterns['paper_number'], filename)
        if paper_match:
            metadata['paper_number'] = int(paper_match.group(1))
        
        # Extract variant
        variant_match = re.search(self.paper_patterns['variant'], filename)
        if variant_match:
            metadata['variant'] = int(variant_match.group(1))
        
        return metadata
    
    def clean_extracted_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page numbers and headers/footers (common patterns)
        text = re.sub(r'Page \d+ of \d+', '', text)
        text = re.sub(r'© UCLES \d{4}', '', text)
        text = re.sub(r'Cambridge IGCSE', '', text)
        
        # Remove excessive line breaks
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def extract_text_from_pdf(self, pdf_path: str) -> Tuple[Optional[str], Dict[str, Any]]:
        """Extract text content from a PDF file"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Extract basic PDF metadata
                pdf_metadata = {
                    'page_count': len(pdf.pages),
                    'pdf_metadata': pdf.metadata or {}
                }
                
                # Extract text from all pages
                text_content = []
                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_content.append(f"--- Page {page_num} ---\n{page_text}")
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num} of {pdf_path}: {e}")
                        continue
                
                if not text_content:
                    logger.warning(f"No text content extracted from {pdf_path}")
                    return None, pdf_metadata
                
                # Combine all pages
                full_text = '\n\n'.join(text_content)
                
                # Clean the text
                cleaned_text = self.clean_extracted_text(full_text)
                
                # Update metadata with extraction info
                pdf_metadata.update({
                    'extraction_method': 'pdfplumber',
                    'original_length': len(full_text),
                    'cleaned_length': len(cleaned_text),
                    'pages_processed': len(text_content)
                })
                
                return cleaned_text, pdf_metadata
                
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            return None, {}
    
    def determine_source_type(self, filename: str, metadata: Dict[str, Any]) -> str:
        """Determine the source type based on filename and metadata"""
        filename_lower = filename.lower()
        
        if 'past' in filename_lower and 'paper' in filename_lower:
            return 'past_paper'
        elif 'cambridge' in filename_lower:
            return 'cambridge_resource'
        elif 'specimen' in filename_lower:
            return 'past_paper'
        elif 'mark' in filename_lower and 'scheme' in filename_lower:
            return 'past_paper'
        else:
            return 'other'
    
    def process_single_pdf(self, pdf_path: str, override_metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Process a single PDF file"""
        try:
            logger.info(f"Processing PDF: {pdf_path}")
            
            # Extract text content
            text_content, extraction_metadata = self.extract_text_from_pdf(pdf_path)
            
            if not text_content:
                logger.warning(f"No content extracted from {pdf_path}")
                return False
            
            # Generate content hash
            content_hash = self.generate_content_hash(text_content)
            
            # Check for duplicates
            if self.is_duplicate_content(content_hash):
                logger.info(f"Duplicate content found for {pdf_path}, skipping")
                return True  # Not an error, just a duplicate
            
            # Extract metadata from filename
            filename = os.path.basename(pdf_path)
            filename_metadata = self.extract_metadata_from_filename(filename)
            
            # Determine source type
            source_type = self.determine_source_type(filename, filename_metadata)
            
            # Combine all metadata
            combined_metadata = {
                **filename_metadata,
                **extraction_metadata,
                'original_filename': filename,
                'file_path': pdf_path,
                'processed_at': datetime.now().isoformat(),
                'session_id': self.session_id
            }
            
            # Apply any override metadata
            if override_metadata:
                combined_metadata.update(override_metadata)
            
            # Prepare data for database
            content_data = {
                'source_url': None,  # PDFs don't have URLs
                'source_type': source_type,
                'raw_text': text_content,
                'metadata': combined_metadata,
                'content_hash': content_hash,
                'file_size_bytes': os.path.getsize(pdf_path)
            }
            
            # Save to database
            result = self.supabase.table('raw_content_sources').insert(content_data).execute()
            
            if result.data:
                logger.info(f"Successfully saved content from {pdf_path} to database")
                return True
            else:
                logger.error(f"Failed to save content to database: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            return False
    
    def process_directory(self, directory_path: str, recursive: bool = True) -> Dict[str, int]:
        """Process all PDF files in a directory"""
        stats = {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0}
        
        try:
            directory = Path(directory_path)
            
            if not directory.exists():
                logger.error(f"Directory does not exist: {directory_path}")
                return stats
            
            # Find all PDF files
            if recursive:
                pdf_files = list(directory.rglob('*.pdf'))
            else:
                pdf_files = list(directory.glob('*.pdf'))
            
            logger.info(f"Found {len(pdf_files)} PDF files in {directory_path}")
            
            for pdf_file in pdf_files:
                stats['total'] += 1
                
                if self.process_single_pdf(str(pdf_file)):
                    stats['success'] += 1
                else:
                    stats['failed'] += 1
            
        except Exception as e:
            logger.error(f"Error processing directory {directory_path}: {e}")
        
        return stats

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Extract content from PDF files')
    parser.add_argument('--directory', help='Directory containing PDF files')
    parser.add_argument('--file', help='Single PDF file to process')
    parser.add_argument('--recursive', action='store_true', help='Process subdirectories recursively')
    parser.add_argument('--subject', help='Override subject name')
    parser.add_argument('--syllabus-code', help='Override syllabus code')
    parser.add_argument('--source-type', help='Override source type')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for admin operations
    
    if not all([supabase_url, supabase_key]):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize parser
    pdf_parser = PDFContentParser(supabase_url, supabase_key)
    
    # Prepare override metadata
    override_metadata = {}
    if args.subject:
        override_metadata['subject'] = args.subject
    if args.syllabus_code:
        override_metadata['syllabus_code'] = args.syllabus_code
    if args.source_type:
        override_metadata['source_type'] = args.source_type
    
    if args.directory:
        # Process directory
        stats = pdf_parser.process_directory(args.directory, args.recursive)
        logger.info(f"Processing completed. Stats: {stats}")
    elif args.file:
        # Process single file
        success = pdf_parser.process_single_pdf(args.file, override_metadata if override_metadata else None)
        if success:
            logger.info(f"Successfully processed {args.file}")
        else:
            logger.error(f"Failed to process {args.file}")
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == '__main__':
    main()
