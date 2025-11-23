/**
 * Embeddings API Routes
 * 
 * Provides endpoints for generating vector embeddings using various providers
 * (OpenAI, Cohere, etc.) for the semantic search functionality.
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Import embedding providers
let openaiClient = null;
let cohereClient = null;

// Initialize OpenAI if API key is available
if (process.env.OPENAI_API_KEY) {
  try {
    const { OpenAI } = require('openai');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI embedding service initialized');
  } catch (error) {
    console.warn('⚠️ OpenAI not available:', error.message);
  }
}

// Initialize Cohere if API key is available
if (process.env.COHERE_API_KEY) {
  try {
    const { CohereClient } = require('cohere-ai');
    cohereClient = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });
    console.log('✅ Cohere embedding service initialized');
  } catch (error) {
    console.warn('⚠️ Cohere not available:', error.message);
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(text) {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI embedding failed: ${error.message}`);
  }
}

/**
 * Generate embedding using Cohere
 */
async function generateCohereEmbedding(text) {
  if (!cohereClient) {
    throw new Error('Cohere client not initialized');
  }

  try {
    const response = await cohereClient.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    return response.embeddings[0];
  } catch (error) {
    console.error('Cohere embedding error:', error);
    throw new Error(`Cohere embedding failed: ${error.message}`);
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
// Embeddings are used for semantic search (student-facing feature)
// Requires authentication but NOT admin privileges
// Public routes: GET /providers, GET /health
// Protected routes: POST /generate, POST /batch
// ============================================================================

/**
 * POST /api/embeddings/generate
 * Generate embedding for a text input
 * PROTECTED: Requires authentication (for students & admins)
 */
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text input is required and must be a string'
      });
    }

    if (text.length > 8000) {
      return res.status(400).json({
        error: 'Text input too long (max 8000 characters)'
      });
    }

    let embedding;

    switch (provider.toLowerCase()) {
      case 'openai':
        if (!openaiClient) {
          return res.status(503).json({
            error: 'OpenAI service not available. Please configure OPENAI_API_KEY.'
          });
        }
        embedding = await generateOpenAIEmbedding(text);
        break;

      case 'cohere':
        if (!cohereClient) {
          return res.status(503).json({
            error: 'Cohere service not available. Please configure COHERE_API_KEY.'
          });
        }
        embedding = await generateCohereEmbedding(text);
        break;

      default:
        return res.status(400).json({
          error: `Unsupported provider: ${provider}. Supported providers: openai, cohere`
        });
    }

    res.json({
      embedding,
      provider,
      dimensions: embedding.length,
      text_length: text.length
    });

  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({
      error: 'Failed to generate embedding',
      details: error.message
    });
  }
});

/**
 * POST /api/embeddings/batch
 * Generate embeddings for multiple texts
 * PROTECTED: Requires authentication (for students & admins)
 */
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { texts, provider = 'openai' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: 'Texts must be a non-empty array'
      });
    }

    if (texts.length > 100) {
      return res.status(400).json({
        error: 'Too many texts (max 100 per batch)'
      });
    }

    // Validate all texts
    for (const text of texts) {
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          error: 'All texts must be non-empty strings'
        });
      }
      if (text.length > 8000) {
        return res.status(400).json({
          error: 'Text too long (max 8000 characters per text)'
        });
      }
    }

    const embeddings = [];
    const errors = [];

    for (let i = 0; i < texts.length; i++) {
      try {
        let embedding;

        switch (provider.toLowerCase()) {
          case 'openai':
            if (!openaiClient) {
              throw new Error('OpenAI service not available');
            }
            embedding = await generateOpenAIEmbedding(texts[i]);
            break;

          case 'cohere':
            if (!cohereClient) {
              throw new Error('Cohere service not available');
            }
            embedding = await generateCohereEmbedding(texts[i]);
            break;

          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }

        embeddings.push({
          index: i,
          embedding,
          success: true
        });

        // Add small delay between requests to respect rate limits
        if (i < texts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        embeddings.push({
          index: i,
          embedding: null,
          success: false,
          error: error.message
        });
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.json({
      embeddings,
      provider,
      total_count: texts.length,
      success_count: embeddings.filter(e => e.success).length,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Batch embedding generation error:', error);
    res.status(500).json({
      error: 'Failed to generate batch embeddings',
      details: error.message
    });
  }
});

/**
 * GET /api/embeddings/providers
 * Get available embedding providers
 */
router.get('/providers', (req, res) => {
  const providers = [];

  if (openaiClient) {
    providers.push({
      name: 'openai',
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      max_tokens: 8191,
      available: true
    });
  }

  if (cohereClient) {
    providers.push({
      name: 'cohere',
      model: 'embed-english-v3.0',
      dimensions: 1024,
      max_tokens: 512,
      available: true
    });
  }

  res.json({
    providers,
    default_provider: providers.length > 0 ? providers[0].name : null,
    total_available: providers.length
  });
});

/**
 * GET /api/embeddings/health
 * Health check for embedding services
 */
router.get('/health', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Test OpenAI
  if (openaiClient) {
    try {
      await generateOpenAIEmbedding('test');
      health.services.openai = { status: 'healthy', available: true };
    } catch (error) {
      health.services.openai = { 
        status: 'error', 
        available: false, 
        error: error.message 
      };
    }
  } else {
    health.services.openai = { 
      status: 'unavailable', 
      available: false, 
      reason: 'API key not configured' 
    };
  }

  // Test Cohere
  if (cohereClient) {
    try {
      await generateCohereEmbedding('test');
      health.services.cohere = { status: 'healthy', available: true };
    } catch (error) {
      health.services.cohere = { 
        status: 'error', 
        available: false, 
        error: error.message 
      };
    }
  } else {
    health.services.cohere = { 
      status: 'unavailable', 
      available: false, 
      reason: 'API key not configured' 
    };
  }

  const availableServices = Object.values(health.services).filter(s => s.available).length;
  health.overall_status = availableServices > 0 ? 'healthy' : 'unhealthy';
  health.available_services = availableServices;

  res.json(health);
});

module.exports = router;
