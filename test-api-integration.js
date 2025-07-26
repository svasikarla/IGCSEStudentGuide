/**
 * API Integration Test for Simplified Generation
 * 
 * This script tests the actual API endpoints to ensure they work correctly.
 * Run this after setting up your environment variables.
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// Test configuration
const testConfig = {
  subject: 'Mathematics',
  topicTitle: 'Algebraic Expressions',
  syllabusCode: '0580.2',
  questionCount: 3,
  cardCount: 5,
  costTier: 'minimal'
};

async function testHealthEndpoint() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('   ✅ Health check passed');
      return true;
    } else {
      console.log('   ❌ Health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

async function testCostEstimateEndpoint() {
  console.log('💰 Testing Cost Estimate Endpoint...');
  try {
    const url = `${API_BASE_URL}/simplified-generation/cost-estimate?contentType=quiz&itemCount=${testConfig.questionCount}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ Cost estimate successful');
      console.log(`   📊 Estimated tokens: ${data.estimatedTokens}`);
      console.log(`   💵 Minimal cost: $${data.costs.minimal}`);
      console.log(`   💵 Standard cost: $${data.costs.standard}`);
      console.log(`   💵 Premium cost: $${data.costs.premium}`);
      return true;
    } else {
      console.log('   ❌ Cost estimate failed:', data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Cost estimate error:', error.message);
    return false;
  }
}

async function testQuizGeneration() {
  console.log('🧪 Testing Quiz Generation...');
  try {
    const response = await fetch(`${API_BASE_URL}/simplified-generation/quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testConfig)
    });
    
    const data = await response.json();
    
    if (response.ok && data.questions && data.questions.length > 0) {
      console.log('   ✅ Quiz generation successful');
      console.log(`   📝 Generated ${data.questions.length} questions`);
      console.log(`   💰 Estimated cost: $${data.metadata.estimatedCost}`);
      console.log(`   📋 Sample question: ${data.questions[0].question_text.substring(0, 60)}...`);
      return { success: true, data };
    } else {
      console.log('   ❌ Quiz generation failed:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log('   ❌ Quiz generation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testFlashcardGeneration() {
  console.log('🃏 Testing Flashcard Generation...');
  try {
    const response = await fetch(`${API_BASE_URL}/simplified-generation/flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testConfig,
        cardCount: testConfig.cardCount
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.flashcards && data.flashcards.length > 0) {
      console.log('   ✅ Flashcard generation successful');
      console.log(`   🃏 Generated ${data.flashcards.length} flashcards`);
      console.log(`   💰 Estimated cost: $${data.metadata.estimatedCost}`);
      console.log(`   📋 Sample front: ${data.flashcards[0].front_content.substring(0, 60)}...`);
      return { success: true, data };
    } else {
      console.log('   ❌ Flashcard generation failed:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log('   ❌ Flashcard generation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testExamGeneration() {
  console.log('📄 Testing Exam Paper Generation...');
  try {
    const response = await fetch(`${API_BASE_URL}/simplified-generation/exam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testConfig,
        duration: 60,
        totalMarks: 50,
        costTier: 'standard' // Use standard for exam papers
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.questions && data.questions.length > 0) {
      console.log('   ✅ Exam generation successful');
      console.log(`   📄 Generated ${data.questions.length} exam questions`);
      console.log(`   ⏱️ Duration: ${data.duration_minutes} minutes`);
      console.log(`   🎯 Total marks: ${data.total_marks}`);
      console.log(`   💰 Estimated cost: $${data.metadata.estimatedCost}`);
      return { success: true, data };
    } else {
      console.log('   ❌ Exam generation failed:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log('   ❌ Exam generation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runIntegrationTests() {
  console.log('🚀 Simplified Generation API Integration Tests');
  console.log('==============================================\n');

  console.log('📋 Test Configuration:');
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   Subject: ${testConfig.subject}`);
  console.log(`   Topic: ${testConfig.topicTitle}`);
  console.log(`   Cost Tier: ${testConfig.costTier}\n`);

  const results = {
    health: false,
    costEstimate: false,
    quiz: false,
    flashcards: false,
    exam: false
  };

  // Test health endpoint first
  results.health = await testHealthEndpoint();
  console.log();

  if (!results.health) {
    console.log('❌ Server is not running or not accessible.');
    console.log('   Please start the server with: node server/index.js');
    console.log('   Make sure you have the required environment variables set.');
    return;
  }

  // Test cost estimate endpoint
  results.costEstimate = await testCostEstimateEndpoint();
  console.log();

  // Test content generation endpoints
  const quizResult = await testQuizGeneration();
  results.quiz = quizResult.success;
  console.log();

  const flashcardResult = await testFlashcardGeneration();
  results.flashcards = flashcardResult.success;
  console.log();

  const examResult = await testExamGeneration();
  results.exam = examResult.success;
  console.log();

  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The simplified generation API is working correctly.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Integrate the demo component into your admin panel');
    console.log('   2. Test with real IGCSE content');
    console.log('   3. Compare quality with existing generation');
    console.log('   4. Implement gradual migration strategy');
  } else {
    console.log('⚠️  Some tests failed. Please check the error messages above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure server is running: node server/index.js');
    console.log('   2. Check environment variables (OPENAI_API_KEY, GOOGLE_API_KEY)');
    console.log('   3. Verify API endpoints are accessible');
    console.log('   4. Check server logs for detailed error messages');
  }
}

// Instructions for running the test
function printInstructions() {
  console.log('📖 How to run this test:');
  console.log('========================');
  console.log('1. Set up your environment variables:');
  console.log('   - OPENAI_API_KEY (for GPT models)');
  console.log('   - GOOGLE_API_KEY (for Gemini models)');
  console.log('   - SUPABASE_URL and SUPABASE_SERVICE_KEY (for database)');
  console.log('');
  console.log('2. Start the server:');
  console.log('   node server/index.js');
  console.log('');
  console.log('3. Run this test in another terminal:');
  console.log('   node test-api-integration.js');
  console.log('');
}

// Run the test if this file is executed directly
if (require.main === module) {
  // Check if we should show instructions
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printInstructions();
  } else {
    runIntegrationTests();
  }
}

module.exports = {
  testHealthEndpoint,
  testCostEstimateEndpoint,
  testQuizGeneration,
  testFlashcardGeneration,
  testExamGeneration,
  runIntegrationTests
};
