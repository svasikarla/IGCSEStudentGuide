/**
 * Google Gemini API Service
 * Handles text and JSON generation using Google's Generative AI
 *
 * Uses shared JSONParserService for all JSON cleanup and parsing logic.
 * This eliminates ~600 lines of duplicate code that was previously in this file.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const JSONParserService = require('./jsonParserService');
const { logError, isDevelopment } = require('../utils/errorHandler');
require('dotenv').config();

class GeminiService {
  constructor() {
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      throw new Error('GOOGLE_API_KEY environment variable is required and must be a valid API key');
    }

    try {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      this.isAvailable = true;
      console.log('Gemini API initialized with key starting with:', process.env.GOOGLE_API_KEY.substring(0, 5) + '...');
    } catch (error) {
      console.error('Failed to initialize Gemini API client:', error);
      throw new Error(`Failed to initialize Gemini API client: ${error.message}`);
    }
  }

  /**
   * Check if the service is properly configured
   */
  static isConfigured() {
    return !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your_google_api_key_here');
  }

  /**
   * Generate text content using Gemini
   * @param {string} prompt - The prompt to send to Gemini
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    try {
      const {
        model = 'gemini-1.5-flash',
        temperature = 0.7,
        maxTokens = 1000
      } = options;

      console.log(`Generating text with Gemini model: ${model}, temperature: ${temperature}`);

      // Validate model availability
      const availableModels = this.getAvailableModels();
      const modelToUse = availableModels.includes(model) ? model : availableModels[0];

      if (model !== modelToUse) {
        console.warn(`Requested model ${model} not available. Falling back to ${modelToUse}`);
      }

      const geminiModel = this.genAI.getGenerativeModel({
        model: modelToUse,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });

      // Race between the actual request and the timeout
      const result = await Promise.race([
        geminiModel.generateContent(prompt),
        timeoutPromise
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      // Enhanced error logging with request details (stack trace only in dev)
      logError('GeminiService.generateText', error, {
        errorCode: error.code,
        modelRequested: options.model || 'gemini-1.5-flash'
      });

      // Check for common errors and provide more helpful messages
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(`Gemini model not found or unavailable. Try a different model.`);
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        throw new Error(`Gemini API key has insufficient permissions. Please check your API key settings.`);
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error(`Gemini API quota exceeded or rate limited. Please try again later.`);
      } else if (error.message.includes('invalid') && error.message.includes('key')) {
        throw new Error(`Invalid Gemini API key. Please check your API key configuration.`);
      } else {
        throw new Error(`Gemini API error: ${error.message}`);
      }
    }
  }

  /**
   * Generate JSON content using Gemini
   * @param {string} prompt - The prompt to send to Gemini
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSON(prompt, options = {}) {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Gemini JSON generation attempt ${attempt}/${maxRetries}`);

        const {
          model = 'gemini-1.5-flash',
          temperature = 0.7,
          maxTokens = 1000
        } = options;

        // Enhanced prompt for JSON generation with truncation prevention
        const jsonPrompt = `${prompt}

CRITICAL JSON FORMATTING REQUIREMENTS:
You MUST respond with ONLY a valid JSON object. Follow these rules exactly:

1. Start immediately with { and end with }
2. NO markdown, NO backticks, NO code blocks, NO explanatory text
3. ALL property names must be in double quotes: "property_name"
4. ALL string values must be in double quotes: "string value"
5. Use commas to separate properties, but NO trailing commas
6. For multi-line content, use \\n for line breaks within strings
7. Escape quotes within strings as \\"
8. Do NOT use single quotes anywhere
9. KEEP CONTENT EXTREMELY CONCISE to avoid truncation - prioritize completeness over detail
10. For exam papers: Generate 3-5 questions maximum to ensure completion
11. For question text: Keep under 100 characters when possible
12. For answer text: Keep under 150 characters when possible
13. Avoid lengthy explanations - use brief, direct language

VALID JSON EXAMPLE:
{
  "title": "Sample Title",
  "description": "Brief description",
  "questions": [
    {
      "question_text": "Short question?",
      "answer_text": "Brief answer",
      "marks": 5,
      "difficulty_level": 3
    }
  ]
}

CRITICAL: Your response must be parseable by JSON.parse() without any modifications. Ensure the JSON is complete and properly closed.

TRUNCATION PREVENTION: Keep total response under 4000 characters. Prioritize having fewer, complete questions rather than many incomplete ones.`;

        // Increase token limit significantly to reduce truncation risk
        const adjustedMaxTokens = Math.max(maxTokens, 4000);

        const geminiModel = this.genAI.getGenerativeModel({
          model,
          generationConfig: {
            temperature,
            maxOutputTokens: adjustedMaxTokens,
          }
        });

        const result = await geminiModel.generateContent(jsonPrompt);
        const response = await result.response;
        let jsonText = response.text();

        console.log(`Raw Gemini response length: ${jsonText.length} chars`);
        console.log(`Raw JSON response (first 200 chars): ${jsonText.substring(0, 200)}`);

        // Check for truncation indicators using shared parser
        if (JSONParserService.isResponseTruncated(jsonText)) {
          console.warn('⚠️ Response appears to be truncated, attempting recovery...');
        }

        // Clean up the response using shared parser
        jsonText = JSONParserService.cleanupJsonString(jsonText);

        const parsed = JSON.parse(jsonText);
        console.log(`✅ Gemini JSON generation successful on attempt ${attempt}`);
        return parsed;

      } catch (error) {
        lastError = error;
        console.error(`❌ Gemini JSON generation attempt ${attempt} failed:`, error.message);

        // If this was a truncation-related error and we have more attempts, try with reduced content
        if (attempt < maxRetries && (error.message.includes('truncated') || error.message.includes('parsing failed'))) {
          console.log('🔄 Retrying with reduced content requirements...');

          // Modify the prompt for the next attempt to request less content
          const reducedPrompt = prompt.replace(/\d+/g, (match) => {
            const num = parseInt(match);
            return num > 5 ? Math.max(3, Math.floor(num / 2)) : num;
          }) + '\n\nIMPORTANT: Generate only 3 questions maximum to ensure completion.';

          // Update the prompt for next iteration
          prompt = reducedPrompt;
        }

        if (attempt === maxRetries) {
          console.error('🚨 All Gemini JSON generation attempts failed');
          break;
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // If all attempts failed, throw the last error
    throw new Error(`Gemini JSON generation failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Get available Gemini models
   * @returns {Array<string>} List of available model names
   */
  getAvailableModels() {
    return [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.0-pro'
    ];
  }
}

module.exports = GeminiService;
