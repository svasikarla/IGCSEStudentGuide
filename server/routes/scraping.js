const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ============================================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ============================================================================
// All scraping routes require authentication and admin privileges
// Web scraping is an admin-only feature
// ============================================================================
router.use(verifyToken, requireAdmin);

// In-memory job tracking (use Redis in production)
const scrapingJobs = new Map();

/**
 * Trigger web scraping from UI
 * POST /api/scraping/trigger
 */
router.post('/trigger', async (req, res) => {
  try {
    const {
      sources, // Array of URLs to scrape
      sourceType, // 'khan_academy', 'ck12', etc.
      subject,
      subjectId,
      topicId,
      topicName,
      syllabusCode,
      difficultyLevel,
      generateQuestions = true,
      generateFlashcards = true
    } = req.body;

    // Generate unique job ID
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize job status
    scrapingJobs.set(jobId, {
      id: jobId,
      status: 'starting',
      progress: 0,
      totalSources: sources.length,
      processedSources: 0,
      startTime: new Date(),
      sources: sources,
      results: []
    });

    // Start scraping process asynchronously
    startScrapingProcess(jobId, sources, sourceType, subject, subjectId, topicId, topicName, syllabusCode, difficultyLevel, generateQuestions, generateFlashcards);

    res.json({
      success: true,
      jobId: jobId,
      message: `Started scraping ${sources.length} sources`,
      estimatedTime: sources.length * 30 // 30 seconds per source estimate
    });

  } catch (error) {
    console.error('Error starting scraping job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get scraping job status
 * GET /api/scraping/status/:jobId
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = scrapingJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      totalSources: job.totalSources,
      processedSources: job.processedSources,
      startTime: job.startTime,
      endTime: job.endTime,
      results: job.results,
      error: job.error
    }
  });
});

/**
 * Get all scraping jobs
 * GET /api/scraping/jobs
 */
router.get('/jobs', (req, res) => {
  const jobs = Array.from(scrapingJobs.values()).map(job => ({
    id: job.id,
    status: job.status,
    progress: job.progress,
    totalSources: job.totalSources,
    processedSources: job.processedSources,
    startTime: job.startTime,
    endTime: job.endTime
  }));

  res.json({
    success: true,
    jobs: jobs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  });
});

/**
 * Start the actual scraping process
 */
async function startScrapingProcess(jobId, sources, sourceType, subject, subjectId, topicId, topicName, syllabusCode, difficultyLevel, generateQuestions, generateFlashcards) {
  const job = scrapingJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.progress = 5;

    for (let i = 0; i < sources.length; i++) {
      const url = sources[i];
      
      // Update progress
      job.progress = Math.round((i / sources.length) * 80) + 10;
      job.processedSources = i;

      try {
        // Run the Python scraping script for single URL
        const result = await runScrapingScript(url, sourceType, subject, subjectId, topicId, topicName, syllabusCode, difficultyLevel, generateQuestions, generateFlashcards);
        
        job.results.push({
          url: url,
          success: true,
          result: result
        });

      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        job.results.push({
          url: url,
          success: false,
          error: error.message
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as completed
    job.status = 'completed';
    job.progress = 100;
    job.processedSources = sources.length;
    job.endTime = new Date();

  } catch (error) {
    console.error(`Scraping job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.endTime = new Date();
  }
}

/**
 * Run the Python scraping script
 */
function runScrapingScript(url, sourceType, subject, subjectId, topicId, topicName, syllabusCode, difficultyLevel, generateQuestions, generateFlashcards) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/collect_web_content.py');
    const args = [
      scriptPath,
      '--url', url,
      '--source-type', sourceType
    ];

    if (subject) args.push('--subject', subject);
    if (subjectId) args.push('--subject-id', subjectId);
    if (topicId) args.push('--topic-id', topicId);
    if (topicName) args.push('--topic-name', topicName);
    if (syllabusCode) args.push('--syllabus-code', syllabusCode);
    if (difficultyLevel) args.push('--difficulty-level', difficultyLevel.toString());
    if (generateQuestions) args.push('--generate-questions');
    if (generateFlashcards) args.push('--generate-flashcards');

    const pythonProcess = spawn('python', args, {
      env: {
        ...process.env,
        // Ensure Python scripts have access to required environment variables
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
      }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: output,
          message: `Successfully scraped ${url}`
        });
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python script: ${error.message}`));
    });
  });
}

/**
 * Trigger content processing
 * POST /api/scraping/process
 */
router.post('/process', async (req, res) => {
  try {
    const { contentIds } = req.body; // Array of raw_content_sources IDs to process

    // Generate unique job ID
    const jobId = `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize job status
    scrapingJobs.set(jobId, {
      id: jobId,
      status: 'starting',
      progress: 0,
      type: 'processing',
      startTime: new Date()
    });

    // Start processing asynchronously
    startProcessingJob(jobId, contentIds);

    res.json({
      success: true,
      jobId: jobId,
      message: `Started processing ${contentIds ? contentIds.length : 'all pending'} content items`
    });

  } catch (error) {
    console.error('Error starting processing job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start content processing job
 */
async function startProcessingJob(jobId, contentIds) {
  const job = scrapingJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.progress = 10;

    const scriptPath = path.join(__dirname, '../../scripts/process_raw_content.py');
    const args = [scriptPath];

    if (contentIds && contentIds.length > 0) {
      args.push('--content-ids', contentIds.join(','));
    }

    const pythonProcess = spawn('python', args, {
      env: {
        ...process.env,
        // Ensure Python scripts have access to required environment variables
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
      }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Update progress based on output parsing
      job.progress = Math.min(90, job.progress + 5);
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.result = { success: true, output: output };
      } else {
        job.status = 'failed';
        job.error = `Processing failed with code ${code}: ${errorOutput}`;
      }
      job.endTime = new Date();
    });

    pythonProcess.on('error', (error) => {
      job.status = 'failed';
      job.error = `Failed to start processing script: ${error.message}`;
      job.endTime = new Date();
    });

  } catch (error) {
    console.error(`Processing job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.endTime = new Date();
  }
}

module.exports = router;
