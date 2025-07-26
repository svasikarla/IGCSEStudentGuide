import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Chapter,
  ChapterWithStats,
  ChapterFormData,
  CreateChapterRequest,
  UpdateChapterRequest,
  ChapterStatsResponse,
  DEFAULT_CHAPTER_VALUES
} from '../types/chapter';

export interface UseChaptersReturn {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  fetchChapters: () => Promise<void>;
  createChapter: (chapterData: CreateChapterRequest) => Promise<Chapter | null>;
  updateChapter: (chapterData: UpdateChapterRequest) => Promise<Chapter | null>;
  deleteChapter: (chapterId: string) => Promise<boolean>;
  
  // Utility functions
  getChapterById: (chapterId: string) => Chapter | null;
  getChapterStats: (chapterId: string) => Promise<ChapterStatsResponse | null>;
  generateSlug: (title: string, subjectId: string) => Promise<string>;
  
  // State management
  isSaving: boolean;
  saveError: string | null;
}

export function useChapters(subjectId: string | null): UseChaptersReturn {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch chapters for a subject
  const fetchChapters = useCallback(async () => {
    if (!subjectId) {
      setChapters([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setChapters(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching chapters:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  // Create a new chapter
  const createChapter = async (chapterData: CreateChapterRequest): Promise<Chapter | null> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Generate slug if not provided
      const slug = await generateSlug(chapterData.title, chapterData.subject_id);

      // Set display order if not provided
      let displayOrder = chapterData.display_order;
      if (displayOrder === undefined) {
        const { data: maxOrderData } = await supabase
          .from('chapters')
          .select('display_order')
          .eq('subject_id', chapterData.subject_id)
          .order('display_order', { ascending: false })
          .limit(1);
        
        displayOrder = (maxOrderData?.[0]?.display_order || 0) + 1;
      }

      const chapterToCreate = {
        ...DEFAULT_CHAPTER_VALUES,
        ...chapterData,
        slug,
        display_order: displayOrder,
      };

      const { data, error } = await supabase
        .from('chapters')
        .insert(chapterToCreate)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Refresh chapters list
      await fetchChapters();
      
      return data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create chapter');
      console.error('Error creating chapter:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Update an existing chapter
  const updateChapter = async (chapterData: UpdateChapterRequest): Promise<Chapter | null> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Extract id and create update data without it
      const { id, ...updateDataBase } = chapterData;
      const updateData: Partial<ChapterFormData> & { slug?: string } = { ...updateDataBase };

      // Generate new slug if title changed
      if (chapterData.title) {
        const existingChapter = chapters.find(c => c.id === chapterData.id);
        if (existingChapter && existingChapter.title !== chapterData.title) {
          updateData.slug = await generateSlug(chapterData.title, existingChapter.subject_id);
        }
      }

      const { data, error } = await supabase
        .from('chapters')
        .update(updateData)
        .eq('id', chapterData.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Refresh chapters list
      await fetchChapters();
      
      return data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update chapter');
      console.error('Error updating chapter:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a chapter
  const deleteChapter = async (chapterId: string): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Check if chapter has topics
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id')
        .eq('chapter_id', chapterId)
        .limit(1);

      if (topicsData && topicsData.length > 0) {
        throw new Error('Cannot delete chapter that contains topics. Please move or delete topics first.');
      }

      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh chapters list
      await fetchChapters();
      
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete chapter');
      console.error('Error deleting chapter:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Get chapter by ID
  const getChapterById = (chapterId: string): Chapter | null => {
    return chapters.find(chapter => chapter.id === chapterId) || null;
  };

  // Get chapter statistics
  const getChapterStats = async (chapterId: string): Promise<ChapterStatsResponse | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_chapter_stats', { chapter_uuid: chapterId });

      if (error) {
        throw new Error(error.message);
      }

      return data?.[0] || null;
    } catch (err) {
      console.error('Error fetching chapter stats:', err);
      return null;
    }
  };

  // Generate unique slug for chapter
  const generateSlug = async (title: string, subjectId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_chapter_slug', { 
          chapter_title: title, 
          subject_uuid: subjectId 
        });

      if (error) {
        throw new Error(error.message);
      }

      return data || title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    } catch (err) {
      console.error('Error generating slug:', err);
      // Fallback slug generation
      return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
  };

  // Effect to fetch chapters when subjectId changes
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // Listen for chapter changes
  useEffect(() => {
    const handleChaptersChanged = () => {
      if (subjectId) {
        fetchChapters();
      }
    };

    document.addEventListener('chaptersChanged', handleChaptersChanged);

    return () => {
      document.removeEventListener('chaptersChanged', handleChaptersChanged);
    };
  }, [subjectId, fetchChapters]);

  return {
    chapters,
    loading,
    error,
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    getChapterById,
    getChapterStats,
    generateSlug,
    isSaving,
    saveError,
  };
}

// Helper hook for chapter-based topic management
export function useChapterTopics(chapterId: string | null) {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!chapterId) {
      setTopics([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setTopics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
      console.error('Error fetching chapter topics:', err);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, loading, error, refetch: fetchTopics };
}
