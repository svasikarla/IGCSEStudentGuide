/**
 * Chapter Type Definitions
 * 
 * Defines TypeScript interfaces for the new hierarchical chapter structure
 * in the Subject → Chapter → Topic organization system.
 */

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  slug: string;
  
  // Curriculum organization
  syllabus_code: string | null;
  curriculum_board: string;
  tier: 'Core' | 'Extended' | 'Foundation' | 'Higher' | null;
  
  // Display and ordering
  display_order: number;
  color_hex: string;
  icon_name: string;
  
  // Metadata
  estimated_study_time_minutes: number;
  learning_objectives: string[] | null;
  
  // Status
  is_published: boolean;
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ChapterWithStats extends Chapter {
  // Statistics from get_chapter_stats function
  topic_count: number;
  total_study_time: number;
  published_topics: number;
  quiz_count: number;
  flashcard_count: number;
}

export interface ChapterFormData {
  title: string;
  description: string;
  syllabus_code: string;
  curriculum_board: string;
  tier: 'Core' | 'Extended' | 'Foundation' | 'Higher' | null;
  display_order: number;
  color_hex: string;
  icon_name: string;
  estimated_study_time_minutes: number;
  learning_objectives: string[];
  is_published: boolean;
  is_active: boolean;
}

export interface CreateChapterRequest extends Omit<ChapterFormData, 'display_order'> {
  subject_id: string;
  display_order?: number; // Optional, will be auto-calculated if not provided
}

export interface UpdateChapterRequest extends Partial<ChapterFormData> {
  id: string;
  slug?: string; // Optional slug field for updates
}

// Chapter hierarchy navigation
export interface ChapterNavigation {
  chapter: Chapter;
  topics: Array<{
    id: string;
    title: string;
    slug: string;
    is_published: boolean;
    estimated_study_time_minutes: number;
  }>;
}

// For chapter-based content generation
export interface ChapterGenerationContext {
  chapter: Chapter;
  subject_name: string;
  topic_count: number;
  existing_topics: string[]; // Titles of existing topics in the chapter
}

// Chapter progress tracking
export interface ChapterProgress {
  chapter_id: string;
  user_id: string;
  topics_completed: number;
  topics_total: number;
  completion_percentage: number;
  total_study_time_minutes: number;
  last_studied_at: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

// API response types
export interface ChapterListResponse {
  chapters: Chapter[];
  total_count: number;
}

export interface ChapterStatsResponse {
  topic_count: number;
  total_study_time: number;
  published_topics: number;
  quiz_count: number;
  flashcard_count: number;
}

// Error types
export interface ChapterError {
  code: string;
  message: string;
  field?: string;
}

// Validation schemas (for use with form validation)
export interface ChapterValidationRules {
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  description: {
    maxLength: number;
  };
  syllabus_code: {
    pattern: RegExp;
    maxLength: number;
  };
  estimated_study_time_minutes: {
    min: number;
    max: number;
  };
}

export const CHAPTER_VALIDATION_RULES: ChapterValidationRules = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200
  },
  description: {
    maxLength: 1000
  },
  syllabus_code: {
    pattern: /^[0-9]+(\.[0-9]+)*$/,
    maxLength: 20
  },
  estimated_study_time_minutes: {
    min: 15,
    max: 600
  }
};

// Default values for new chapters
export const DEFAULT_CHAPTER_VALUES: Partial<ChapterFormData> = {
  curriculum_board: 'Cambridge IGCSE',
  color_hex: '#6366f1',
  icon_name: 'folder',
  estimated_study_time_minutes: 120,
  is_published: true,
  is_active: true,
  learning_objectives: []
};

// Chapter tier options
export const CHAPTER_TIER_OPTIONS = [
  { value: 'Core', label: 'Core' },
  { value: 'Extended', label: 'Extended' },
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Higher', label: 'Higher' }
] as const;

// Chapter icon options
export const CHAPTER_ICON_OPTIONS = [
  { value: 'folder', label: 'Folder' },
  { value: 'book', label: 'Book' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'chart', label: 'Chart' },
  { value: 'compass', label: 'Compass' },
  { value: 'flask', label: 'Flask' },
  { value: 'globe', label: 'Globe' },
  { value: 'lightbulb', label: 'Light Bulb' }
] as const;
