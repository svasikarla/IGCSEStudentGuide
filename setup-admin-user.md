# Setting Up Admin User for IGCSE Student Guide

## Issue Identified
The flashcard generation is failing because the current user doesn't have admin privileges. The system requires admin role to access the LLM API endpoints.

## How Admin Authentication Works

### Backend Middleware
The backend checks for admin role in `app_metadata`:
```javascript
const isAdmin = req.user.app_metadata?.role === 'admin';
```

### Database RLS Policies
The database expects admin role in JWT claims:
```sql
(auth.jwt() ->> 'role') = 'admin'
```

## Solution: Set Up Admin User

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/yznyaczemseqkpydwetn
   - Go to Authentication > Users

2. **Find Your User**
   - Locate the user you want to make admin
   - Click on the user to edit

3. **Update User Metadata**
   - In the "Raw User Meta Data" section, add:
   ```json
   {
     "role": "admin"
   }
   ```
   - In the "Raw App Meta Data" section, add:
   ```json
   {
     "role": "admin"
   }
   ```

4. **Save Changes**
   - Click "Update user"
   - The user will need to log out and log back in for changes to take effect

### Option 2: Using SQL (Alternative)

Execute this in Supabase SQL Editor (replace with actual user ID):

```sql
-- Update user metadata to include admin role
UPDATE auth.users 
SET 
  raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
  raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

### Option 3: Using Supabase Admin API

```javascript
// This would need to be run server-side with service role key
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yznyaczemseqkpydwetn.supabase.co',
  'your-service-role-key'
);

await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { role: 'admin' },
  user_metadata: { role: 'admin' }
});
```

## Verification

After setting up admin user:

1. **Check Authentication Status**
   - The FlashcardGeneratorForm now shows authentication status
   - Should display "✅ Admin privileges"

2. **Test Flashcard Generation**
   - Try generating flashcards
   - Should work without authentication errors

3. **Check Console Logs**
   - Look for authentication debug info in browser console
   - Should show admin role present

## Troubleshooting

If still having issues:

1. **Clear Browser Cache**
   - Log out and log back in
   - Clear localStorage/sessionStorage

2. **Check Token**
   - Verify JWT token contains admin role
   - Check both app_metadata and user_metadata

3. **Verify Backend Server**
   - Ensure backend server is running on port 3001
   - Check server logs for authentication errors

4. **Check Environment Variables**
   - Verify OPENAI_API_KEY is set in server/.env
   - Verify SUPABASE_SERVICE_KEY is correct
