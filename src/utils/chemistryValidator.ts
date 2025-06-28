/**
 * Chemistry content validation utility for IGCSE standards
 * Ensures generated content meets IGCSE Chemistry curriculum standards
 * and proper formatting of chemical formulas and equations
 */

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * IGCSE Chemistry syllabus topics - core concepts that should be present
 * Used to validate if content is properly aligned with curriculum
 */
const IGCSE_CHEMISTRY_TOPICS = [
  'atomic structure',
  'periodic table',
  'chemical bonding',
  'stoichiometry',
  'chemical energetics',
  'chemical reactions',
  'acids and bases',
  'redox reactions',
  'organic chemistry',
  'experimental techniques',
];

/**
 * Common chemical formulas used in IGCSE Chemistry
 * Used to validate if formulas are written correctly
 */
const COMMON_FORMULAS = {
  'water': 'H2O',
  'carbon dioxide': 'CO2',
  'methane': 'CH4',
  'oxygen': 'O2',
  'hydrogen': 'H2',
  'ammonia': 'NH3',
  'sulfuric acid': 'H2SO4',
  'hydrochloric acid': 'HCl',
  'nitric acid': 'HNO3',
  'sodium hydroxide': 'NaOH',
  'calcium carbonate': 'CaCO3',
  'sodium chloride': 'NaCl',
};

/**
 * Regular expressions for validation
 */
const REGEX = {
  // Chemical formula pattern (e.g., H2O, CO2, Ca(OH)2)
  formula: /([A-Z][a-z]*)(\d*)|(\(([A-Z][a-z]*(\d*))+\))(\d+)/g,
  
  // Chemical equation pattern (e.g., 2H2 + O2 -> 2H2O)
  equation: /(?:\d*[A-Z][a-z]*\d*)+\s*(?:[+]\s*(?:\d*[A-Z][a-z]*\d*)+\s*)*(?:→|->|⟶|⇌)\s*(?:\d*[A-Z][a-z]*\d*)+\s*(?:[+]\s*(?:\d*[A-Z][a-z]*\d*)+\s*)*/g,
  
  // Chemical states pattern (s), (l), (g), (aq)
  states: /\([sglaq]\)/g,
};

/**
 * Validate if the content contains any chemical equations
 * @param content - The content to validate
 * @returns true if chemical equations are present
 */
function containsChemicalEquations(content: string): boolean {
  return REGEX.equation.test(content);
}

/**
 * Check for balanced chemical equations
 * @param content - The content to validate
 * @returns Object with isValid flag and any detected issues
 */
function validateChemicalEquations(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Reset regex lastIndex
  REGEX.equation.lastIndex = 0;
  
  // Find all chemical equations in content
  const equations = content.match(REGEX.equation) || [];
  
  if (equations.length === 0) {
    result.warnings.push('No chemical equations found in content. Chemistry content should typically include relevant chemical equations.');
    return result;
  }
  
  // Basic check for arrow symbol in equations
  for (const equation of equations) {
    if (!equation.includes('→') && !equation.includes('->') && !equation.includes('⟶')) {
      result.errors.push(`Equation "${equation}" may not use proper reaction arrow symbol (→).`);
    }
    
    // Check for state symbols
    if (!REGEX.states.test(equation)) {
      result.warnings.push(`Equation "${equation}" does not include state symbols (s), (l), (g), or (aq).`);
    }
  }
  
  return result;
}

/**
 * Check if chemical formulas are properly formatted
 * @param content - The content to validate
 * @returns Object with isValid flag and any detected issues
 */
function validateChemicalFormulas(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check for common formulas and their correct representations
  for (const [name, formula] of Object.entries(COMMON_FORMULAS)) {
    // If the name appears in the content, check if the formula also appears correctly
    if (content.toLowerCase().includes(name.toLowerCase()) && 
        !content.includes(formula)) {
      result.warnings.push(`Content mentions "${name}" but may not include its correct formula "${formula}".`);
    }
  }
  
  // Check for subscripts in formulas (HTML or Unicode)
  const hasFormattedSubscripts = content.includes('<sub>') || 
                                /[₀₁₂₃₄₅₆₇₈₉]/.test(content);
  
  if (!hasFormattedSubscripts && REGEX.formula.test(content)) {
    result.warnings.push('Chemical formulas may not be properly formatted with subscripts. Consider using <sub> tags or Unicode subscripts.');
  }
  
  return result;
}

/**
 * Check if content aligns with IGCSE Chemistry curriculum
 * @param content - The content to validate
 * @returns Object with isValid flag and any detected issues
 */
function validateCurriculumAlignment(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  const contentLower = content.toLowerCase();
  const matchedTopics: string[] = [];
  
  // Check for coverage of core IGCSE Chemistry topics
  for (const topic of IGCSE_CHEMISTRY_TOPICS) {
    if (contentLower.includes(topic.toLowerCase())) {
      matchedTopics.push(topic);
    }
  }
  
  if (matchedTopics.length === 0) {
    result.warnings.push('Content may not clearly align with IGCSE Chemistry curriculum topics. Consider including explicit references to syllabus topics.');
  }
  
  // Check if there's at least one practical/experimental reference
  const hasPracticalReference = 
    contentLower.includes('experiment') || 
    contentLower.includes('practical') || 
    contentLower.includes('apparatus') || 
    contentLower.includes('laboratory') ||
    contentLower.includes('safety');
  
  if (!hasPracticalReference) {
    result.warnings.push('Content does not include references to practical work or experiments. IGCSE Chemistry emphasizes practical skills.');
  }
  
  return result;
}

/**
 * Check if the content includes appropriate safety information
 * @param content - The content to validate
 * @returns Object with isValid flag and any detected issues
 */
function validateSafetyInformation(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  const contentLower = content.toLowerCase();
  const hasPracticalReference = 
    contentLower.includes('experiment') || 
    contentLower.includes('practical') || 
    contentLower.includes('apparatus') || 
    contentLower.includes('laboratory');
  
  const hasSafetyReference = 
    contentLower.includes('safety') || 
    contentLower.includes('hazard') || 
    contentLower.includes('precaution') ||
    contentLower.includes('danger') || 
    contentLower.includes('careful');
  
  if (hasPracticalReference && !hasSafetyReference) {
    result.warnings.push('Content mentions practical work but does not include appropriate safety information.');
  }
  
  return result;
}

/**
 * Perform comprehensive validation of Chemistry content
 * @param content - The content to validate
 * @returns Validation result with errors and warnings
 */
export function validateChemistryContent(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Skip validation for very short content
  if (!content || content.length < 50) {
    result.errors.push('Content is too short for proper validation.');
    result.isValid = false;
    return result;
  }

  // Perform all validation checks
  const formulaValidation = validateChemicalFormulas(content);
  const equationValidation = validateChemicalEquations(content);
  const curriculumValidation = validateCurriculumAlignment(content);
  const safetyValidation = validateSafetyInformation(content);
  
  // Merge errors and warnings
  result.errors = [
    ...result.errors,
    ...formulaValidation.errors,
    ...equationValidation.errors,
    ...curriculumValidation.errors,
    ...safetyValidation.errors
  ];
  
  result.warnings = [
    ...result.warnings,
    ...formulaValidation.warnings,
    ...equationValidation.warnings,
    ...curriculumValidation.warnings,
    ...safetyValidation.warnings
  ];
  
  // Set overall validity - fails if there are any errors
  result.isValid = result.errors.length === 0;
  
  return result;
}

/**
 * Utility to format chemical equations with proper subscripts using HTML
 * @param equation - The chemical equation to format
 * @returns Formatted equation with HTML subscripts
 */
export function formatChemicalEquation(equation: string): string {
  return equation.replace(/(\d+)/g, '<sub>$1</sub>');
}

/**
 * Check if content is Chemistry-related
 * @param content - The content to check
 * @returns boolean indicating if content is Chemistry-related
 */
export function isChemistryContent(content: string): boolean {
  if (!content) return false;
  
  const chemistryKeywords = [
    'chemistry', 'chemical', 'element', 'compound', 
    'acid', 'base', 'reaction', 'molecule', 
    'periodic table', 'atom', 'electron', 'proton'
  ];
  
  const contentLower = content.toLowerCase();
  return chemistryKeywords.some(keyword => contentLower.includes(keyword));
}
