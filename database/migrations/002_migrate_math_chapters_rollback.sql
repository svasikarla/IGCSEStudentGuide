-- =====================================================
-- ROLLBACK DATA MIGRATION: Remove Mathematics Chapters
-- Version: 002_rollback
-- Description: Removes chapters created for Mathematics and resets topic relationships
-- Author: IGCSE Study Guide Team
-- Date: 2025-01-26
-- =====================================================

-- =====================================================
-- WARNING: This will remove all Mathematics chapter data
-- Ensure you have a backup before running this script
-- =====================================================

-- =====================================================
-- 1. VERIFY PREREQUISITES
-- =====================================================
DO $$
BEGIN
    -- Check if Mathematics subject exists
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'MATH') THEN
        RAISE EXCEPTION 'Mathematics subject not found. Cannot proceed with rollback.';
    END IF;
END $$;

-- =====================================================
-- 2. REMOVE CHAPTER REFERENCES FROM TOPICS
-- =====================================================

-- Reset chapter_id to NULL for all Mathematics topics
UPDATE public.topics 
SET chapter_id = NULL
FROM public.subjects s
WHERE topics.subject_id = s.id
  AND s.code = 'MATH';

-- =====================================================
-- 3. DELETE MATHEMATICS CHAPTERS
-- =====================================================

-- Delete all chapters for Mathematics subject
DELETE FROM public.chapters 
WHERE subject_id = (SELECT id FROM subjects WHERE code = 'MATH');

-- =====================================================
-- 4. VERIFICATION AND STATISTICS
-- =====================================================

-- Display rollback results
DO $$
DECLARE
    math_subject_id UUID;
    remaining_chapters INTEGER;
    topics_with_chapters INTEGER;
    total_math_topics INTEGER;
BEGIN
    -- Get Mathematics subject ID
    SELECT id INTO math_subject_id FROM subjects WHERE code = 'MATH';
    
    -- Count remaining chapters for Mathematics
    SELECT COUNT(*) INTO remaining_chapters 
    FROM chapters 
    WHERE subject_id = math_subject_id;
    
    -- Count Mathematics topics still referencing chapters
    SELECT COUNT(*) INTO topics_with_chapters 
    FROM topics 
    WHERE subject_id = math_subject_id AND chapter_id IS NOT NULL;
    
    -- Count total Mathematics topics
    SELECT COUNT(*) INTO total_math_topics 
    FROM topics 
    WHERE subject_id = math_subject_id;
    
    -- Display results
    RAISE NOTICE 'Mathematics Chapter Rollback Results:';
    RAISE NOTICE '- Remaining chapters: %', remaining_chapters;
    RAISE NOTICE '- Topics still referencing chapters: %', topics_with_chapters;
    RAISE NOTICE '- Total Mathematics topics: %', total_math_topics;
    
    IF remaining_chapters > 0 THEN
        RAISE WARNING 'Found % remaining chapters. Manual cleanup may be required.', remaining_chapters;
    END IF;
    
    IF topics_with_chapters > 0 THEN
        RAISE WARNING 'Found % topics still referencing chapters. Manual cleanup may be required.', topics_with_chapters;
    END IF;
END $$;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Query to check for any remaining Mathematics chapters
-- Uncomment to run verification
/*
SELECT 
    c.title,
    c.syllabus_code,
    COUNT(t.id) as topic_count
FROM chapters c
LEFT JOIN topics t ON c.id = t.chapter_id
JOIN subjects s ON c.subject_id = s.id
WHERE s.code = 'MATH'
GROUP BY c.id, c.title, c.syllabus_code;
*/

-- Query to check for Mathematics topics still referencing chapters
/*
SELECT 
    t.title,
    t.major_area,
    t.chapter_id
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'MATH' 
  AND t.chapter_id IS NOT NULL;
*/

-- Query to verify all Mathematics topics are back to original state
/*
SELECT 
    COUNT(*) as total_topics,
    COUNT(CASE WHEN chapter_id IS NULL THEN 1 END) as topics_without_chapters,
    COUNT(CASE WHEN chapter_id IS NOT NULL THEN 1 END) as topics_with_chapters
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'MATH';
*/

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================
-- Mathematics chapters have been removed
-- All Mathematics topics have been reset to their original state
-- The major_area field remains intact for future migrations
