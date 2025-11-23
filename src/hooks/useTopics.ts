import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Topic {
  id: string;
  subject_id: string;
  parent_topic_id: string | null;
  chapter_id: string | null; // New: Reference to chapter for hierarchical organization
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  difficulty_level: number;
  estimated_study_time_minutes: number;
  learning_objectives: string[] | null;
  prerequisites: string[] | null;
  display_order: number;
  is_published: boolean;
  // Enhanced curriculum fields
  syllabus_code?: string | null;
  curriculum_board?: string | null;
  tier?: string | null;
  official_syllabus_ref?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Enhanced interface for chapter-based topic organization
export interface TopicsByChapter {
  [chapterId: string]: {
    chapter: {
      id: string;
      title: string;
      syllabus_code: string | null;
      display_order: number;
    };
    topics: Topic[];
  };
}

export function useTopics(subjectId: string | null, chapterId?: string | null) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Extract fetchTopics to hook level so it can be reused
  const fetchTopics = async () => {
    if (!subjectId) {
      setTopics([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId);

      // Filter by chapter if specified
      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setTopics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching topics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't fetch if no subjectId is provided
    if (!subjectId) {
      setTopics([]);
      return;
    }

    fetchTopics();

    const handleTopicsChanged = () => {
      if (subjectId) {
        fetchTopics();
      }
    };

    document.addEventListener('topicsChanged', handleTopicsChanged);

    return () => {
      document.removeEventListener('topicsChanged', handleTopicsChanged);
    };
  }, [subjectId, chapterId]); // Added chapterId dependency

  /**
   * Generate a unique slug for a topic within a subject
   * Incorporates hierarchical structure to prevent duplicates
   */
  const generateUniqueSlug = (topic: Partial<Topic>, existingSlugs: Set<string>): string => {
    if (topic.slug && !existingSlugs.has(topic.slug)) {
      return topic.slug;
    }

    if (!topic.title) {
      return `topic-${Date.now()}`;
    }

    // Base slug from title
    let baseSlug = topic.title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Enhance slug with hierarchical context to ensure uniqueness
    const slugParts = [];

    // Add syllabus code if available
    if (topic.syllabus_code) {
      const codeSlug = topic.syllabus_code.toLowerCase()
        .replace(/[^\w-]+/g, '-')
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');
      slugParts.push(codeSlug);
    }

    // Combine parts with base slug
    let candidateSlug = slugParts.length > 0
      ? `${slugParts.join('-')}-${baseSlug}`
      : baseSlug;

    // Ensure slug is not empty
    if (!candidateSlug) {
      candidateSlug = `topic-${Date.now()}`;
    }

    // If still not unique, add a counter
    let finalSlug = candidateSlug;
    let counter = 1;
    while (existingSlugs.has(finalSlug)) {
      finalSlug = `${candidateSlug}-${counter}`;
      counter++;
    }

    return finalSlug;
  };

  /**
   * Generate a unique title for a topic within a subject
   * Incorporates hierarchical context to prevent duplicates
   */
  const generateUniqueTitle = (topic: Partial<Topic>, existingTitles: Set<string>): string => {
    let baseTitle = topic.title || 'Untitled Topic';

    // If title is already unique, return it
    if (!existingTitles.has(baseTitle)) {
      return baseTitle;
    }

    // For generic titles, just add a counter
    // (Chapter context is already provided through chapter_id relationship)

    // If still duplicate, add counter
    let finalTitle = baseTitle;
    let counter = 1;
    while (existingTitles.has(finalTitle)) {
      finalTitle = `${baseTitle} ${counter}`;
      counter++;
    }

    return finalTitle;
  };

  const saveTopics = async (subjectId: string, topics: Partial<Topic>[]): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Get existing slugs and titles to avoid duplicates
      const { data: existingTopics } = await supabase
        .from('topics')
        .select('slug, title')
        .eq('subject_id', subjectId);

      const existingSlugs = new Set(existingTopics?.map(t => t.slug) || []);
      const existingTitles = new Set(existingTopics?.map(t => t.title) || []);

      const topicsToInsert = topics.map(topic => {
        // Generate unique title first
        const uniqueTitle = generateUniqueTitle(topic, existingTitles);
        existingTitles.add(uniqueTitle); // Track generated titles to avoid duplicates within this batch

        // Generate unique slug using the unique title
        const topicWithUniqueTitle = { ...topic, title: uniqueTitle };
        const uniqueSlug = generateUniqueSlug(topicWithUniqueTitle, existingSlugs);
        existingSlugs.add(uniqueSlug); // Track generated slugs to avoid duplicates within this batch

        return {
          ...topic, // Preserve all generated content
          subject_id: subjectId,
          title: uniqueTitle,
          slug: uniqueSlug,
          // Set default values for required fields if not provided
          difficulty_level: topic.difficulty_level || 1,
          estimated_study_time_minutes: topic.estimated_study_time_minutes || 30,
          display_order: topic.display_order || 0,
          is_published: topic.is_published !== undefined ? topic.is_published : true,
        };
      });

      const { error } = await supabase.from('topics').insert(topicsToInsert);

      if (error) {
        throw new Error(error.message);
      }

      // Optionally, refetch topics for the current subject to update the list
      if (subjectId) {
        const event = new Event('topicsChanged');
        document.dispatchEvent(event);
      }
      return true;

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An unknown error occurred while saving.');
      console.error('Error saving topics:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveSingleTopic = async (topic: Partial<Topic>): Promise<boolean> => {
    if (!topic.title || !topic.subject_id) {
      setSaveError('Topic title and subject ID are required.');
      return false;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      // Get existing slugs and titles to avoid duplicates
      const { data: existingTopics } = await supabase
        .from('topics')
        .select('slug, title')
        .eq('subject_id', topic.subject_id);

      const existingSlugs = new Set(existingTopics?.map(t => t.slug) || []);
      const existingTitles = new Set(existingTopics?.map(t => t.title) || []);

      // Generate unique title first
      const uniqueTitle = generateUniqueTitle(topic, existingTitles);

      // Generate unique slug using the unique title
      const topicWithUniqueTitle = { ...topic, title: uniqueTitle };
      const uniqueSlug = generateUniqueSlug(topicWithUniqueTitle, existingSlugs);

      const topicToSave = {
        ...topic,
        title: uniqueTitle,
        slug: uniqueSlug,
        // Ensure required fields have defaults
        difficulty_level: topic.difficulty_level || 1,
        estimated_study_time_minutes: topic.estimated_study_time_minutes || 30,
        display_order: topic.display_order || 0,
        is_published: topic.is_published !== undefined ? topic.is_published : true,
      };

      const { error } = await supabase
        .from('topics')
        .upsert(topicToSave, { onConflict: 'subject_id, title' });

      if (error) {
        throw new Error(error.message);
      }

      // Dispatch event to notify other components of the change
      document.dispatchEvent(new Event('topicsChanged'));
      return true;

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An unknown error occurred while saving the topic.');
      console.error('Error saving single topic:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateTopicContent = async (topicId: string, content: string): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const { error } = await supabase
        .from('topics')
        .update({ content })
        .eq('id', topicId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh topics to show updated content
      await fetchTopics();
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update topic content');
      console.error('Error updating topic content:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // New chapter-based functions
  const getTopicsByChapter = async (subjectId: string): Promise<TopicsByChapter> => {
    try {
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, title, syllabus_code, display_order')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });

      if (chaptersError) throw chaptersError;

      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });

      if (topicsError) throw topicsError;

      const result: TopicsByChapter = {};

      // Group topics by chapter
      chaptersData?.forEach(chapter => {
        result[chapter.id] = {
          chapter,
          topics: topicsData?.filter(topic => topic.chapter_id === chapter.id) || []
        };
      });

      return result;
    } catch (err) {
      console.error('Error fetching topics by chapter:', err);
      return {};
    }
  };

  const moveTopicToChapter = async (topicId: string, newChapterId: string | null): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const { error } = await supabase
        .from('topics')
        .update({ chapter_id: newChapterId })
        .eq('id', topicId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh topics
      await fetchTopics();

      // Dispatch event to notify other components
      document.dispatchEvent(new Event('topicsChanged'));

      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to move topic');
      console.error('Error moving topic to chapter:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    topics,
    loading,
    error,
    saveTopics,
    saveSingleTopic,
    updateTopicContent,
    isSaving,
    saveError,
    // New chapter-based functions
    getTopicsByChapter,
    moveTopicToChapter,
    fetchTopics // Expose for manual refresh
  };
}
