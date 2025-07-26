import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Quiz {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  difficulty_level: number;
  time_limit_minutes: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  display_order: number;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  time_taken_seconds: number | null;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  answers: Record<string, string>; // { question_id: selected_answer_index }
}

/**
 * Hook for managing quiz attempts and progress
 */
export function useQuizAttempts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Create a sample quiz if none exist
   */
  const createSampleQuiz = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Create a sample quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          {
            topic_id: '6bd3e30d-7b5c-43f1-87d9-362dc41090e2', // Using a known valid topic ID
            title: 'Sample IGCSE Mathematics Quiz',
            description: 'Test your knowledge of basic mathematics concepts.',
            difficulty_level: 2,
            time_limit_minutes: 10,
            is_published: true
          }
        ])
        .select()
        .single();
      
      if (quizError) throw new Error(quizError.message);
      if (!quizData) return null;
      
      // Create sample questions
      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert([
          {
            quiz_id: quizData.id,
            question_text: 'What is the value of x in the equation 2x + 5 = 15?',
            options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 3'],
            correct_answer: '0', // Index of the correct answer
            explanation: 'To solve 2x + 5 = 15, subtract 5 from both sides: 2x = 10. Then divide both sides by 2: x = 5.',
            display_order: 0
          },
          {
            quiz_id: quizData.id,
            question_text: 'Which of the following is the formula for the area of a circle?',
            options: ['A = πr²', 'A = 2πr', 'A = πd', 'A = r²'],
            correct_answer: '0',
            explanation: 'The area of a circle is calculated using the formula A = πr², where r is the radius of the circle.',
            display_order: 1
          },
          {
            quiz_id: quizData.id,
            question_text: 'Simplify the expression 3(2x - 4) + 5.',
            options: ['6x - 12 + 5', '6x - 7', '6x - 12', '6x - 7 + 5'],
            correct_answer: '1',
            explanation: 'First distribute: 3(2x - 4) = 6x - 12. Then add 5: 6x - 12 + 5 = 6x - 7.',
            display_order: 2
          }
        ]);
      
      if (questionsError) throw new Error(questionsError.message);
      
      console.log('Created sample quiz with ID:', quizData.id);
      return quizData.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sample quiz';
      setError(errorMessage);
      console.error('Error creating sample quiz:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchQuizzes = useCallback(async (): Promise<Quiz[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_published', true) // Restored the published filter
        .order('created_at', { ascending: false });
      
      console.log('Fetched quizzes:', data);

      if (fetchError) throw new Error(fetchError.message);
      
      // If no quizzes exist and user is logged in, create a sample quiz
      if ((!data || data.length === 0) && user) {
        console.log('No quizzes found, creating a sample quiz...');
        const sampleQuizId = await createSampleQuiz();
        
        if (sampleQuizId) {
          // Fetch again to include the newly created quiz
          const { data: refreshedData, error: refreshError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
            
          if (refreshError) throw new Error(refreshError.message);
          return refreshedData || [];
        }
      }
      
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quizzes';
      setError(errorMessage);
      console.error('Error in fetchQuizzes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [createSampleQuiz]);

  /**
   * Fetch a quiz with its questions
   */
  const fetchQuizWithQuestions = async (quizId: string): Promise<QuizWithQuestions | null> => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw new Error(quizError.message);
      if (!quizData) return null;

      // Fetch the questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('display_order', { ascending: true });

      if (questionsError) throw new Error(questionsError.message);

      // Transform questions to ensure options is an array
      const transformedQuestions = (questionsData || []).map(question => {
        let options: string[] = [];

        // Handle different formats of options field
        if (question.options) {
          if (Array.isArray(question.options)) {
            // Already an array
            options = question.options;
          } else if (typeof question.options === 'object') {
            // JSONB object format: {"A": "option1", "B": "option2", ...}
            // Convert to array in alphabetical order of keys
            const sortedKeys = Object.keys(question.options).sort();
            options = sortedKeys.map(key => question.options[key]);
          }
        }

        return {
          ...question,
          options
        };
      });

      return {
        ...quizData,
        questions: transformedQuestions
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quiz';
      setError(errorMessage);
      console.error('Error fetching quiz:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch user's quiz attempts
   */
  const fetchUserQuizAttempts = async (): Promise<QuizAttempt[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quiz attempts';
      setError(errorMessage);
      console.error('Error fetching quiz attempts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ensure user profile exists before attempting quiz operations
   */
  const ensureUserProfile = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating missing user profile for user:', user.id);

        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to create user profile:', insertError);
          return false;
        }

        console.log('Successfully created user profile');
        return true;
      } else if (profileError) {
        console.error('Error checking user profile:', profileError);
        return false;
      }

      // Profile exists
      return true;
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      return false;
    }
  };

  /**
   * Start a new quiz attempt
   */
  const startQuizAttempt = async (quizId: string): Promise<QuizAttempt | null> => {
    if (!user) {
      setError('You must be logged in to take a quiz');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure user profile exists before proceeding
      const profileExists = await ensureUserProfile();
      if (!profileExists) {
        throw new Error('Unable to create or verify user profile. Please try refreshing the page.');
      }

      // Get the quiz to determine total questions
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw new Error(quizError.message);

      // Get the questions to determine total count
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('quiz_id', quizId);

      if (questionsError) throw new Error(questionsError.message);

      // Get the next attempt number for this user and quiz
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('user_quiz_attempts')
        .select('attempt_number')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (attemptsError) throw new Error(attemptsError.message);

      const nextAttemptNumber = attemptsData && attemptsData.length > 0 
        ? attemptsData[0].attempt_number + 1 
        : 1;

      // Create a new attempt
      const newAttempt = {
        user_id: user.id,
        quiz_id: quizId,
        attempt_number: nextAttemptNumber,
        started_at: new Date().toISOString(),
        completed_at: null,
        time_taken_seconds: null,
        total_questions: questionsData?.length || 0,
        correct_answers: 0,
        score_percentage: 0,
        passed: false,
        answers: {}
      };

      const { data: attemptData, error: insertError } = await supabase
        .from('user_quiz_attempts')
        .insert(newAttempt)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      return attemptData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start quiz attempt';
      setError(errorMessage);
      console.error('Error starting quiz attempt:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit a quiz attempt
   */
  const submitQuizAttempt = async (
    attemptId: string, 
    answers: Record<string, string>,
    timeTakenSeconds: number
  ): Promise<QuizAttempt | null> => {
    if (!user) {
      setError('You must be logged in to submit a quiz');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure user profile exists before proceeding
      const profileExists = await ensureUserProfile();
      if (!profileExists) {
        throw new Error('Unable to verify user profile. Please try refreshing the page.');
      }

      // Get the attempt to verify it belongs to the user
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_quiz_attempts')
        .select('*, quizzes!inner(*)')
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .single();

      if (attemptError) throw new Error(attemptError.message);
      if (!attemptData) throw new Error('Quiz attempt not found');

      // Get the questions with correct answers and options
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id, correct_answer, options')
        .eq('quiz_id', attemptData.quiz_id);

      if (questionsError) throw new Error(questionsError.message);

      // Transform questions to ensure options is an array (same as in fetchQuizWithQuestions)
      const transformedQuestions = (questionsData || []).map(question => {
        let options: string[] = [];

        // Handle different formats of options field
        if (question.options) {
          if (Array.isArray(question.options)) {
            // Already an array
            options = question.options;
          } else if (typeof question.options === 'object') {
            // JSONB object format: {"A": "option1", "B": "option2", ...}
            // Convert to array in alphabetical order of keys
            const sortedKeys = Object.keys(question.options).sort();
            options = sortedKeys.map(key => question.options[key]);
          }
        }

        return {
          ...question,
          options
        };
      });

      // Calculate score
      let correctAnswers = 0;
      transformedQuestions.forEach(question => {
        const userAnswerIndex = answers[question.id];

        if (userAnswerIndex !== undefined && question.options && Array.isArray(question.options)) {
          // Convert user's selected index to the corresponding option text
          const userAnswerText = question.options[parseInt(userAnswerIndex)];

          // Compare the user's answer text with the correct answer text
          if (userAnswerText === question.correct_answer) {
            correctAnswers++;
          }
        }
      });

      const totalQuestions = transformedQuestions.length || 0;
      const scorePercentage = totalQuestions > 0 
        ? (correctAnswers / totalQuestions) * 100 
        : 0;
      
      // Determine if passed (60% is passing)
      const passed = scorePercentage >= 60;

      // Update the attempt
      const updatedAttempt = {
        completed: true,
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds,
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        passed,
        answers
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('user_quiz_attempts')
        .update(updatedAttempt)
        .eq('id', attemptId)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      // Update user topic progress
      await updateTopicProgress(attemptData.quizzes.topic_id);

      return updatedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit quiz attempt';
      setError(errorMessage);
      console.error('Error submitting quiz attempt:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user topic progress after completing a quiz
   */
  const updateTopicProgress = async (topicId: string): Promise<void> => {
    if (!user) return;

    try {
      // Get the quiz_id for the most recent attempt on this topic
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('topic_id', topicId)
        .limit(1)
        .single();
      
      if (quizError) throw new Error(`Failed to get quiz for topic: ${quizError.message}`);
      
      // The database has a trigger function that calculates topic progress,
      // but we'll call it explicitly here to ensure it runs
      const { error: progressError } = await supabase.rpc('calculate_topic_progress', {
        p_user_id: user.id,
        p_topic_id: topicId,
        p_quiz_id: quizData.id
      });
      
      if (progressError) throw new Error(`Failed to update topic progress: ${progressError.message}`);
    } catch (err) {
      console.error('Error updating topic progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update topic progress');
    }
  };

  /**
   * Get quiz statistics for a user
   */
  const getUserQuizStats = useCallback(async () => {
    if (!user) return null;

    try {
      setLoading(true);
      setError(null);

      // Get total quizzes taken
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_quiz_attempts')
        .select('id, score_percentage')
        .eq('user_id', user.id)
        // Remove the completed filter since we added it to the DB but might not have backfilled all records
        // .eq('completed', true)  
        .not('completed_at', 'is', null);

      if (attemptError) {
        console.error('Error fetching quiz attempts:', attemptError);
        throw new Error(attemptError.message);
      }

      // Get quizzes taken this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: weeklyData, error: weeklyError } = await supabase
      .from('user_quiz_attempts')
      .select('id')
      .eq('user_id', user.id)
      // Remove the completed filter since we added it to the DB but might not have backfilled all records
      // .eq('completed', true)  
      .not('completed_at', 'is', null)
      .gte('completed_at', oneWeekAgo.toISOString());

    if (weeklyError) {
      console.error('Error fetching weekly quiz attempts:', weeklyError);
      throw new Error(weeklyError.message);
    }

      // Calculate average score
      const totalAttempts = attemptData?.length || 0;
      const totalScore = attemptData?.reduce((sum, attempt) => sum + (attempt.score_percentage || 0), 0) || 0;
      const averageScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;

      console.log('Quiz stats calculated:', {
        totalQuizzesTaken: totalAttempts,
        quizzesTakenThisWeek: weeklyData?.length || 0,
        averageScore: averageScore
      });

      return {
        totalQuizzesTaken: totalAttempts,
        quizzesTakenThisWeek: weeklyData?.length || 0,
        averageScore: averageScore
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quiz statistics';
      setError(errorMessage);
      console.error('Error getting quiz statistics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    fetchQuizzes,
    fetchQuizWithQuestions,
    fetchUserQuizAttempts,
    startQuizAttempt,
    submitQuizAttempt,
    getUserQuizStats,
    loading,
    error
  };
}
