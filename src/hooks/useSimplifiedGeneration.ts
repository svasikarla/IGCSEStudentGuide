/**
 * Simplified Content Generation Hooks
 * 
 * React hooks for the new simplified content generation approach.
 * Replaces complex web scraping with direct LLM generation.
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { 
  simplifiedContentGenerator, 
  GenerationOptions,
  QuizQuestion,
  ExamQuestion,
  Flashcard 
} from '../services/simplifiedContentGenerator';

interface GenerationState {
  loading: boolean;
  error: string | null;
  progress: number;
  estimatedCost: number;
}

/**
 * Hook for simplified quiz generation
 */
export function useSimplifiedQuizGeneration() {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    progress: 0,
    estimatedCost: 0
  });
  
  const { session } = useAuth();
  const supabase = useSupabaseClient();

  const generateAndSaveQuiz = async (
    topicId: string,
    subject: string,
    topicTitle: string,
    syllabusCode: string,
    questionCount: number = 5,
    difficultyLevel: number = 3,
    costTier: 'minimal' | 'standard' | 'premium' = 'minimal'
  ) => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      progress: 10,
      estimatedCost: simplifiedContentGenerator.estimateGenerationCost('quiz', questionCount, costTier)
    }));

    try {
      // Generate questions using simplified approach
      setState(prev => ({ ...prev, progress: 30 }));
      
      const questions = await simplifiedContentGenerator.generateQuizQuestions(
        subject,
        topicTitle,
        syllabusCode,
        questionCount,
        difficultyLevel,
        10, // Grade 10
        {
          costTier,
          authToken: session.access_token
        }
      );

      setState(prev => ({ ...prev, progress: 60 }));

      // Create quiz record
      const quizData = {
        topic_id: topicId,
        title: `${topicTitle} - Practice Quiz`,
        description: `Auto-generated quiz for ${topicTitle}`,
        quiz_type: 'practice',
        difficulty_level: difficultyLevel,
        randomize_questions: true,
        show_correct_answers: true,
        is_published: true
      };

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert(quizData)
        .select()
        .single();

      if (quizError) throw quizError;

      setState(prev => ({ ...prev, progress: 80 }));

      // Save questions
      const questionData = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? {
          A: q.options[0]?.replace('A) ', ''),
          B: q.options[1]?.replace('B) ', ''),
          C: q.options[2]?.replace('C) ', ''),
          D: q.options[3]?.replace('D) ', '')
        } : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        points: q.points,
        display_order: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionData);

      if (questionsError) throw questionsError;

      setState(prev => ({ ...prev, progress: 100, loading: false }));
      
      return {
        quiz,
        questions: questionData,
        generatedCount: questions.length,
        estimatedCost: state.estimatedCost
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        progress: 0 
      }));
      return null;
    }
  };

  return {
    ...state,
    generateAndSaveQuiz
  };
}

/**
 * Hook for simplified exam paper generation
 */
export function useSimplifiedExamGeneration() {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    progress: 0,
    estimatedCost: 0
  });
  
  const { session } = useAuth();

  const generateExamPaper = async (
    subject: string,
    topicTitle: string,
    syllabusCode: string,
    duration: number = 60,
    totalMarks: number = 50,
    costTier: 'minimal' | 'standard' | 'premium' = 'standard'
  ) => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      progress: 10,
      estimatedCost: simplifiedContentGenerator.estimateGenerationCost('exam', 8, costTier)
    }));

    try {
      setState(prev => ({ ...prev, progress: 50 }));
      
      const examPaper = await simplifiedContentGenerator.generateExamPaper(
        subject,
        topicTitle,
        syllabusCode,
        {
          questionCount: Math.ceil(totalMarks / 5), // Estimate questions from marks
          timeLimit: duration,
          difficultyLevel: 3
        }
      );

      setState(prev => ({ ...prev, progress: 100, loading: false }));
      
      return {
        ...examPaper,
        estimatedCost: state.estimatedCost
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        progress: 0 
      }));
      return null;
    }
  };

  return {
    ...state,
    generateExamPaper
  };
}

/**
 * Hook for simplified flashcard generation
 */
export function useSimplifiedFlashcardGeneration() {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    progress: 0,
    estimatedCost: 0
  });
  
  const { session } = useAuth();
  const supabase = useSupabaseClient();

  const generateAndSaveFlashcards = async (
    topicId: string,
    subject: string,
    topicTitle: string,
    syllabusCode: string,
    cardCount: number = 10,
    costTier: 'minimal' | 'standard' | 'premium' = 'minimal'
  ) => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, error: 'Authentication required' }));
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      progress: 10,
      estimatedCost: simplifiedContentGenerator.estimateGenerationCost('flashcards', cardCount, costTier)
    }));

    try {
      setState(prev => ({ ...prev, progress: 40 }));
      
      const flashcards = await simplifiedContentGenerator.generateFlashcards(
        subject,
        topicTitle,
        syllabusCode,
        cardCount,
        10, // Grade 10
        {
          costTier,
          authToken: session.access_token
        }
      );

      setState(prev => ({ ...prev, progress: 70 }));

      // Save flashcards to database
      const flashcardData = flashcards.map(card => ({
        topic_id: topicId,
        front_content: card.front_content,
        back_content: card.back_content,
        card_type: card.card_type,
        difficulty_level: card.difficulty_level,
        tags: card.tags,
        hint: card.hint,
        is_active: true
      }));

      const { data, error } = await supabase
        .from('flashcards')
        .insert(flashcardData)
        .select();

      if (error) throw error;

      setState(prev => ({ ...prev, progress: 100, loading: false }));
      
      return {
        flashcards: data,
        generatedCount: flashcards.length,
        estimatedCost: state.estimatedCost
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        progress: 0 
      }));
      return null;
    }
  };

  return {
    ...state,
    generateAndSaveFlashcards
  };
}

/**
 * Hook for cost estimation
 */
export function useGenerationCostEstimator() {
  const estimateCost = (
    contentType: 'quiz' | 'exam' | 'flashcards',
    itemCount: number,
    costTier: 'minimal' | 'standard' | 'premium' = 'minimal'
  ) => {
    return simplifiedContentGenerator.estimateGenerationCost(contentType, itemCount, costTier);
  };

  const compareCosts = (itemCount: number) => {
    return {
      quiz: {
        minimal: estimateCost('quiz', itemCount, 'minimal'),
        standard: estimateCost('quiz', itemCount, 'standard'),
        premium: estimateCost('quiz', itemCount, 'premium')
      },
      exam: {
        minimal: estimateCost('exam', itemCount, 'minimal'),
        standard: estimateCost('exam', itemCount, 'standard'),
        premium: estimateCost('exam', itemCount, 'premium')
      },
      flashcards: {
        minimal: estimateCost('flashcards', itemCount, 'minimal'),
        standard: estimateCost('flashcards', itemCount, 'standard'),
        premium: estimateCost('flashcards', itemCount, 'premium')
      }
    };
  };

  return {
    estimateCost,
    compareCosts
  };
}
