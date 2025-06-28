import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Flashcard {
  id: string;
  topic_id: string;
  front_content: string;
  back_content: string;
  card_type: 'basic' | 'cloze' | 'multiple_choice';
  difficulty_level: number;
  tags: string[];
  hint?: string;
  explanation?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: string;
  last_reviewed_at: string;
}

/**
 * Custom hook to fetch flashcards for a specific topic
 * @param topicId - The ID of the topic to fetch flashcards for
 * @returns Object containing flashcards, loading state, and error state
 */
export function useFlashcards(topicId: string | null) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no topicId is provided, don't fetch anything
    if (!topicId) {
      setFlashcards([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchFlashcards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('topic_id', topicId)
          .eq('is_active', true)
          .order('difficulty_level', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        setFlashcards(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching flashcards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [topicId]);

  return { flashcards, loading, error };
}

/**
 * Custom hook to fetch a single flashcard by ID
 * @param flashcardId - The ID of the flashcard to fetch
 * @returns Object containing the flashcard, loading state, and error state
 */
export function useFlashcard(flashcardId: string | null) {
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no flashcardId is provided, don't fetch anything
    if (!flashcardId) {
      setFlashcard(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchFlashcard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('id', flashcardId)
          .single();
        
        if (error) {
          throw new Error(error.message);
        }
        
        setFlashcard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching flashcard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcard();
  }, [flashcardId]);

  return { flashcard, loading, error };
}
