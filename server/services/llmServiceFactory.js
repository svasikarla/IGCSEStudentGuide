/**
 * LLM Service Factory
 *
 * Centralized service selection and initialization for all LLM providers.
 * Provides intelligent fallback and cost-tier based provider selection.
 */

const GeminiService = require('./geminiService');
const HuggingFaceService = require('./huggingFaceService');
const OpenAI = require('openai');

// Initialize services
let geminiService = null;
let huggingFaceService = null;
let openaiClient = null;

// Track initialization errors
const serviceErrors = [];

// Initialize Gemini
try {
  if (GeminiService.isConfigured()) {
    geminiService = new GeminiService();
    console.log('✅ Gemini service initialized successfully');
  } else {
    serviceErrors.push('Gemini: API key not configured');
    console.warn('⚠️  Gemini service not configured');
  }
} catch (error) {
  serviceErrors.push(`Gemini: ${error.message}`);
  console.error('❌ Gemini initialization failed:', error.message);
}

// Initialize Hugging Face
try {
  if (HuggingFaceService.isConfigured()) {
    huggingFaceService = new HuggingFaceService();
    console.log('✅ Hugging Face service initialized successfully');
  } else {
    serviceErrors.push('HuggingFace: API key not configured');
    console.warn('⚠️  Hugging Face service not configured');
  }
} catch (error) {
  serviceErrors.push(`HuggingFace: ${error.message}`);
  console.error('❌ Hugging Face initialization failed:', error.message);
}

// Initialize OpenAI
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI service initialized successfully');
  } else {
    serviceErrors.push('OpenAI: API key not configured');
    console.warn('⚠️  OpenAI service not configured');
  }
} catch (error) {
  serviceErrors.push(`OpenAI: ${error.message}`);
  console.error('❌ OpenAI initialization failed:', error.message);
}

// Initialize Azure OpenAI
let azureClient = null;
try {
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    const { AzureOpenAI } = require('openai');
    azureClient = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    });
    console.log('✅ Azure OpenAI service initialized successfully');
  } else {
    serviceErrors.push('Azure OpenAI: API key or Endpoint not configured');
    console.warn('⚠️  Azure OpenAI service not configured');
  }
} catch (error) {
  serviceErrors.push(`Azure OpenAI: ${error.message}`);
  console.error('❌ Azure OpenAI initialization failed:', error.message);
}

// Cost-optimized model selection by tier
const MODEL_SELECTION = {
  ultra_minimal: { provider: 'huggingface', model: 'meta-llama/Llama-3.1-8B-Instruct' },  // ~$0.0001/1M tokens
  minimal: { provider: 'google', model: 'gemini-1.5-flash' },                            // ~$0.075/1M tokens
  standard: { provider: 'openai', model: 'gpt-4o-mini' },                                // ~$0.15/1M tokens
  premium: { provider: 'openai', model: 'gpt-4o' }                                       // ~$30/1M tokens
};

/**
 * Get the appropriate LLM service based on provider or cost tier
 * @param {Object} options - Selection options
 * @param {string} options.provider - Specific provider (openai, google, huggingface, azure)
 * @param {string} options.costTier - Cost tier (ultra_minimal, minimal, standard, premium)
 * @param {string} options.model - Specific model to use
 * @returns {Object} Service object with methods and metadata
 */
function getLLMService(options = {}) {
  const { provider, costTier = 'minimal', model } = options;

  // If specific provider requested, try to use it
  if (provider) {
    return getServiceByProvider(provider, model);
  }

  // Otherwise, use cost tier to select provider
  const tierConfig = MODEL_SELECTION[costTier] || MODEL_SELECTION.minimal;
  return getServiceByProvider(tierConfig.provider, model || tierConfig.model);
}

/**
 * Get service by specific provider name with fallback
 * @param {string} providerName - Provider name (openai, google, huggingface, azure)
 * @param {string} modelOverride - Optional model override
 * @returns {Object} Service object
 */
function getServiceByProvider(providerName, modelOverride) {
  const provider = providerName.toLowerCase();

  // Try requested provider first
  switch (provider) {
    case 'huggingface':
    case 'hf':
      if (huggingFaceService) {
        return createServiceWrapper('huggingface', huggingFaceService, modelOverride);
      }
      console.warn(`⚠️  Hugging Face requested but not available, attempting fallback...`);
      break;

    case 'google':
    case 'gemini':
      if (geminiService) {
        return createServiceWrapper('google', geminiService, modelOverride);
      }
      console.warn(`⚠️  Gemini requested but not available, attempting fallback...`);
      break;

    case 'openai':
      if (openaiClient) {
        return createOpenAIWrapper(modelOverride);
      }
      console.warn(`⚠️  OpenAI requested but not available, attempting fallback...`);
      break;

    case 'azure':
      if (azureClient) {
        return createAzureWrapper(modelOverride);
      }
      console.warn(`⚠️  Azure OpenAI requested but not available, attempting fallback...`);
      break;

    default:
      console.error(`❌ Unknown provider: ${provider}`);
  }

  // Fallback logic: try any available service in order of cost-effectiveness
  if (huggingFaceService) {
    console.log(`🔄 Falling back to Hugging Face (ultra-minimal tier)`);
    return {
      ...createServiceWrapper('huggingface', huggingFaceService, modelOverride),
      fallbackUsed: true,
      originalProvider: provider,
      actualProvider: 'huggingface'
    };
  }

  if (geminiService) {
    console.log(`🔄 Falling back to Gemini (minimal tier)`);
    return {
      ...createServiceWrapper('google', geminiService, modelOverride),
      fallbackUsed: true,
      originalProvider: provider,
      actualProvider: 'google'
    };
  }

  if (openaiClient) {
    console.log(`🔄 Falling back to OpenAI (standard tier)`);
    return {
      ...createOpenAIWrapper(modelOverride),
      fallbackUsed: true,
      originalProvider: provider,
      actualProvider: 'openai'
    };
  }

  if (azureClient) {
    console.log(`🔄 Falling back to Azure OpenAI`);
    return {
      ...createAzureWrapper(modelOverride),
      fallbackUsed: true,
      originalProvider: provider,
      actualProvider: 'azure'
    };
  }

  // No services available
  throw new Error(
    `No LLM services available. Issues: ${serviceErrors.join(', ')}. ` +
    `Please configure at least one API key (GOOGLE_API_KEY, OPENAI_API_KEY, AZURE_OPENAI_API_KEY, or HF_TOKEN).`
  );
}

/**
 * Create a unified service wrapper for Gemini/HuggingFace
 * @param {string} providerName - Provider name
 * @param {Object} service - Service instance
 * @param {string} modelOverride - Optional model override
 * @returns {Object} Unified service interface
 */
function createServiceWrapper(providerName, service, modelOverride) {
  const models = service.getAvailableModels();
  const defaultModel = models[0];

  return {
    provider: providerName,
    model: modelOverride || defaultModel,
    availableModels: models,
    generateText: (prompt, options) => service.generateText(prompt, {
      ...options,
      model: modelOverride || options?.model || defaultModel
    }),
    generateJSON: (prompt, options) => service.generateJSON(prompt, {
      ...options,
      model: modelOverride || options?.model || defaultModel
    })
  };
}

/**
 * Create OpenAI service wrapper
 * @param {string} modelOverride - Optional model override
 * @returns {Object} Unified service interface
 */
function createOpenAIWrapper(modelOverride) {
  const availableModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  const defaultModel = 'gpt-4o-mini';

  return {
    provider: 'openai',
    model: modelOverride || defaultModel,
    availableModels,
    generateText: async (prompt, options = {}) => {
      const response = await openaiClient.chat.completions.create({
        model: modelOverride || options.model || defaultModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });
      return response.choices[0].message.content;
    },
    generateJSON: async (prompt, options = {}) => {
      const jsonPrompt = `${prompt}

IMPORTANT: You must respond with a valid, parseable JSON object only.
- No markdown formatting, backticks, or code blocks
- No explanatory text before or after the JSON
- Ensure all property names and string values are in double quotes
- No trailing commas
- Follow proper JSON syntax`;

      const response = await openaiClient.chat.completions.create({
        model: modelOverride || options.model || defaultModel,
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

/**
 * Create Azure OpenAI service wrapper
 * @param {string} modelOverride - Optional model override
 * @returns {Object} Unified service interface
 */
function createAzureWrapper(modelOverride) {
  // Azure usually has one deployment per model, so model selection might map to deployments
  const availableModels = ['gpt-4o', 'gpt-35-turbo'];
  const defaultModel = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

  return {
    provider: 'azure',
    model: modelOverride || defaultModel,
    availableModels,
    generateText: async (prompt, options = {}) => {
      // For Azure, 'model' often refers to the deployment name
      const deploymentName = modelOverride || options.model || defaultModel;

      const response = await azureClient.chat.completions.create({
        model: deploymentName,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });
      return response.choices[0].message.content;
    },
    generateJSON: async (prompt, options = {}) => {
      const deploymentName = modelOverride || options.model || defaultModel;

      const jsonPrompt = `${prompt}

IMPORTANT: You must respond with a valid, parseable JSON object only.
- No markdown formatting, backticks, or code blocks
- No explanatory text before or after the JSON
- Ensure all property names and string values are in double quotes
- No trailing commas
- Follow proper JSON syntax`;

      const response = await azureClient.chat.completions.create({
        model: deploymentName,
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

/**
 * Get list of available providers
 * @returns {Array} Array of provider info objects
 */
function getAvailableProviders() {
  return [
    {
      id: 'openai',
      name: 'OpenAI',
      available: !!openaiClient,
      models: openaiClient ? ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] : [],
      costTier: 'standard'
    },
    {
      id: 'azure',
      name: 'Azure OpenAI',
      available: !!azureClient,
      models: azureClient ? ['gpt-4o', 'gpt-35-turbo'] : [],
      setupUrl: 'https://portal.azure.com',
      costTier: 'standard'
    },
    {
      id: 'google',
      name: 'Google Gemini',
      available: !!geminiService,
      models: geminiService ? geminiService.getAvailableModels() : [],
      setupUrl: 'https://makersuite.google.com/app/apikey',
      costTier: 'minimal'
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      available: !!huggingFaceService,
      models: huggingFaceService ? huggingFaceService.getAvailableModels() : [],
      setupUrl: 'https://huggingface.co/settings/tokens',
      costTier: 'ultra_minimal',
      description: 'Open-source models with ultra-low costs (99%+ savings)'
    }
  ];
}

/**
 * Get service health status
 * @returns {Object} Health status object
 */
function getServiceHealth() {
  return {
    timestamp: new Date().toISOString(),
    services: {
      gemini: {
        available: !!geminiService,
        configured: GeminiService.isConfigured()
      },
      huggingface: {
        available: !!huggingFaceService,
        configured: HuggingFaceService.isConfigured()
      },
      openai: {
        available: !!openaiClient,
        configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here')
      },
      azure: {
        available: !!azureClient,
        configured: !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT)
      }
    },
    errors: serviceErrors,
    status: (geminiService || huggingFaceService || openaiClient || azureClient) ? 'healthy' : 'critical'
  };
}

module.exports = {
  getLLMService,
  getAvailableProviders,
  getServiceHealth,
  MODEL_SELECTION
};
