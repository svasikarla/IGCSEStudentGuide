/**
 * Test script to verify the frontend connection issue
 */
const fetch = require('node-fetch');

async function testLLMEndpoint() {
  console.log('🧪 Testing /api/llm/generate-json endpoint...\n');

  const testPayload = {
    prompt: 'Generate educational content for IGCSE Mathematics topic "Number and Algebra". Provide your response as a valid JSON object.',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    max_tokens: 1000,
    provider: 'google'
  };

  console.log('📋 Request payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n🚀 Making request...\n');

  try {
    const response = await fetch('http://localhost:3001/api/llm/generate-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\n📄 Response body:');
    console.log(responseText);

    if (response.ok) {
      try {
        const json = JSON.parse(responseText);
        console.log('\n✅ Successfully parsed JSON response:');
        console.log(JSON.stringify(json, null, 2));
      } catch (parseError) {
        console.log('\n⚠️ Response is not valid JSON');
      }
    } else {
      console.log('\n❌ Request failed with status:', response.status);
    }

  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔍 Diagnosis: Server is not running or not accessible on port 3001');
      console.log('💡 Solution: Make sure the backend server is running with "node index.js"');
    }
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    console.log('✅ Health check successful:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Frontend Connection Diagnostic Tool\n');
  console.log('This tool tests the exact same endpoint that your React frontend is trying to access.\n');
  
  // First test health endpoint
  const healthOk = await testHealthEndpoint();
  
  if (!healthOk) {
    console.log('\n🚨 Server is not responding. Please start the backend server first.');
    return;
  }
  
  // Then test the LLM endpoint
  await testLLMEndpoint();
  
  console.log('\n🏁 Diagnostic complete');
  console.log('\n💡 If you see a 401 error, that means the server is working but requires authentication.');
  console.log('💡 If you see ECONNREFUSED, that means the server is not running.');
  console.log('💡 If you see a successful response, the connection is working!');
}

main().catch(console.error);
