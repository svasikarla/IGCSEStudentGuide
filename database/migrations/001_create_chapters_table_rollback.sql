-- =====================================================
-- ROLLBACK MIGRATION: Remove Chapters Table and Chapter Support
-- Version: 001_rollback
-- Description: Safely removes chapters table and chapter_id from topics
-- Author: IGCSE Study Guide Team
-- Date: 2025-01-26
-- =====================================================

-- =====================================================
-- WARNING: This rollback will remove all chapter data
-- Ensure you have a backup before running this script
-- =====================================================

-- =====================================================
-- 1. REMOVE CHAPTER_ID FROM TOPICS TABLE
-- =====================================================
-- First, remove the foreign key constraint and column
ALTER TABLE public.topics DROP COLUMN IF EXISTS chapter_id;

-- Remove the index
DROP INDEX IF EXISTS idx_topics_chapter_id;

-- =====================================================
-- 2. DROP HELPER FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS get_chapter_stats(UUID);
DROP FUNCTION IF EXISTS generate_chapter_slug(TEXT, UUID);

-- =====================================================
-- 3. DROP TRIGGERS AND TRIGGER FUNCTIONS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_chapters_updated_at ON public.chapters;
DROP FUNCTION IF EXISTS update_chapters_updated_at();

-- =====================================================
-- 4. DROP INDEXES
-- =====================================================
DROP INDEX IF EXISTS idx_chapters_subject_id;
DROP INDEX IF EXISTS idx_chapters_display_order;
DROP INDEX IF EXISTS idx_chapters_syllabus_code;
DROP INDEX IF EXISTS idx_chapters_published;

-- =====================================================
-- 5. REVOKE PERMISSIONS
-- =====================================================
REVOKE ALL ON public.chapters FROM authenticated;

-- =====================================================
-- 6. DROP CHAPTERS TABLE
-- =====================================================
-- This will cascade and remove all chapter data
DROP TABLE IF EXISTS public.chapters CASCADE;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
-- Uncomment these to verify the rollback was successful

-- Check that chapters table is gone
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'chapters';

-- Check that chapter_id column is removed from topics
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'topics' AND column_name = 'chapter_id';

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================
-- The database has been restored to its state before the chapters migration
-- All chapter data has been permanently removed
