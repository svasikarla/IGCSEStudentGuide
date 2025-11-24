-- =====================================================
-- IGCSE Student Guide - Fix RLS Policy Recursion
-- File 7: Fix user_profiles RLS Policy Infinite Recursion
-- =====================================================
-- This file fixes the infinite recursion error in user_profiles RLS policies

-- =====================================================
-- DROP PROBLEMATIC POLICIES
-- =====================================================

-- Drop the admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;

-- Drop other admin-related policies that might cause issues
DROP POLICY IF EXISTS "Admins can view all user progress" ON public.user_flashcard_progress;
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.user_quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all topic progress" ON public.user_topic_progress;
DROP POLICY IF EXISTS "Admins can view all study sessions" ON public.user_study_sessions;

-- =====================================================
-- CREATE SECURITY DEFINER HELPER FUNCTION
-- =====================================================

-- This function bypasses RLS to get the current user's role
-- SECURITY DEFINER allows it to read user_profiles without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    SELECT user_role INTO v_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    RETURN v_user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_current_user_role() IS 'Returns the current authenticated user role, bypassing RLS to prevent recursion';

-- =====================================================
-- RECREATE NON-RECURSIVE POLICIES
-- =====================================================

-- Policy for privileged users to view all user profiles
CREATE POLICY "Privileged users can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = id OR  -- Users can always view their own profile
        public.get_current_user_role() IN ('admin', 'content_reviewer', 'teacher')
    );

-- Policy for privileged users to view all flashcard progress
CREATE POLICY "Privileged users can view all flashcard progress" ON public.user_flashcard_progress
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'content_reviewer', 'teacher')
    );

-- Policy for privileged users to view all quiz attempts
CREATE POLICY "Privileged users can view all quiz attempts" ON public.user_quiz_attempts
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'content_reviewer', 'teacher')
    );

-- Policy for privileged users to view all topic progress
CREATE POLICY "Privileged users can view all topic progress" ON public.user_topic_progress
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'content_reviewer', 'teacher')
    );

-- Policy for privileged users to view all study sessions
CREATE POLICY "Privileged users can view all study sessions" ON public.user_study_sessions
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'content_reviewer', 'teacher')
    );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Add policy comments for documentation
COMMENT ON POLICY "Privileged users can view all profiles" ON public.user_profiles IS 'Allows admin, content_reviewer, and teacher roles to view all user profiles without recursion';
COMMENT ON POLICY "Privileged users can view all flashcard progress" ON public.user_flashcard_progress IS 'Allows privileged users to view all flashcard progress for analytics';
COMMENT ON POLICY "Privileged users can view all quiz attempts" ON public.user_quiz_attempts IS 'Allows privileged users to view all quiz attempts for analytics';
COMMENT ON POLICY "Privileged users can view all topic progress" ON public.user_topic_progress IS 'Allows privileged users to view all topic progress for analytics';
COMMENT ON POLICY "Privileged users can view all study sessions" ON public.user_study_sessions IS 'Allows privileged users to view all study sessions for analytics';
