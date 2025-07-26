/**
 * Test script for enhanced Hugging Face JSON fixing
 * Tests the specific error patterns we're encountering
 */

const HuggingFaceService = require('./services/huggingFaceService');

// Test cases based on actual error patterns
const testCases = [
  {
    name: "Expected ':' after property name (actual error)",
    json: `{
  "title": "IGCSE Chemistry (0620) - Oxidation and Reduction Reactions",
  "description": "This exam paper covers the topic of Oxidation and Reduction Reactions, including the definition, examples,",
  "questions": [
    {
      "question_text": "What is oxidation?",
      "options": ["Loss of electrons", "Gain of electrons", "Loss of protons", "Gain of protons"],
      correct_answer_index: 0,
      "explanation": "Oxidation is the loss of electrons"
    }
  ]
}`
  },
  {
    name: "Multiple unquoted property names",
    json: `{
  title: "Chemistry Quiz",
  description: "Test on redox reactions",
  difficulty_level: 3,
  time_limit_minutes: 20,
  questions: [
    {
      question_text: "Define reduction",
      options: ["A", "B", "C", "D"],
      correct_answer_index: 1,
      explanation: "Reduction is gain of electrons"
    }
  ]
}`
  },
  {
    name: "Mixed quoted and unquoted properties",
    json: `{
  "title": "IGCSE Chemistry Quiz",
  description: "Covers oxidation and reduction",
  "difficulty_level": 3,
  time_limit_minutes: 30,
  "questions": [
    {
      "question_text": "What happens during oxidation?",
      options: ["Electrons lost", "Electrons gained"],
      "correct_answer_index": 0,
      explanation: "Oxidation involves loss of electrons"
    }
  ]
}`
  },
  {
    name: "Property names with special characters",
    json: `{
  "title": "Chemistry Test",
  "description": "Redox reactions test",
  difficulty-level: 3,
  time_limit_minutes: 25,
  question-count: 5,
  "questions": [
    {
      question_text: "Define oxidation state",
      answer_options: ["A", "B", "C"],
      correct-answer: 0
    }
  ]
}`
  },
  {
    name: "Missing commas and colons",
    json: `{
  "title" "Chemistry Quiz"
  "description": "Test on redox"
  difficulty_level: 3
  "questions": [
    {
      "question_text" "What is reduction?"
      "options": ["A", "B"]
      correct_answer_index: 1
    }
  ]
}`
  }
];

async function testEnhancedFixes() {
  console.log('🧪 Testing Enhanced Hugging Face JSON Fixes\n');
  
  // Create a mock service for testing
  const hfService = {
    _smartJsonFix: HuggingFaceService.prototype._smartJsonFix,
    _preProcessJson: HuggingFaceService.prototype._preProcessJson,
    _postProcessJson: HuggingFaceService.prototype._postProcessJson,
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues,
    _truncateToLastCompleteProperty: HuggingFaceService.prototype._truncateToLastCompleteProperty,
    _ensureProperClosure: HuggingFaceService.prototype._ensureProperClosure,
    _isInsideString: HuggingFaceService.prototype._isInsideString,
    _createFallbackJson: HuggingFaceService.prototype._createFallbackJson
  };
  
  let successCount = 0;
  let fallbackCount = 0;
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log('=' + '='.repeat(testCase.name.length + 10));
    
    try {
      // Apply the enhanced smart fix
      const fixed = hfService._smartJsonFix(testCase.json);
      
      // Try to parse the fixed JSON
      const parsed = JSON.parse(fixed);
      
      console.log('✅ SUCCESS - JSON fixed and parsed');
      console.log(`   Title: ${parsed.title || 'N/A'}`);
      console.log(`   Questions: ${parsed.questions ? parsed.questions.length : 0}`);
      console.log(`   Fixed length: ${fixed.length} chars`);
      
      // Validate the structure
      if (parsed.title && parsed.questions && Array.isArray(parsed.questions)) {
        console.log('   ✅ Structure validation passed');
        successCount++;
      } else {
        console.log('   ⚠️  Structure validation failed - missing required fields');
      }
      
    } catch (error) {
      console.log(`❌ SMART FIX FAILED: ${error.message}`);
      
      // Try the fallback
      try {
        const fallback = hfService._createFallbackJson(testCase.json, error.message);
        const parsed = JSON.parse(fallback);
        console.log('🔄 FALLBACK SUCCESS');
        console.log(`   Title: ${parsed.title}`);
        console.log(`   Error: ${parsed.error}`);
        console.log(`   Provider: ${parsed.provider}`);
        fallbackCount++;
      } catch (fallbackError) {
        console.log(`💥 FALLBACK ALSO FAILED: ${fallbackError.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Smart Fix Successes: ${successCount}/${testCases.length}`);
  console.log(`🔄 Fallback Used: ${fallbackCount}/${testCases.length}`);
  console.log(`❌ Total Failures: ${testCases.length - successCount - fallbackCount}/${testCases.length}`);
  
  const successRate = ((successCount + fallbackCount) / testCases.length * 100).toFixed(1);
  console.log(`📈 Overall Success Rate: ${successRate}%`);
}

// Test specific string fixing methods
function testStringFixing() {
  console.log('\n🔤 Testing Enhanced String Fixing Methods\n');
  
  const hfService = {
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues,
    _isInsideString: HuggingFaceService.prototype._isInsideString
  };
  
  const stringTests = [
    'correct_answer_index: 0',  // Unquoted property name
    'difficulty_level: 3',      // Another unquoted property
    '"title" "Chemistry Quiz"', // Missing colon
    'question-count: 5',        // Property with dash
    'time_limit_minutes: 20',   // Underscore property
  ];
  
  stringTests.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test}`);
    try {
      const fixed = hfService._fixCommonStringIssues(`{${test}}`);
      console.log(`   Fixed: ${fixed}`);
      JSON.parse(fixed);
      console.log('   ✅ Valid JSON after fix');
    } catch (error) {
      console.log(`   ❌ Still invalid: ${error.message}`);
    }
    console.log('');
  });
}

// Test the actual error case
function testActualErrorCase() {
  console.log('\n🎯 Testing Actual Error Case from Logs\n');
  
  const hfService = {
    _smartJsonFix: HuggingFaceService.prototype._smartJsonFix,
    _fixCommonStringIssues: HuggingFaceService.prototype._fixCommonStringIssues,
    _preProcessJson: HuggingFaceService.prototype._preProcessJson,
    _postProcessJson: HuggingFaceService.prototype._postProcessJson,
    _truncateToLastCompleteProperty: HuggingFaceService.prototype._truncateToLastCompleteProperty,
    _ensureProperClosure: HuggingFaceService.prototype._ensureProperClosure,
    _isInsideString: HuggingFaceService.prototype._isInsideString
  };
  
  // Simulate the actual problematic JSON from the logs
  const problematicJson = `{
  "title": "IGCSE Chemistry (0620) - Oxidation and Reduction Reactions",
  "description": "This exam paper covers the topic of Oxidation and Reduction Reactions, including the definition, examples,",
  "questions": [
    {
      "question_text": "What is oxidation?",
      "options": ["Loss of electrons", "Gain of electrons"],
      correct_answer_index: 0,
      "explanation": "Oxidation is the loss of electrons"
    },
    {
      "question_text": "What is reduction?",
      options: ["Loss of electrons", "Gain of electrons"],
      "correct_answer_index": 1,
      explanation: "Reduction is the gain of electrons"
    }
  ]
}`;
  
  console.log('📝 Testing problematic JSON from actual logs...');
  console.log('Original length:', problematicJson.length, 'chars');
  
  try {
    const fixed = hfService._smartJsonFix(problematicJson);
    console.log('Fixed length:', fixed.length, 'chars');
    
    const parsed = JSON.parse(fixed);
    console.log('✅ SUCCESS - Actual error case fixed!');
    console.log('Result:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log('❌ FAILED to fix actual error case:', error.message);
    console.log('Error position:', error.message.match(/position (\d+)/)?.[1] || 'unknown');
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testEnhancedFixes();
    testStringFixing();
    testActualErrorCase();
    console.log('\n🏁 All enhanced JSON fix tests completed');
  } catch (error) {
    console.error('💥 Test suite error:', error);
  }
}

runAllTests();
