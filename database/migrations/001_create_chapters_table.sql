-- =====================================================
-- MIGRATION: Create Chapters Table for Subject → Chapter → Topic Hierarchy
-- Version: 001
-- Description: Creates the chapters table to support hierarchical organization
-- Author: IGCSE Study Guide Team
-- Date: 2025-01-26
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE CHAPTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL, -- URL-friendly identifier
    
    -- Curriculum organization
    syllabus_code TEXT, -- e.g., '1', '2', '3' for major areas
    curriculum_board TEXT DEFAULT 'Cambridge IGCSE',
    tier TEXT CHECK (tier IN ('Core', 'Extended', 'Foundation', 'Higher')),
    
    -- Display and ordering
    display_order INTEGER DEFAULT 0,
    color_hex TEXT DEFAULT '#6366f1', -- For UI theming, inherited from subject if not set
    icon_name TEXT DEFAULT 'folder', -- Icon identifier for chapters
    
    -- Metadata
    estimated_study_time_minutes INTEGER DEFAULT 120, -- Total time for all topics in chapter
    learning_objectives TEXT[], -- Array of chapter-level learning goals
    
    -- Status
    is_published BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(subject_id, slug),
    UNIQUE(subject_id, title),
    UNIQUE(subject_id, syllabus_code) -- Ensure unique syllabus codes per subject
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_display_order ON public.chapters(subject_id, display_order);
CREATE INDEX IF NOT EXISTS idx_chapters_syllabus_code ON public.chapters(subject_id, syllabus_code);
CREATE INDEX IF NOT EXISTS idx_chapters_published ON public.chapters(is_published, is_active);

-- =====================================================
-- 3. ADD CHAPTER_ID TO TOPICS TABLE
-- =====================================================
-- Add the new column (nullable initially for backward compatibility)
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_topics_chapter_id ON public.topics(chapter_id);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER FOR CHAPTERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_chapters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chapters_updated_at
    BEFORE UPDATE ON public.chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_chapters_updated_at();

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.chapters IS 'Hierarchical chapters within subjects for organizing topics';
COMMENT ON COLUMN public.chapters.syllabus_code IS 'Major area code from curriculum (e.g., 1, 2, 3)';
COMMENT ON COLUMN public.chapters.slug IS 'URL-friendly identifier for chapters';
COMMENT ON COLUMN public.chapters.estimated_study_time_minutes IS 'Total estimated study time for all topics in chapter';
COMMENT ON COLUMN public.topics.chapter_id IS 'Foreign key to chapters table for hierarchical organization';

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get chapter statistics
CREATE OR REPLACE FUNCTION get_chapter_stats(chapter_uuid UUID)
RETURNS TABLE (
    topic_count INTEGER,
    total_study_time INTEGER,
    published_topics INTEGER,
    quiz_count INTEGER,
    flashcard_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(t.id)::INTEGER as topic_count,
        COALESCE(SUM(t.estimated_study_time_minutes), 0)::INTEGER as total_study_time,
        COUNT(CASE WHEN t.is_published THEN 1 END)::INTEGER as published_topics,
        COUNT(q.id)::INTEGER as quiz_count,
        COUNT(f.id)::INTEGER as flashcard_count
    FROM topics t
    LEFT JOIN quizzes q ON t.id = q.topic_id
    LEFT JOIN flashcards f ON t.id = f.topic_id
    WHERE t.chapter_id = chapter_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to generate chapter slug from title
CREATE OR REPLACE FUNCTION generate_chapter_slug(chapter_title TEXT, subject_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Create base slug from title
    base_slug := lower(regexp_replace(chapter_title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM chapters WHERE subject_id = subject_uuid AND slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
-- Grant permissions to authenticated users (adjust as needed for your RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT USAGE ON SEQUENCE chapters_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_chapter_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_chapter_slug(TEXT, UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration creates the chapters table and adds chapter_id to topics
-- Next step: Run data migration to populate chapters from existing major_area data
