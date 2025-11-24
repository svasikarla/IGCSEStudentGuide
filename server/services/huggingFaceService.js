/**
 * Hugging Face Inference Service
 *
 * Provides text and JSON generation using Hugging Face Inference Providers API.
 * Supports multiple models with automatic fallback and cost optimization.
 *
 * Uses shared JSONParserService for all JSON cleanup and parsing logic.
 * This eliminates ~400 lines of duplicate code that was previously in this file.
 */

const fetch = require('node-fetch');
const JSONParserService = require('./jsonParserService');

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HF_TOKEN;
    this.baseUrl = 'https://router.huggingface.co/v1';

    if (!this.apiKey) {
      console.warn('⚠️  Hugging Face service not configured - HF_TOKEN missing');
    } else {
      console.log('✅ Hugging Face service initialized successfully');
    }
  }

  /**
   * Check if the service is properly configured
   */
  static isConfigured() {
    return !!process.env.HF_TOKEN;
  }

  /**
   * Get available models for Hugging Face
   */
  getAvailableModels() {
    return [
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.1-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen-2.5-7B-Instruct',
      'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
      'meta-llama/Llama-3.2-3B-Instruct'
    ];
  }

  /**
   * Generate text content using Hugging Face
   * @param {string} prompt - The prompt to send to Hugging Face
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    try {
      const {
        model = 'meta-llama/Llama-3.1-8B-Instruct',
        temperature = 0.7,
        maxTokens = 2000
      } = options;

      console.log(`Generating text with Hugging Face model: ${model}, temperature: ${temperature}`);

      // Validate model availability
      const availableModels = this.getAvailableModels();
      const modelToUse = availableModels.includes(model) ? model : availableModels[0];

      if (model !== modelToUse) {
        console.warn(`Requested model ${model} not available. Falling back to ${modelToUse}`);
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
      });

      // Race between the actual request and the timeout
      const response = await Promise.race([
        fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature,
            max_tokens: maxTokens,
            stream: false
          })
        }),
        timeoutPromise
      ]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Hugging Face API');
      }

      const generatedText = data.choices[0].message.content;
      console.log(`Generated text length: ${generatedText.length} characters`);

      return generatedText;
    } catch (error) {
      console.error('Hugging Face text generation error:', error);
      throw new Error(`Hugging Face text generation error: ${error.message}`);
    }
  }

  /**
   * Generate JSON content using Hugging Face
   * @param {string} prompt - The prompt to send to Hugging Face
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSON(prompt, options = {}) {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Hugging Face JSON generation attempt ${attempt}/${maxRetries}`);

        const {
          model = 'meta-llama/Llama-3.1-8B-Instruct',
          temperature = 0.7,
          maxTokens = 2000
        } = options;

        console.log(`Generating JSON with Hugging Face model: ${model}`);

      // Enhanced prompt for JSON generation
      const jsonPrompt = `${prompt}

IMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON object.

Requirements:
- Return only valid JSON that can be parsed by JSON.parse()
- Do not include markdown code blocks or formatting
- Ensure all strings are properly escaped
- Close all brackets and braces properly
- Use double quotes for all string keys and values

VALID JSON EXAMPLE:
{
  "title": "Sample Title",
  "description": "A description with \\"quoted\\" text and\\nmultiple lines",
  "content": "Content with proper escaping",
  "difficulty_level": 3,
  "learning_objectives": ["Objective 1", "Objective 2"]
}

IMPORTANT: Your response must be parseable by JSON.parse() without any modifications. Ensure the JSON is complete and properly closed.

KEEP RESPONSES CONCISE: Limit explanations to 1-2 sentences to prevent truncation.`;

      // Increase token limit to reduce truncation risk
      const adjustedMaxTokens = Math.max(maxTokens, 2000);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: jsonPrompt
            }
          ],
          temperature,
          max_tokens: adjustedMaxTokens,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      let jsonText = data.choices[0].message.content;

      console.log(`Raw Hugging Face response length: ${jsonText.length} chars`);
      console.log(`Raw JSON response (first 200 chars): ${jsonText.substring(0, 200)}`);

      // Check for truncation indicators using shared parser
      if (JSONParserService.isResponseTruncated(jsonText)) {
        console.warn('⚠️ Response appears to be truncated, attempting recovery...');
      }

      // Clean up the response with shared JSON parser
      jsonText = JSONParserService.cleanupJsonString(jsonText);

      // Try to parse
      try {
        const parsed = JSON.parse(jsonText);
        console.log(`✅ Hugging Face JSON generation successful on attempt ${attempt}`);
        return parsed;
      } catch (parseError) {
        console.log('JSON parse failed after cleanup, this should not happen');
        throw parseError;
      }

      } catch (error) {
        lastError = error;
        console.error(`❌ Hugging Face JSON generation attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          console.error('🚨 All Hugging Face JSON generation attempts failed');
          break;
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // If all attempts failed, throw the last error
    throw new Error(`Hugging Face JSON generation failed after ${maxRetries} attempts: ${lastError.message}`);
  }
}

module.exports = HuggingFaceService;
