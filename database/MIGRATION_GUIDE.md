# Applying Database Migrations

To complete the fixes for the database errors, you need to apply the SQL migration files to your Supabase database.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query

### Apply Quiz Statistics Function

Copy and paste the contents of [`database/06_quiz_statistics_function.sql`](file:///d:/GrowthSch/IGCSEStuGuide/database/06_quiz_statistics_function.sql) and run it.

### Apply RLS Policy Fix

Copy and paste the contents of [`database/07_fix_rls_policy_recursion.sql`](file:///d:/GrowthSch/IGCSEStuGuide/database/07_fix_rls_policy_recursion.sql) and run it.

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed and configured:

```bash
# Navigate to project directory
cd d:\GrowthSch\IGCSEStuGuide

# Apply the quiz statistics function
supabase db execute -f database/06_quiz_statistics_function.sql

# Apply the RLS policy fix
supabase db execute -f database/07_fix_rls_policy_recursion.sql
```

## Verification After Migration

After applying the migrations, test the application:

1. **Start the development server** (if not already running):
   ```bash
   npm start
   ```

2. **Check browser console** for:
   - ✅ No "Multiple GoTrueClient instances" warning
   - ✅ No 404 errors for `get_user_quiz_statistics`
   - ✅ No 500 errors for `user_profiles` queries
   - ✅ Auth state changes occur only once per event

3. **Test specific features**:
   - Navigate to quizzes page to verify statistics load
   - Check reviewer list loads without errors (if you have admin/teacher access)

## Rollback (If Needed)

If you encounter issues, you can rollback the changes:

### Rollback Quiz Statistics Function
```sql
DROP FUNCTION IF EXISTS public.get_user_quiz_statistics(UUID);
```

### Rollback RLS Policy Changes
```sql
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP POLICY IF EXISTS "Privileged users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Privileged users can view all flashcard progress" ON public.user_flashcard_progress;
DROP POLICY IF EXISTS "Privileged users can view all quiz attempts" ON public.user_quiz_attempts;
DROP POLICY IF EXISTS "Privileged users can view all topic progress" ON public.user_topic_progress;
DROP POLICY IF EXISTS "Privileged users can view all study sessions" ON public.user_study_sessions;

-- Recreate the original admin policy (note: this will cause recursion again)
CREATE POLICY "Admins can view all user profiles" ON public.user_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'role') = 'admin'
    );
```
