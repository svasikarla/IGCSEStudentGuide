import { useState } from 'react';
import { llmService, LLMProvider } from '../services/llmService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { validateChemistryContent, ValidationResult, isChemistryContent } from '../utils/chemistryValidator';
import { Subject } from './useSubjects';

export interface GeneratedSubject {
  name: string;
  code: string;
  description: string;
  color_hex: string;
  icon_name: string;
}

export function useSubjectGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const { session } = useAuth();

  const generateSubject = async (
    prompt: string,
    provider: LLMProvider,
    model: string
  ): Promise<GeneratedSubject | null> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session || !session.access_token) {
        throw new Error('Authentication required. Please log in to generate content.');
      }
      
      const systemPrompt = `
        Generate a detailed IGCSE subject based on the following prompt.
        Return a JSON object with these fields:
        - name: The name of the subject
        - code: A short code for the subject (e.g., "MATH" for Mathematics)
        - description: A detailed description of what the subject covers (2-3 paragraphs)
        - color_hex: A suitable hex color code for the subject (e.g., "#4285F4")
        - icon_name: A suitable icon name from common icon sets (e.g., "book", "calculator", "flask")
      `;
      
      const fullPrompt = `${systemPrompt}\n\nPrompt: ${prompt}`;
      
      const result = await llmService.generateJSON<GeneratedSubject>(fullPrompt, {
        authToken: session.access_token,
        provider: provider,
        model: model
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate subject';
      setError(errorMessage);
      console.error('Error generating subject:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveSubject = async (subject: GeneratedSubject): Promise<Subject | null> => {
    try {
      setLoading(true);
      setError(null);
      setValidationResults(null);
      
      const { data: maxOrderData } = await supabase
        .from('subjects')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const maxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order : 0;
      
      if (isChemistryContent(subject.name)) {
        const validation = validateChemistryContent(subject.description);
        setValidationResults(validation);
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
          console.warn('Chemistry content validation issues:', validation);
        }
      }

      const { data, error: dbError } = await supabase
        .from('subjects')
        .insert({
          name: subject.name,
          code: subject.code,
          description: subject.description,
          color_hex: subject.color_hex,
          icon_name: subject.icon_name,
          display_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (dbError) throw new Error(dbError.message);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save subject';
      setError(errorMessage);
      console.error('Error saving subject:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { 
    generateSubject, 
    saveSubject, 
    loading, 
    error,
    validationResults 
  };
}
