/**
 * Enhanced hook for quiz management with subject/topic organization
 * Provides comprehensive quiz data with subject and topic information
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface EnhancedQuiz {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  difficulty_level: number;
  time_limit_minutes: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  quiz_type: string;
  passing_score_percentage: number;
  max_attempts: number | null;
  
  // Enhanced data from joins
  topic_title: string;
  topic_slug: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_color_hex: string;
  subject_icon_name: string;
  
  // Statistics
  total_questions: number;
  user_attempts: number;
  user_best_score: number | null;
  user_last_attempt: string | null;
  completion_status: 'not_started' | 'in_progress' | 'completed' | 'passed';
  average_score: number | null;
  total_attempts_all_users: number;
}

export interface QuizFilters {
  subject_id?: string;
  difficulty_level?: number;
  completion_status?: string;
  search_query?: string;
}

export interface QuizStatistics {
  total_quizzes: number;
  completed_quizzes: number;
  average_score: number;
  total_time_spent: number;
  subjects_with_quizzes: number;
  best_subject: string | null;
  recent_activity: Array<{
    quiz_id: string;
    quiz_title: string;
    subject_name: string;
    score: number;
    completed_at: string;
  }>;
}

export function useEnhancedQuizzes() {
  const [quizzes, setQuizzes] = useState<EnhancedQuiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<EnhancedQuiz[]>([]);
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch enhanced quiz data with subject/topic information
  const fetchEnhancedQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quizzes')
        .select(`
          *,
          topics!inner (
            id,
            title,
            slug,
            subject_id,
            subjects!inner (
              id,
              name,
              code,
              color_hex,
              icon_name
            )
          ),
          quiz_questions (
            id
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      // Transform the data to flat structure
      const enhancedQuizzes: EnhancedQuiz[] = (data || []).map(quiz => ({
        ...quiz,
        topic_title: quiz.topics.title,
        topic_slug: quiz.topics.slug,
        subject_id: quiz.topics.subjects.id,
        subject_name: quiz.topics.subjects.name,
        subject_code: quiz.topics.subjects.code,
        subject_color_hex: quiz.topics.subjects.color_hex,
        subject_icon_name: quiz.topics.subjects.icon_name,
        total_questions: quiz.quiz_questions?.length || 0,
        user_attempts: 0,
        user_best_score: null,
        user_last_attempt: null,
        completion_status: 'not_started' as const,
        average_score: null,
        total_attempts_all_users: 0
      }));

      // If user is logged in, fetch user-specific data
      if (user) {
        await enrichWithUserData(enhancedQuizzes);
      }

      setQuizzes(enhancedQuizzes);
      setFilteredQuizzes(enhancedQuizzes);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quizzes');
      console.error('Error fetching enhanced quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enrich quiz data with user-specific information
  const enrichWithUserData = async (quizzes: EnhancedQuiz[]) => {
    if (!user || quizzes.length === 0) return;

    try {
      // Fetch user quiz attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_quiz_attempts')
        .select('quiz_id, score_percentage, completed_at, passed')
        .eq('user_id', user.id)
        .in('quiz_id', quizzes.map(q => q.id));

      if (attemptsError) throw new Error(attemptsError.message);

      // Process attempts data
      const attemptsByQuiz = new Map<string, any[]>();
      attempts?.forEach(attempt => {
        if (!attemptsByQuiz.has(attempt.quiz_id)) {
          attemptsByQuiz.set(attempt.quiz_id, []);
        }
        attemptsByQuiz.get(attempt.quiz_id)!.push(attempt);
      });

      // Update quiz data with user information
      quizzes.forEach(quiz => {
        const userAttempts = attemptsByQuiz.get(quiz.id) || [];
        
        quiz.user_attempts = userAttempts.length;
        quiz.user_best_score = userAttempts.length > 0 
          ? Math.max(...userAttempts.map(a => a.score_percentage))
          : null;
        quiz.user_last_attempt = userAttempts.length > 0
          ? userAttempts.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at
          : null;

        // Determine completion status
        if (userAttempts.length === 0) {
          quiz.completion_status = 'not_started';
        } else if (userAttempts.some(a => a.passed)) {
          quiz.completion_status = 'passed';
        } else if (userAttempts.some(a => a.completed_at)) {
          quiz.completion_status = 'completed';
        } else {
          quiz.completion_status = 'in_progress';
        }
      });

    } catch (err) {
      console.error('Error enriching with user data:', err);
    }
  };

  // Fetch user statistics
  const fetchUserStatistics = useCallback(async () => {
    if (!user) return;

    try {
      // Get overall quiz statistics
      const { data: stats, error: statsError } = await supabase.rpc(
        'get_user_quiz_statistics',
        { p_user_id: user.id }
      );

      if (statsError) {
        console.warn('Quiz statistics function not available:', statsError.message);
        // Fallback to basic statistics
        await fetchBasicStatistics();
        return;
      }

      setStatistics(stats);

    } catch (err) {
      console.error('Error fetching user statistics:', err);
      await fetchBasicStatistics();
    }
  }, [user]);

  // Fallback basic statistics calculation
  const fetchBasicStatistics = async () => {
    if (!user) return;

    try {
      const { data: attempts, error } = await supabase
        .from('user_quiz_attempts')
        .select(`
          quiz_id,
          score_percentage,
          completed_at,
          passed,
          quizzes!inner (
            title,
            topics!inner (
              subjects!inner (
                name
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      if (error) throw new Error(error.message);

      const completedQuizzes = attempts?.length || 0;
      const averageScore = completedQuizzes > 0
        ? attempts!.reduce((sum, a) => sum + a.score_percentage, 0) / completedQuizzes
        : 0;

      // Get unique subjects - fix the data access
      const subjects = new Set(attempts?.map(a => (a as any).quizzes?.topics?.subjects?.name).filter(Boolean) || []);

      setStatistics({
        total_quizzes: quizzes.length,
        completed_quizzes: completedQuizzes,
        average_score: averageScore,
        total_time_spent: 0, // Would need additional tracking
        subjects_with_quizzes: subjects.size,
        best_subject: null, // Would need additional calculation
        recent_activity: (attempts || [])
          .slice(0, 5)
          .map(a => ({
            quiz_id: a.quiz_id,
            quiz_title: (a as any).quizzes?.title || 'Unknown Quiz',
            subject_name: (a as any).quizzes?.topics?.subjects?.name || 'Unknown Subject',
            score: a.score_percentage,
            completed_at: a.completed_at
          }))
      });

    } catch (err) {
      console.error('Error fetching basic statistics:', err);
    }
  };

  // Apply filters to quizzes
  const applyFilters = useCallback((filters: QuizFilters) => {
    let filtered = [...quizzes];

    if (filters.subject_id) {
      filtered = filtered.filter(quiz => quiz.subject_id === filters.subject_id);
    }

    if (filters.difficulty_level) {
      filtered = filtered.filter(quiz => quiz.difficulty_level === filters.difficulty_level);
    }

    if (filters.completion_status) {
      filtered = filtered.filter(quiz => quiz.completion_status === filters.completion_status);
    }

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase();
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(query) ||
        quiz.description?.toLowerCase().includes(query) ||
        quiz.subject_name.toLowerCase().includes(query) ||
        quiz.topic_title.toLowerCase().includes(query)
      );
    }

    setFilteredQuizzes(filtered);
  }, [quizzes]);

  // Group quizzes by subject
  const getQuizzesBySubject = useCallback(() => {
    const grouped = new Map<string, EnhancedQuiz[]>();
    
    filteredQuizzes.forEach(quiz => {
      if (!grouped.has(quiz.subject_name)) {
        grouped.set(quiz.subject_name, []);
      }
      grouped.get(quiz.subject_name)!.push(quiz);
    });

    return Array.from(grouped.entries()).map(([subjectName, quizzes]) => ({
      subject_name: subjectName,
      subject_id: quizzes[0].subject_id,
      subject_code: quizzes[0].subject_code,
      subject_color_hex: quizzes[0].subject_color_hex,
      subject_icon_name: quizzes[0].subject_icon_name,
      quizzes: quizzes.sort((a, b) => a.topic_title.localeCompare(b.topic_title))
    }));
  }, [filteredQuizzes]);

  // Get unique subjects for filtering
  const getAvailableSubjects = useCallback(() => {
    const subjects = new Map();
    quizzes.forEach(quiz => {
      if (!subjects.has(quiz.subject_id)) {
        subjects.set(quiz.subject_id, {
          id: quiz.subject_id,
          name: quiz.subject_name,
          code: quiz.subject_code,
          color_hex: quiz.subject_color_hex,
          icon_name: quiz.subject_icon_name
        });
      }
    });
    return Array.from(subjects.values());
  }, [quizzes]);

  // Initialize data
  useEffect(() => {
    fetchEnhancedQuizzes();
  }, [fetchEnhancedQuizzes]);

  useEffect(() => {
    if (user) {
      fetchUserStatistics();
    }
  }, [user, fetchUserStatistics]);

  return {
    quizzes: filteredQuizzes,
    allQuizzes: quizzes,
    statistics,
    loading,
    error,
    applyFilters,
    getQuizzesBySubject,
    getAvailableSubjects,
    refreshData: fetchEnhancedQuizzes
  };
}
