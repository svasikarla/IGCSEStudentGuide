import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to manage flashcard progress
 */
export function useFlashcardProgress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFlashcardProgress = useCallback(
    async (flashcardId: string, performance: 'easy' | 'medium' | 'hard') => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('update_flashcard_progress', {
          p_user_id: user.id,
          p_flashcard_id: flashcardId,
          p_performance: performance,
        });

        if (error) {
          throw new Error(error.message);
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update progress');
        console.error('Error updating flashcard progress:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateFlashcardProgress, loading, error };
}
