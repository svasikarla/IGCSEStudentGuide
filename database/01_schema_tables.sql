-- =====================================================
-- IGCSE Student Guide - Database Schema
-- File 1: Core Tables Creation
-- =====================================================
-- Execute this file first to create all core tables
-- Compatible with Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with IGCSE-specific profile data
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    grade_level INTEGER CHECK (grade_level IN (9, 10)),
    school_name TEXT,
    target_subjects TEXT[], -- Array of subject IDs user is studying
    study_goals TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferred_study_time TIME,
    daily_study_goal_minutes INTEGER DEFAULT 30,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SUBJECTS TABLE
-- =====================================================
-- Core IGCSE subjects with metadata and styling
CREATE TABLE public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- e.g., 'MATH', 'PHYS', 'CHEM'
    description TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#6366f1', -- For UI theming
    icon_name TEXT NOT NULL DEFAULT 'book', -- Icon identifier
    curriculum_board TEXT DEFAULT 'Cambridge IGCSE', -- Cambridge, Edexcel, etc.
    grade_levels INTEGER[] DEFAULT '{9,10}', -- Which grades this applies to
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TOPICS TABLE
-- =====================================================
-- Hierarchical topic organization within subjects
CREATE TABLE public.topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    parent_topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE, -- For subtopics
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    description TEXT,
    content TEXT, -- Markdown content for study material
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    estimated_study_time_minutes INTEGER DEFAULT 30,
    learning_objectives TEXT[], -- Array of learning goals
    prerequisites UUID[], -- Array of topic IDs that should be completed first
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique slug within subject
    UNIQUE(subject_id, slug)
);

-- =====================================================
-- 4. FLASHCARDS TABLE
-- =====================================================
-- Individual flashcards with spaced repetition data
CREATE TABLE public.flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL, -- Question/prompt (supports markdown)
    back_content TEXT NOT NULL, -- Answer/explanation (supports markdown)
    card_type TEXT DEFAULT 'basic' CHECK (card_type IN ('basic', 'cloze', 'multiple_choice')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    tags TEXT[], -- Array of tags for categorization
    hint TEXT, -- Optional hint for the card
    explanation TEXT, -- Additional explanation after answer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. QUIZZES TABLE
-- =====================================================
-- Quiz metadata and configuration
CREATE TABLE public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    quiz_type TEXT DEFAULT 'practice' CHECK (quiz_type IN ('practice', 'assessment', 'mock_exam')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 1,
    time_limit_minutes INTEGER, -- NULL for untimed quizzes
    passing_score_percentage INTEGER DEFAULT 70,
    max_attempts INTEGER, -- NULL for unlimited attempts
    randomize_questions BOOLEAN DEFAULT false,
    show_correct_answers BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. QUIZ QUESTIONS TABLE
-- =====================================================
-- Individual questions within quizzes
CREATE TABLE public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (
        question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')
    ),
    options JSONB, -- For multiple choice: {"A": "option1", "B": "option2", ...}
    correct_answer TEXT NOT NULL, -- For MC: "A", for T/F: "true"/"false", for others: the answer
    explanation TEXT, -- Explanation of the correct answer
    points INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. USER FLASHCARD PROGRESS TABLE
-- =====================================================
-- Tracks individual user progress on flashcards (spaced repetition)
CREATE TABLE public.user_flashcard_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    
    -- Spaced repetition algorithm fields
    ease_factor DECIMAL(3,2) DEFAULT 2.5, -- SM-2 algorithm ease factor
    interval_days INTEGER DEFAULT 1, -- Days until next review
    repetitions INTEGER DEFAULT 0, -- Number of successful repetitions
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance tracking
    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    last_review_date TIMESTAMP WITH TIME ZONE,
    last_review_rating INTEGER CHECK (last_review_rating BETWEEN 1 AND 5), -- 1=again, 5=easy
    
    -- Status
    is_learned BOOLEAN DEFAULT false, -- Graduated from learning phase
    is_favorite BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one progress record per user per flashcard
    UNIQUE(user_id, flashcard_id)
);

-- =====================================================
-- 8. USER QUIZ ATTEMPTS TABLE
-- =====================================================
-- Records of user quiz attempts and scores
CREATE TABLE public.user_quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    
    -- Attempt details
    attempt_number INTEGER NOT NULL, -- 1st attempt, 2nd attempt, etc.
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    
    -- Scoring
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2),
    points_earned INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT false,
    
    -- Response data
    answers JSONB, -- {"question_id": "user_answer", ...}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure proper attempt numbering per user per quiz
    UNIQUE(user_id, quiz_id, attempt_number)
);

-- =====================================================
-- 9. USER TOPIC PROGRESS TABLE
-- =====================================================
-- Aggregated progress tracking at topic level
CREATE TABLE public.user_topic_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    
    -- Progress metrics
    completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    flashcards_mastered INTEGER DEFAULT 0,
    flashcards_total INTEGER DEFAULT 0,
    quizzes_passed INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    best_quiz_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Time tracking
    total_study_time_minutes INTEGER DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one progress record per user per topic
    UNIQUE(user_id, topic_id)
);

-- =====================================================
-- 10. USER STUDY SESSIONS TABLE
-- =====================================================
-- Track individual study sessions for analytics
CREATE TABLE public.user_study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    
    -- Session details
    session_type TEXT CHECK (session_type IN ('flashcards', 'quiz', 'reading', 'mixed')) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Activity metrics
    flashcards_reviewed INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to tables
COMMENT ON TABLE public.user_profiles IS 'Extended user profiles with IGCSE-specific data';
COMMENT ON TABLE public.subjects IS 'IGCSE subjects with metadata and styling information';
COMMENT ON TABLE public.topics IS 'Hierarchical topics within subjects containing study content';
COMMENT ON TABLE public.flashcards IS 'Individual flashcards for spaced repetition learning';
COMMENT ON TABLE public.quizzes IS 'Quiz metadata and configuration';
COMMENT ON TABLE public.quiz_questions IS 'Individual questions within quizzes';
COMMENT ON TABLE public.user_flashcard_progress IS 'User progress on flashcards with spaced repetition data';
COMMENT ON TABLE public.user_quiz_attempts IS 'Records of user quiz attempts and scores';
COMMENT ON TABLE public.user_topic_progress IS 'Aggregated user progress at topic level';
COMMENT ON TABLE public.user_study_sessions IS 'Individual study session tracking for analytics';
