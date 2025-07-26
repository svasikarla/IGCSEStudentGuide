-- =====================================================
-- DATA MIGRATION: Convert Mathematics Major Areas to Chapters
-- Version: 002
-- Description: Migrates IGCSE Mathematics major_area data to chapters table
-- Author: IGCSE Study Guide Team
-- Date: 2025-01-26
-- =====================================================

-- =====================================================
-- PREREQUISITES: 
-- - 001_create_chapters_table.sql must be run first
-- - This migration is specific to IGCSE Mathematics subject
-- =====================================================

-- =====================================================
-- 1. VERIFY PREREQUISITES
-- =====================================================
DO $$
BEGIN
    -- Check if chapters table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapters') THEN
        RAISE EXCEPTION 'Chapters table does not exist. Run 001_create_chapters_table.sql first.';
    END IF;
    
    -- Check if Mathematics subject exists
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'MATH') THEN
        RAISE EXCEPTION 'Mathematics subject not found. Cannot proceed with migration.';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE CHAPTERS FROM MATHEMATICS MAJOR AREAS
-- =====================================================

-- Insert chapters based on existing major_area data from Mathematics topics
INSERT INTO public.chapters (
    subject_id,
    title,
    description,
    slug,
    syllabus_code,
    curriculum_board,
    display_order,
    color_hex,
    estimated_study_time_minutes,
    learning_objectives,
    is_published,
    is_active
)
SELECT DISTINCT
    t.subject_id,
    t.major_area as title,
    CASE t.major_area
        WHEN 'Number and Algebra' THEN 'Fundamental mathematical concepts including number systems, algebraic manipulation, equations, and functions.'
        WHEN 'Geometry and Measures' THEN 'Geometric shapes, properties, measurements, coordinate geometry, and spatial reasoning.'
        WHEN 'Probability and Statistics' THEN 'Data analysis, statistical measures, probability theory, and data representation.'
        WHEN 'Vectors and Transformations' THEN 'Vector operations, geometric transformations, and coordinate geometry applications.'
        WHEN 'Calculus (Introduction)' THEN 'Basic calculus concepts including differentiation, integration, and their applications.'
        WHEN 'Discrete Mathematics (Introduction)' THEN 'Logic, set theory, combinatorics, and discrete mathematical structures.'
        WHEN 'Problem Solving and Modeling' THEN 'Mathematical modeling, problem-solving strategies, and real-world applications.'
        ELSE 'Mathematical concepts and applications in ' || t.major_area
    END as description,
    generate_chapter_slug(t.major_area, t.subject_id) as slug,
    -- Extract main syllabus code (first number before any dots)
    CASE 
        WHEN t.major_area = 'Number and Algebra' THEN '1'
        WHEN t.major_area = 'Geometry and Measures' THEN '2'
        WHEN t.major_area = 'Calculus (Introduction)' THEN '3'
        WHEN t.major_area = 'Probability and Statistics' THEN '4'
        WHEN t.major_area = 'Vectors and Transformations' THEN '5'
        WHEN t.major_area = 'Problem Solving and Modeling' THEN '6'
        WHEN t.major_area = 'Discrete Mathematics (Introduction)' THEN '7'
        ELSE SUBSTRING(MIN(t.syllabus_code) FROM '^[0-9]+')
    END as syllabus_code,
    'Cambridge IGCSE' as curriculum_board,
    -- Set display order based on syllabus code
    CASE 
        WHEN t.major_area = 'Number and Algebra' THEN 1
        WHEN t.major_area = 'Geometry and Measures' THEN 2
        WHEN t.major_area = 'Calculus (Introduction)' THEN 3
        WHEN t.major_area = 'Probability and Statistics' THEN 4
        WHEN t.major_area = 'Vectors and Transformations' THEN 5
        WHEN t.major_area = 'Problem Solving and Modeling' THEN 6
        WHEN t.major_area = 'Discrete Mathematics (Introduction)' THEN 7
        ELSE 99
    END as display_order,
    s.color_hex, -- Inherit color from subject
    -- Calculate estimated study time based on topics in this major area
    SUM(COALESCE(t.estimated_study_time_minutes, 30)) as estimated_study_time_minutes,
    -- Create learning objectives array
    ARRAY[
        'Understand fundamental concepts in ' || t.major_area,
        'Apply mathematical techniques to solve problems',
        'Demonstrate proficiency in ' || LOWER(t.major_area) || ' skills'
    ] as learning_objectives,
    true as is_published,
    true as is_active
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'MATH' 
  AND t.major_area IS NOT NULL 
  AND t.major_area != ''
GROUP BY t.subject_id, t.major_area, s.color_hex
ORDER BY display_order;

-- =====================================================
-- 3. UPDATE TOPICS TO REFERENCE CHAPTERS
-- =====================================================

-- Update topics to reference their corresponding chapters
UPDATE public.topics 
SET chapter_id = c.id
FROM public.chapters c
JOIN public.subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'MATH';

-- =====================================================
-- 4. VERIFICATION AND STATISTICS
-- =====================================================

-- Display migration results
DO $$
DECLARE
    math_subject_id UUID;
    chapter_count INTEGER;
    updated_topics INTEGER;
    orphaned_topics INTEGER;
BEGIN
    -- Get Mathematics subject ID
    SELECT id INTO math_subject_id FROM subjects WHERE code = 'MATH';
    
    -- Count created chapters
    SELECT COUNT(*) INTO chapter_count FROM chapters WHERE subject_id = math_subject_id;
    
    -- Count updated topics
    SELECT COUNT(*) INTO updated_topics 
    FROM topics 
    WHERE subject_id = math_subject_id AND chapter_id IS NOT NULL;
    
    -- Count orphaned topics (topics without chapters)
    SELECT COUNT(*) INTO orphaned_topics 
    FROM topics 
    WHERE subject_id = math_subject_id AND chapter_id IS NULL;
    
    -- Display results
    RAISE NOTICE 'Mathematics Chapter Migration Results:';
    RAISE NOTICE '- Created chapters: %', chapter_count;
    RAISE NOTICE '- Topics assigned to chapters: %', updated_topics;
    RAISE NOTICE '- Orphaned topics (no chapter): %', orphaned_topics;
    
    IF orphaned_topics > 0 THEN
        RAISE WARNING 'Found % orphaned topics. Review topics without major_area.', orphaned_topics;
    END IF;
END $$;

-- =====================================================
-- 5. CREATE VERIFICATION QUERIES
-- =====================================================

-- Query to check chapter creation results
-- Uncomment to run verification
/*
SELECT 
    c.title as chapter_title,
    c.syllabus_code,
    c.display_order,
    COUNT(t.id) as topic_count,
    SUM(t.estimated_study_time_minutes) as total_study_time
FROM chapters c
LEFT JOIN topics t ON c.id = t.chapter_id
JOIN subjects s ON c.subject_id = s.id
WHERE s.code = 'MATH'
GROUP BY c.id, c.title, c.syllabus_code, c.display_order
ORDER BY c.display_order;
*/

-- Query to check for orphaned topics
/*
SELECT 
    t.title,
    t.major_area,
    t.syllabus_code
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'MATH' 
  AND t.chapter_id IS NULL;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Mathematics major areas have been converted to chapters
-- All topics have been assigned to their corresponding chapters
-- Next step: Test the new hierarchy in the application
