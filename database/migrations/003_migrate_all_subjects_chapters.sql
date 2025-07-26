-- =====================================================
-- DATA MIGRATION: Convert All Subjects Major Areas to Chapters
-- Version: 003
-- Description: Migrates all remaining subjects (Physics, Chemistry, Biology, Economics) to chapter structure
-- Author: IGCSE Study Guide Team
-- Date: 2025-01-26
-- =====================================================

-- =====================================================
-- PREREQUISITES: 
-- - 001_create_chapters_table.sql must be run first
-- - 002_migrate_math_chapters.sql should be completed
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
    
    -- Check if required subjects exist
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE code IN ('PHYS', 'CHEM', 'BIO', 'ECON')) THEN
        RAISE WARNING 'Some subjects may be missing. Migration will continue for available subjects.';
    END IF;
END $$;

-- =====================================================
-- 2. PHYSICS CHAPTERS MIGRATION
-- =====================================================

-- Create chapters for Physics based on major areas
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
        WHEN 'General Physics' THEN 'Fundamental physics concepts including measurements, units, and scientific methods.'
        WHEN 'Mechanics' THEN 'Motion, forces, energy, momentum, and mechanical systems.'
        WHEN 'Thermal Physics' THEN 'Heat, temperature, thermal properties, and kinetic theory.'
        WHEN 'Waves' THEN 'Wave properties, sound, electromagnetic spectrum, and wave phenomena.'
        WHEN 'Electricity and Magnetism' THEN 'Electric circuits, electromagnetic fields, and electrical phenomena.'
        WHEN 'Atomic Physics' THEN 'Atomic structure, radioactivity, and nuclear physics.'
        WHEN 'Space Physics' THEN 'Astronomy, space exploration, and celestial mechanics.'
        ELSE 'Physics concepts and applications in ' || t.major_area
    END as description,
    generate_chapter_slug(t.major_area, t.subject_id) as slug,
    -- Assign syllabus codes based on typical IGCSE Physics structure
    CASE 
        WHEN t.major_area = 'General Physics' THEN '1'
        WHEN t.major_area = 'Mechanics' THEN '2'
        WHEN t.major_area = 'Thermal Physics' THEN '3'
        WHEN t.major_area = 'Waves' THEN '4'
        WHEN t.major_area = 'Electricity and Magnetism' THEN '5'
        WHEN t.major_area = 'Atomic Physics' THEN '6'
        WHEN t.major_area = 'Space Physics' THEN '7'
        ELSE SUBSTRING(MIN(t.syllabus_code) FROM '^[0-9]+')
    END as syllabus_code,
    'Cambridge IGCSE' as curriculum_board,
    -- Set display order
    CASE 
        WHEN t.major_area = 'General Physics' THEN 1
        WHEN t.major_area = 'Mechanics' THEN 2
        WHEN t.major_area = 'Thermal Physics' THEN 3
        WHEN t.major_area = 'Waves' THEN 4
        WHEN t.major_area = 'Electricity and Magnetism' THEN 5
        WHEN t.major_area = 'Atomic Physics' THEN 6
        WHEN t.major_area = 'Space Physics' THEN 7
        ELSE 99
    END as display_order,
    s.color_hex,
    SUM(COALESCE(t.estimated_study_time_minutes, 30)) as estimated_study_time_minutes,
    ARRAY[
        'Understand fundamental concepts in ' || t.major_area,
        'Apply physics principles to solve problems',
        'Demonstrate practical skills in ' || LOWER(t.major_area)
    ] as learning_objectives,
    true as is_published,
    true as is_active
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'PHYS' 
  AND t.major_area IS NOT NULL 
  AND t.major_area != ''
GROUP BY t.subject_id, t.major_area, s.color_hex
ORDER BY display_order;

-- =====================================================
-- 3. CHEMISTRY CHAPTERS MIGRATION
-- =====================================================

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
        WHEN 'States of Matter' THEN 'Solids, liquids, gases, and changes of state.'
        WHEN 'Atoms, Elements and Compounds' THEN 'Atomic structure, periodic table, and chemical bonding.'
        WHEN 'Stoichiometry' THEN 'Chemical calculations, moles, and quantitative chemistry.'
        WHEN 'Electrochemistry' THEN 'Electrolysis, batteries, and electrochemical reactions.'
        WHEN 'Chemical Energetics' THEN 'Energy changes in chemical reactions and thermochemistry.'
        WHEN 'Chemical Reactions' THEN 'Types of reactions, reaction mechanisms, and chemical kinetics.'
        WHEN 'Acids, Bases and Salts' THEN 'Acid-base chemistry, pH, and salt formation.'
        WHEN 'The Periodic Table' THEN 'Periodic trends, group properties, and element classification.'
        WHEN 'Metals' THEN 'Metallic bonding, properties, and extraction of metals.'
        WHEN 'Chemistry of the Environment' THEN 'Environmental chemistry, pollution, and sustainability.'
        WHEN 'Organic Chemistry' THEN 'Carbon compounds, functional groups, and organic reactions.'
        WHEN 'Analytical Chemistry' THEN 'Chemical analysis, identification, and testing methods.'
        ELSE 'Chemistry concepts and applications in ' || t.major_area
    END as description,
    generate_chapter_slug(t.major_area, t.subject_id) as slug,
    -- Assign syllabus codes based on typical IGCSE Chemistry structure
    CASE 
        WHEN t.major_area = 'States of Matter' THEN '1'
        WHEN t.major_area = 'Atoms, Elements and Compounds' THEN '2'
        WHEN t.major_area = 'Stoichiometry' THEN '3'
        WHEN t.major_area = 'Electrochemistry' THEN '4'
        WHEN t.major_area = 'Chemical Energetics' THEN '5'
        WHEN t.major_area = 'Chemical Reactions' THEN '6'
        WHEN t.major_area = 'Acids, Bases and Salts' THEN '7'
        WHEN t.major_area = 'The Periodic Table' THEN '8'
        WHEN t.major_area = 'Metals' THEN '9'
        WHEN t.major_area = 'Chemistry of the Environment' THEN '10'
        WHEN t.major_area = 'Organic Chemistry' THEN '11'
        WHEN t.major_area = 'Analytical Chemistry' THEN '12'
        ELSE SUBSTRING(MIN(t.syllabus_code) FROM '^[0-9]+')
    END as syllabus_code,
    'Cambridge IGCSE' as curriculum_board,
    -- Set display order
    CASE 
        WHEN t.major_area = 'States of Matter' THEN 1
        WHEN t.major_area = 'Atoms, Elements and Compounds' THEN 2
        WHEN t.major_area = 'Stoichiometry' THEN 3
        WHEN t.major_area = 'Electrochemistry' THEN 4
        WHEN t.major_area = 'Chemical Energetics' THEN 5
        WHEN t.major_area = 'Chemical Reactions' THEN 6
        WHEN t.major_area = 'Acids, Bases and Salts' THEN 7
        WHEN t.major_area = 'The Periodic Table' THEN 8
        WHEN t.major_area = 'Metals' THEN 9
        WHEN t.major_area = 'Chemistry of the Environment' THEN 10
        WHEN t.major_area = 'Organic Chemistry' THEN 11
        WHEN t.major_area = 'Analytical Chemistry' THEN 12
        ELSE 99
    END as display_order,
    s.color_hex,
    SUM(COALESCE(t.estimated_study_time_minutes, 30)) as estimated_study_time_minutes,
    ARRAY[
        'Understand fundamental concepts in ' || t.major_area,
        'Apply chemical principles to solve problems',
        'Demonstrate practical skills in ' || LOWER(t.major_area)
    ] as learning_objectives,
    true as is_published,
    true as is_active
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'CHEM' 
  AND t.major_area IS NOT NULL 
  AND t.major_area != ''
GROUP BY t.subject_id, t.major_area, s.color_hex
ORDER BY display_order;

-- =====================================================
-- 4. BIOLOGY CHAPTERS MIGRATION
-- =====================================================

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
        WHEN 'Characteristics and Classification of Living Organisms' THEN 'Features of living organisms and classification systems.'
        WHEN 'Organisation and Maintenance of the Organism' THEN 'Cell structure, tissues, organs, and life processes.'
        WHEN 'Movement in and out of Cells' THEN 'Diffusion, osmosis, active transport, and membrane processes.'
        WHEN 'Biological Molecules' THEN 'Carbohydrates, proteins, lipids, and nucleic acids.'
        WHEN 'Enzymes' THEN 'Enzyme structure, function, and factors affecting enzyme activity.'
        WHEN 'Plant Nutrition' THEN 'Photosynthesis, plant mineral requirements, and nutrition.'
        WHEN 'Human Nutrition' THEN 'Diet, digestion, absorption, and nutritional disorders.'
        WHEN 'Transport in Plants' THEN 'Water transport, translocation, and plant transport systems.'
        WHEN 'Transport in Animals' THEN 'Circulatory systems, blood, and transport mechanisms.'
        WHEN 'Disease and Immunity' THEN 'Pathogens, immune system, and disease prevention.'
        WHEN 'Gas Exchange in Humans' THEN 'Respiratory system, breathing, and gas exchange.'
        WHEN 'Respiration' THEN 'Cellular respiration, aerobic and anaerobic processes.'
        WHEN 'Excretion in Humans' THEN 'Kidney function, waste removal, and homeostasis.'
        WHEN 'Coordination and Response' THEN 'Nervous system, hormones, and response mechanisms.'
        WHEN 'Drugs' THEN 'Drug effects, addiction, and medicinal chemistry.'
        WHEN 'Reproduction' THEN 'Sexual and asexual reproduction in plants and animals.'
        WHEN 'Inheritance' THEN 'Genetics, DNA, chromosomes, and heredity.'
        WHEN 'Variation and Selection' THEN 'Genetic variation, natural selection, and evolution.'
        WHEN 'Organisms and their Environment' THEN 'Ecology, ecosystems, and environmental interactions.'
        WHEN 'Biotechnology and Genetic Engineering' THEN 'Modern biotechnology applications and genetic modification.'
        WHEN 'Human Influences on Ecosystems' THEN 'Environmental impact, conservation, and sustainability.'
        ELSE 'Biology concepts and applications in ' || t.major_area
    END as description,
    generate_chapter_slug(t.major_area, t.subject_id) as slug,
    -- Use ROW_NUMBER for sequential syllabus codes
    ROW_NUMBER() OVER (ORDER BY MIN(t.display_order))::text as syllabus_code,
    'Cambridge IGCSE' as curriculum_board,
    ROW_NUMBER() OVER (ORDER BY MIN(t.display_order)) as display_order,
    s.color_hex,
    SUM(COALESCE(t.estimated_study_time_minutes, 30)) as estimated_study_time_minutes,
    ARRAY[
        'Understand fundamental concepts in ' || t.major_area,
        'Apply biological principles to solve problems',
        'Demonstrate practical skills in ' || LOWER(t.major_area)
    ] as learning_objectives,
    true as is_published,
    true as is_active
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'BIO'
  AND t.major_area IS NOT NULL
  AND t.major_area != ''
GROUP BY t.subject_id, t.major_area, s.color_hex
ORDER BY display_order;

-- =====================================================
-- 5. ECONOMICS CHAPTERS MIGRATION
-- =====================================================

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
        WHEN 'The Basic Economic Problem' THEN 'Scarcity, choice, opportunity cost, and resource allocation.'
        WHEN 'The Allocation of Resources' THEN 'Market mechanisms, price system, and resource distribution.'
        WHEN 'Microeconomic Decision Makers' THEN 'Individual economic agents, households, firms, and workers.'
        WHEN 'Government and the Macroeconomy' THEN 'Government intervention, fiscal policy, and economic management.'
        WHEN 'Economic Development' THEN 'Growth, development indicators, and international economics.'
        WHEN 'International Trade and Globalisation' THEN 'Trade theory, globalization effects, and international economics.'
        ELSE 'Economics concepts and applications in ' || t.major_area
    END as description,
    generate_chapter_slug(t.major_area, t.subject_id) as slug,
    ROW_NUMBER() OVER (ORDER BY MIN(t.display_order))::text as syllabus_code,
    'Cambridge IGCSE' as curriculum_board,
    ROW_NUMBER() OVER (ORDER BY MIN(t.display_order)) as display_order,
    s.color_hex,
    SUM(COALESCE(t.estimated_study_time_minutes, 30)) as estimated_study_time_minutes,
    ARRAY[
        'Understand fundamental concepts in ' || t.major_area,
        'Apply economic principles to real-world situations',
        'Analyze economic data and trends'
    ] as learning_objectives,
    true as is_published,
    true as is_active
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE s.code = 'ECON'
  AND t.major_area IS NOT NULL
  AND t.major_area != ''
GROUP BY t.subject_id, t.major_area, s.color_hex
ORDER BY display_order;

-- =====================================================
-- 6. UPDATE TOPICS TO REFERENCE CHAPTERS
-- =====================================================

-- Update Physics topics
UPDATE public.topics
SET chapter_id = c.id
FROM public.chapters c
JOIN public.subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'PHYS';

-- Update Chemistry topics
UPDATE public.topics
SET chapter_id = c.id
FROM public.chapters c
JOIN public.subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'CHEM';

-- Update Biology topics
UPDATE public.topics
SET chapter_id = c.id
FROM public.chapters c
JOIN public.subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'BIO';

-- Update Economics topics
UPDATE public.topics
SET chapter_id = c.id
FROM public.chapters c
JOIN public.subjects s ON c.subject_id = s.id
WHERE topics.subject_id = c.subject_id
  AND topics.major_area = c.title
  AND s.code = 'ECON';

-- =====================================================
-- 7. VERIFICATION AND STATISTICS
-- =====================================================

-- Display migration results for all subjects
DO $$
DECLARE
    subject_rec RECORD;
    chapter_count INTEGER;
    updated_topics INTEGER;
    orphaned_topics INTEGER;
BEGIN
    RAISE NOTICE 'All Subjects Chapter Migration Results:';
    RAISE NOTICE '=====================================';

    FOR subject_rec IN
        SELECT id, name, code FROM subjects WHERE code IN ('PHYS', 'CHEM', 'BIO', 'ECON')
    LOOP
        -- Count created chapters
        SELECT COUNT(*) INTO chapter_count
        FROM chapters WHERE subject_id = subject_rec.id;

        -- Count updated topics
        SELECT COUNT(*) INTO updated_topics
        FROM topics
        WHERE subject_id = subject_rec.id AND chapter_id IS NOT NULL;

        -- Count orphaned topics
        SELECT COUNT(*) INTO orphaned_topics
        FROM topics
        WHERE subject_id = subject_rec.id AND chapter_id IS NULL;

        -- Display results for this subject
        RAISE NOTICE '% (%): % chapters, % topics assigned, % orphaned',
            subject_rec.name, subject_rec.code, chapter_count, updated_topics, orphaned_topics;

        IF orphaned_topics > 0 THEN
            RAISE WARNING '% has % orphaned topics. Review topics without major_area.',
                subject_rec.name, orphaned_topics;
        END IF;
    END LOOP;

    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Migration complete for all subjects!';
END $$;

-- =====================================================
-- 8. FINAL VERIFICATION QUERY
-- =====================================================

-- Summary query to check overall migration status
SELECT
    s.name as subject_name,
    s.code,
    COUNT(DISTINCT c.id) as total_chapters,
    COUNT(DISTINCT t.id) as total_topics,
    COUNT(DISTINCT CASE WHEN t.chapter_id IS NOT NULL THEN t.id END) as topics_with_chapters,
    COUNT(DISTINCT CASE WHEN t.chapter_id IS NULL THEN t.id END) as orphaned_topics,
    ROUND(
        (COUNT(DISTINCT CASE WHEN t.chapter_id IS NOT NULL THEN t.id END)::numeric /
         NULLIF(COUNT(DISTINCT t.id), 0)) * 100, 2
    ) as assignment_percentage
FROM subjects s
LEFT JOIN chapters c ON s.id = c.subject_id
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.code IN ('MATH', 'PHYS', 'CHEM', 'BIO', 'ECON')
GROUP BY s.id, s.name, s.code
ORDER BY s.code;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All subjects have been migrated to the chapter structure
-- Topics have been assigned to their corresponding chapters
-- Next step: Test the new hierarchy in the application
