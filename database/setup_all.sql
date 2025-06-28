-- =====================================================
-- IGCSE Student Guide - Complete Database Setup
-- Single file for automatic setup in Supabase
-- =====================================================
-- Execute this entire file in Supabase SQL Editor for complete setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE TABLES CREATION
-- =====================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    grade_level INTEGER CHECK (grade_level IN (9, 10)),
    school_name TEXT,
    target_subjects TEXT[],
    study_goals TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferred_study_time TIME,
    daily_study_goal_minutes INTEGER DEFAULT 30,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#6366f1',
    icon_name TEXT NOT NULL DEFAULT 'book',
    curriculum_board TEXT DEFAULT 'Cambridge IGCSE',
    grade_levels INTEGER[] DEFAULT '{9,10}',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    parent_topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    content TEXT,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    estimated_study_time_minutes INTEGER DEFAULT 30,
    learning_objectives TEXT[],
    prerequisites UUID[],
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, slug)
);

-- Flashcards Table
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    card_type TEXT DEFAULT 'basic' CHECK (card_type IN ('basic', 'cloze', 'multiple_choice')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    tags TEXT[],
    hint TEXT,
    explanation TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    quiz_type TEXT DEFAULT 'practice' CHECK (quiz_type IN ('practice', 'assessment', 'mock_exam')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    time_limit_minutes INTEGER,
    passing_score_percentage INTEGER DEFAULT 70,
    max_attempts INTEGER,
    randomize_questions BOOLEAN DEFAULT false,
    show_correct_answers BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (
        question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')
    ),
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Flashcard Progress Table
CREATE TABLE IF NOT EXISTS public.user_flashcard_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    ease_factor DECIMAL(3,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    last_review_date TIMESTAMP WITH TIME ZONE,
    last_review_rating INTEGER CHECK (last_review_rating BETWEEN 1 AND 5),
    is_learned BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, flashcard_id)
);

-- User Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.user_quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2),
    points_earned INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT false,
    answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quiz_id, attempt_number)
);

-- User Topic Progress Table
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    flashcards_mastered INTEGER DEFAULT 0,
    flashcards_total INTEGER DEFAULT 0,
    quizzes_passed INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    best_quiz_score DECIMAL(5,2) DEFAULT 0.0,
    total_study_time_minutes INTEGER DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- User Study Sessions Table
CREATE TABLE IF NOT EXISTS public.user_study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    session_type TEXT CHECK (session_type IN ('flashcards', 'quiz', 'reading', 'mixed')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    flashcards_reviewed INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes if they don't exist
DO $$ 
BEGIN
    -- User Profiles Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_email') THEN
        CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
    END IF;
    
    -- Subjects Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subjects_code') THEN
        CREATE INDEX idx_subjects_code ON public.subjects(code);
    END IF;
    
    -- Topics Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_subject_id') THEN
        CREATE INDEX idx_topics_subject_id ON public.topics(subject_id);
    END IF;
    
    -- Flashcards Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_topic_id') THEN
        CREATE INDEX idx_flashcards_topic_id ON public.flashcards(topic_id);
    END IF;
    
    -- User Progress Indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_flashcard_progress_user_id') THEN
        CREATE INDEX idx_user_flashcard_progress_user_id ON public.user_flashcard_progress(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_flashcard_progress_next_review') THEN
        CREATE INDEX idx_user_flashcard_progress_next_review ON public.user_flashcard_progress(next_review_date);
    END IF;
END $$;

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on user-specific tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$ 
BEGIN
    -- User Profiles Policies
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
    CREATE POLICY "Users can view own profile" ON public.user_profiles
        FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
    CREATE POLICY "Users can update own profile" ON public.user_profiles
        FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
    CREATE POLICY "Users can insert own profile" ON public.user_profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
    
    -- Public read policies for content
    DROP POLICY IF EXISTS "Authenticated users can read subjects" ON public.subjects;
    CREATE POLICY "Authenticated users can read subjects" ON public.subjects
        FOR SELECT USING (auth.role() = 'authenticated');
    
    DROP POLICY IF EXISTS "Authenticated users can read published topics" ON public.topics;
    CREATE POLICY "Authenticated users can read published topics" ON public.topics
        FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);
    
    DROP POLICY IF EXISTS "Authenticated users can read active flashcards" ON public.flashcards;
    CREATE POLICY "Authenticated users can read active flashcards" ON public.flashcards
        FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
    
    -- User progress policies
    DROP POLICY IF EXISTS "Users can manage own flashcard progress" ON public.user_flashcard_progress;
    CREATE POLICY "Users can manage own flashcard progress" ON public.user_flashcard_progress
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own quiz attempts" ON public.user_quiz_attempts;
    CREATE POLICY "Users can manage own quiz attempts" ON public.user_quiz_attempts
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own topic progress" ON public.user_topic_progress;
    CREATE POLICY "Users can manage own topic progress" ON public.user_topic_progress
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.user_study_sessions;
    CREATE POLICY "Users can manage own study sessions" ON public.user_study_sessions
        FOR ALL USING (auth.uid() = user_id);
END $$;

-- =====================================================
-- 4. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Spaced repetition calculation function
CREATE OR REPLACE FUNCTION public.calculate_next_review(
    current_ease_factor DECIMAL,
    current_interval INTEGER,
    repetitions INTEGER,
    review_rating INTEGER
)
RETURNS TABLE(
    new_ease_factor DECIMAL,
    new_interval INTEGER,
    new_repetitions INTEGER,
    next_review_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    ease DECIMAL := current_ease_factor;
    interval_days INTEGER := current_interval;
    reps INTEGER := repetitions;
BEGIN
    IF review_rating >= 3 THEN
        IF reps = 0 THEN
            interval_days := 1;
        ELSIF reps = 1 THEN
            interval_days := 6;
        ELSE
            interval_days := ROUND(interval_days * ease);
        END IF;
        reps := reps + 1;
    ELSE
        reps := 0;
        interval_days := 1;
    END IF;
    
    ease := ease + (0.1 - (5 - review_rating) * (0.08 + (5 - review_rating) * 0.02));
    
    IF ease < 1.3 THEN
        ease := 1.3;
    END IF;
    
    RETURN QUERY SELECT 
        ease,
        interval_days,
        reps,
        (NOW() + (interval_days || ' days')::INTERVAL)::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.topics TO authenticated;
GRANT SELECT ON public.flashcards TO authenticated;
GRANT SELECT ON public.quizzes TO authenticated;
GRANT SELECT ON public.quiz_questions TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_flashcard_progress TO authenticated;
GRANT ALL ON public.user_quiz_attempts TO authenticated;
GRANT ALL ON public.user_topic_progress TO authenticated;
GRANT ALL ON public.user_study_sessions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 6. SAMPLE DATA
-- =====================================================

-- Insert sample subjects
INSERT INTO public.subjects (id, name, code, description, color_hex, icon_name, display_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'MATH', 'Core mathematical concepts for IGCSE students.', '#3b82f6', 'calculator', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Physics', 'PHYS', 'Fundamental physics principles.', '#10b981', 'atom', 2),
('550e8400-e29b-41d4-a716-446655440003', 'Chemistry', 'CHEM', 'Chemical principles and reactions.', '#8b5cf6', 'flask', 3),
('550e8400-e29b-41d4-a716-446655440004', 'Biology', 'BIOL', 'Life sciences and biology concepts.', '#ef4444', 'leaf', 4),
('550e8400-e29b-41d4-a716-446655440005', 'English Language', 'ENGL', 'English language skills.', '#f59e0b', 'book-open', 5),
('550e8400-e29b-41d4-a716-446655440006', 'History', 'HIST', 'World history and historical analysis.', '#6366f1', 'clock', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert sample topics
INSERT INTO public.topics (id, subject_id, title, slug, description, content, difficulty_level, display_order) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Algebra Fundamentals', 'algebra-fundamentals', 'Basic algebraic concepts', '# Algebra Fundamentals\n\nLearn variables, expressions, and equations.', 2, 1),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Forces and Motion', 'forces-motion', 'Newton''s laws of motion', '# Forces and Motion\n\nUnderstand Newton''s three laws.', 3, 1)
ON CONFLICT (subject_id, slug) DO NOTHING;

-- Insert sample flashcards
INSERT INTO public.flashcards (id, topic_id, front_content, back_content, difficulty_level, tags) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'What is a variable?', 'A letter representing an unknown value', 1, '{"algebra", "basics"}'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'State Newton''s First Law', 'An object at rest stays at rest unless acted upon by force', 2, '{"physics", "newton"}')
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'IGCSE Student Guide database setup completed successfully!';
    RAISE NOTICE 'Tables created: %, Indexes added, RLS enabled, Sample data inserted', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%user_%' OR table_name IN ('subjects', 'topics', 'flashcards', 'quizzes', 'quiz_questions'));
END $$;
