/**
 * Google Gemini API Service
 * Handles text and JSON generation using Google's Generative AI
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
      // Enhanced error logging with request details
      console.error('Gemini API error details:', {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack?.split('\n')?.[0] || 'No stack trace',
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
    try {
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
9. KEEP CONTENT CONCISE to avoid truncation - prioritize completeness over length
10. If content is long, summarize key points rather than providing exhaustive detail

VALID JSON EXAMPLE:
{
  "title": "Sample Title",
  "description": "A description with \\"quoted\\" text and\\nmultiple lines",
  "content": "Content with proper escaping",
  "difficulty_level": 3,
  "learning_objectives": ["Objective 1", "Objective 2"]
}

IMPORTANT: Your response must be parseable by JSON.parse() without any modifications. Ensure the JSON is complete and properly closed.`;

      // Increase token limit to reduce truncation risk
      const adjustedMaxTokens = Math.max(maxTokens, 2000);

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

      // Check for truncation indicators
      if (this._isResponseTruncated(jsonText)) {
        console.warn('⚠️ Response appears to be truncated, attempting recovery...');
      }

      // Clean up the response
      jsonText = this._cleanupJsonString(jsonText);

      return JSON.parse(jsonText); // This will throw if parsing fails, which is caught by the outer try-catch
    } catch (error) {
      console.error('Gemini JSON generation error:', error);
      throw new Error(`Gemini JSON generation error: ${error.message}`);
    }
  }

  /**
   * Check if response appears to be truncated
   * @param {string} jsonString - The JSON text to check
   * @returns {boolean} True if response appears truncated
   */
  _isResponseTruncated(jsonString) {
    if (!jsonString) return true;

    // Check for common truncation indicators
    const truncationIndicators = [
      // Ends abruptly without closing brace
      !jsonString.trim().endsWith('}'),
      // Contains unterminated strings (quotes without closing quotes)
      (jsonString.match(/"/g) || []).length % 2 !== 0,
      // Ends mid-word or mid-sentence
      /[a-zA-Z0-9]$/.test(jsonString.trim()),
      // Very long responses that might hit token limits
      jsonString.length > 4000
    ];

    return truncationIndicators.some(indicator => indicator);
  }

  /**
   * Clean up common JSON string issues with enhanced truncation handling
   * @param {string} jsonString - The JSON text to clean
   * @returns {string} Cleaned JSON text
   */
  _cleanupJsonString(jsonString) {
    if (!jsonString) return '';

    console.log('Raw JSON response (first 100 chars):', jsonString.substring(0, 100));

    // Step 1: Remove markdown code fences and whitespace
    jsonString = jsonString.replace(/```json\n?/g, '')
                          .replace(/```\n?/g, '')
                          .replace(/```/g, '')
                          .trim();

    // Step 2: Ensure we start with a JSON object/array
    if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
      const objStart = jsonString.indexOf('{');
      if (objStart >= 0) {
        jsonString = jsonString.substring(objStart);
      }
    }

    // Step 3: Enhanced truncation handling - find the last complete property
    if (this._isResponseTruncated(jsonString)) {
      jsonString = this._handleTruncatedResponse(jsonString);
    }

    // Step 4: Find proper ending of JSON by counting braces
    let braceCount = 0;
    let endIndex = -1;
    for (let i = 0; i < jsonString.length; i++) {
      if (jsonString[i] === '{') {
        braceCount++;
      } else if (jsonString[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex >= 0 && endIndex < jsonString.length - 1) {
      jsonString = jsonString.substring(0, endIndex + 1);
    }

    // Step 5: Try to parse first to see if it's already valid
    try {
      return JSON.stringify(JSON.parse(jsonString));
    } catch (parseError) {
      console.log('Initial JSON parse failed, attempting to fix:', parseError.message);

      // Apply comprehensive fixes
      let fixedJson = this._applyJsonFixes(jsonString);

      try {
        const parsed = JSON.parse(fixedJson);
        console.log('✅ Successfully fixed JSON');
        return JSON.stringify(parsed);
      } catch (finalError) {
        console.error('Gentle fixes failed, trying aggressive approach...');

        // Last resort: try to extract a valid JSON object using more aggressive methods
        try {
          const aggressivelyFixed = this._aggressiveJsonFix(jsonString);
          const parsed = JSON.parse(aggressivelyFixed);
          console.log('✅ Aggressive fix succeeded');
          return JSON.stringify(parsed);
        } catch (aggressiveError) {
          console.error('Could not fix JSON after all attempts:', finalError);
          console.error('Raw JSON after fixers:', fixedJson.substring(0, 500));
          throw new Error(`Failed to parse JSON after all fixes: ${finalError.message}`);
        }
      }
    }
  }

  /**
   * Handle truncated JSON responses by finding the last complete property
   * @param {string} jsonString - The truncated JSON string
   * @returns {string} JSON string with truncation handled
   */
  _handleTruncatedResponse(jsonString) {
    console.log('🔧 Handling truncated response...');

    // Find the last complete property by looking for the last comma or opening brace
    let lastCompleteIndex = -1;
    let inString = false;
    let escapeNext = false;

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
        if (char === ',' || char === '{') {
          lastCompleteIndex = i;
        }
      }
    }

    // If we found a safe truncation point, cut there and close the JSON
    if (lastCompleteIndex > 0) {
      let truncated = jsonString.substring(0, lastCompleteIndex);

      // If we cut at a comma, remove it
      if (truncated.endsWith(',')) {
        truncated = truncated.slice(0, -1);
      }

      // Ensure proper closing
      if (!truncated.endsWith('}')) {
        truncated += '}';
      }

      console.log(`✂️ Truncated at position ${lastCompleteIndex}, new length: ${truncated.length}`);
      return truncated;
    }

    // If no safe truncation point found, return original
    return jsonString;
  }

  /**
   * Apply comprehensive JSON fixes using a simple and reliable approach
   * @param {string} jsonString - The malformed JSON string
   * @returns {string} Fixed JSON string
   */
  _applyJsonFixes(jsonString) {
    console.log('Applying JSON fixes to:', jsonString.substring(0, 200));

    let fixed = jsonString;

    // Step 1: Fix broken string values within property values only
    // Pattern: ": "text", "more text" -> ": "text, more text"
    fixed = fixed.replace(/(:\s*"[^"]*?"),\s*"([^"]*?")/g, '$1, $2');

    // Step 2: Fix specific broken patterns from Gemini responses
    fixed = fixed.replace(/",\s*the\s+([^"]*?)"/g, ', the $1"');
    fixed = fixed.replace(/",\s*and\s+([^"]*?)"/g, ', and $1"');
    fixed = fixed.replace(/",\s*with\s+([^"]*?)"/g, ', with $1"');

    // Step 3: Fix property names missing opening quotes
    // Pattern: , description": -> , "description":
    fixed = fixed.replace(/,\s*([a-zA-Z_][a-zA-Z0-9_]*"):/g, ', "$1:');

    // Step 4: Fix unescaped quotes within string values
    // Pattern: "text "quoted" text" -> "text \"quoted\" text"
    fixed = fixed.replace(/"([^"]*?)\s+"([^"]*?)"\s+([^"]*?)"/g, '"$1 \\"$2\\" $3"');

    // NEW: Step 4.1: Fix unterminated strings by identifying property patterns
    // Pattern: "key": "string value without closing quote -> "key": "string value without closing quote"
    fixed = this._fixUnterminatedStrings(fixed);

    // Step 5: Clean up trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Step 6: Balance braces if needed
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;

    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }

    // Step 7: Final cleanup for known issues with invalid characters
    fixed = this._cleanupJsonStructure(fixed);

    console.log('Fixed JSON result:', fixed.substring(0, 200));
    return fixed;
  }



  /**
   * Aggressive JSON fix as last resort
   * @param {string} jsonString - The malformed JSON string
   * @returns {string} Fixed JSON string
   */
  /**
   * Fix unterminated strings in JSON
   * This specifically addresses the issue with unterminated strings at specific positions
   * @param {string} jsonString - The JSON text to fix
   * @returns {string} Fixed JSON with terminated strings
   */
  _fixUnterminatedStrings(jsonString) {
    // Early return for empty strings
    if (!jsonString || jsonString.length === 0) return jsonString;
    
    let fixed = jsonString;
    
    // Find potential unterminated strings using property pattern analysis
    // Look for "property": "value patterns without closing quotes
    const propertyValueRegex = /"([^"]+)"\s*:\s*"([^"]*)("\s*,|[^"]*}|$)/g;
    
    // Collect all property-value pairs for analysis
    let match;
    const propertyValues = [];
    while ((match = propertyValueRegex.exec(jsonString)) !== null) {
      propertyValues.push({
        property: match[1],
        value: match[2],
        terminator: match[3],
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }
    
    // Analyze and fix unterminated strings
    for (const pv of propertyValues) {
      // If the string doesn't end with a quote and comma or closing brace, it's likely unterminated
      if (!pv.terminator.startsWith('"')) {
        // Find the probable end of this property's value (next property or closing brace)
        const nextPropertyStart = jsonString.indexOf('",', pv.endPos);
        const closingBracePos = jsonString.indexOf('}', pv.endPos);
        
        // Determine where to add the closing quote
        let addQuotePos = -1;
        if (nextPropertyStart >= 0 && (closingBracePos === -1 || nextPropertyStart < closingBracePos)) {
          // Add before the next property
          addQuotePos = nextPropertyStart;
        } else if (closingBracePos >= 0) {
          // Add before the closing brace
          addQuotePos = closingBracePos;
        }
        
        if (addQuotePos >= 0) {
          // Insert the missing closing quote
          fixed = fixed.substring(0, addQuotePos) + '"' + fixed.substring(addQuotePos);
          console.log(`Fixed unterminated string for property "${pv.property}" at position ${addQuotePos}`);
        }
      }
    }
    
    return fixed;
  }
  
  /**
   * Clean up overall JSON structure issues
   * @param {string} jsonString - The JSON text to clean up
   * @returns {string} Cleaned JSON text
   */
  _cleanupJsonStructure(jsonString) {
    // Handle empty string case
    if (!jsonString || jsonString.length === 0) return '{}';
    
    let fixed = jsonString;
    
    // Fix common control characters that break JSON parsing
    fixed = fixed.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    
    // Check for any broken escape sequences and fix them
    fixed = fixed.replace(/\\([^"\\bfnrtu])/g, '\\\\$1'); // Escape backslashes
    
    // Fix line breaks inside string values that aren't properly escaped
    fixed = fixed.replace(/"([^"]*)\n([^"]*)"(?=[,}])/g, '"$1\\n$2"');
    
    // Ensure the JSON is properly balanced with braces
    const openCount = (fixed.match(/{/g) || []).length;
    const closeCount = (fixed.match(/}/g) || []).length;
    
    if (openCount > closeCount) {
      // Add missing closing braces
      fixed += '}'.repeat(openCount - closeCount);
    } else if (closeCount > openCount) {
      // Remove extra closing braces from the end
      let excess = closeCount - openCount;
      while (excess > 0 && fixed.endsWith('}')) {
        fixed = fixed.substring(0, fixed.length - 1);
        excess--;
      }
    }
    
    // Ensure we have a valid JSON object
    if (!fixed.startsWith('{')) fixed = '{' + fixed;
    if (!fixed.endsWith('}')) fixed += '}';
    
    return fixed;
  }

  _aggressiveJsonFix(jsonString) {
    console.log('Applying aggressive JSON fix...');

    let fixed = jsonString.trim();

    // Remove any markdown formatting
    fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Ensure we start and end with braces
    if (!fixed.startsWith('{')) {
      const braceIndex = fixed.indexOf('{');
      if (braceIndex >= 0) {
        fixed = fixed.substring(braceIndex);
      }
    }

    // ENHANCED: Handle truncated responses more intelligently
    // Find the last complete property before any truncation
    const lastCompleteProperty = this._findLastCompleteProperty(fixed);
    if (lastCompleteProperty.index > 0) {
      fixed = fixed.substring(0, lastCompleteProperty.index);
      console.log(`🔧 Truncated to last complete property at position ${lastCompleteProperty.index}`);
    }

    // ENHANCED: Fix unterminated strings more robustly
    fixed = this._fixUnterminatedStrings(fixed);

    // ENHANCED: Ensure proper JSON closure
    if (!fixed.endsWith('}')) {
      // Remove any trailing incomplete content
      const lastValidChar = this._findLastValidJsonChar(fixed);
      if (lastValidChar > 0) {
        fixed = fixed.substring(0, lastValidChar + 1);
      }

      // Add closing brace if needed
      if (!fixed.endsWith('}')) {
        fixed += '}';
      }
    }

    // Fix property names that are missing quotes - but be very careful
    // Look for patterns like: , description": or { description":
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*"):/g, '$1"$2:');

    // Also fix completely unquoted property names
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, prefix, propName) => {
      if (match.includes('"')) return match; // Already has quotes somewhere
      return prefix + '"' + propName + '":';
    });
    
    // Apply unterminated string fix
    fixed = this._fixUnterminatedStrings(fixed);
    
    // Apply JSON structure cleanup
    fixed = this._cleanupJsonStructure(fixed);

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    console.log('Aggressive fix result:', fixed.substring(0, 200));
    return fixed;
  }

  /**
   * Find the last complete property in a JSON string
   * @param {string} jsonString - The JSON string to analyze
   * @returns {Object} Object with index of last complete property
   */
  _findLastCompleteProperty(jsonString) {
    let lastCompleteIndex = -1;
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
            lastCompleteIndex = i;
          }
        } else if (char === ',' && braceDepth === 1) {
          // Found a complete property separator at the top level
          lastCompleteIndex = i;
        }
      }
    }

    return { index: lastCompleteIndex };
  }

  /**
   * Fix unterminated strings in JSON
   * @param {string} jsonString - The JSON string to fix
   * @returns {string} Fixed JSON string
   */
  _fixUnterminatedStrings(jsonString) {
    // Count quotes to see if we have an odd number (indicating unterminated string)
    const quotes = (jsonString.match(/"/g) || []).length;

    if (quotes % 2 !== 0) {
      // We have an unterminated string
      console.log('🔧 Fixing unterminated string...');

      // Find the last quote and see what comes after it
      const lastQuoteIndex = jsonString.lastIndexOf('"');
      if (lastQuoteIndex >= 0) {
        const afterLastQuote = jsonString.substring(lastQuoteIndex + 1);

        // If there's content after the last quote that looks like it should be in the string
        if (afterLastQuote && !afterLastQuote.match(/^\s*[,}]/)) {
          // Add a closing quote before any structural characters
          const structuralMatch = afterLastQuote.match(/^([^,}]*)/);
          if (structuralMatch) {
            const contentLength = structuralMatch[1].length;
            const insertPos = lastQuoteIndex + 1 + contentLength;
            jsonString = jsonString.substring(0, insertPos) + '"' + jsonString.substring(insertPos);
          }
        }
      }
    }

    return jsonString;
  }

  /**
   * Find the last valid JSON character position
   * @param {string} jsonString - The JSON string to analyze
   * @returns {number} Index of last valid character
   */
  _findLastValidJsonChar(jsonString) {
    // Look for the last character that could validly end a JSON property value
    const validEndChars = ['"', ']', '}', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    for (let i = jsonString.length - 1; i >= 0; i--) {
      const char = jsonString[i];
      if (validEndChars.includes(char)) {
        return i;
      }
    }

    return jsonString.length - 1;
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
