/**
 * Test script to reproduce Gemini JSON parsing failures
 */
const GeminiService = require('./services/geminiService');

async function testGeminiJsonGeneration() {
  console.log('🧪 Testing Gemini JSON Generation...\n');
  
  try {
    const geminiService = new GeminiService();
    
    // Test case 1: Simple educational content generation
    console.log('📝 Test 1: Simple Topic Content Generation');
    const simplePrompt = `Generate educational content for the IGCSE Mathematics topic "Quadratic Equations". 

Return a JSON object with the following structure:
{
  "title": "Topic title",
  "description": "Brief description",
  "content": "Detailed educational content with examples",
  "difficulty_level": 3,
  "learning_objectives": ["objective 1", "objective 2"]
}`;

    try {
      const result1 = await geminiService.generateJSON(simplePrompt, {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2000
      });
      console.log('✅ Test 1 SUCCESS');
      console.log('Result keys:', Object.keys(result1));
      console.log('Content length:', result1.content?.length || 0);
    } catch (error) {
      console.log('❌ Test 1 FAILED:', error.message);
      console.log('Error details:', error);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test case 2: Complex content with potential problematic characters
    console.log('📝 Test 2: Complex Content with Special Characters');
    const complexPrompt = `Generate educational content for IGCSE Chemistry topic "Acids and Bases". Include chemical equations, pH values, and examples with quotes.

Return a JSON object with:
{
  "title": "Topic title",
  "description": "Description with \"quoted\" text and chemical formulas like H2SO4",
  "content": "Detailed content with equations like: HCl + NaOH → NaCl + H2O, and pH values",
  "difficulty_level": 4,
  "learning_objectives": ["Learn about acids", "Understand pH scale", "Master neutralization"]
}`;

    try {
      const result2 = await geminiService.generateJSON(complexPrompt, {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 3000
      });
      console.log('✅ Test 2 SUCCESS');
      console.log('Result keys:', Object.keys(result2));
      console.log('Description preview:', result2.description?.substring(0, 100) + '...');
    } catch (error) {
      console.log('❌ Test 2 FAILED:', error.message);
      console.log('Error details:', error);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test case 3: Large content generation (likely to trigger truncation)
    console.log('📝 Test 3: Large Content Generation (Truncation Test)');
    const largePrompt = `Generate comprehensive educational content for IGCSE Physics topic "Electromagnetic Waves". Include detailed explanations, multiple examples, equations, and practical applications.

Return a JSON object with:
{
  "title": "Electromagnetic Waves",
  "description": "Comprehensive description of electromagnetic waves",
  "content": "Very detailed content covering: wave properties, electromagnetic spectrum, applications in technology, mathematical relationships, real-world examples, and practical exercises",
  "difficulty_level": 5,
  "learning_objectives": ["Understand wave properties", "Learn electromagnetic spectrum", "Apply wave equations", "Analyze real applications"]
}

Make the content very comprehensive and detailed.`;

    try {
      const result3 = await geminiService.generateJSON(largePrompt, {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 4000
      });
      console.log('✅ Test 3 SUCCESS');
      console.log('Result keys:', Object.keys(result3));
      console.log('Content length:', result3.content?.length || 0);
    } catch (error) {
      console.log('❌ Test 3 FAILED:', error.message);
      console.log('Error details:', error);
    }

  } catch (initError) {
    console.error('❌ Failed to initialize Gemini service:', initError.message);
  }
}

// Run the test
testGeminiJsonGeneration().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});
