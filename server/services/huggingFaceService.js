/**
 * Hugging Face Inference Service
 * 
 * Provides text and JSON generation using Hugging Face Inference Providers API.
 * Supports multiple models with automatic fallback and cost optimization.
 */

const fetch = require('node-fetch');

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

      // Check for truncation indicators
      if (this._isResponseTruncated(jsonText)) {
        console.warn('⚠️ Response appears to be truncated, attempting recovery...');
      }

      // Clean up the response with smart fixing
      jsonText = this._cleanupJsonString(jsonText);

      // Try to parse, with smart fixing if needed
      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        console.log('Initial JSON parse failed, attempting smart fix:', parseError.message);

        // Apply smart JSON fixing
        const fixedJson = this._smartJsonFix(jsonText);

        try {
          const parsed = JSON.parse(fixedJson);
          console.log(`✅ Hugging Face JSON fixed and parsed successfully on attempt ${attempt}`);
          return parsed;
        } catch (finalError) {
          console.error('Smart fix failed, using fallback...');

          // Return a valid fallback JSON instead of throwing
          const fallbackJson = this._createFallbackJson(jsonText, finalError.message);
          console.log('🔄 Using fallback JSON structure');
          return JSON.parse(fallbackJson);
        }
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

  /**
   * Check if response appears to be truncated
   */
  _isResponseTruncated(text) {
    const truncationIndicators = [
      '...',
      'truncated',
      'incomplete',
      /\{[^}]*$/,  // Unclosed object at end
      /\[[^\]]*$/  // Unclosed array at end
    ];
    
    return truncationIndicators.some(indicator => {
      if (typeof indicator === 'string') {
        return text.toLowerCase().includes(indicator);
      } else {
        return indicator.test(text);
      }
    });
  }

  /**
   * Clean up JSON string for parsing with enhanced handling
   */
  _cleanupJsonString(jsonText) {
    if (!jsonText) return '{}';

    console.log('🔧 Cleaning up Hugging Face JSON response...');

    // Step 1: Remove markdown code fences and whitespace
    jsonText = jsonText.replace(/```json\n?/g, '')
                      .replace(/```\n?/g, '')
                      .replace(/```/g, '')
                      .trim();

    // Step 2: Ensure we start with a JSON object/array
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      const objStart = jsonText.indexOf('{');
      if (objStart >= 0) {
        jsonText = jsonText.substring(objStart);
      } else {
        // No JSON found, return empty object
        return '{}';
      }
    }

    // Step 3: Try to parse as-is first
    try {
      const parsed = JSON.parse(jsonText);
      console.log('✅ JSON parsed successfully without fixes');
      return JSON.stringify(parsed);
    } catch (initialError) {
      console.log('Initial JSON parse failed, will apply smart fixes:', initialError.message);

      // Apply smart fixes immediately
      try {
        const fixedJson = this._smartJsonFix(jsonText);
        const parsed = JSON.parse(fixedJson);
        console.log('✅ JSON fixed and parsed successfully in cleanup');
        return JSON.stringify(parsed);
      } catch (smartFixError) {
        console.log('Smart fix failed in cleanup, returning original for fallback:', smartFixError.message);
        return jsonText; // Return for fallback handling
      }
    }
  }

  /**
   * Smart JSON fix that handles most common issues with a simple approach
   * @param {string} jsonString - The malformed JSON string
   * @returns {string} Fixed JSON string
   */
  _smartJsonFix(jsonString) {
    console.log('🔧 Applying smart JSON fix to Hugging Face response...');

    let fixed = jsonString.trim();

    // Step 1: Pre-processing - handle obvious issues
    fixed = this._preProcessJson(fixed);

    // Step 2: Remove any trailing incomplete content
    fixed = this._truncateToLastCompleteProperty(fixed);

    // Step 3: Fix common string issues (enhanced)
    fixed = this._fixCommonStringIssues(fixed);

    // Step 4: Post-processing fixes
    fixed = this._postProcessJson(fixed);

    // Step 5: Ensure proper JSON closure
    fixed = this._ensureProperClosure(fixed);

    console.log('Smart fix result (first 200 chars):', fixed.substring(0, 200));
    return fixed;
  }

  /**
   * Pre-process JSON to handle obvious formatting issues
   * @param {string} jsonString - The JSON string to pre-process
   * @returns {string} Pre-processed JSON string
   */
  _preProcessJson(jsonString) {
    let fixed = jsonString;

    // Remove any non-JSON content at the beginning
    const jsonStart = fixed.indexOf('{');
    if (jsonStart > 0) {
      fixed = fixed.substring(jsonStart);
    }

    // Handle common LLM output patterns
    // Remove markdown code blocks
    fixed = fixed.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');

    // Remove explanatory text before JSON
    fixed = fixed.replace(/^[^{]*({.*)/s, '$1');

    return fixed;
  }

  /**
   * Post-process JSON after main fixes
   * @param {string} jsonString - The JSON string to post-process
   * @returns {string} Post-processed JSON string
   */
  _postProcessJson(jsonString) {
    let fixed = jsonString;

    // Fix double quotes inside string values
    // Pattern: "text with "quotes" inside"
    fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g, (match, part1, middle, part3, ending) => {
      // If this looks like a string with quotes inside, escape them
      if (middle.length > 0 && !middle.includes(':')) {
        return `"${part1}\\"${middle}\\"${part3}"${ending}`;
      }
      return match;
    });

    // Fix missing quotes around string values
    // Pattern: "property": value (where value should be quoted)
    fixed = fixed.replace(/"([^"]*)":\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])(\s*[,}])/g, (match, prop, value, ending) => {
      // If value doesn't look like a number or boolean, quote it
      if (!value.match(/^(true|false|\d+(\.\d+)?)$/)) {
        return `"${prop}": "${value.trim()}"${ending}`;
      }
      return match;
    });

    return fixed;
  }

  /**
   * Truncate JSON to the last complete property
   * @param {string} jsonString - The JSON string to truncate
   * @returns {string} Truncated JSON string
   */
  _truncateToLastCompleteProperty(jsonString) {
    // Find the last complete property by looking for the last comma followed by a complete property
    let lastGoodPosition = -1;
    let inString = false;
    let escapeNext = false;
    let braceDepth = 0;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceDepth++;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            // Found the end of the main object
            return jsonString.substring(0, i + 1);
          }
        } else if (char === ',' && braceDepth === 1) {
          // This is a property separator at the top level
          lastGoodPosition = i;
        }
      }
    }

    // If we didn't find a complete object, truncate to the last good comma
    if (lastGoodPosition > 0) {
      let truncated = jsonString.substring(0, lastGoodPosition);
      // Remove the trailing comma and close the object
      return truncated + '}';
    }

    return jsonString;
  }

  /**
   * Fix common string-related JSON issues
   * @param {string} jsonString - The JSON string to fix
   * @returns {string} Fixed JSON string
   */
  _fixCommonStringIssues(jsonString) {
    let fixed = jsonString;

    console.log('🔧 Applying enhanced string fixes...');

    // Fix 1: More comprehensive unquoted property name fixing
    // Handle various patterns of unquoted property names

    // Pattern 1: Simple word_name: or wordName: (with proper context)
    fixed = fixed.replace(/([\s,{])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, prefix, propName) => {
      // Only quote if it's not already quoted
      if (!match.includes('"')) {
        console.log(`   Fixing property: ${propName} -> "${propName}"`);
        return `${prefix}"${propName}":`;
      }
      return match;
    });

    // Pattern 2: Property names at the beginning of lines
    fixed = fixed.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, (match, whitespace, propName) => {
      if (!match.includes('"')) {
        console.log(`   Fixing line-start property: ${propName} -> "${propName}"`);
        return `${whitespace}"${propName}":`;
      }
      return match;
    });

    // Pattern 3: Property names after commas (fixed regex)
    fixed = fixed.replace(/,(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
      if (!match.includes('"')) {
        return `,${whitespace}"${propName}":`;
      }
      return match;
    });

    // Fix 2: Handle property names with special characters or numbers
    // Pattern: property-name: or property_name_123:
    fixed = fixed.replace(/(\s+)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g, (match, whitespace, propName) => {
      if (!match.includes('"') && propName.match(/^[a-zA-Z_][a-zA-Z0-9_-]*$/)) {
        return `${whitespace}"${propName}":`;
      }
      return match;
    });

    // Fix 3: Replace single quotes with double quotes (but be careful with content)
    // Only replace quotes that are likely property delimiters
    fixed = fixed.replace(/(\s*)'([^']*)'(\s*:)/g, '$1"$2"$3'); // Property names
    fixed = fixed.replace(/(\s*:\s*)'([^']*)'(\s*[,}])/g, '$1"$2"$3'); // Property values

    // Fix 4: Fix malformed property-value separators
    // Handle cases like: "property" "value" (missing colon)
    fixed = fixed.replace(/"([^"]*)"(\s+)"([^"]*)"/g, '"$1": "$3"');

    // Fix 5: Fix unterminated strings at the end
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Odd number of quotes means we have an unterminated string
      // Simply close the string at the end
      if (!fixed.trim().endsWith('"')) {
        fixed = fixed.trim() + '"';
      }
    }

    // Fix 6: Remove any trailing commas before closing braces
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix 7: Handle missing commas between properties
    // Pattern: "prop1": "value1" "prop2": "value2" (missing comma)
    fixed = fixed.replace(/"([^"]*)"(\s+)"([^"]*)"(\s*:)/g, '"$1", "$3"$4');

    console.log('✅ Enhanced string fixes applied');
    return fixed;
  }

  /**
   * Check if a match is inside a string value (basic heuristic)
   * @param {string} fullString - The full JSON string
   * @param {string} match - The matched substring
   * @returns {boolean} True if likely inside a string
   */
  _isInsideString(fullString, match) {
    const matchIndex = fullString.indexOf(match);
    if (matchIndex === -1) return false;

    // Count quotes before this position
    const beforeMatch = fullString.substring(0, matchIndex);
    const quoteCount = (beforeMatch.match(/"/g) || []).length;

    // If odd number of quotes, we're likely inside a string
    return quoteCount % 2 !== 0;
  }

  /**
   * Ensure the JSON has proper closing braces
   * @param {string} jsonString - The JSON string to close
   * @returns {string} Properly closed JSON string
   */
  _ensureProperClosure(jsonString) {
    let fixed = jsonString.trim();

    // Count opening and closing braces
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;

    // Add missing closing braces
    const missingBraces = openBraces - closeBraces;
    if (missingBraces > 0) {
      fixed += '}'.repeat(missingBraces);
    }

    return fixed;
  }

  /**
   * Create a fallback JSON structure when all fixes fail
   * @param {string} originalJson - The original malformed JSON
   * @param {string} errorMessage - The error message from parsing
   * @returns {string} Valid fallback JSON
   */
  _createFallbackJson(originalJson, errorMessage) {
    // Try to extract any recognizable content
    const titleMatch = originalJson.match(/"title"\s*:\s*"([^"]*?)"/);
    const descriptionMatch = originalJson.match(/"description"\s*:\s*"([^"]*?)"/);

    const fallback = {
      title: titleMatch ? titleMatch[1] : "Generated Content",
      description: descriptionMatch ? descriptionMatch[1] : "Content generation completed with parsing issues",
      questions: [],
      error: "JSON parsing failed, using fallback structure",
      error_details: errorMessage,
      partial_content: originalJson.substring(0, 200) + "...",
      provider: "huggingface"
    };

    return JSON.stringify(fallback);
  }
}

module.exports = HuggingFaceService;
