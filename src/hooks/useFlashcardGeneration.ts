import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '../contexts/AuthContext';
import { llmService } from '../services/llmService';
import { Flashcard } from './useFlashcards';
import { LLMProvider } from '../services/llmAdapter';

export function useFlashcardGeneration() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseClient = useSupabaseClient();
  const { session } = useAuth();

  const generateFlashcards = async (
    subjectName: string,
    topicTitle: string,
    count: number,
    difficulty: string,
    provider: LLMProvider,
    model: string
  ): Promise<Partial<Flashcard>[] | null> => {
    setLoading(true);
    setError(null);

    if (!session?.access_token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return null;
    }

    const prompt = `You are an expert in creating educational content for the IGCSE curriculum. Your task is to generate a set of ${count} high-quality flashcards for the topic \"${topicTitle}\" in the subject \"${subjectName}\". The target audience is IGCSE students, and the difficulty level should be ${difficulty}.

Each flashcard must have a 'front_content' (a question, term, or concept) and a 'back_content' (a concise and accurate answer or explanation).

Format the output as a JSON array of objects, where each object represents a flashcard with "front_content" and "back_content" keys. Do not include any introductory text, explanations, or markdown formatting outside of the JSON structure.

Example format:
[
  {
    "front_content": "What is photosynthesis?",
    "back_content": "The process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigment."
  },
  {
    "front_content": "What are the reactants of photosynthesis?",
    "back_content": "Carbon dioxide, water, and sunlight."
  }
]`;

    try {
      const response = await llmService.generateContent(prompt, {
        authToken: session.access_token,
        provider,
        model,
      });

      if (!response) {
        throw new Error('LLM service returned an empty response.');
      }

      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']');
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON array found in the LLM response.');
      }
      const jsonString = response.substring(startIndex, endIndex + 1);
      const parsedFlashcards = JSON.parse(jsonString);

      if (!Array.isArray(parsedFlashcards)) {
        throw new Error('LLM response is not a JSON array.');
      }
      
      return parsedFlashcards as Partial<Flashcard>[];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate or parse flashcards';
      setError(errorMessage);
      console.error(errorMessage, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveFlashcards = async (topicId: string, difficulty: string, flashcards: Partial<Flashcard>[]) => {
    setLoading(true);
    setError(null);
    try {
      // Verify topic exists
      const { data: topic } = await supabaseClient
        .from('topics')
        .select('title')
        .eq('id', topicId)
        .single();

      if (!topic) throw new Error('Topic not found');

      // Convert difficulty string to number for database
      const difficultyLevel = difficulty === 'easy' ? 1 :
                             difficulty === 'medium' ? 3 :
                             difficulty === 'hard' ? 5 : 3;

      // Prepare flashcards for insertion directly into flashcards table
      const flashcardsToInsert = flashcards.map(fc => ({
        topic_id: topicId,
        front_content: fc.front_content,
        back_content: fc.back_content,
        card_type: 'basic', // Default card type
        difficulty_level: difficultyLevel,
        tags: [], // Empty tags array
        is_active: true
      }));

      // Insert flashcards directly
      const { data: insertedFlashcards, error: flashcardsError } = await supabaseClient
        .from('flashcards')
        .insert(flashcardsToInsert)
        .select();

      if (flashcardsError) throw flashcardsError;

      // Return a summary object similar to what was expected
      return {
        id: `topic-${topicId}-flashcards`,
        title: `Flashcards for ${topic.title}`,
        topic_id: topicId,
        difficulty: difficulty,
        flashcards: insertedFlashcards,
        count: insertedFlashcards?.length || 0
      };
    } catch (err: any) {
      console.error('Error saving flashcards:', err);
      setError(err.message || 'Failed to save flashcards');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateFlashcards,
    saveFlashcards,
    loading,
    error,
  };
}
