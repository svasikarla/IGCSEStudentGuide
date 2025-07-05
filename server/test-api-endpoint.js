/**
 * Test script to test the API endpoint directly
 */
const fetch = require('node-fetch');

async function testAPIEndpoint() {
  console.log('🌐 Testing API Endpoint Integration...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/llm/generate-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Generate educational content for IGCSE Mathematics topic "Algebra Basics".

Return a JSON object with:
{
  "title": "Algebra Basics",
  "description": "Introduction to algebraic concepts",
  "content": "Detailed educational content about algebra",
  "difficulty_level": 3,
  "learning_objectives": ["Learn variables", "Understand equations", "Solve problems"]
}`,
        provider: 'google',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Raw response length:', responseText.length);
    console.log('Raw response (first 200 chars):', responseText.substring(0, 200));

    if (response.ok) {
      try {
        const jsonResult = JSON.parse(responseText);
        console.log('\n✅ API Endpoint SUCCESS');
        console.log('Result keys:', Object.keys(jsonResult));
        console.log('Content length:', jsonResult.content?.length || 0);
      } catch (parseError) {
        console.log('\n❌ Failed to parse API response as JSON:', parseError.message);
        console.log('Response text:', responseText);
      }
    } else {
      console.log('\n❌ API Endpoint FAILED');
      console.log('Error response:', responseText);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('Retrying with node-fetch...');
}

testAPIEndpoint().then(() => {
  console.log('\n🏁 API endpoint testing completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});
