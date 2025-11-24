/**
 * Unified Content Generation API Routes
 *
 * Consolidates all LLM-based content generation endpoints.
 * Replaces the previous llm.js and simplified-generation.js files.
 *
 * This unified approach eliminates 300+ lines of duplicate code and provides
 * a consistent interface for all content types (quizzes, flashcards, exams).
 */

const express = require('express');
const router = express.Router();
const { getLLMService, getAvailableProviders, getServiceHealth } = require('../services/llmServiceFactory');
const { verifyToken, requireTeacher } = require('../middleware/auth');

// ============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================================

/**
 * Get available LLM providers and models
 * GET /api/content-generation/providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = getAvailableProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch available providers' });
  }
});

/**
 * Health check endpoint to diagnose service availability
 * GET /api/content-generation/health
 */
router.get('/health', (req, res) => {
  const health = getServiceHealth();

  // Add recommendations based on service availability
  const recommendations = [];
  if (health.status === 'critical') {
    recommendations.push('Configure at least one API key (GOOGLE_API_KEY, OPENAI_API_KEY, or HF_TOKEN)');
  } else if (!health.services.gemini.available && !health.services.openai.available) {
    recommendations.push('Only Hugging Face available. Consider adding Gemini or OpenAI for better quality.');
  } else if (!health.services.huggingface.available) {
    recommendations.push('Consider adding Hugging Face for cost-effective generation.');
  } else {
    recommendations.push('All services operational');
  }

  const statusCode = health.status === 'critical' ? 503 : 200;
  res.status(statusCode).json({ ...health, recommendations });
});

/**
 * Get cost estimates for different generation options
 * GET /api/content-generation/cost-estimate
 */
router.get('/cost-estimate', (req, res) => {
  const { contentType, itemCount = 5 } = req.query;

  const estimatedTokens = {
    quiz: parseInt(itemCount) * 150,
    exam: parseInt(itemCount) * 200,
    flashcards: parseInt(itemCount) * 100
  };

  const costs = {
    ultra_minimal: (estimatedTokens[contentType] || 0) * (0.0001 / 1000000),  // Hugging Face
    minimal: (estimatedTokens[contentType] || 0) * (0.075 / 1000000),         // Gemini
    standard: (estimatedTokens[contentType] || 0) * (0.15 / 1000000),         // GPT-4o-mini
    premium: (estimatedTokens[contentType] || 0) * (30 / 1000000)             // GPT-4o
  };

  res.json({
    contentType,
    itemCount: parseInt(itemCount),
    estimatedTokens: estimatedTokens[contentType] || 0,
    costs: {
      ultra_minimal: costs.ultra_minimal.toFixed(6),
      minimal: costs.minimal.toFixed(6),
      standard: costs.standard.toFixed(6),
      premium: costs.premium.toFixed(6)
    },
    recommendations: {
      costEffective: 'ultra_minimal',
      balanced: 'minimal',
      highQuality: 'standard'
    }
  });
});

// ============================================================================
// CONTENT GENERATION ENDPOINTS
// ============================================================================

/**
 * Generate quiz questions
 * POST /api/content-generation/quiz
 * @requires Authentication - Teacher or Admin role
 */
router.post('/quiz', verifyToken, requireTeacher, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      questionCount = 5,
      difficultyLevel = 3,
      grade = 10,
      costTier = 'minimal',
      provider,
      model
    } = req.body;

    // Validate required parameters
    if (!subject || !topicTitle) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service with fallback handling
    let service;
    try {
      service = getLLMService({ provider, costTier, model });
    } catch (serviceError) {
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message,
        suggestion: 'Please configure GOOGLE_API_KEY, OPENAI_API_KEY, or HF_TOKEN'
      });
    }

    // Build prompt for quiz generation
    const prompt = `You are an expert IGCSE ${subject} educator creating assessment questions for Grade ${grade} students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Difficulty Level: ${difficultyLevel}/5
Question Count: ${questionCount}

Generate ${questionCount} high-quality IGCSE ${subject} questions covering the topic "${topicTitle}".

Requirements:
- Follow Cambridge IGCSE ${subject} curriculum standards
- Include a mix of multiple choice (60%) and short answer (40%) questions
- Ensure questions test understanding, not just memorization
- Provide clear, accurate answers with brief explanations
- Use appropriate scientific terminology and notation
- Match the specified difficulty level

Return JSON format:
{
  "questions": [
    {
      "question_text": "Clear, specific question text",
      "question_type": "multiple_choice" | "short_answer",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"] | null,
      "correct_answer": "A" | "specific answer text",
      "explanation": "Brief explanation of why this is correct",
      "difficulty_level": ${difficultyLevel},
      "points": 1-3,
      "syllabus_reference": "${syllabusCode}"
    }
  ]
}`;

    // Generate content
    const result = await service.generateJSON(prompt, {
      maxTokens: 2000,
      temperature: 0.7
    });

    // Calculate estimated cost
    const estimatedTokens = questionCount * 150;
    const costPerToken = getCostPerToken(service.provider);
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response
    const response = {
      questions: result.questions || [],
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        questionCount: result.questions?.length || 0,
        difficultyLevel,
        costTier: service.fallbackUsed ? service.actualProvider : (costTier || 'minimal'),
        estimatedCost: estimatedCost.toFixed(6),
        provider: service.provider,
        model: service.model,
        generationTimestamp: new Date().toISOString()
      }
    };

    // Add fallback information if applicable
    if (service.fallbackUsed) {
      response.warnings = [`Requested ${service.originalProvider} unavailable, used ${service.actualProvider} instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      error: 'Quiz generation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate exam paper
 * POST /api/content-generation/exam
 * @requires Authentication - Teacher or Admin role
 */
router.post('/exam', verifyToken, requireTeacher, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      duration = 60,
      totalMarks = 50,
      grade = 10,
      costTier = 'standard',
      provider,
      model
    } = req.body;

    // Validate required parameters
    if (!subject || !topicTitle) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service
    let service;
    try {
      service = getLLMService({ provider, costTier, model });
    } catch (serviceError) {
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message
      });
    }

    // Build prompt for exam generation
    const prompt = `You are an expert IGCSE ${subject} examiner creating a formal exam paper for Grade ${grade} students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Paper Duration: ${duration} minutes
Total Marks: ${totalMarks}

Create a complete IGCSE ${subject} exam paper section covering "${topicTitle}".

Requirements:
- Follow official IGCSE exam paper format and style
- Include command words (state, explain, describe, calculate, etc.)
- Provide appropriate mark allocations
- Include a variety of question types and difficulty levels
- Ensure questions are printer-friendly and clearly formatted
- Include space indicators for student answers

Return JSON format:
{
  "title": "IGCSE ${subject} - ${topicTitle}",
  "instructions": "Answer ALL questions. Show your working clearly.",
  "duration_minutes": ${duration},
  "total_marks": ${totalMarks},
  "questions": [
    {
      "question_number": "1",
      "question_text": "Question with clear instructions",
      "marks": 3,
      "answer_space_lines": 4,
      "command_words": ["explain", "describe"],
      "difficulty_level": 1-5
    }
  ]
}`;

    // Generate content
    const result = await service.generateJSON(prompt, {
      maxTokens: 3000,
      temperature: 0.5
    });

    // Calculate cost
    const estimatedTokens = 8 * 200;
    const costPerToken = getCostPerToken(service.provider);
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response
    const response = {
      ...result,
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        questionCount: result.questions?.length || 0,
        costTier: service.fallbackUsed ? service.actualProvider : (costTier || 'standard'),
        estimatedCost: estimatedCost.toFixed(6),
        provider: service.provider,
        model: service.model,
        generationTimestamp: new Date().toISOString()
      }
    };

    if (service.fallbackUsed) {
      response.warnings = [`Requested ${service.originalProvider} unavailable, used ${service.actualProvider} instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Exam generation error:', error);
    res.status(500).json({
      error: 'Exam generation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate flashcards
 * POST /api/content-generation/flashcards
 * @requires Authentication - Teacher or Admin role
 */
router.post('/flashcards', verifyToken, requireTeacher, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      cardCount = 10,
      grade = 10,
      costTier = 'minimal',
      provider,
      model
    } = req.body;

    // Validate required parameters
    if (!subject || !topicTitle) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service
    let service;
    try {
      service = getLLMService({ provider, costTier, model });
    } catch (serviceError) {
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message
      });
    }

    // Build prompt for flashcard generation
    const prompt = `You are an expert IGCSE ${subject} educator creating study flashcards for Grade ${grade} students.

Topic: ${topicTitle}
Syllabus Code: ${syllabusCode}
Card Count: ${cardCount}

Generate ${cardCount} effective study flashcards for the topic "${topicTitle}".

Requirements:
- Create clear, concise question-answer pairs
- Focus on key concepts, definitions, and formulas
- Use active recall principles
- Include memory aids and mnemonics where helpful
- Ensure answers are complete but not overwhelming

Return JSON format:
{
  "flashcards": [
    {
      "front_content": "Clear question or term",
      "back_content": "Comprehensive but concise answer",
      "card_type": "basic",
      "difficulty_level": 1-5,
      "tags": ["concept", "definition", "formula"],
      "hint": "Optional memory aid or hint",
      "syllabus_reference": "${syllabusCode}"
    }
  ]
}`;

    // Generate content
    const result = await service.generateJSON(prompt, {
      maxTokens: 2500,
      temperature: 0.6
    });

    // Calculate cost
    const estimatedTokens = cardCount * 100;
    const costPerToken = getCostPerToken(service.provider);
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response
    const response = {
      flashcards: result.flashcards || [],
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        cardCount: result.flashcards?.length || 0,
        costTier: service.fallbackUsed ? service.actualProvider : (costTier || 'minimal'),
        estimatedCost: estimatedCost.toFixed(6),
        provider: service.provider,
        model: service.model,
        generationTimestamp: new Date().toISOString()
      }
    };

    if (service.fallbackUsed) {
      response.warnings = [`Requested ${service.originalProvider} unavailable, used ${service.actualProvider} instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({
      error: 'Flashcard generation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generic text generation endpoint
 * POST /api/content-generation/generate
 * @requires Authentication - Teacher or Admin role
 */
router.post('/generate', verifyToken, requireTeacher, async (req, res) => {
  try {
    const {
      prompt,
      provider,
      model,
      costTier = 'minimal',
      temperature = 0.7,
      maxTokens = 1000
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'Prompt is required'
      });
    }

    // Get LLM service
    let service;
    try {
      service = getLLMService({ provider, costTier, model });
    } catch (serviceError) {
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message
      });
    }

    // Generate content
    const result = await service.generateText(prompt, { temperature, maxTokens });

    res.json({
      content: result,
      metadata: {
        provider: service.provider,
        model: service.model,
        fallbackUsed: service.fallbackUsed || false,
        generationTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Text generation error:', error);
    res.status(500).json({
      error: 'Text generation failed',
      details: error.message
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cost per token for a provider
 * @param {string} provider - Provider name
 * @returns {number} Cost per token
 */
function getCostPerToken(provider) {
  const costs = {
    huggingface: 0.0001 / 1000000,
    google: 0.075 / 1000000,
    openai: 0.15 / 1000000
  };
  return costs[provider] || 0.15 / 1000000;
}

module.exports = router;
