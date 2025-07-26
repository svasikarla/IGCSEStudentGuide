/**
 * Test script for the improved JSON fixing logic
 */

const GeminiService = require('./services/geminiService');

// Test cases with common JSON issues
const testCases = [
  {
    name: "Truncated JSON",
    json: `{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "This quiz tests your understanding of key organic chemistry concepts.",
  "difficulty_level": 3,
  "time_limit_minutes": 20,
  "question`
  },
  {
    name: "Unterminated string",
    json: `{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "This quiz tests your understanding of key organic chemistry concepts.",
  "difficulty_level": 3,
  "time_limit_minutes": 20,
  "questions": [
    {
      "question_text": "What is the general formula for alkanes?",
      "options": ["C<sub>n</sub>H<sub>2n</sub>", "C<sub>n</sub>H<sub>2n+2</sub>"],
      "correct_answer_index": 1,
      "explanation": "Alkanes are saturated hydrocarbons wi`
  },
  {
    name: "Missing closing brace",
    json: `{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "This quiz tests your understanding",
  "questions": [
    {
      "question_text": "What is the general formula?",
      "options": ["A", "B"],
      "correct_answer_index": 1
    }
  ]`
  },
  {
    name: "Trailing comma",
    json: `{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "This quiz tests your understanding",
  "questions": [
    {
      "question_text": "What is the general formula?",
      "options": ["A", "B"],
      "correct_answer_index": 1,
    }
  ],
}`
  }
];

async function testJsonFixes() {
  console.log('🧪 Testing JSON Fix Logic\n');
  
  const geminiService = new GeminiService();
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log('=' + '='.repeat(testCase.name.length + 10));
    
    try {
      // Test the smart JSON fix directly
      const fixed = geminiService._smartJsonFix(testCase.json);
      
      // Try to parse the fixed JSON
      const parsed = JSON.parse(fixed);
      
      console.log('✅ SUCCESS - JSON fixed and parsed');
      console.log(`   Title: ${parsed.title || 'N/A'}`);
      console.log(`   Questions: ${parsed.questions ? parsed.questions.length : 0}`);
      console.log(`   Fixed length: ${fixed.length} chars`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      
      // Try the fallback
      try {
        const fallback = geminiService._createFallbackJson(testCase.json, error.message);
        const parsed = JSON.parse(fallback);
        console.log('🔄 FALLBACK SUCCESS');
        console.log(`   Title: ${parsed.title}`);
        console.log(`   Error: ${parsed.error}`);
      } catch (fallbackError) {
        console.log(`💥 FALLBACK ALSO FAILED: ${fallbackError.message}`);
      }
    }
    
    console.log('');
  }
}

// Test the cleanup method directly
function testCleanupMethod() {
  console.log('🔧 Testing _cleanupJsonString method\n');
  
  const geminiService = new GeminiService();
  
  const problematicJson = `{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "This quiz tests your understanding of key organic chemistry concepts.",
  "difficulty_level": 3,
  "time_limit_minutes": 20,
  "question`;
  
  try {
    const cleaned = geminiService._cleanupJsonString(problematicJson);
    const parsed = JSON.parse(cleaned);
    console.log('✅ Cleanup method SUCCESS');
    console.log('Cleaned JSON:', cleaned);
  } catch (error) {
    console.log('❌ Cleanup method FAILED:', error.message);
  }
}

// Run tests
async function runAllTests() {
  try {
    await testJsonFixes();
    testCleanupMethod();
    console.log('🏁 All tests completed');
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

runAllTests();
