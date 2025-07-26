#!/usr/bin/env python3
"""
Content Validation and Filtering for IGCSE Educational Resources

This module provides content quality checks, license validation, and syllabus
alignment filtering for the content ingestion pipeline.

Usage:
    python content_validator.py --validate-pending
    python content_validator.py --content-id <uuid>
"""

import os
import sys
import json
import re
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from supabase import create_client, Client
except ImportError as e:
    print(f"Missing required dependencies: {e}")
    print("Install with: pip install supabase")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/content_validator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ValidationResult(Enum):
    """Validation result types"""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    SKIP = "skip"

@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    type: str
    severity: ValidationResult
    message: str
    details: Optional[Dict[str, Any]] = None

class ContentValidator:
    """Main content validation class"""
    
    def __init__(self, supabase_url: str, supabase_key: str, config_path: str = 'config/content_sources.json'):
        """Initialize the validator with Supabase credentials and configuration"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Load configuration
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load configuration from {config_path}: {e}")
            self.config = {}
        
        self.processing_rules = self.config.get('processing_rules', {})
        self.syllabus_mapping = self.config.get('syllabus_mapping', {})
    
    def validate_content_length(self, content: str) -> List[ValidationIssue]:
        """Validate content length"""
        issues = []
        validation_rules = self.processing_rules.get('content_validation', {})
        
        min_length = validation_rules.get('min_length', 100)
        max_length = validation_rules.get('max_length', 50000)
        
        content_length = len(content)
        
        if content_length < min_length:
            issues.append(ValidationIssue(
                type="content_length",
                severity=ValidationResult.FAIL,
                message=f"Content too short: {content_length} characters (minimum: {min_length})",
                details={"actual_length": content_length, "min_length": min_length}
            ))
        elif content_length > max_length:
            issues.append(ValidationIssue(
                type="content_length",
                severity=ValidationResult.WARNING,
                message=f"Content very long: {content_length} characters (maximum: {max_length})",
                details={"actual_length": content_length, "max_length": max_length}
            ))
        
        return issues
    
    def validate_educational_content(self, content: str, subject: Optional[str] = None) -> List[ValidationIssue]:
        """Validate that content is educational and relevant"""
        issues = []
        content_lower = content.lower()
        
        # Check for required educational indicators
        quality_filters = self.processing_rules.get('quality_filters', {})
        educational_indicators = quality_filters.get('require_educational_indicators', [])
        
        found_indicators = [indicator for indicator in educational_indicators 
                          if indicator.lower() in content_lower]
        
        if len(found_indicators) < 2:  # Require at least 2 educational indicators
            issues.append(ValidationIssue(
                type="educational_content",
                severity=ValidationResult.WARNING,
                message=f"Few educational indicators found: {found_indicators}",
                details={"found_indicators": found_indicators, "required_count": 2}
            ))
        
        # Check for subject-specific keywords if subject is provided
        if subject:
            validation_rules = self.processing_rules.get('content_validation', {})
            required_keywords = validation_rules.get('required_keywords_by_subject', {}).get(subject, [])
            
            found_keywords = [keyword for keyword in required_keywords 
                            if keyword.lower() in content_lower]
            
            if len(found_keywords) == 0:
                issues.append(ValidationIssue(
                    type="subject_relevance",
                    severity=ValidationResult.WARNING,
                    message=f"No subject-specific keywords found for {subject}",
                    details={"subject": subject, "required_keywords": required_keywords}
                ))
        
        return issues
    
    def validate_license_compliance(self, content: str, metadata: Dict[str, Any]) -> List[ValidationIssue]:
        """Validate license compliance and copyright"""
        issues = []
        content_lower = content.lower()
        
        license_validation = self.processing_rules.get('license_validation', {})
        exclude_phrases = self.processing_rules.get('quality_filters', {}).get('exclude_if_contains', [])
        
        # Check for copyright violations
        for phrase in exclude_phrases:
            if phrase.lower() in content_lower:
                issues.append(ValidationIssue(
                    type="copyright_violation",
                    severity=ValidationResult.FAIL,
                    message=f"Potential copyright violation: found '{phrase}'",
                    details={"violation_phrase": phrase}
                ))
        
        # Check for license information in metadata
        source_type = metadata.get('source_type', '')
        if source_type in ['wikipedia', 'ck12']:
            # These sources typically have open licenses
            pass
        elif source_type == 'past_paper':
            # Past papers may have copyright restrictions
            issues.append(ValidationIssue(
                type="license_check",
                severity=ValidationResult.WARNING,
                message="Past paper content may have copyright restrictions",
                details={"source_type": source_type}
            ))
        
        return issues
    
    def validate_syllabus_alignment(self, content: str, metadata: Dict[str, Any]) -> List[ValidationIssue]:
        """Validate alignment with IGCSE syllabus"""
        issues = []
        
        subject = metadata.get('subject')
        syllabus_code = metadata.get('syllabus_code')
        
        if not subject or not syllabus_code:
            issues.append(ValidationIssue(
                type="syllabus_metadata",
                severity=ValidationResult.WARNING,
                message="Missing subject or syllabus code in metadata",
                details={"subject": subject, "syllabus_code": syllabus_code}
            ))
            return issues
        
        # Check if syllabus code is recognized
        cambridge_syllabi = self.syllabus_mapping.get('Cambridge IGCSE', {})
        if syllabus_code not in cambridge_syllabi:
            issues.append(ValidationIssue(
                type="syllabus_recognition",
                severity=ValidationResult.WARNING,
                message=f"Unrecognized syllabus code: {syllabus_code}",
                details={"syllabus_code": syllabus_code}
            ))
        else:
            # Check if content aligns with major areas
            syllabus_info = cambridge_syllabi[syllabus_code]
            major_areas = syllabus_info.get('major_areas', [])
            
            content_lower = content.lower()
            aligned_areas = []
            
            for area in major_areas:
                # Simple keyword matching - could be improved with NLP
                area_keywords = area.lower().split()
                if any(keyword in content_lower for keyword in area_keywords):
                    aligned_areas.append(area)
            
            if not aligned_areas:
                issues.append(ValidationIssue(
                    type="syllabus_alignment",
                    severity=ValidationResult.WARNING,
                    message=f"Content may not align with {subject} syllabus areas",
                    details={"major_areas": major_areas, "aligned_areas": aligned_areas}
                ))
        
        return issues
    
    def validate_content_quality(self, content: str) -> List[ValidationIssue]:
        """Validate overall content quality"""
        issues = []
        
        # Check for excessive repetition
        words = content.lower().split()
        if len(words) > 50:  # Only check for longer content
            word_freq = {}
            for word in words:
                if len(word) > 3:  # Only count meaningful words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Check if any word appears too frequently
            total_words = len(words)
            for word, freq in word_freq.items():
                if freq > total_words * 0.1:  # More than 10% of content
                    issues.append(ValidationIssue(
                        type="content_quality",
                        severity=ValidationResult.WARNING,
                        message=f"Excessive repetition of word '{word}': {freq} times",
                        details={"word": word, "frequency": freq, "percentage": freq/total_words}
                    ))
        
        # Check for minimum sentence structure
        sentences = re.split(r'[.!?]+', content)
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if len(meaningful_sentences) < 3:
            issues.append(ValidationIssue(
                type="content_structure",
                severity=ValidationResult.WARNING,
                message=f"Few meaningful sentences found: {len(meaningful_sentences)}",
                details={"sentence_count": len(meaningful_sentences)}
            ))
        
        return issues
    
    def validate_single_content(self, content_id: str) -> Tuple[bool, List[ValidationIssue]]:
        """Validate a single content item"""
        try:
            # Fetch content from database
            result = self.supabase.table('raw_content_sources').select('*').eq('id', content_id).execute()
            
            if not result.data:
                logger.error(f"Content not found: {content_id}")
                return False, []
            
            content_item = result.data[0]
            content = content_item['raw_text']
            metadata = content_item['metadata'] or {}
            
            # Run all validations
            all_issues = []
            all_issues.extend(self.validate_content_length(content))
            all_issues.extend(self.validate_educational_content(content, metadata.get('subject')))
            all_issues.extend(self.validate_license_compliance(content, metadata))
            all_issues.extend(self.validate_syllabus_alignment(content, metadata))
            all_issues.extend(self.validate_content_quality(content))
            
            # Determine overall validation result
            has_failures = any(issue.severity == ValidationResult.FAIL for issue in all_issues)
            
            # Update processing status based on validation
            if has_failures:
                new_status = 'failed'
                processing_notes = f"Validation failed: {len([i for i in all_issues if i.severity == ValidationResult.FAIL])} errors"
            else:
                new_status = 'processed'
                warning_count = len([i for i in all_issues if i.severity == ValidationResult.WARNING])
                processing_notes = f"Validation passed with {warning_count} warnings"
            
            # Update the database record
            update_data = {
                'processing_status': new_status,
                'processing_notes': processing_notes,
                'processed_at': datetime.now().isoformat()
            }
            
            # Add validation results to metadata
            validation_metadata = {
                **metadata,
                'validation_results': [
                    {
                        'type': issue.type,
                        'severity': issue.severity.value,
                        'message': issue.message,
                        'details': issue.details
                    }
                    for issue in all_issues
                ],
                'validation_timestamp': datetime.now().isoformat()
            }
            update_data['metadata'] = validation_metadata
            
            self.supabase.table('raw_content_sources').update(update_data).eq('id', content_id).execute()
            
            logger.info(f"Validated content {content_id}: {new_status} with {len(all_issues)} issues")
            return not has_failures, all_issues
            
        except Exception as e:
            logger.error(f"Error validating content {content_id}: {e}")
            return False, []
    
    def validate_pending_content(self) -> Dict[str, int]:
        """Validate all pending content items"""
        stats = {'total': 0, 'passed': 0, 'failed': 0, 'errors': 0}
        
        try:
            # Fetch all pending content
            result = self.supabase.table('raw_content_sources').select('id').eq('processing_status', 'pending').execute()
            
            pending_items = result.data
            stats['total'] = len(pending_items)
            
            logger.info(f"Found {stats['total']} pending content items to validate")
            
            for item in pending_items:
                content_id = item['id']
                success, issues = self.validate_single_content(content_id)
                
                if success:
                    stats['passed'] += 1
                else:
                    # Check if it's a validation failure or system error
                    has_validation_failures = any(issue.severity == ValidationResult.FAIL for issue in issues)
                    if has_validation_failures:
                        stats['failed'] += 1
                    else:
                        stats['errors'] += 1
            
        except Exception as e:
            logger.error(f"Error validating pending content: {e}")
        
        return stats

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Validate educational content')
    parser.add_argument('--validate-pending', action='store_true', help='Validate all pending content')
    parser.add_argument('--content-id', help='Validate specific content by ID')
    parser.add_argument('--config', default='config/content_sources.json', help='Configuration file path')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not all([supabase_url, supabase_key]):
        logger.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Initialize validator
    validator = ContentValidator(supabase_url, supabase_key, args.config)
    
    if args.validate_pending:
        # Validate all pending content
        stats = validator.validate_pending_content()
        logger.info(f"Validation completed. Stats: {stats}")
    elif args.content_id:
        # Validate specific content
        success, issues = validator.validate_single_content(args.content_id)
        if success:
            logger.info(f"Content {args.content_id} passed validation with {len(issues)} issues")
        else:
            logger.error(f"Content {args.content_id} failed validation")
        
        # Print issues for debugging
        for issue in issues:
            print(f"{issue.severity.value.upper()}: {issue.type} - {issue.message}")
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == '__main__':
    main()
