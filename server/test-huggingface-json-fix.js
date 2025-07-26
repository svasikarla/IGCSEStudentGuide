/**
 * Test script for Hugging Face JSON fixing logic
 */

const HuggingFaceService = require('./services/huggingFaceService');

// Test cases with common JSON issues from Hugging Face
const testCases = [
  {
    name: "Property name without quotes (common HF issue)",
    json: `{
  "title": "IGCSE Chemistry (0620) Organic Chemistry Exam",
  "description": "This exam covers the topic of Organic Chemistry",
  difficulty_level: 3,
  "questions": [
    {
      "question_text": "What is the general formula for alkanes?",
      "options": ["A", "B", "C", "D"],
      "correct_answer_index": 1
    }
  ]
}`
  },
  {
    name: "Truncated mid-property",
    json: `{
  "title": "IGCSE Chemistry 0620 - Alkanes: Structure and Properties",
  "description": "This examination paper covers the structure and properties of alkanes, including their bonding, physical and`
  },
  {
    name: "Unterminated string with special characters",
    json: `{
  "title": "IGCSE Chemistry Exam",
  "description": "This exam covers organic chemistry including C-H bonds and "alkanes" which are`
  },
  {
    name: "Missing closing braces",
    json: `{
  "title": "Chemistry Quiz",
  "questions": [
    {
      "question_text": "What is methane?",
      "options": ["CH4", "C2H6", "C3H8", "C4H10"],
      "correct_answer_index": 0,
      "explanation": "Methane is the simplest alkane"
    }
  ]`
  },
  {
    name: "Mixed quote types",
    json: `{
  "title": 'IGCSE Chemistry Quiz',
  "description": "Test on organic chemistry",
  "questions": [
    {
      'question_text': "What is an alkane?",
      "options": ["Saturated hydrocarbon", "Unsaturated hydrocarbon"],
      "correct_answer_index": 0
    }
  ]
}`
  }
];

async function testHuggingFaceJsonFixes() {
  console.log('🧪 Testing Hugging Face JSON Fix Logic\n');
  
  // Create a mock HuggingFace service (without API key for testing)
  const hfService = {
    _cleanupJsonString: HuggingFaceService.prototype._cleanupJsonString,
    _smartJsonFix: HuggingFaceService.prototype._smartJsonFix,
    _truncateToLastCompleteProperty: HuggingFaceService.prototype._truncateToLastCompleteProperty,
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues,
    _ensureProperClosure: HuggingFaceService.prototype._ensureProperClosure,
    _createFallbackJson: HuggingFaceService.prototype._createFallbackJson
  };
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log('=' + '='.repeat(testCase.name.length + 10));
    
    try {
      // Test the cleanup method first
      const cleaned = hfService._cleanupJsonString(testCase.json);
      
      // If cleanup didn't fix it, try smart fix
      let fixed = cleaned;
      try {
        JSON.parse(cleaned);
        console.log('✅ SUCCESS - Cleanup method fixed the JSON');
      } catch (cleanupError) {
        console.log('🔧 Cleanup failed, trying smart fix...');
        fixed = hfService._smartJsonFix(cleaned);
      }
      
      // Try to parse the final result
      const parsed = JSON.parse(fixed);
      
      console.log('✅ FINAL SUCCESS - JSON fixed and parsed');
      console.log(`   Title: ${parsed.title || 'N/A'}`);
      console.log(`   Questions: ${parsed.questions ? parsed.questions.length : 0}`);
      console.log(`   Fixed length: ${fixed.length} chars`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      
      // Try the fallback
      try {
        const fallback = hfService._createFallbackJson(testCase.json, error.message);
        const parsed = JSON.parse(fallback);
        console.log('🔄 FALLBACK SUCCESS');
        console.log(`   Title: ${parsed.title}`);
        console.log(`   Error: ${parsed.error}`);
        console.log(`   Provider: ${parsed.provider}`);
      } catch (fallbackError) {
        console.log(`💥 FALLBACK ALSO FAILED: ${fallbackError.message}`);
      }
    }
    
    console.log('');
  }
}

// Test specific HF issues
function testSpecificHFIssues() {
  console.log('🔧 Testing Specific Hugging Face Issues\n');
  
  const hfService = {
    _smartJsonFix: HuggingFaceService.prototype._smartJsonFix,
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues
  };
  
  // Test the specific error from the logs
  const problematicJson = `{
  "title": "IGCSE Chemistry (0620) Organic Chemistry Exam",
  "description": "This exam covers the topic of Organic Chemistry, including alkanes, alkenes, alkynes, and aromatic compounds, as well as
  difficulty_level: 3,
  "time_limit_minutes": 60`;
  
  console.log('📋 Testing actual error case from logs...');
  
  try {
    const fixed = hfService._smartJsonFix(problematicJson);
    const parsed = JSON.parse(fixed);
    console.log('✅ SUCCESS - Fixed the actual error case');
    console.log('Fixed JSON:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log('❌ FAILED to fix actual error case:', error.message);
  }
}

// Test the string fixing specifically
function testStringFixing() {
  console.log('\n🔤 Testing String Issue Fixing\n');
  
  const hfService = {
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues
  };
  
  const stringIssues = [
    'difficulty_level: 3',  // Unquoted property name
    '"description": "Text with "quotes" inside"',  // Unescaped quotes
    '"property": "value",}',  // Trailing comma
  ];
  
  stringIssues.forEach((issue, index) => {
    console.log(`Test ${index + 1}: ${issue}`);
    try {
      const fixed = hfService._fixCommonStringIssues(`{${issue}}`);
      console.log(`   Fixed: ${fixed}`);
      JSON.parse(fixed);
      console.log('   ✅ Valid JSON after fix');
    } catch (error) {
      console.log(`   ❌ Still invalid: ${error.message}`);
    }
    console.log('');
  });
}

// Run all tests
async function runAllTests() {
  try {
    await testHuggingFaceJsonFixes();
    testSpecificHFIssues();
    testStringFixing();
    console.log('🏁 All Hugging Face JSON fix tests completed');
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

runAllTests();
