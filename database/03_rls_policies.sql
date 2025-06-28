-- =====================================================
-- IGCSE Student Guide - Row Level Security Policies
-- File 3: Security & Access Control
-- =====================================================
-- Execute this file after creating tables and indexes

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables that need user-specific access control
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_sessions ENABLE ROW LEVEL SECURITY;

-- Public tables (subjects, topics, flashcards, quizzes) don't need RLS
-- as they should be readable by all authenticated users

-- =====================================================
-- USER PROFILES POLICIES
-- =====================================================

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for new registrations)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users cannot delete their profile (handled by Supabase auth cascade)
CREATE POLICY "Users cannot delete profiles" ON public.user_profiles
    FOR DELETE USING (false);

-- =====================================================
-- USER FLASHCARD PROGRESS POLICIES
-- =====================================================

-- Users can view their own flashcard progress
CREATE POLICY "Users can view own flashcard progress" ON public.user_flashcard_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own flashcard progress
CREATE POLICY "Users can insert own flashcard progress" ON public.user_flashcard_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own flashcard progress
CREATE POLICY "Users can update own flashcard progress" ON public.user_flashcard_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own flashcard progress
CREATE POLICY "Users can delete own flashcard progress" ON public.user_flashcard_progress
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER QUIZ ATTEMPTS POLICIES
-- =====================================================

-- Users can view their own quiz attempts
CREATE POLICY "Users can view own quiz attempts" ON public.user_quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own quiz attempts
CREATE POLICY "Users can insert own quiz attempts" ON public.user_quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz attempts (for completing attempts)
CREATE POLICY "Users can update own quiz attempts" ON public.user_quiz_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users cannot delete quiz attempts (for data integrity)
CREATE POLICY "Users cannot delete quiz attempts" ON public.user_quiz_attempts
    FOR DELETE USING (false);

-- =====================================================
-- USER TOPIC PROGRESS POLICIES
-- =====================================================

-- Users can view their own topic progress
CREATE POLICY "Users can view own topic progress" ON public.user_topic_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own topic progress
CREATE POLICY "Users can insert own topic progress" ON public.user_topic_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own topic progress
CREATE POLICY "Users can update own topic progress" ON public.user_topic_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own topic progress
CREATE POLICY "Users can delete own topic progress" ON public.user_topic_progress
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- USER STUDY SESSIONS POLICIES
-- =====================================================

-- Users can view their own study sessions
CREATE POLICY "Users can view own study sessions" ON public.user_study_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own study sessions
CREATE POLICY "Users can insert own study sessions" ON public.user_study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions (for ending sessions)
CREATE POLICY "Users can update own study sessions" ON public.user_study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own study sessions
CREATE POLICY "Users can delete own study sessions" ON public.user_study_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- PUBLIC READ POLICIES FOR CONTENT TABLES
-- =====================================================

-- All authenticated users can read subjects
CREATE POLICY "Authenticated users can read subjects" ON public.subjects
    FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can read published topics
CREATE POLICY "Authenticated users can read published topics" ON public.topics
    FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);

-- All authenticated users can read active flashcards
CREATE POLICY "Authenticated users can read active flashcards" ON public.flashcards
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- All authenticated users can read published quizzes
CREATE POLICY "Authenticated users can read published quizzes" ON public.quizzes
    FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);

-- All authenticated users can read quiz questions for published quizzes
CREATE POLICY "Authenticated users can read quiz questions" ON public.quiz_questions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.is_published = true
        )
    );

-- =====================================================
-- ADMIN POLICIES (Optional - for content management)
-- =====================================================

-- Create a custom claim for admin users
-- This would be set in Supabase Auth custom claims: {"role": "admin"}

-- Admins can manage all content (subjects, topics, flashcards, quizzes)
CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage topics" ON public.topics
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage flashcards" ON public.flashcards
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Admins can view all user data (for analytics and support)
CREATE POLICY "Admins can view all user profiles" ON public.user_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can view all user progress" ON public.user_flashcard_progress
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can view all quiz attempts" ON public.user_quiz_attempts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can view all topic progress" ON public.user_topic_progress
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can view all study sessions" ON public.user_study_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );

-- =====================================================
-- HELPER FUNCTIONS FOR POLICIES
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION public.user_owns_resource(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if content is published and accessible
CREATE OR REPLACE FUNCTION public.content_is_accessible(is_published BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'authenticated' AND (is_published = true OR public.is_admin());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.topics TO authenticated;
GRANT SELECT ON public.flashcards TO authenticated;
GRANT SELECT ON public.quizzes TO authenticated;
GRANT SELECT ON public.quiz_questions TO authenticated;

-- Grant full access to user-specific tables (controlled by RLS)
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_flashcard_progress TO authenticated;
GRANT ALL ON public.user_quiz_attempts TO authenticated;
GRANT ALL ON public.user_topic_progress TO authenticated;
GRANT ALL ON public.user_study_sessions TO authenticated;

-- Grant sequence permissions for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON POLICY "Users can view own profile" ON public.user_profiles IS 'Users can only access their own profile data';
COMMENT ON POLICY "Authenticated users can read subjects" ON public.subjects IS 'All logged-in users can browse available subjects';
COMMENT ON POLICY "Authenticated users can read published topics" ON public.topics IS 'Users can only see published educational content';
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check admin privileges from JWT claims';
COMMENT ON FUNCTION public.content_is_accessible(BOOLEAN) IS 'Helper function to check if content should be accessible to current user';
