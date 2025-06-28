/**
 * LLM API routes for content generation
 * Protected by authentication and admin middleware
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const OpenAI = require('openai');
const GeminiService = require('../services/geminiService');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini service
let geminiService = null;
try {
  if (GeminiService.isConfigured()) {
    geminiService = new GeminiService();
    console.log('✅ Google Gemini service initialized successfully');
  } else {
    console.warn('⚠️  Google Gemini service not configured - GOOGLE_API_KEY missing or invalid');
  }
} catch (error) {
  console.warn('❌ Gemini service initialization failed:', error.message);
}

// Public endpoints (no auth required)
/**
 * Get available providers
 * GET /api/llm/providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = [
      {
        id: 'openai',
        name: 'OpenAI',
        available: !!process.env.OPENAI_API_KEY,
        models: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ]
      },
      {
        id: 'google',
        name: 'Google Gemini',
        available: !!geminiService,
        models: geminiService ? geminiService.getAvailableModels() : [],
        setupUrl: 'https://makersuite.google.com/app/apikey',
        note: geminiService ? null : 'Requires valid GOOGLE_API_KEY environment variable'
      }
    ];

    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch available providers' });
  }
});

/**
 * Get available models for each provider
 * GET /api/llm/models
 */
router.get('/models', async (req, res) => {
  try {
    const models = {
      openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      google: geminiService ? geminiService.getAvailableModels() : []
    };

    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch available models' });
  }
});

// Add a middleware to handle OPTIONS requests (CORS preflight) before auth
router.options('*', (req, res) => {
  res.status(200).end();
});

// Apply both middlewares to protected LLM routes
// This ensures only authenticated admin users can access these endpoints
router.use(verifyToken, requireAdmin);

/**
 * Helper function to get the appropriate LLM service based on provider
 * @param {string} provider - The LLM provider ('openai' or 'google')
 * @returns {Object} Service object with generateText and generateJSON methods
 */
function getLLMService(provider = 'openai') {
  switch (provider.toLowerCase()) {
    case 'google':
    case 'gemini':
      if (!geminiService) {
        throw new Error('Google Gemini service is not available. Please configure a valid GOOGLE_API_KEY in your environment variables. Get your API key from: https://makersuite.google.com/app/apikey');
      }
      return {
        generateText: (prompt, options) => geminiService.generateText(prompt, options),
        generateJSON: (prompt, options) => geminiService.generateJSON(prompt, options)
      };
    case 'openai':
    default:
      return {
        generateText: async (prompt, options) => {
          const response = await openai.chat.completions.create({
            model: options.model || 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000,
          });
          return response.choices[0].message.content;
        },
        generateJSON: async (prompt, options) => {
          const jsonPrompt = `${prompt}

IMPORTANT: You must respond with a valid, parseable JSON object only.
- No markdown formatting, backticks, or code blocks
- No explanatory text before or after the JSON
- Ensure all property names and string values are in double quotes
- No trailing commas
- Follow proper JSON syntax`;

          const response = await openai.chat.completions.create({
            model: options.model || 'gpt-4o',
            messages: [{ role: 'user', content: jsonPrompt }],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000,
            response_format: { type: 'json_object' },
          });

          const jsonText = response.choices[0].message.content.trim();
          return JSON.parse(jsonText);
        }
      };
  }
}

/**
 * Generate text content using LLM
 * POST /api/llm/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      prompt,
      model = 'gpt-4o',
      temperature = 0.7,
      max_tokens = 1000,
      provider = 'openai'
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const llmService = getLLMService(provider);
    const generatedText = await llmService.generateText(prompt, {
      model,
      temperature,
      maxTokens: max_tokens
    });

    res.json({ text: generatedText });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Failed to generate text content' });
  }
});

/**
 * Generate JSON content using LLM
 * POST /api/llm/generate-json
 */
router.post('/generate-json', async (req, res) => {
  try {
    const {
      prompt,
      model = 'gpt-4o',
      temperature = 0.7,
      max_tokens = 1000,
      provider = 'openai'
    } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const llmService = getLLMService(provider);
      const parsedJson = await llmService.generateJSON(prompt, {
        model,
        temperature,
        maxTokens: max_tokens
      });

      res.json(parsedJson);
    } catch (llmError) {
      console.error('LLM API error:', llmError);
      res.status(500).json({
        error: `${provider.toUpperCase()} API error: ${llmError.message}`,
        details: llmError.response?.data || {}
      });
    }
  } catch (error) {
    console.error('Error generating JSON:', error);
    res.status(500).json({ error: 'Failed to generate JSON content' });
  }
});

/**
 * Generate comprehensive curriculum using chunked generation approach
 *
 * This endpoint implements a two-phase chunked generation strategy:
 * 1. Phase 1: Generate major curriculum areas (5-10 areas)
 * 2. Phase 2: Generate detailed topics and subtopics for each area
 * 3. Combines results into hierarchical structure with syllabus codes
 *
 * Provides 50-100+ topics with complete IGCSE syllabus coverage
 * POST /api/llm/generate-curriculum
 */
router.post('/generate-curriculum', async (req, res) => {
  try {
    const {
      subjectName,
      gradeLevel,
      curriculumBoard = 'Cambridge IGCSE',
      tier,
      model = 'gpt-4o-mini', // Use cost-effective model for curriculum generation
      temperature = 0.3,
      provider = 'openai'
    } = req.body;

    if (!subjectName || !gradeLevel) {
      return res.status(400).json({
        error: 'Subject name and grade level are required'
      });
    }

    const llmService = getLLMService(provider);

    // Step 1: Generate major curriculum areas
    const majorAreasPrompt = `
      You are an expert ${curriculumBoard} curriculum designer.

      Generate the major curriculum areas for "${subjectName}" at grade level(s) "${gradeLevel}"${tier ? ` (${tier} tier)` : ''}.

      Return 5-8 major areas that comprehensively cover the entire syllabus.

      Return a JSON array of objects with:
      {
        "title": "Major area title",
        "description": "Brief description of this curriculum area",
        "syllabus_code": "Sequential code (1, 2, 3, etc.)",
        "official_syllabus_ref": "Official reference if known"
      }
    `;

    const majorAreasResponse = await llmService.generateText(majorAreasPrompt, {
      model,
      temperature,
      maxTokens: 2000
    });

    const majorAreasJson = majorAreasResponse.substring(
      majorAreasResponse.indexOf('['),
      majorAreasResponse.lastIndexOf(']') + 1
    );
    const majorAreas = JSON.parse(majorAreasJson);

    // Step 2: Generate detailed topics for each major area
    const allTopics = [];

    for (const area of majorAreas) {
      const detailedPrompt = `
        You are an expert ${curriculumBoard} curriculum designer.

        For the major area "${area.title}" in "${subjectName}" (${gradeLevel}${tier ? `, ${tier} tier` : ''}), generate a comprehensive breakdown of ALL topics and subtopics.

        Generate 8-15 topics with 2-4 subtopics each to ensure complete coverage of this curriculum area.

        IMPORTANT TITLE REQUIREMENTS:
        - Create SPECIFIC, DESCRIPTIVE titles that avoid generic terms
        - DO NOT use generic titles like "Introduction", "Overview", "Fundamentals", "Basics", "Principles"
        - Instead use specific titles like "Cell Structure Components", "DNA Replication Process", "Photosynthesis Mechanisms"
        - Each title must be unique and descriptive of the specific content
        - Include the major area context in titles when helpful for clarity

        Return a JSON array where each object has:
        {
          "title": "Specific, descriptive topic/subtopic title (avoid generic terms)",
          "description": "Brief description (1 sentence)",
          "major_area": "${area.title}",
          "topic_level": 2|3,
          "syllabus_code": "${area.syllabus_code}.X" or "${area.syllabus_code}.X.Y",
          "official_syllabus_ref": "Official reference if applicable",
          "difficulty_level": 1-5,
          "estimated_study_time_minutes": 30-90
        }
      `;

      const detailedResponse = await llmService.generateText(detailedPrompt, {
        model,
        temperature,
        maxTokens: 4000
      });

      if (detailedResponse) {
        const detailedJson = detailedResponse.substring(
          detailedResponse.indexOf('['),
          detailedResponse.lastIndexOf(']') + 1
        );
        const detailedTopics = JSON.parse(detailedJson);

        // Add the major area as level 1
        allTopics.push({
          title: area.title,
          description: area.description,
          major_area: area.title,
          topic_level: 1,
          syllabus_code: area.syllabus_code,
          official_syllabus_ref: area.official_syllabus_ref,
          difficulty_level: 2,
          estimated_study_time_minutes: 60,
          curriculum_board: curriculumBoard,
          tier: tier || null,
        });

        // Add all detailed topics
        allTopics.push(...detailedTopics.map(topic => ({
          ...topic,
          curriculum_board: curriculumBoard,
          tier: tier || null,
        })));
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      topics: allTopics,
      metadata: {
        totalTopics: allTopics.length,
        majorAreas: majorAreas.length,
        curriculumBoard,
        tier,
        subjectName,
        gradeLevel
      }
    });

  } catch (error) {
    console.error('Error generating comprehensive curriculum:', error);
    res.status(500).json({
      error: 'Failed to generate comprehensive curriculum',
      details: error.message
    });
  }
});

module.exports = router;
