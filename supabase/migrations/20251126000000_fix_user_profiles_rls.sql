-- Fix infinite recursion in user_profiles RLS policy
-- This migration replaces the direct table query in RLS with a SECURITY DEFINER function

-- 1. Create a secure function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- This runs with the privileges of the function creator (postgres), bypassing RLS
    SELECT (auth.jwt() ->> 'role') INTO v_role;
    
    -- If not in JWT, check the profile table directly (bypassing RLS due to SECURITY DEFINER)
    IF v_role IS NULL OR v_role = 'authenticated' THEN
        SELECT role INTO v_role
        FROM public.user_profiles
        WHERE id = auth.uid();
    END IF;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic policies that might be causing recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Privileged users can view all profiles" ON public.user_profiles;

-- 3. Create the new recursion-safe policy
CREATE POLICY "Privileged users can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = id OR  -- Users can always view their own profile
        public.get_user_role_safe() IN ('admin', 'content_reviewer', 'teacher')
    );

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role_safe() TO authenticated;

-- 5. Add comment
COMMENT ON POLICY "Privileged users can view all profiles" ON public.user_profiles IS 'Allows privileged users to view all profiles without triggering infinite recursion';
