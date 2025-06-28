import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { LLMProvider } from '../services/llmAdapter';
import { useQuizGeneration as useLLMQuizGeneration, GeneratedQuiz, QuizQuestion } from './useLLMGeneration';
import { ValidationResult, validateChemistryContent } from '../utils/chemistryValidator';

export function useQuizGeneration() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const supabaseClient = useSupabaseClient();
  const { generateQuiz } = useLLMQuizGeneration();
  
  // Helper function that wraps generateContent from the base LLM generation
  

      const generateAndSaveQuiz = async (
    topicId: string,
    topicTitle: string,
    topicContent: string,
    questionCount: number,
    difficulty: string,
    provider: LLMProvider,
    model: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
                  const generatedQuiz = await generateQuiz(topicTitle, topicContent, questionCount, difficulty, provider, model);

      if (!generatedQuiz) {
        throw new Error('Failed to generate quiz from LLM.');
      }

      // Validate chemistry content if applicable
      const quizContentForValidation = JSON.stringify(generatedQuiz);
      if (validateChemistryContent(quizContentForValidation)) {
        const validation = validateChemistryContent(quizContentForValidation);
        setValidationResults(validation);
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
          console.warn('Chemistry content validation issues:', validation);
        }
      }

      // Save the quiz to the database
      const { data: quiz, error: saveError } = await supabaseClient
        .from('quizzes')
        .insert({
          topic_id: topicId,
          title: generatedQuiz.title,
          description: generatedQuiz.description,
          difficulty_level: generatedQuiz.difficulty_level,
          time_limit_minutes: generatedQuiz.time_limit_minutes,
          is_published: true, // Default to published
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Save quiz questions
      if (quiz) {
        const questionsToInsert = generatedQuiz.questions.map((q, index) => {
          // Convert correct_answer_index to correct_answer text
          // The database expects a text value, not an index
          let correctAnswer: string;

          if (typeof q.correct_answer_index === 'number' && Array.isArray(q.options)) {
            // Convert 0-based index to the actual answer text
            correctAnswer = q.options[q.correct_answer_index] || '0';
          } else {
            // Fallback to index as string if conversion fails
            correctAnswer = String(q.correct_answer_index || 0);
          }

          return {
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: 'multiple_choice', // Default question type
            options: q.options,
            correct_answer: correctAnswer, // Use correct_answer instead of correct_answer_index
            explanation: q.explanation,
            points: 1, // Default points value
            display_order: index,
          };
        });

        const { error: questionsError } = await supabaseClient
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (questionsError) {
          // If questions fail to save, delete the parent quiz to avoid orphaned data
          console.error('Error saving quiz questions:', questionsError);
          console.log('Attempting to rollback quiz creation...');

          await supabaseClient
            .from('quizzes')
            .delete()
            .eq('id', quiz.id);

          throw new Error(`Failed to save quiz questions: ${questionsError.message}`);
        }
      }

      return quiz;
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      setError(err.message || 'Failed to generate quiz');
      return null;
    } finally {
      setLoading(false);
    }
  };

  

  return {
    generateAndSaveQuiz,
    loading,
    error,
    validationResults
  };
}
