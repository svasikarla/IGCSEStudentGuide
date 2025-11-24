/**
 * Generic Content Generation Hook
 *
 * Unified hook for all content types (quizzes, flashcards, exam papers).
 * Replaces the specialized hooks: useQuizGeneration, useFlashcardGeneration,
 * useExamPaperGeneration, useSimplifiedGeneration, etc.
 *
 * Benefits:
 * - Single source of truth for content generation
 * - Consistent error handling and loading states
 * - Built-in validation support
 * - Automatic cost tier selection
 * - Easy to extend with new content types
 */

import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '../contexts/AuthContext';
import {
  generateQuiz,
  generateExamPaper,
  generateFlashcards,
  ContentGenerationOptions,
  QuizGenerationParams,
  ExamPaperGenerationParams,
  FlashcardGenerationParams,
  QuizQuestion,
  ExamQuestion,
  Flashcard,
} from '../services/contentGenerationAPI';
import { validateChemistryContent, ValidationResult } from '../utils/chemistryValidator';

export type ContentType = 'quiz' | 'exam' | 'flashcard';

export interface UseContentGenerationOptions extends ContentGenerationOptions {
  autoSave?: boolean;
  validateChemistry?: boolean;
}

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationResults?: ValidationResult;
  metadata?: any;
}

/**
 * Generic content generation hook
 * @param contentType - Type of content to generate ('quiz', 'exam', 'flashcard')
 * @param options - Generation options (provider, model, costTier, etc.)
 */
export function useContentGeneration<T = any>(
  contentType: ContentType,
  options: UseContentGenerationOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const supabaseClient = useSupabaseClient();
  const { session } = useAuth();

  /**
   * Generate content based on type
   */
  const generate = useCallback(async (params: any): Promise<GenerationResult<T>> => {
    setLoading(true);
    setError(null);
    setValidationResults(null);

    try {
      let result: any;

      // Call appropriate API based on content type
      switch (contentType) {
        case 'quiz':
          result = await generateQuiz(params as QuizGenerationParams, options);
          setGeneratedContent(result.questions as T);
          break;

        case 'exam':
          result = await generateExamPaper(params as ExamPaperGenerationParams, options);
          setGeneratedContent(result as T);
          break;

        case 'flashcard':
          result = await generateFlashcards(params as FlashcardGenerationParams, options);
          setGeneratedContent(result.flashcards as T);
          break;

        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      // Store metadata
      setMetadata(result.metadata);

      // Validate chemistry content if enabled
      if (options.validateChemistry) {
        const contentString = JSON.stringify(result);
        const validation = validateChemistryContent(contentString);
        if (validation) {
          setValidationResults(validation);
          if (validation.errors.length > 0) {
            console.warn('Chemistry validation errors:', validation.errors);
          }
        }
      }

      setLoading(false);
      return {
        success: true,
        data: contentType === 'quiz'
          ? result.questions
          : contentType === 'flashcard'
          ? result.flashcards
          : result,
        metadata: result.metadata,
        validationResults: validationResults || undefined,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Content generation failed';
      setError(errorMessage);
      setLoading(false);
      console.error(`${contentType} generation error:`, err);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [contentType, options, validationResults]);

  /**
   * Generate and save quiz to database
   */
  const generateAndSaveQuiz = useCallback(async (
    topicId: string,
    params: QuizGenerationParams
  ): Promise<any> => {
    const result = await generate(params);

    if (!result.success || !result.data) {
      return null;
    }

    const questions = result.data as QuizQuestion[];

    try {
      // Save quiz to database
      const { data: quiz, error: saveError } = await supabaseClient
        .from('quizzes')
        .insert({
          topic_id: topicId,
          title: `${params.subject} - ${params.topicTitle}`,
          description: `Quiz for ${params.topicTitle}`,
          difficulty_level: params.difficultyLevel || 3,
          time_limit_minutes: Math.max(questions.length * 2, 10),
          is_published: true,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Save quiz questions
      if (quiz) {
        const questionsToInsert = questions.map((q, index) => ({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points || 1,
          display_order: index,
        }));

        const { error: questionsError } = await supabaseClient
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (questionsError) {
          // Rollback: delete the quiz
          await supabaseClient.from('quizzes').delete().eq('id', quiz.id);
          throw new Error(`Failed to save quiz questions: ${questionsError.message}`);
        }
      }

      return quiz;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save quiz';
      setError(errorMessage);
      return null;
    }
  }, [generate, supabaseClient]);

  /**
   * Generate and save exam paper to database
   */
  const generateAndSaveExamPaper = useCallback(async (
    topicId: string,
    params: ExamPaperGenerationParams
  ): Promise<any> => {
    const result = await generate(params);

    if (!result.success || !result.data) {
      return null;
    }

    const examData = result.data as any;

    try {
      // Save exam paper to database
      const { data: examPaper, error: saveError } = await supabaseClient
        .from('exam_papers')
        .insert({
          topic_id: topicId,
          title: examData.title,
          description: examData.instructions,
          duration_minutes: examData.duration_minutes,
          total_marks: examData.total_marks,
          is_published: true,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Save exam questions
      if (examPaper && examData.questions) {
        const questionsToInsert = examData.questions.map((q: ExamQuestion, index: number) => ({
          exam_paper_id: examPaper.id,
          question_text: q.question_text,
          marks: q.marks,
          question_number: q.question_number || String(index + 1),
          display_order: index,
        }));

        const { error: questionsError } = await supabaseClient
          .from('exam_questions')
          .insert(questionsToInsert);

        if (questionsError) {
          // Rollback: delete the exam paper
          await supabaseClient.from('exam_papers').delete().eq('id', examPaper.id);
          throw new Error(`Failed to save exam questions: ${questionsError.message}`);
        }
      }

      return examPaper;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save exam paper';
      setError(errorMessage);
      return null;
    }
  }, [generate, supabaseClient]);

  /**
   * Generate and save flashcards to database
   */
  const generateAndSaveFlashcards = useCallback(async (
    topicId: string,
    params: FlashcardGenerationParams
  ): Promise<any> => {
    const result = await generate(params);

    if (!result.success || !result.data) {
      return null;
    }

    const flashcards = result.data as Flashcard[];

    try {
      // Prepare flashcards for insertion
      const flashcardsToInsert = flashcards.map((fc) => ({
        topic_id: topicId,
        front_content: fc.front_content,
        back_content: fc.back_content,
        card_type: fc.card_type || 'basic',
        difficulty_level: fc.difficulty_level || 3,
        tags: fc.tags || [],
        is_active: true,
      }));

      // Insert flashcards
      const { data: insertedFlashcards, error: flashcardsError } = await supabaseClient
        .from('flashcards')
        .insert(flashcardsToInsert)
        .select();

      if (flashcardsError) throw flashcardsError;

      return {
        flashcards: insertedFlashcards,
        count: insertedFlashcards?.length || 0,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save flashcards';
      setError(errorMessage);
      return null;
    }
  }, [generate, supabaseClient]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setValidationResults(null);
    setGeneratedContent(null);
    setMetadata(null);
  }, []);

  return {
    // State
    loading,
    error,
    validationResults,
    generatedContent,
    metadata,

    // Actions
    generate,
    generateAndSaveQuiz,
    generateAndSaveExamPaper,
    generateAndSaveFlashcards,
    clearError,
    reset,
  };
}

// Convenience hooks for specific content types
export const useQuizGeneration = (options?: UseContentGenerationOptions) =>
  useContentGeneration<QuizQuestion[]>('quiz', options);

export const useExamPaperGeneration = (options?: UseContentGenerationOptions) =>
  useContentGeneration('exam', options);

export const useFlashcardGeneration = (options?: UseContentGenerationOptions) =>
  useContentGeneration<Flashcard[]>('flashcard', options);
