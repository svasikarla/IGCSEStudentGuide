/**
 * Test script for quiz generation with improved JSON handling
 */

const GeminiService = require('./services/geminiService');

async function testQuizGeneration() {
  console.log('🧪 Testing Quiz Generation with Improved JSON Handling\n');
  
  try {
    const geminiService = new GeminiService();
    
    const prompt = `Generate a quiz for IGCSE Chemistry on the topic "Organic Chemistry Basics".

Create 3 multiple choice questions covering:
1. Alkanes and their properties
2. Functional groups
3. Basic organic reactions

Return JSON format:
{
  "title": "Quiz: IGCSE Organic Chemistry",
  "description": "Brief description",
  "difficulty_level": 3,
  "time_limit_minutes": 15,
  "questions": [
    {
      "question_text": "Question text here",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer_index": 1,
      "explanation": "Brief explanation"
    }
  ]
}`;

    console.log('📝 Generating quiz with Gemini...');
    
    const result = await geminiService.generateJSON(prompt, {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 2000
    });
    
    console.log('✅ Quiz generation successful!');
    console.log(`📊 Results:`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Questions: ${result.questions ? result.questions.length : 0}`);
    console.log(`   Difficulty: ${result.difficulty_level}`);
    console.log(`   Time limit: ${result.time_limit_minutes} minutes`);
    
    if (result.questions && result.questions.length > 0) {
      console.log('\n📋 Sample Question:');
      const firstQ = result.questions[0];
      console.log(`   Q: ${firstQ.question_text}`);
      console.log(`   Options: ${firstQ.options ? firstQ.options.length : 0}`);
      console.log(`   Correct: ${firstQ.correct_answer_index}`);
      console.log(`   Explanation: ${firstQ.explanation ? firstQ.explanation.substring(0, 100) + '...' : 'N/A'}`);
    }
    
    // Test if it's valid JSON by stringifying and parsing again
    const jsonString = JSON.stringify(result);
    const reparsed = JSON.parse(jsonString);
    console.log('\n✅ JSON validation successful - can be stringified and reparsed');
    
  } catch (error) {
    console.error('❌ Quiz generation failed:', error.message);
    console.error('Error details:', error);
  }
}

async function testMultipleGenerations() {
  console.log('\n🔄 Testing Multiple Generations for Consistency\n');
  
  const geminiService = new GeminiService();
  const successCount = { value: 0 };
  const totalTests = 3;
  
  for (let i = 1; i <= totalTests; i++) {
    console.log(`📝 Test ${i}/${totalTests}: Generating simple quiz...`);
    
    try {
      const result = await geminiService.generateJSON(`Generate a simple 2-question IGCSE Math quiz on algebra.

Return JSON:
{
  "title": "Algebra Quiz",
  "questions": [
    {
      "question_text": "Question here",
      "options": ["A", "B", "C", "D"],
      "correct_answer_index": 0,
      "explanation": "Brief explanation"
    }
  ]
}`, {
        maxTokens: 1500,
        temperature: 0.5
      });
      
      if (result && result.title && result.questions) {
        console.log(`   ✅ Success - ${result.questions.length} questions generated`);
        successCount.value++;
      } else {
        console.log(`   ⚠️  Partial success - missing expected fields`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount.value}/${totalTests} successful generations`);
  const successRate = (successCount.value / totalTests * 100).toFixed(1);
  console.log(`📈 Success rate: ${successRate}%`);
}

// Run tests
async function runTests() {
  try {
    await testQuizGeneration();
    await testMultipleGenerations();
    console.log('\n🏁 All tests completed');
  } catch (error) {
    console.error('💥 Test suite error:', error);
  }
}

runTests();
