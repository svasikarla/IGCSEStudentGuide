/**
 * Hook for managing question statistics and counts
 * Provides real-time question counts by subject/topic and generation tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export interface QuestionCount {
  topic_id: string;
  topic_title: string;
  subject_name: string;
  total_questions: number;
  generated_questions: number;
  manual_questions: number;
  avg_quality_score: number | null;
}

export interface SubjectQuestionSummary {
  subject_name: string;
  total_questions: number;
  total_topics: number;
  topics_with_questions: number;
  avg_questions_per_topic: number;
  last_generated: string | null;
}

export interface QuestionStatistics {
  questionCounts: QuestionCount[];
  subjectSummaries: SubjectQuestionSummary[];
  totalQuestions: number;
  totalGeneratedQuestions: number;
  loading: boolean;
  error: string | null;
}

export function useQuestionStatistics() {
  const [statistics, setStatistics] = useState<QuestionStatistics>({
    questionCounts: [],
    subjectSummaries: [],
    totalQuestions: 0,
    totalGeneratedQuestions: 0,
    loading: true,
    error: null
  });

  const supabase = useSupabaseClient();

  const fetchQuestionStatistics = useCallback(async () => {
    try {
      setStatistics(prev => ({ ...prev, loading: true, error: null }));

      // Fetch topic question counts using the existing database function
      const { data: questionCounts, error: countsError } = await supabase
        .rpc('get_topic_question_counts');

      if (countsError) {
        throw new Error(`Failed to fetch question counts: ${countsError.message}`);
      }

      // Calculate subject summaries
      const subjectMap = new Map<string, {
        total_questions: number;
        total_topics: number;
        topics_with_questions: number;
        last_generated: string | null;
      }>();

      let totalQuestions = 0;
      let totalGeneratedQuestions = 0;

      questionCounts?.forEach((count: QuestionCount) => {
        totalQuestions += count.total_questions;
        totalGeneratedQuestions += count.generated_questions;

        const existing = subjectMap.get(count.subject_name) || {
          total_questions: 0,
          total_topics: 0,
          topics_with_questions: 0,
          last_generated: null
        };

        subjectMap.set(count.subject_name, {
          total_questions: existing.total_questions + count.total_questions,
          total_topics: existing.total_topics + 1,
          topics_with_questions: existing.topics_with_questions + (count.total_questions > 0 ? 1 : 0),
          last_generated: existing.last_generated // We'll fetch this separately if needed
        });
      });

      // Convert subject map to array
      const subjectSummaries: SubjectQuestionSummary[] = Array.from(subjectMap.entries()).map(
        ([subject_name, data]) => ({
          subject_name,
          total_questions: data.total_questions,
          total_topics: data.total_topics,
          topics_with_questions: data.topics_with_questions,
          avg_questions_per_topic: data.total_topics > 0 ? data.total_questions / data.total_topics : 0,
          last_generated: data.last_generated
        })
      );

      setStatistics({
        questionCounts: questionCounts || [],
        subjectSummaries,
        totalQuestions,
        totalGeneratedQuestions,
        loading: false,
        error: null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch question statistics';
      setStatistics(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      console.error('Error fetching question statistics:', error);
    }
  }, [supabase]);

  // Fetch statistics on mount
  useEffect(() => {
    fetchQuestionStatistics();
  }, [fetchQuestionStatistics]);

  // Get question count for a specific topic
  const getTopicQuestionCount = useCallback((topicId: string): QuestionCount | null => {
    return statistics.questionCounts.find(count => count.topic_id === topicId) || null;
  }, [statistics.questionCounts]);

  // Get question count for a specific subject
  const getSubjectQuestionCount = useCallback((subjectName: string): SubjectQuestionSummary | null => {
    return statistics.subjectSummaries.find(summary => summary.subject_name === subjectName) || null;
  }, [statistics.subjectSummaries]);

  // Calculate recommended question count for a topic
  const getRecommendedQuestionCount = useCallback((topicId: string): number => {
    const topicCount = getTopicQuestionCount(topicId);
    if (!topicCount) return 10; // Default recommendation for new topics

    const current = topicCount.total_questions;
    
    // Recommendation logic based on current count
    if (current === 0) return 10;
    if (current < 5) return 10 - current;
    if (current < 15) return 10;
    if (current < 25) return 15;
    return 5; // For topics with many questions, suggest smaller increments
  }, [getTopicQuestionCount]);

  // Check if a topic needs more questions (below recommended threshold)
  const topicNeedsMoreQuestions = useCallback((topicId: string, threshold: number = 10): boolean => {
    const topicCount = getTopicQuestionCount(topicId);
    return !topicCount || topicCount.total_questions < threshold;
  }, [getTopicQuestionCount]);

  // Get topics that need more questions
  const getTopicsNeedingQuestions = useCallback((threshold: number = 10): QuestionCount[] => {
    return statistics.questionCounts.filter(count => count.total_questions < threshold);
  }, [statistics.questionCounts]);

  // Refresh statistics (useful after generating new questions)
  const refreshStatistics = useCallback(() => {
    fetchQuestionStatistics();
  }, [fetchQuestionStatistics]);

  return {
    ...statistics,
    getTopicQuestionCount,
    getSubjectQuestionCount,
    getRecommendedQuestionCount,
    topicNeedsMoreQuestions,
    getTopicsNeedingQuestions,
    refreshStatistics
  };
}

/**
 * Hook for real-time question count updates
 * Automatically refreshes when questions are added/removed
 */
export function useRealtimeQuestionCounts() {
  const questionStats = useQuestionStatistics();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Subscribe to quiz_questions table changes
    const subscription = supabase
      .channel('question-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_questions'
        },
        () => {
          // Refresh statistics when questions are added/updated/deleted
          questionStats.refreshStatistics();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, questionStats.refreshStatistics]);

  return questionStats;
}
