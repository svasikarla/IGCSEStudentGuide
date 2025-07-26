# Web Scraping UI Integration

This document describes the implementation of UI-triggered web scraping functionality in the IGCSE Study Guide application.

## Overview

The web scraping integration allows administrators to trigger content scraping directly from the web interface, monitor progress in real-time, and manage scraping jobs without requiring command-line access.

## Architecture

### Components

1. **Frontend Components**
   - `ContentScrapingInterface.tsx` - Main UI for scraping management
   - `useContentScraping.ts` - React hook for API interactions

2. **Backend Services**
   - `server/routes/scraping.js` - API endpoints for scraping operations
   - `scripts/collect_web_content.py` - Python scraping script
   - `scripts/process_raw_content.py` - Content processing script

3. **Database Tables**
   - `raw_content_sources` - Stores scraped content
   - `topics`, `flashcards`, `quiz_questions` - Generated content

## Features

### 1. UI-Triggered Scraping
- **Bulk URL Input**: Paste multiple URLs (one per line)
- **Source Type Selection**: Khan Academy, CK-12, Wikipedia, etc.
- **Metadata Configuration**: Subject, syllabus code, difficulty level
- **Real-time Progress**: Live updates on scraping status

### 2. Job Management
- **Job History**: View all previous scraping jobs
- **Status Monitoring**: Track job progress and completion
- **Error Handling**: Clear error messages and retry capabilities
- **Result Display**: See which URLs succeeded/failed

### 3. Content Processing
- **Automated Processing**: Trigger AI processing of scraped content
- **Background Jobs**: Non-blocking operations with progress tracking
- **Generated Content**: Automatic creation of topics, flashcards, and questions

## API Endpoints

### POST /api/scraping/trigger
Starts a new scraping job.

**Request Body:**
```json
{
  "sources": ["url1", "url2", ...],
  "sourceType": "khan_academy",
  "subject": "Biology",
  "syllabusCode": "1.1",
  "difficultyLevel": 3
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "scrape_1234567890_abc123",
  "message": "Started scraping 5 sources",
  "estimatedTime": 150
}
```

### GET /api/scraping/status/:jobId
Gets the status of a specific scraping job.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "scrape_1234567890_abc123",
    "status": "running",
    "progress": 60,
    "totalSources": 5,
    "processedSources": 3,
    "startTime": "2024-01-15T10:30:00Z",
    "results": [...]
  }
}
```

### GET /api/scraping/jobs
Gets all scraping jobs for the authenticated user.

### POST /api/scraping/process
Triggers content processing for scraped content.

## Usage Guide

### For Administrators

1. **Access the Interface**
   - Navigate to Admin Dashboard
   - Click on "Content Scraping" tab

2. **Start Scraping**
   - Enter URLs (one per line) in the text area
   - Select appropriate source type
   - Configure metadata (optional)
   - Click "Start Scraping"

3. **Monitor Progress**
   - Watch real-time progress bar
   - View processing status updates
   - Check results as they complete

4. **Process Content**
   - Click "Process Pending Content" to generate educational materials
   - Monitor processing job status
   - Generated content appears in respective sections

### For Developers

1. **Environment Setup**
   ```bash
   # Copy environment template
   cp scripts/.env.example scripts/.env
   
   # Configure required variables
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   FIRECRAWL_API_KEY=your_firecrawl_key
   ```

2. **Testing Locally**
   ```bash
   # Start the development server
   npm run dev
   
   # Test scraping endpoint
   curl -X POST http://localhost:3001/api/scraping/trigger \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"sources": ["https://example.com"], "sourceType": "other"}'
   ```

## Configuration

### Source Types
- `khan_academy` - Khan Academy educational content
- `ck12` - CK-12 Foundation resources
- `wikipedia` - Wikipedia articles
- `cambridge_resource` - Cambridge educational materials
- `other` - General educational content

### Rate Limiting
- Default delay: 1 second between requests
- Configurable via environment variables
- Respects source website policies

### Content Processing
- Automatic generation of topics, flashcards, and quiz questions
- AI-powered content structuring
- Vector embeddings for semantic search

## Security

### Authentication
- All scraping endpoints require admin authentication
- JWT token validation
- Role-based access control

### Data Validation
- URL validation and sanitization
- Content type verification
- Size limits on scraped content

### Error Handling
- Graceful failure handling
- Detailed error logging
- User-friendly error messages

## Monitoring

### Logging
- Comprehensive logging of all scraping activities
- Error tracking and debugging information
- Performance metrics

### Job Tracking
- In-memory job status tracking
- Persistent job history
- Progress monitoring

## Troubleshooting

### Common Issues

1. **Python Script Fails**
   - Check environment variables are set
   - Verify Python dependencies installed
   - Check script permissions

2. **Scraping Timeouts**
   - Increase timeout values
   - Check network connectivity
   - Verify target website accessibility

3. **Authentication Errors**
   - Verify JWT token validity
   - Check admin role permissions
   - Ensure proper headers

### Debug Mode
Enable debug logging by setting `LOG_LEVEL=DEBUG` in environment variables.

## Future Enhancements

1. **Scheduled Scraping**: Automatic periodic content updates
2. **Content Validation**: AI-powered quality assessment
3. **Duplicate Detection**: Advanced content deduplication
4. **Performance Optimization**: Parallel processing and caching
5. **Analytics Dashboard**: Scraping metrics and insights

## Dependencies

### Frontend
- React 18+
- TypeScript
- Tailwind CSS

### Backend
- Node.js 16+
- Express.js
- Python 3.8+

### Python Packages
- firecrawl-py
- supabase-py
- openai
- beautifulsoup4

## Support

For issues or questions regarding the web scraping integration:
1. Check the troubleshooting section
2. Review server logs for error details
3. Verify environment configuration
4. Test with simple URLs first
