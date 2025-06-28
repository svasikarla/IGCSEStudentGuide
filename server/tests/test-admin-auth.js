/**
 * Test script to verify admin-only LLM endpoints
 * 
 * This script tests three scenarios:
 * 1. Request without authentication (should be rejected)
 * 2. Request with non-admin authentication (should be rejected)
 * 3. Request with admin authentication (should be accepted)
 * 
 * To run this test, you need valid JWT tokens for both admin and non-admin users.
 * You can get these from your Supabase dashboard or by logging in through the frontend.
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3001';
const TEST_PROMPT = 'Write a short paragraph about photosynthesis';

// Replace these with actual tokens from your Supabase instance
// You can get these by logging in through your frontend app and checking localStorage
const ADMIN_TOKEN = 'REPLACE_WITH_ADMIN_TOKEN';
const NON_ADMIN_TOKEN = 'REPLACE_WITH_NON_ADMIN_TOKEN';

// Test cases
async function runTests() {
  console.log('🧪 Testing Admin-Only LLM Endpoints\n');
  
  // Test 1: No authentication
  console.log('Test 1: Request without authentication');
  try {
    const response = await fetch(`${API_URL}/api/llm/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: TEST_PROMPT
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Test 1 passed: Request without authentication was correctly rejected\n');
    } else {
      console.log('❌ Test 1 failed: Request without authentication should be rejected\n');
    }
  } catch (error) {
    console.error('Error in Test 1:', error);
  }
  
  // Test 2: Non-admin authentication
  console.log('Test 2: Request with non-admin authentication');
  try {
    const response = await fetch(`${API_URL}/api/llm/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NON_ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        prompt: TEST_PROMPT
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    if (response.status === 403) {
      console.log('✅ Test 2 passed: Request with non-admin authentication was correctly rejected\n');
    } else {
      console.log('❌ Test 2 failed: Request with non-admin authentication should be rejected\n');
    }
  } catch (error) {
    console.error('Error in Test 2:', error);
  }
  
  // Test 3: Admin authentication
  console.log('Test 3: Request with admin authentication');
  try {
    const response = await fetch(`${API_URL}/api/llm/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        prompt: TEST_PROMPT
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    if (response.status === 200) {
      console.log('✅ Test 3 passed: Request with admin authentication was correctly accepted\n');
    } else {
      console.log('❌ Test 3 failed: Request with admin authentication should be accepted\n');
    }
  } catch (error) {
    console.error('Error in Test 3:', error);
  }
}

// Run the tests
runTests().catch(console.error);
