import { useState, useCallback } from 'react';
import {
  importSubjectHierarchy,
  getSubjectHierarchy,
  validateImportData,
  loadTemplate,
  SubjectHierarchyData,
  SubjectHierarchyResponse,
  SubjectWithHierarchy,
} from '../services/subjectImportAPI';

interface UseSubjectImportReturn {
  // State
  importing: boolean;
  progress: number;
  errors: string[];
  warnings: string[];
  result: SubjectHierarchyResponse | null;

  // Actions
  importHierarchy: (data: SubjectHierarchyData) => Promise<SubjectHierarchyResponse | null>;
  validateData: (data: any) => { isValid: boolean; errors: string[]; warnings: string[] };
  loadTemplateFile: (templateName: string) => Promise<SubjectHierarchyData | null>;
  reset: () => void;
}

/**
 * Hook for importing subject hierarchies
 */
export function useSubjectImport(): UseSubjectImportReturn {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<SubjectHierarchyResponse | null>(null);

  /**
   * Import a subject hierarchy
   */
  const importHierarchy = useCallback(
    async (data: SubjectHierarchyData): Promise<SubjectHierarchyResponse | null> => {
      try {
        setImporting(true);
        setProgress(0);
        setErrors([]);
        setWarnings([]);
        setResult(null);

        // Validate data first
        setProgress(10);
        const validation = validateImportData(data);

        if (!validation.isValid) {
          setErrors(validation.errors);
          setWarnings(validation.warnings);
          setImporting(false);
          return null;
        }

        setWarnings(validation.warnings);
        setProgress(20);

        // Call API
        console.log('Importing subject hierarchy:', data.subject.name);
        const response = await importSubjectHierarchy(data);

        setProgress(90);

        // Add any warnings from backend
        if (response.warnings && response.warnings.length > 0) {
          setWarnings((prev) => [...prev, ...response.warnings!]);
        }

        setResult(response);
        setProgress(100);

        console.log('Import successful:', response.stats);

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to import subject';
        console.error('Import error:', error);
        setErrors([errorMessage]);
        return null;
      } finally {
        setImporting(false);
      }
    },
    []
  );

  /**
   * Validate import data without importing
   */
  const validateData = useCallback((data: any) => {
    return validateImportData(data);
  }, []);

  /**
   * Load a template file
   */
  const loadTemplateFile = useCallback(
    async (templateName: string): Promise<SubjectHierarchyData | null> => {
      try {
        setErrors([]);
        setWarnings([]);
        console.log('Loading template:', templateName);

        const template = await loadTemplate(templateName);

        console.log('Template loaded successfully');
        return template;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load template';
        console.error('Template loading error:', error);
        setErrors([errorMessage]);
        return null;
      }
    },
    []
  );

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setImporting(false);
    setProgress(0);
    setErrors([]);
    setWarnings([]);
    setResult(null);
  }, []);

  return {
    importing,
    progress,
    errors,
    warnings,
    result,
    importHierarchy,
    validateData,
    loadTemplateFile,
    reset,
  };
}

/**
 * Hook for fetching subject hierarchies
 */
export function useSubjectHierarchy(subjectId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<SubjectWithHierarchy | null>(null);

  const fetchHierarchy = useCallback(async () => {
    if (!subjectId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSubjectHierarchy(subjectId);
      setHierarchy(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hierarchy';
      setError(errorMessage);
      console.error('Error fetching hierarchy:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  return {
    hierarchy,
    loading,
    error,
    fetchHierarchy,
  };
}
