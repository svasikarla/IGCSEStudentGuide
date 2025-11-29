/**
 * Admin Setup Utility
 * Helper functions to set up admin users and test authentication
 */

import { supabase } from '../lib/supabase';

/**
 * Check current user's authentication status and admin privileges
 */
export async function checkAuthStatus() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return { error: sessionError.message };
    }

    if (!session) {
      return {
        authenticated: false,
        message: 'No active session'
      };
    }

    const user = session.user;
    const isAdmin = user.app_metadata?.role === 'admin';

    console.log('🔍 Authentication Status:', {
      authenticated: true,
      userId: user.id,
      email: user.email,
      isAdmin,
      userMetadata: user.user_metadata,
      appMetadata: user.app_metadata,
      tokenPresent: !!session.access_token
    });

    return {
      authenticated: true,
      user,
      session,
      isAdmin,
      message: isAdmin ? 'User has admin privileges' : 'User does not have admin privileges'
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test API connectivity and authentication
 */
export async function testApiConnectivity() {
  try {
    console.log('🧪 Testing API connectivity...');

    // Test health endpoint
    const healthResponse = await fetch('/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        health: healthData,
        auth: 'No access token available',
        llm: 'Cannot test LLM API without authentication'
      };
    }

    // Test LLM API
    console.log('🧪 Testing LLM API with authentication...');
    const llmResponse = await fetch('/api/content-generation/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        prompt: 'Generate a simple test JSON object with a "message" field containing "Hello, World!"',
        maxTokens: 100 // Note: endpoint expects maxTokens, not max_tokens
      })
    });

    const llmStatus = llmResponse.status;
    const llmData = await llmResponse.text();

    console.log('LLM API Response Status:', llmStatus);
    console.log('LLM API Response:', llmData);

    let llmResult;
    try {
      llmResult = JSON.parse(llmData);
    } catch {
      llmResult = { rawResponse: llmData };
    }

    return {
      health: healthData,
      auth: 'Token present',
      llm: {
        status: llmStatus,
        success: llmStatus === 200,
        data: llmResult
      }
    };
  } catch (error) {
    console.error('❌ API test failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Instructions for setting up admin user
 */
export function getAdminSetupInstructions() {
  return `
🔧 ADMIN SETUP INSTRUCTIONS

The flashcard generation requires admin privileges. Here's how to set up an admin user:

1. **Using Supabase Dashboard (Recommended):**
   - Go to: https://supabase.com/dashboard/project/yznyaczemseqkpydwetn
   - Navigate to Authentication > Users
   - Find your user and click to edit
   - In "Raw App Meta Data", add: {"role": "admin"}
   - In "Raw User Meta Data", add: {"role": "admin"}
   - Save changes and log out/in

2. **Using SQL (Alternative):**
   Execute in Supabase SQL Editor:
   
   UPDATE auth.users 
   SET 
     raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
     raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
   WHERE email = 'your-email@example.com';

3. **Verification:**
   - Use the "Debug Auth" button to check admin status
   - Use the "Test API" button to verify LLM API access
   - Try generating flashcards

⚠️ Note: You must log out and log back in after making changes for them to take effect.
  `;
}

/**
 * Export for browser console use
 */
if (typeof window !== 'undefined') {
  (window as any).adminSetup = {
    checkAuthStatus,
    testApiConnectivity,
    getAdminSetupInstructions
  };
}
