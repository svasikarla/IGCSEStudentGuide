import { useState } from 'react';
import { ValidationResult, validateChemistryContent } from '../utils/chemistryValidator';

/**
 * Hook for validating chemistry content
 */
export function useChemistryValidation() {
  const [loading, setLoading] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

  /**
   * Validate content for chemistry-related issues
   * @param content Text content to validate
   * @returns Validation results
   */
  const validateContent = (content: string): ValidationResult => {
    setLoading(true);
    try {
      const results = validateChemistryContent(content);
      setValidationResults(results);
      return results;
    } catch (error) {
      console.error('Error validating chemistry content:', error);
      const fallbackResults: ValidationResult = {
        isValid: false,
        errors: [
          'An error occurred during validation'
        ],
        warnings: []
      };
      setValidationResults(fallbackResults);
      return fallbackResults;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset validation results
   */
  const resetValidation = () => {
    setValidationResults(null);
  };

  return {
    validateContent,
    resetValidation,
    validationResults,
    loading
  };
}
