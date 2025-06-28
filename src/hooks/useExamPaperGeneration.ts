import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { llmService } from '../services/llmService';
import { useAuth } from '../contexts/AuthContext';
import { Topic } from './useTopics';
import { LLMProvider } from '../services/llmAdapter';
import { validateChemistryContent, ValidationResult, isChemistryContent } from '../utils/chemistryValidator';

// Interface for a single generated question
export interface GeneratedQuestion {
  question_text: string;
  answer_text: string;
  marks: number;
  difficulty_level: number; // 1-5
}

// Interface for the entire generated exam paper
export interface GeneratedExamPaper {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}

/**
 * Hook for generating and saving a complete exam paper using an LLM.
 */
export function useExamPaperGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const { session } = useAuth();

  /**
   * Generates and saves an exam paper for a given topic.
   * @param topic The topic to generate the exam paper for.
   * @param subjectName The name of the subject the topic belongs to.
   * @param questionCount The number of questions to generate.
   * @param provider The LLM provider to use for generation.
   * @returns The newly created exam paper record from the database, or null if an error occurred.
   */
  const generateAndSaveExamPaper = async (
    topic: Topic,
    subjectName: string,
    questionCount: number = 10,
    provider: LLMProvider = LLMProvider.OPENAI
  ) => {
    setLoading(true);
    setError(null);
    setValidationResults(null);

    if (!session?.access_token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return null;
    }

    try {
      const isChemistryTopic = isChemistryContent(subjectName) || isChemistryContent(topic.title);
      
      // 1. Generate the exam paper content using the LLM
      let systemPrompt = `
        You are an expert IGCSE curriculum developer.
        Generate a complete exam paper for the topic "${topic.title}" within the subject of "${subjectName}".
        The paper should contain ${questionCount} questions.
        The topic content for context is: "${(topic.content || '').substring(0, 2000)}..."
        
        Return a single, valid JSON object with the following structure:
        {
          "title": "A suitable title for the exam paper",
          "description": "A brief description of what this exam paper covers.",
          "questions": [
            {
              "question_text": "The full text of the question.",
              "answer_text": "A detailed, correct answer or mark scheme entry.",
              "marks": 5, // Number of marks for this question
              "difficulty_level": 3 // A number from 1 (easy) to 5 (hard)
            }
          ]
        }
      `;
      
      // Add Chemistry-specific instructions if relevant
      if (isChemistryTopic) {
        systemPrompt += `
        
        IMPORTANT CHEMISTRY FORMATTING INSTRUCTIONS:
        1. For chemical formulas, use proper notation (e.g., H₂O, CO₂, Fe³⁺). If you can't use subscripts and superscripts, use regular notation (H2O, CO2, Fe3+).
        2. For chemical equations, include proper balancing and state symbols where appropriate: 2H₂(g) + O₂(g) → 2H₂O(l)
        3. Include appropriate IGCSE-level chemistry questions covering:
           - Atomic structure and bonding
           - Chemical calculations and mole concepts
           - Chemical reactions and equations
           - Periodic table and properties
           - Experimental techniques relevant to IGCSE level
        4. For calculation questions, include step-by-step solutions in the answer_text.
        5. Ensure all chemical terminology adheres to IGCSE Chemistry syllabus requirements.
        `;
      }

      const generatedData = await llmService.generateJSON<GeneratedExamPaper>(
        systemPrompt, 
        { 
          authToken: session.access_token,
          maxTokens: 4000,
          provider: provider // Using the LLMProvider enum
        }
      );

      if (!generatedData || !generatedData.questions || generatedData.questions.length === 0) {
        throw new Error('LLM failed to generate valid exam paper data.');
      }
      
      // Validate chemistry content if applicable
      if (isChemistryTopic) {
        const allText = [
          generatedData.title,
          generatedData.description,
          ...generatedData.questions.map(q => `${q.question_text} ${q.answer_text}`)
        ].join(' ');
        
        const validationResult = validateChemistryContent(allText);
        setValidationResults(validationResult);
        
        // Log validation results but don't block generation
        console.log('Chemistry validation results:', validationResult);
      }

      // 2. Save the generated data to the database
      const { data: newPaper, error: rpcError } = await supabase.rpc('create_exam_paper_with_questions', {
        p_title: generatedData.title,
        p_description: generatedData.description,
        p_subject_id: topic.subject_id,
        p_topic_id: topic.id,
        p_questions: generatedData.questions
        // Note: Provider tracking not implemented in current database schema
      });

      if (rpcError) {
        throw new Error(`Failed to save exam paper: ${rpcError.message}`);
      }

      console.log('Successfully created exam paper:', newPaper);
      return newPaper;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Error generating and saving exam paper:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateAndSaveExamPaper, loading, error, validationResults };
}
