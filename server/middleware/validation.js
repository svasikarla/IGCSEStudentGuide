/**
 * Input Validation Middleware
 *
 * Provides validation and sanitization for API requests to prevent:
 * - SQL injection
 * - XSS attacks
 * - Command injection
 * - Invalid data types
 * - Excessive payload sizes
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove potential HTML/script tags
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate that a value is a non-empty string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} { valid: boolean, error: string|null, sanitized: string|null }
 */
function validateRequiredString(value, fieldName) {
  if (!value) {
    return {
      valid: false,
      error: `${fieldName} is required`
    };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`
    };
  }

  const sanitized = sanitizeString(value);

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be empty`
    };
  }

  return {
    valid: true,
    error: null,
    sanitized
  };
}

/**
 * Validate optional string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} Validation result
 */
function validateOptionalString(value, fieldName) {
  if (!value) {
    return {
      valid: true,
      error: null,
      sanitized: null
    };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`
    };
  }

  return {
    valid: true,
    error: null,
    sanitized: sanitizeString(value)
  };
}

/**
 * Validate number with optional min/max constraints
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {Object} options - Validation options { min, max, required }
 * @returns {Object} Validation result
 */
function validateNumber(value, fieldName, options = {}) {
  const { min, max, required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      return {
        valid: false,
        error: `${fieldName} is required`
      };
    }
    return { valid: true, error: null, value: null };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`
    };
  }

  if (min !== undefined && num < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min}`
    };
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max}`
    };
  }

  return {
    valid: true,
    error: null,
    value: num
  };
}

/**
 * Validate integer with optional constraints
 */
function validateInteger(value, fieldName, options = {}) {
  const numberResult = validateNumber(value, fieldName, options);

  if (!numberResult.valid) {
    return numberResult;
  }

  if (numberResult.value !== null && !Number.isInteger(numberResult.value)) {
    return {
      valid: false,
      error: `${fieldName} must be an integer`
    };
  }

  return numberResult;
}

/**
 * Validate enum value
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {Array} allowedValues - Array of allowed values
 * @param {boolean} required - Whether the field is required
 * @returns {Object} Validation result
 */
function validateEnum(value, fieldName, allowedValues, required = true) {
  if (!value) {
    if (required) {
      return {
        valid: false,
        error: `${fieldName} is required`
      };
    }
    return { valid: true, error: null, value: null };
  }

  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
    };
  }

  return {
    valid: true,
    error: null,
    value
  };
}

/**
 * Validate LLM generation request
 * Middleware for POST /api/llm/generate and /api/llm/generate-json
 */
function validateLLMGeneration(req, res, next) {
  const errors = [];

  // Validate prompt (required)
  const promptResult = validateRequiredString(req.body.prompt, 'prompt');
  if (!promptResult.valid) {
    errors.push(promptResult.error);
  } else {
    // Check prompt length (prevent excessive token usage)
    if (promptResult.sanitized.length > 50000) {
      errors.push('prompt is too long (max 50,000 characters)');
    }
    req.body.prompt = promptResult.sanitized;
  }

  // Validate provider (optional, enum)
  if (req.body.provider) {
    const providerResult = validateEnum(
      req.body.provider,
      'provider',
      ['openai', 'google', 'gemini', 'anthropic', 'azure', 'huggingface', 'hf'],
      false
    );
    if (!providerResult.valid) {
      errors.push(providerResult.error);
    }
  }

  // Validate model (optional string)
  if (req.body.model) {
    const modelResult = validateOptionalString(req.body.model, 'model');
    if (!modelResult.valid) {
      errors.push(modelResult.error);
    } else if (modelResult.sanitized && modelResult.sanitized.length > 100) {
      errors.push('model name is too long (max 100 characters)');
    }
  }

  // Validate temperature (optional, 0-2)
  if (req.body.temperature !== undefined) {
    const tempResult = validateNumber(req.body.temperature, 'temperature', {
      min: 0,
      max: 2,
      required: false
    });
    if (!tempResult.valid) {
      errors.push(tempResult.error);
    }
  }

  // Validate max_tokens (optional, 1-100000)
  if (req.body.max_tokens !== undefined) {
    const tokensResult = validateInteger(req.body.max_tokens, 'max_tokens', {
      min: 1,
      max: 100000,
      required: false
    });
    if (!tokensResult.valid) {
      errors.push(tokensResult.error);
    }
  }

  // If there are validation errors, return 400
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validate curriculum generation request
 * Middleware for POST /api/llm/generate-curriculum
 */
function validateCurriculumGeneration(req, res, next) {
  const errors = [];

  // Validate subjectName (required)
  const subjectResult = validateRequiredString(req.body.subjectName, 'subjectName');
  if (!subjectResult.valid) {
    errors.push(subjectResult.error);
  } else {
    req.body.subjectName = subjectResult.sanitized;
  }

  // Validate gradeLevel (required)
  const gradeResult = validateRequiredString(req.body.gradeLevel, 'gradeLevel');
  if (!gradeResult.valid) {
    errors.push(gradeResult.error);
  } else {
    req.body.gradeLevel = gradeResult.sanitized;
  }

  // Validate curriculumBoard (optional)
  if (req.body.curriculumBoard) {
    const boardResult = validateOptionalString(req.body.curriculumBoard, 'curriculumBoard');
    if (!boardResult.valid) {
      errors.push(boardResult.error);
    } else if (boardResult.sanitized) {
      req.body.curriculumBoard = boardResult.sanitized;
    }
  }

  // Validate tier (optional)
  if (req.body.tier) {
    const tierResult = validateOptionalString(req.body.tier, 'tier');
    if (!tierResult.valid) {
      errors.push(tierResult.error);
    } else if (tierResult.sanitized) {
      req.body.tier = tierResult.sanitized;
    }
  }

  // Validate provider and model (same as LLM generation)
  if (req.body.provider) {
    const providerResult = validateEnum(
      req.body.provider,
      'provider',
      ['openai', 'google', 'gemini', 'anthropic', 'huggingface'],
      false
    );
    if (!providerResult.valid) {
      errors.push(providerResult.error);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validate simplified content generation requests
 * For quiz, exam, flashcard generation
 */
function validateSimplifiedGeneration(req, res, next) {
  const errors = [];

  // Validate subject (required)
  const subjectResult = validateRequiredString(req.body.subject, 'subject');
  if (!subjectResult.valid) {
    errors.push(subjectResult.error);
  } else {
    req.body.subject = subjectResult.sanitized;
  }

  // Validate topicTitle (required)
  const topicResult = validateRequiredString(req.body.topicTitle, 'topicTitle');
  if (!topicResult.valid) {
    errors.push(topicResult.error);
  } else {
    req.body.topicTitle = topicResult.sanitized;
  }

  // Validate questionCount/cardCount (optional, 1-50)
  const countField = req.body.questionCount !== undefined ? 'questionCount' : 'cardCount';
  const countValue = req.body[countField];

  if (countValue !== undefined) {
    const countResult = validateInteger(countValue, countField, {
      min: 1,
      max: 50,
      required: false
    });
    if (!countResult.valid) {
      errors.push(countResult.error);
    }
  }

  // Validate difficultyLevel (optional, 1-5)
  if (req.body.difficultyLevel !== undefined) {
    const diffResult = validateInteger(req.body.difficultyLevel, 'difficultyLevel', {
      min: 1,
      max: 5,
      required: false
    });
    if (!diffResult.valid) {
      errors.push(diffResult.error);
    }
  }

  // Validate grade (optional, 9-10 for IGCSE)
  if (req.body.grade !== undefined) {
    const gradeResult = validateInteger(req.body.grade, 'grade', {
      min: 9,
      max: 10,
      required: false
    });
    if (!gradeResult.valid) {
      errors.push(gradeResult.error);
    }
  }

  // Validate costTier (optional enum)
  if (req.body.costTier) {
    const tierResult = validateEnum(
      req.body.costTier,
      'costTier',
      ['ultra_minimal', 'minimal', 'standard', 'premium'],
      false
    );
    if (!tierResult.valid) {
      errors.push(tierResult.error);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validate embeddings generation request
 */
function validateEmbeddingsGeneration(req, res, next) {
  const errors = [];

  // Validate text (required)
  const textResult = validateRequiredString(req.body.text, 'text');
  if (!textResult.valid) {
    errors.push(textResult.error);
  } else {
    // Check text length (embeddings have limits)
    if (textResult.sanitized.length > 8000) {
      errors.push('text is too long (max 8,000 characters)');
    }
    req.body.text = textResult.sanitized;
  }

  // Validate provider (optional enum)
  if (req.body.provider) {
    const providerResult = validateEnum(
      req.body.provider,
      'provider',
      ['openai', 'cohere'],
      false
    );
    if (!providerResult.valid) {
      errors.push(providerResult.error);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validate batch embeddings generation request
 */
function validateBatchEmbeddings(req, res, next) {
  const errors = [];

  // Validate texts array (required)
  if (!req.body.texts) {
    errors.push('texts is required');
  } else if (!Array.isArray(req.body.texts)) {
    errors.push('texts must be an array');
  } else if (req.body.texts.length === 0) {
    errors.push('texts array cannot be empty');
  } else if (req.body.texts.length > 100) {
    errors.push('texts array too large (max 100 items)');
  } else {
    // Validate each text in the array
    const sanitizedTexts = [];
    for (let i = 0; i < req.body.texts.length; i++) {
      const textResult = validateRequiredString(req.body.texts[i], `texts[${i}]`);
      if (!textResult.valid) {
        errors.push(textResult.error);
      } else if (textResult.sanitized.length > 8000) {
        errors.push(`texts[${i}] is too long (max 8,000 characters)`);
      } else {
        sanitizedTexts.push(textResult.sanitized);
      }
    }

    if (errors.length === 0) {
      req.body.texts = sanitizedTexts;
    }
  }

  // Validate provider (optional enum)
  if (req.body.provider) {
    const providerResult = validateEnum(
      req.body.provider,
      'provider',
      ['openai', 'cohere'],
      false
    );
    if (!providerResult.valid) {
      errors.push(providerResult.error);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * General request size limiter
 * Prevents excessively large payloads
 */
function limitRequestSize(maxSizeKB = 500) {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];

    if (contentLength && parseInt(contentLength) > maxSizeKB * 1024) {
      return res.status(413).json({
        error: 'Payload too large',
        details: `Request size exceeds ${maxSizeKB}KB limit`
      });
    }

    next();
  };
}

module.exports = {
  // Validation functions
  sanitizeString,
  validateRequiredString,
  validateOptionalString,
  validateNumber,
  validateInteger,
  validateEnum,

  // Middleware
  validateLLMGeneration,
  validateCurriculumGeneration,
  validateSimplifiedGeneration,
  validateEmbeddingsGeneration,
  validateBatchEmbeddings,
  limitRequestSize
};
