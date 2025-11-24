/**
 * Subject Data Validation Middleware
 * Validates subject hierarchy data before processing
 */

/**
 * Validate topic data
 * @param {Object} topic - Topic object to validate
 * @param {string} chapterTitle - Parent chapter title (for error messages)
 * @returns {Object} Validation result
 */
function validateTopic(topic, chapterTitle = 'Unknown') {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!topic.title || typeof topic.title !== 'string' || topic.title.trim().length === 0) {
    errors.push(`Topic in chapter "${chapterTitle}" must have a valid title`);
  }

  // Optional but validated fields
  if (topic.difficulty_level !== undefined) {
    const difficulty = parseInt(topic.difficulty_level);
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push(`Topic "${topic.title}" has invalid difficulty_level (must be 1-5)`);
    }
  }

  if (topic.estimated_study_time_minutes !== undefined) {
    const time = parseInt(topic.estimated_study_time_minutes);
    if (isNaN(time) || time < 0) {
      errors.push(`Topic "${topic.title}" has invalid estimated_study_time_minutes`);
    }
    if (time === 0) {
      warnings.push(`Topic "${topic.title}" has 0 study time - is this intentional?`);
    }
  }

  if (topic.display_order !== undefined) {
    const order = parseInt(topic.display_order);
    if (isNaN(order) || order < 0) {
      errors.push(`Topic "${topic.title}" has invalid display_order`);
    }
  }

  if (topic.learning_objectives !== undefined && !Array.isArray(topic.learning_objectives)) {
    errors.push(`Topic "${topic.title}" learning_objectives must be an array`);
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Validate chapter data
 * @param {Object} chapter - Chapter object to validate
 * @returns {Object} Validation result
 */
function validateChapter(chapter) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!chapter.title || typeof chapter.title !== 'string' || chapter.title.trim().length === 0) {
    errors.push('Chapter must have a valid title');
    return { errors, warnings, isValid: false }; // Can't validate topics without chapter title
  }

  // Optional but validated fields
  if (chapter.tier !== undefined) {
    const validTiers = ['Core', 'Extended', 'Foundation', 'Higher'];
    if (!validTiers.includes(chapter.tier)) {
      errors.push(`Chapter "${chapter.title}" has invalid tier (must be: ${validTiers.join(', ')})`);
    }
  }

  if (chapter.display_order !== undefined) {
    const order = parseInt(chapter.display_order);
    if (isNaN(order) || order < 0) {
      errors.push(`Chapter "${chapter.title}" has invalid display_order`);
    }
  }

  if (chapter.learning_objectives !== undefined && !Array.isArray(chapter.learning_objectives)) {
    errors.push(`Chapter "${chapter.title}" learning_objectives must be an array`);
  }

  // Validate topics
  if (chapter.topics) {
    if (!Array.isArray(chapter.topics)) {
      errors.push(`Chapter "${chapter.title}" topics must be an array`);
    } else {
      chapter.topics.forEach((topic, index) => {
        const topicValidation = validateTopic(topic, chapter.title);
        errors.push(...topicValidation.errors);
        warnings.push(...topicValidation.warnings);
      });

      if (chapter.topics.length === 0) {
        warnings.push(`Chapter "${chapter.title}" has no topics`);
      }
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Validate complete subject hierarchy
 * @param {Object} data - Subject hierarchy data
 * @returns {Object} Validation result
 */
function validateSubjectHierarchy(data) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
      warnings: []
    };
  }

  // Validate subject
  if (!data.subject || typeof data.subject !== 'object') {
    return {
      isValid: false,
      errors: ['Missing or invalid "subject" object'],
      warnings: []
    };
  }

  const subject = data.subject;

  // Required subject fields
  if (!subject.name || typeof subject.name !== 'string' || subject.name.trim().length === 0) {
    errors.push('Subject name is required');
  }

  if (!subject.code || typeof subject.code !== 'string' || subject.code.trim().length === 0) {
    errors.push('Subject code is required');
  } else {
    if (subject.code.length < 2 || subject.code.length > 10) {
      warnings.push('Subject code should be 2-10 characters');
    }
    if (subject.code !== subject.code.toUpperCase()) {
      warnings.push('Subject code will be converted to uppercase');
    }
  }

  if (!subject.description || typeof subject.description !== 'string' || subject.description.trim().length === 0) {
    errors.push('Subject description is required');
  }

  // Optional but validated fields
  if (subject.color_hex !== undefined) {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(subject.color_hex)) {
      errors.push('Subject color_hex must be a valid hex color (e.g., #FF6B6B)');
    }
  }

  if (subject.grade_levels !== undefined) {
    if (!Array.isArray(subject.grade_levels)) {
      errors.push('Subject grade_levels must be an array');
    } else {
      subject.grade_levels.forEach(grade => {
        const gradeNum = parseInt(grade);
        if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 13) {
          errors.push(`Invalid grade level: ${grade} (must be 1-13)`);
        }
      });
    }
  }

  // Validate chapters
  if (!data.chapters) {
    warnings.push('No chapters provided - subject will be created without content');
  } else if (!Array.isArray(data.chapters)) {
    errors.push('Chapters must be an array');
  } else {
    if (data.chapters.length === 0) {
      warnings.push('Empty chapters array - subject will be created without content');
    } else {
      data.chapters.forEach((chapter, index) => {
        const chapterValidation = validateChapter(chapter);
        errors.push(...chapterValidation.errors);
        warnings.push(...chapterValidation.warnings);
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Express middleware to validate subject hierarchy
 */
function validateSubjectHierarchyMiddleware(req, res, next) {
  const validation = validateSubjectHierarchy(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: {
        errors: validation.errors,
        warnings: validation.warnings
      }
    });
  }

  // Attach warnings to request for logging
  if (validation.warnings.length > 0) {
    req.validationWarnings = validation.warnings;
  }

  next();
}

/**
 * Validate single subject (no hierarchy)
 */
function validateSingleSubject(subjectData) {
  const errors = [];
  const warnings = [];

  if (!subjectData || typeof subjectData !== 'object') {
    return {
      isValid: false,
      errors: ['Subject data must be a valid object'],
      warnings: []
    };
  }

  // Required fields
  if (!subjectData.name || typeof subjectData.name !== 'string' || subjectData.name.trim().length === 0) {
    errors.push('Subject name is required');
  }

  if (!subjectData.code || typeof subjectData.code !== 'string' || subjectData.code.trim().length === 0) {
    errors.push('Subject code is required');
  }

  if (!subjectData.description || typeof subjectData.description !== 'string' || subjectData.description.trim().length === 0) {
    errors.push('Subject description is required');
  }

  // Optional validations
  if (subjectData.color_hex !== undefined) {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(subjectData.color_hex)) {
      errors.push('color_hex must be a valid hex color (e.g., #FF6B6B)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Express middleware to validate single subject
 */
function validateSingleSubjectMiddleware(req, res, next) {
  const validation = validateSingleSubject(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: {
        errors: validation.errors,
        warnings: validation.warnings
      }
    });
  }

  if (validation.warnings.length > 0) {
    req.validationWarnings = validation.warnings;
  }

  next();
}

module.exports = {
  validateSubjectHierarchy,
  validateSubjectHierarchyMiddleware,
  validateSingleSubject,
  validateSingleSubjectMiddleware,
  validateChapter,
  validateTopic
};
