/**
 * Shared JSON Parser Service
 *
 * Centralizes all JSON cleanup, fixing, and parsing logic for LLM responses.
 * Used by all LLM service adapters (Gemini, HuggingFace, OpenAI, etc.)
 *
 * This eliminates 600+ lines of duplicate code across multiple service files.
 */

class JSONParserService {
  /**
   * Check if response appears to be truncated
   * @param {string} jsonString - The JSON text to check
   * @returns {boolean} True if response appears truncated
   */
  static isResponseTruncated(jsonString) {
    if (!jsonString) return true;

    const trimmed = jsonString.trim();

    // Check for common truncation indicators
    const truncationIndicators = [
      // Ends abruptly without closing brace
      !trimmed.endsWith('}') && !trimmed.endsWith(']'),
      // Contains unterminated strings (quotes without closing quotes)
      (jsonString.match(/"/g) || []).length % 2 !== 0,
      // Ends mid-word or mid-sentence (but not with punctuation)
      /[a-zA-Z0-9]$/.test(trimmed) && !trimmed.endsWith('"'),
      // Very long responses that might hit token limits
      jsonString.length > 3500,
      // Ends with incomplete property (colon without value)
      /:\s*$/.test(trimmed),
      // Ends with incomplete array or object
      /[,\[\{]\s*$/.test(trimmed),
      // Contains incomplete escape sequences
      /\\$/.test(trimmed)
    ];

    const isTruncated = truncationIndicators.some(indicator => indicator);
    if (isTruncated) {
      console.log('🚨 Truncation detected:', {
        length: jsonString.length,
        endsWithBrace: trimmed.endsWith('}'),
        quoteCount: (jsonString.match(/"/g) || []).length,
        lastChars: trimmed.slice(-20)
      });
    }

    return isTruncated;
  }

  /**
   * Clean up common JSON string issues with enhanced truncation handling
   * @param {string} jsonString - The JSON text to clean
   * @returns {string} Cleaned JSON text
   */
  static cleanupJsonString(jsonString) {
    if (!jsonString) return '{}';

    console.log('🔧 Cleaning up JSON response (first 100 chars):', jsonString.substring(0, 100));

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
      } else {
        // No JSON found, return empty object
        return '{}';
      }
    }

    // Step 3: Enhanced truncation handling - find the last complete property
    if (this.isResponseTruncated(jsonString)) {
      jsonString = this.handleTruncatedResponse(jsonString);
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

      // Apply smart JSON fixing
      const fixedJson = this.smartJsonFix(jsonString);

      try {
        const parsed = JSON.parse(fixedJson);
        console.log('✅ Successfully fixed JSON');
        return JSON.stringify(parsed);
      } catch (finalError) {
        console.error('Smart fix failed, using fallback...');

        // Return a valid fallback JSON instead of throwing
        const fallbackJson = this.createFallbackJson(jsonString, finalError.message);
        console.log('🔄 Using fallback JSON structure');
        return fallbackJson;
      }
    }
  }

  /**
   * Smart JSON fix that handles most common issues with a simple approach
   * @param {string} jsonString - The malformed JSON string
   * @returns {string} Fixed JSON string
   */
  static smartJsonFix(jsonString) {
    console.log('🔧 Applying smart JSON fix...');

    let fixed = jsonString.trim();

    // Step 1: Pre-processing - handle obvious issues
    fixed = this.preProcessJson(fixed);

    // Step 2: Remove any trailing incomplete content
    fixed = this.truncateToLastCompleteProperty(fixed);

    // Step 3: Fix common string issues
    fixed = this.fixCommonStringIssues(fixed);

    // Step 4: Post-processing fixes
    fixed = this.postProcessJson(fixed);

    // Step 5: Ensure proper JSON closure
    fixed = this.ensureProperClosure(fixed);

    console.log('Smart fix result (first 200 chars):', fixed.substring(0, 200));
    return fixed;
  }

  /**
   * Pre-process JSON to handle obvious formatting issues
   * @param {string} jsonString - The JSON string to pre-process
   * @returns {string} Pre-processed JSON string
   */
  static preProcessJson(jsonString) {
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
  static postProcessJson(jsonString) {
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
  static truncateToLastCompleteProperty(jsonString) {
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
  static fixCommonStringIssues(jsonString) {
    let fixed = jsonString;

    console.log('🔧 Applying enhanced string fixes...');

    // Fix 1: More comprehensive unquoted property name fixing
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

    // Pattern 3: Property names after commas
    fixed = fixed.replace(/,(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, whitespace, propName) => {
      if (!match.includes('"')) {
        return `,${whitespace}"${propName}":`;
      }
      return match;
    });

    // Fix 2: Replace single quotes with double quotes
    fixed = fixed.replace(/(\s*)'([^']*)'(\s*:)/g, '$1"$2"$3'); // Property names
    fixed = fixed.replace(/(\s*:\s*)'([^']*)'(\s*[,}])/g, '$1"$2"$3'); // Property values

    // Fix 3: Fix unterminated strings at the end
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Odd number of quotes means we have an unterminated string
      if (!fixed.trim().endsWith('"')) {
        fixed = fixed.trim() + '"';
      }
    }

    // Fix 4: Remove any trailing commas before closing braces
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix 5: Handle missing commas between properties
    // Pattern: "prop1": "value1" "prop2": "value2" (missing comma)
    fixed = fixed.replace(/"([^"]*)"(\s+)"([^"]*)"(\s*:)/g, '"$1", "$3"$4');

    console.log('✅ Enhanced string fixes applied');
    return fixed;
  }

  /**
   * Ensure the JSON has proper closing braces
   * @param {string} jsonString - The JSON string to close
   * @returns {string} Properly closed JSON string
   */
  static ensureProperClosure(jsonString) {
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
   * Handle truncated JSON responses by finding the last complete property
   * @param {string} jsonString - The truncated JSON string
   * @returns {string} JSON string with truncation handled
   */
  static handleTruncatedResponse(jsonString) {
    console.log('🔧 Handling truncated response...');

    // Strategy 1: Try to find the last complete question in a questions array
    const questionsMatch = jsonString.match(/"questions"\s*:\s*\[(.*)/s);
    if (questionsMatch) {
      return this.recoverTruncatedQuestions(jsonString, questionsMatch[1]);
    }

    // Strategy 2: Find the last complete property by looking for the last comma or opening brace
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
          if (braceDepth === 1) {
            // We're back at the root level, this is a good truncation point
            lastCompleteIndex = i;
          }
        } else if (char === ',' && braceDepth === 1) {
          // Comma at root level is also a good truncation point
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

      // Ensure proper closing for questions array if present
      if (truncated.includes('"questions"') && !truncated.includes(']}')) {
        truncated += ']}';
      } else if (!truncated.endsWith('}')) {
        truncated += '}';
      }

      console.log(`✂️ Truncated at position ${lastCompleteIndex}, new length: ${truncated.length}`);
      return truncated;
    }

    // If no safe truncation point found, return original
    return jsonString;
  }

  /**
   * Recover truncated questions array by finding complete question objects
   * @param {string} fullJson - The full JSON string
   * @param {string} questionsContent - The content after "questions": [
   * @returns {string} Recovered JSON with complete questions
   */
  static recoverTruncatedQuestions(fullJson, questionsContent) {
    console.log('🔧 Attempting to recover truncated questions array...');

    // Extract the part before questions array
    const beforeQuestions = fullJson.substring(0, fullJson.indexOf('"questions"'));

    // Find complete question objects by looking for complete {...} blocks
    const completeQuestions = [];
    let currentQuestion = '';
    let braceDepth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < questionsContent.length; i++) {
      const char = questionsContent[i];
      currentQuestion += char;

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
            // We have a complete question object
            try {
              const questionObj = JSON.parse(currentQuestion.trim().replace(/,$/, ''));
              if (questionObj.question_text && questionObj.answer_text) {
                completeQuestions.push(currentQuestion.trim().replace(/,$/, ''));
              }
            } catch (e) {
              // Skip malformed question
            }
            currentQuestion = '';
          }
        }
      }
    }

    if (completeQuestions.length > 0) {
      const recoveredJson = `${beforeQuestions}"questions": [${completeQuestions.join(', ')}]}`;
      console.log(`✅ Recovered ${completeQuestions.length} complete questions`);
      return recoveredJson;
    }

    return fullJson;
  }

  /**
   * Create a fallback JSON structure when all fixes fail
   * @param {string} originalJson - The original malformed JSON
   * @param {string} errorMessage - The error message from parsing
   * @returns {string} Valid fallback JSON
   */
  static createFallbackJson(originalJson, errorMessage) {
    console.log('🔄 Creating enhanced fallback JSON structure...');

    // Try to extract any recognizable content
    const titleMatch = originalJson.match(/"title"\s*:\s*"([^"]*?)"/);
    const descriptionMatch = originalJson.match(/"description"\s*:\s*"([^"]*?)"/);

    // Try to extract partial questions
    const extractedQuestions = this.extractPartialQuestions(originalJson);

    const fallback = {
      title: titleMatch ? titleMatch[1] : "Generated Content",
      description: descriptionMatch ? descriptionMatch[1] : "Content generated with partial recovery",
      questions: extractedQuestions.length > 0 ? extractedQuestions : [
        {
          question_text: "Sample question (content recovery in progress)",
          answer_text: "Sample answer (please regenerate for complete content)",
          marks: 5,
          difficulty_level: 3
        }
      ],
      _metadata: {
        status: "partial_recovery",
        error: "JSON parsing failed, using fallback structure",
        error_details: errorMessage,
        recovered_questions: extractedQuestions.length,
        original_length: originalJson.length
      }
    };

    console.log(`📊 Fallback created with ${extractedQuestions.length} recovered questions`);
    return JSON.stringify(fallback);
  }

  /**
   * Extract partial questions from malformed JSON
   * @param {string} jsonString - The malformed JSON string
   * @returns {Array} Array of extracted question objects
   */
  static extractPartialQuestions(jsonString) {
    const questions = [];

    // Look for question patterns in the malformed JSON
    const questionPattern = /"question_text"\s*:\s*"([^"]*?)"/g;
    const answerPattern = /"answer_text"\s*:\s*"([^"]*?)"/g;
    const marksPattern = /"marks"\s*:\s*(\d+)/g;
    const difficultyPattern = /"difficulty_level"\s*:\s*(\d+)/g;

    let questionMatch;
    const questionTexts = [];
    while ((questionMatch = questionPattern.exec(jsonString)) !== null) {
      questionTexts.push(questionMatch[1]);
    }

    let answerMatch;
    const answerTexts = [];
    while ((answerMatch = answerPattern.exec(jsonString)) !== null) {
      answerTexts.push(answerMatch[1]);
    }

    let marksMatch;
    const marksValues = [];
    while ((marksMatch = marksPattern.exec(jsonString)) !== null) {
      marksValues.push(parseInt(marksMatch[1]));
    }

    let difficultyMatch;
    const difficultyValues = [];
    while ((difficultyMatch = difficultyPattern.exec(jsonString)) !== null) {
      difficultyValues.push(parseInt(difficultyMatch[1]));
    }

    // Combine extracted data into question objects
    const maxQuestions = Math.min(questionTexts.length, answerTexts.length);
    for (let i = 0; i < maxQuestions; i++) {
      if (questionTexts[i] && answerTexts[i]) {
        questions.push({
          question_text: questionTexts[i],
          answer_text: answerTexts[i],
          marks: marksValues[i] || 5,
          difficulty_level: difficultyValues[i] || 3
        });
      }
    }

    return questions;
  }
}

module.exports = JSONParserService;
