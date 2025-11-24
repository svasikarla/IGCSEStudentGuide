import { supabase } from '../lib/supabase';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

// Types
export interface SubjectData {
  name: string;
  code: string;
  description: string;
  color_hex?: string;
  icon_name?: string;
  curriculum_board?: string;
  grade_levels?: number[];
  is_active?: boolean;
  display_order?: number;
}

export interface TopicData {
  title: string;
  description?: string;
  content?: string;
  difficulty_level?: number;
  estimated_study_time_minutes?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  display_order?: number;
  is_published?: boolean;
  slug?: string;
}

export interface ChapterData {
  title: string;
  description?: string;
  slug?: string;
  syllabus_code?: string;
  curriculum_board?: string;
  tier?: 'Core' | 'Extended' | 'Foundation' | 'Higher';
  display_order?: number;
  color_hex?: string;
  icon_name?: string;
  estimated_study_time_minutes?: number;
  learning_objectives?: string[];
  is_published?: boolean;
  is_active?: boolean;
  topics?: TopicData[];
}

export interface SubjectHierarchyData {
  subject: SubjectData;
  chapters?: ChapterData[];
}

export interface SubjectHierarchyResponse {
  success: boolean;
  subject: any;
  stats: {
    chaptersCreated: number;
    topicsCreated: number;
    totalStudyTimeMinutes: number;
    avgTopicsPerChapter: number;
  };
  warnings?: string[];
}

export interface SubjectWithHierarchy {
  success: boolean;
  subject: any;
  chapters: Array<{
    id: string;
    title: string;
    topics: any[];
    stats: {
      topicCount: number;
      totalStudyTimeMinutes: number;
      avgDifficulty: string;
    };
  }>;
  stats: {
    totalChapters: number;
    totalTopics: number;
    totalStudyTimeMinutes: number;
    avgTopicsPerChapter: number;
  };
}

/**
 * Import a complete subject hierarchy
 * @param data - Subject hierarchy data
 * @returns Promise with created subject and stats
 */
export async function importSubjectHierarchy(
  data: SubjectHierarchyData
): Promise<SubjectHierarchyResponse> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/subjects/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.details || 'Failed to import subject hierarchy');
    }

    return await response.json();
  } catch (error) {
    console.error('Error importing subject hierarchy:', error);
    throw error;
  }
}

/**
 * Get subject with complete hierarchy
 * @param subjectId - Subject UUID
 * @returns Promise with subject hierarchy
 */
export async function getSubjectHierarchy(
  subjectId: string
): Promise<SubjectWithHierarchy> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/hierarchy`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch subject hierarchy');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subject hierarchy:', error);
    throw error;
  }
}

/**
 * Get all subjects with basic stats
 * @returns Promise with list of subjects
 */
export async function getAllSubjects(): Promise<any> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch subjects');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
}

/**
 * Delete a subject (cascade deletes chapters and topics)
 * @param subjectId - Subject UUID
 * @returns Promise with deletion result
 */
export async function deleteSubject(subjectId: string): Promise<any> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete subject');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
}

/**
 * Validate JSON structure before importing
 * @param jsonData - Parsed JSON object
 * @returns Validation result with errors and warnings
 */
export function validateImportData(jsonData: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (!jsonData || typeof jsonData !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid JSON structure'],
      warnings: [],
    };
  }

  // Check for subject
  if (!jsonData.subject) {
    errors.push('Missing "subject" field');
  } else {
    if (!jsonData.subject.name) errors.push('Subject name is required');
    if (!jsonData.subject.code) errors.push('Subject code is required');
    if (!jsonData.subject.description) errors.push('Subject description is required');
  }

  // Check for chapters
  if (!jsonData.chapters) {
    warnings.push('No chapters provided');
  } else if (!Array.isArray(jsonData.chapters)) {
    errors.push('Chapters must be an array');
  } else if (jsonData.chapters.length === 0) {
    warnings.push('Empty chapters array');
  } else {
    // Validate each chapter
    jsonData.chapters.forEach((chapter: any, index: number) => {
      if (!chapter.title) {
        errors.push(`Chapter ${index + 1} is missing a title`);
      }

      if (chapter.topics && !Array.isArray(chapter.topics)) {
        errors.push(`Chapter "${chapter.title}" topics must be an array`);
      }

      if (chapter.topics && chapter.topics.length === 0) {
        warnings.push(`Chapter "${chapter.title}" has no topics`);
      }

      // Validate topics
      if (chapter.topics && Array.isArray(chapter.topics)) {
        chapter.topics.forEach((topic: any, topicIndex: number) => {
          if (!topic.title) {
            errors.push(`Topic ${topicIndex + 1} in "${chapter.title}" is missing a title`);
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Load a template file
 * @param templateName - Name of the template file (without path)
 * @returns Promise with template data
 */
export async function loadTemplate(templateName: string): Promise<SubjectHierarchyData> {
  try {
    const response = await fetch(`/templates/subjects/${templateName}`);

    if (!response.ok) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
}
