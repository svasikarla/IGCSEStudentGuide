/**
 * Simplified Content Generation API Routes
 * 
 * Cost-optimized endpoints that replace complex web scraping with direct LLM generation.
 * Designed for IGCSE educational content with built-in cost controls.
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
// Note: OpenAI service implementation is missing - will be handled in service selection
// const { OpenAIService } = require('../services/openaiService'); // TODO: Implement this service
const GeminiService = require('../services/geminiService');

// Initialize services with better error handling
let openaiService = null;
let geminiService = null;
let serviceErrors = [];

// Try to initialize Gemini service
try {
  if (GeminiService.isConfigured()) {
    geminiService = new GeminiService();
    console.log('✅ Gemini service initialized successfully');
  } else {
    serviceErrors.push('Gemini: API key not configured');
    console.warn('⚠️ Gemini service not available: API key not configured');
  }
} catch (error) {
  serviceErrors.push(`Gemini: ${error.message}`);
  console.error('❌ Failed to initialize Gemini service:', error.message);
}

// Check OpenAI service availability (implementation missing)
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  serviceErrors.push('OpenAI: Service implementation missing (openaiService.js not found)');
  console.warn('⚠️ OpenAI API key configured but service implementation missing');
  console.log('💡 To enable OpenAI support, create server/services/openaiService.js');
} else {
  serviceErrors.push('OpenAI: API key not configured');
  console.warn('⚠️ OpenAI service not available: API key not configured');
}

// Log service availability summary
if (serviceErrors.length > 0) {
  console.warn('🚨 Service initialization issues:', serviceErrors);
}

if (!geminiService && !openaiService) {
  console.error('💥 CRITICAL: No LLM services available! Please configure at least one API key.');
}

// Cost-optimized model selection
const MODEL_SELECTION = {
  minimal: { provider: 'google', model: 'gemini-1.5-flash' },    // ~$0.075/1M tokens
  standard: { provider: 'openai', model: 'gpt-4o-mini' },        // ~$0.15/1M tokens  
  premium: { provider: 'openai', model: 'gpt-4o' }               // ~$30/1M tokens
};

/**
 * Get the appropriate LLM service based on cost tier with intelligent fallback
 */
function getLLMService(costTier = 'minimal') {
  const config = MODEL_SELECTION[costTier];
  
  // First, try the requested provider
  switch (config.provider) {
    case 'google':
      if (geminiService) {
        console.log(`✅ Using Gemini service for ${costTier} tier`);
        return { service: geminiService, model: config.model };
      }
      console.warn(`⚠️ Gemini service not available for ${costTier} tier, attempting fallback...`);
      break;
    case 'openai':
      if (openaiService) {
        console.log(`✅ Using OpenAI service for ${costTier} tier`);
        return { service: openaiService, model: config.model };
      }
      console.warn(`⚠️ OpenAI service not available for ${costTier} tier, attempting fallback...`);
      break;
    default:
      console.error(`❌ Unknown provider: ${config.provider}`);
  }
  
  // Fallback logic: try any available service
  if (geminiService) {
    console.log(`🔄 Falling back to Gemini service (minimal cost tier)`);
    return { 
      service: geminiService, 
      model: MODEL_SELECTION.minimal.model,
      fallbackUsed: true,
      originalTier: costTier,
      actualTier: 'minimal'
    };
  }
  
  if (openaiService) {
    console.log(`🔄 Falling back to OpenAI service`);
    return { 
      service: openaiService, 
      model: MODEL_SELECTION.standard.model,
      fallbackUsed: true,
      originalTier: costTier,
      actualTier: 'standard'
    };
  }
  
  // No services available
  const availableServices = [];
  if (serviceErrors.length > 0) {
    throw new Error(`No LLM services available. Issues: ${serviceErrors.join(', ')}. Please configure at least one API key (GOOGLE_API_KEY or OPENAI_API_KEY).`);
  } else {
    throw new Error('No LLM services are properly configured. Please check your environment variables.');
  }
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ============================================================================
// Protected content generation routes (POST /quiz, /exam, /flashcards)
// require authentication and admin privileges
//
// Public routes (GET /health, /cost-estimate) defined later are NOT protected
// ============================================================================

/**
 * Generate quiz questions directly without web scraping
 * POST /api/simplified-generation/quiz
 * PROTECTED: Requires authentication and admin role
 */
router.post('/quiz', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      questionCount = 5,
      difficultyLevel = 3,
      grade = 10,
      costTier = 'minimal'
    } = req.body;

    if (!subject || !topicTitle) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service with fallback handling
    let serviceInfo;
    try {
      serviceInfo = getLLMService(costTier);
    } catch (serviceError) {
      console.error('Service selection failed:', serviceError.message);
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message,
        availableServices: serviceErrors.length > 0 ? 'None' : 'Unknown',
        suggestion: 'Please configure GOOGLE_API_KEY or OPENAI_API_KEY environment variables'
      });
    }

    const { service, model, fallbackUsed, originalTier, actualTier } = serviceInfo;

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

    // Generate content with enhanced error handling
    let result;
    try {
      result = await service.generateJSON(prompt, {
        model,
        maxTokens: 2000,
        temperature: 0.7
      });
    } catch (generationError) {
      console.error('Content generation failed:', {
        error: generationError.message,
        subject,
        topicTitle,
        model,
        costTier
      });
      
      return res.status(500).json({
        error: 'Content generation failed',
        details: generationError.message,
        context: {
          subject,
          topicTitle,
          model,
          costTier: fallbackUsed ? `${originalTier} (fallback to ${actualTier})` : costTier
        },
        suggestion: 'Try again with a different cost tier or check API key configuration'
      });
    }

    // Calculate estimated cost
    const actualCostTier = fallbackUsed ? actualTier : costTier;
    const estimatedTokens = questionCount * 150;
    const costPerToken = MODEL_SELECTION[actualCostTier].provider === 'google' ? 0.075 / 1000000 : 0.15 / 1000000;
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response with fallback information
    const response = {
      questions: result.questions || [],
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        questionCount: result.questions?.length || 0,
        difficultyLevel,
        costTier: actualCostTier,
        estimatedCost: estimatedCost.toFixed(6),
        model,
        generationTimestamp: new Date().toISOString()
      }
    };

    // Add fallback information if applicable
    if (fallbackUsed) {
      response.metadata.fallbackInfo = {
        requestedTier: originalTier,
        actualTier: actualTier,
        reason: 'Requested service unavailable'
      };
      response.warnings = [`Requested ${originalTier} tier unavailable, used ${actualTier} tier instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Unexpected error in quiz generation:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n')?.[0] || 'No stack trace',
      requestData: { subject, topicTitle, costTier }
    });
    
    res.status(500).json({ 
      error: 'Unexpected error in quiz generation',
      details: error.message,
      errorType: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
      suggestion: 'Please check server logs and try again. If the issue persists, contact support.'
    });
  }
});

/**
 * Generate exam paper directly
 * POST /api/simplified-generation/exam
 * PROTECTED: Requires authentication and admin role
 */
router.post('/exam', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      duration = 60,
      totalMarks = 50,
      grade = 10,
      costTier = 'standard' // Use standard tier for exam papers
    } = req.body;

    if (!subject || !topicTitle) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service with fallback handling
    let serviceInfo;
    try {
      serviceInfo = getLLMService(costTier);
    } catch (serviceError) {
      console.error('Service selection failed for exam generation:', serviceError.message);
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message,
        availableServices: serviceErrors.length > 0 ? 'None' : 'Unknown',
        suggestion: 'Please configure GOOGLE_API_KEY or OPENAI_API_KEY environment variables'
      });
    }

    const { service, model, fallbackUsed, originalTier, actualTier } = serviceInfo;

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

    // Generate content with enhanced error handling
    let result;
    try {
      result = await service.generateJSON(prompt, {
        model,
        maxTokens: 3000,
        temperature: 0.5
      });
    } catch (generationError) {
      console.error('Exam generation failed:', {
        error: generationError.message,
        subject,
        topicTitle,
        model,
        costTier
      });
      
      return res.status(500).json({
        error: 'Exam generation failed',
        details: generationError.message,
        context: {
          subject,
          topicTitle,
          model,
          costTier: fallbackUsed ? `${originalTier} (fallback to ${actualTier})` : costTier
        },
        suggestion: 'Try again with a different cost tier or check API key configuration'
      });
    }

    // Calculate estimated cost
    const actualCostTier = fallbackUsed ? actualTier : costTier;
    const estimatedTokens = 8 * 200; // Estimate 8 questions, 200 tokens each
    const costPerToken = MODEL_SELECTION[actualCostTier].provider === 'google' ? 0.075 / 1000000 : 0.15 / 1000000;
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response with fallback information
    const response = {
      ...result,
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        questionCount: result.questions?.length || 0,
        costTier: actualCostTier,
        estimatedCost: estimatedCost.toFixed(6),
        model,
        generationTimestamp: new Date().toISOString()
      }
    };

    // Add fallback information if applicable
    if (fallbackUsed) {
      response.metadata.fallbackInfo = {
        requestedTier: originalTier,
        actualTier: actualTier,
        reason: 'Requested service unavailable'
      };
      response.warnings = [`Requested ${originalTier} tier unavailable, used ${actualTier} tier instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Unexpected error in exam generation:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n')?.[0] || 'No stack trace',
      requestData: { subject, topicTitle, costTier, duration, totalMarks }
    });
    
    res.status(500).json({ 
      error: 'Unexpected error in exam generation',
      details: error.message,
      errorType: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
      suggestion: 'Please check server logs and try again. If the issue persists, contact support.'
    });
  }
});

/**
 * Generate flashcards directly
 * POST /api/simplified-generation/flashcards
 * PROTECTED: Requires authentication and admin role
 */
router.post('/flashcards', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      subject,
      topicTitle,
      syllabusCode,
      cardCount = 10,
      grade = 10,
      costTier = 'minimal'
    } = req.body;

    if (!subject || !topicTitle) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: 'Subject and topic title are required',
        requiredFields: ['subject', 'topicTitle']
      });
    }

    // Get LLM service with fallback handling
    let serviceInfo;
    try {
      serviceInfo = getLLMService(costTier);
    } catch (serviceError) {
      console.error('Service selection failed for flashcard generation:', serviceError.message);
      return res.status(503).json({
        error: 'No LLM services available',
        details: serviceError.message,
        availableServices: serviceErrors.length > 0 ? 'None' : 'Unknown',
        suggestion: 'Please configure GOOGLE_API_KEY or OPENAI_API_KEY environment variables'
      });
    }

    const { service, model, fallbackUsed, originalTier, actualTier } = serviceInfo;

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

    // Generate content with enhanced error handling
    let result;
    try {
      result = await service.generateJSON(prompt, {
        model,
        maxTokens: 2500,
        temperature: 0.6
      });
    } catch (generationError) {
      console.error('Flashcard generation failed:', {
        error: generationError.message,
        subject,
        topicTitle,
        model,
        costTier
      });
      
      return res.status(500).json({
        error: 'Flashcard generation failed',
        details: generationError.message,
        context: {
          subject,
          topicTitle,
          model,
          costTier: fallbackUsed ? `${originalTier} (fallback to ${actualTier})` : costTier
        },
        suggestion: 'Try again with a different cost tier or check API key configuration'
      });
    }

    // Calculate estimated cost
    const actualCostTier = fallbackUsed ? actualTier : costTier;
    const estimatedTokens = cardCount * 100;
    const costPerToken = MODEL_SELECTION[actualCostTier].provider === 'google' ? 0.075 / 1000000 : 0.15 / 1000000;
    const estimatedCost = estimatedTokens * costPerToken;

    // Prepare response with fallback information
    const response = {
      flashcards: result.flashcards || [],
      metadata: {
        subject,
        topicTitle,
        syllabusCode,
        cardCount: result.flashcards?.length || 0,
        costTier: actualCostTier,
        estimatedCost: estimatedCost.toFixed(6),
        model,
        generationTimestamp: new Date().toISOString()
      }
    };

    // Add fallback information if applicable
    if (fallbackUsed) {
      response.metadata.fallbackInfo = {
        requestedTier: originalTier,
        actualTier: actualTier,
        reason: 'Requested service unavailable'
      };
      response.warnings = [`Requested ${originalTier} tier unavailable, used ${actualTier} tier instead`];
    }

    res.json(response);

  } catch (error) {
    console.error('Unexpected error in flashcard generation:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n')?.[0] || 'No stack trace',
      requestData: { subject, topicTitle, costTier, cardCount }
    });
    
    res.status(500).json({ 
      error: 'Unexpected error in flashcard generation',
      details: error.message,
      errorType: error.name || 'UnknownError',
      timestamp: new Date().toISOString(),
      suggestion: 'Please check server logs and try again. If the issue persists, contact support.'
    });
  }
});

/**
 * Health check endpoint to diagnose service availability
 * GET /api/simplified-generation/health
 */
router.get('/health', (req, res) => {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    services: {
      gemini: {
        available: !!geminiService,
        configured: GeminiService.isConfigured(),
        model: geminiService ? 'gemini-1.5-flash' : null
      },
      openai: {
        available: !!openaiService,
        configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
        model: openaiService ? 'gpt-4o-mini' : null
      }
    },
    errors: serviceErrors,
    modelSelection: MODEL_SELECTION,
    recommendations: []
  };

  // Add recommendations based on service availability
  if (!healthStatus.services.gemini.available && !healthStatus.services.openai.available) {
    healthStatus.status = 'critical';
    healthStatus.recommendations.push('Configure at least one API key (GOOGLE_API_KEY or OPENAI_API_KEY)');
  } else if (healthStatus.services.gemini.available && !healthStatus.services.openai.available) {
    healthStatus.status = 'partial';
    healthStatus.recommendations.push('Only Gemini service available. Consider adding OpenAI for premium tier support.');
  } else if (!healthStatus.services.gemini.available && healthStatus.services.openai.available) {
    healthStatus.status = 'partial';
    healthStatus.recommendations.push('Only OpenAI service available. Consider adding Gemini for cost-effective generation.');
  } else {
    healthStatus.status = 'healthy';
    healthStatus.recommendations.push('All services operational');
  }

  const statusCode = healthStatus.status === 'critical' ? 503 : 200;
  res.status(statusCode).json(healthStatus);
});

/**
 * Get cost estimates for different generation options
 * GET /api/simplified-generation/cost-estimate
 */
router.get('/cost-estimate', (req, res) => {
  const { contentType, itemCount = 5 } = req.query;

  const estimatedTokens = {
    quiz: parseInt(itemCount) * 150,
    exam: parseInt(itemCount) * 200,
    flashcards: parseInt(itemCount) * 100
  };

  const costs = {
    minimal: (estimatedTokens[contentType] || 0) * (0.075 / 1000000),
    standard: (estimatedTokens[contentType] || 0) * (0.15 / 1000000),
    premium: (estimatedTokens[contentType] || 0) * (30 / 1000000)
  };

  res.json({
    contentType,
    itemCount: parseInt(itemCount),
    estimatedTokens: estimatedTokens[contentType] || 0,
    costs: {
      minimal: costs.minimal.toFixed(6),
      standard: costs.standard.toFixed(6),
      premium: costs.premium.toFixed(6)
    },
    recommendations: {
      costEffective: 'minimal',
      balanced: 'standard',
      highQuality: 'premium'
    }
  });
});

module.exports = router;
