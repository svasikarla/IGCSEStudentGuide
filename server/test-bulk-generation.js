/**
 * Test script to simulate bulk content generation and identify JSON parsing issues
 */
const GeminiService = require('./services/geminiService');

async function testBulkGeneration() {
  console.log('🚀 Testing Bulk Content Generation Scenarios...\n');
  
  try {
    const geminiService = new GeminiService();
    
    // Simulate multiple rapid requests like the bulk generator would make
    const topics = [
      'Quadratic Equations',
      'Chemical Bonding',
      'Electromagnetic Waves',
      'Photosynthesis',
      'Atomic Structure'
    ];

    console.log('📝 Simulating Bulk Generation for 5 Topics...\n');

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`🔄 Generating content for: ${topic} (${i + 1}/${topics.length})`);
      
      const prompt = `Generate comprehensive educational content for IGCSE topic "${topic}".

Return a JSON object with this exact structure:
{
  "title": "${topic}",
  "description": "Brief description of the topic",
  "content": "Detailed educational content with examples and explanations",
  "difficulty_level": 3,
  "learning_objectives": ["objective 1", "objective 2", "objective 3"]
}

Make the content detailed and educational, including examples and explanations.`;

      try {
        const startTime = Date.now();
        const result = await geminiService.generateJSON(prompt, {
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 3000
        });
        const duration = Date.now() - startTime;
        
        console.log(`  ✅ SUCCESS (${duration}ms)`);
        console.log(`  📊 Content length: ${result.content?.length || 0} chars`);
        console.log(`  🎯 Keys: ${Object.keys(result).join(', ')}`);
        
        // Validate the structure
        if (!result.title || !result.description || !result.content) {
          console.log(`  ⚠️  WARNING: Missing required fields`);
        }
        
      } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        
        // Log detailed error information for analysis
        if (error.message.includes('JSON')) {
          console.log(`  🔍 JSON Error Details:`);
          console.log(`     Error: ${error.message}`);
          if (error.stack) {
            console.log(`     Stack: ${error.stack.split('\n')[0]}`);
          }
        }
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test with problematic content that might cause JSON issues
    console.log('🧪 Testing Problematic Content Scenarios...\n');

    const problematicScenarios = [
      {
        name: 'Chemistry with Formulas',
        topic: 'Chemical Equations',
        extraInstructions: 'Include chemical formulas like H2SO4, NaOH, and equations with arrows (→).'
      },
      {
        name: 'Physics with Math',
        topic: 'Wave Equations',
        extraInstructions: 'Include mathematical equations with symbols like λ, ν, and formulas like v = fλ.'
      },
      {
        name: 'Content with Quotes',
        topic: 'Literature Analysis',
        extraInstructions: 'Include quoted text like "To be or not to be" and analysis with nested quotes.'
      }
    ];

    for (const scenario of problematicScenarios) {
      console.log(`🔬 Testing: ${scenario.name}`);
      
      const prompt = `Generate educational content for "${scenario.topic}". ${scenario.extraInstructions}

Return JSON with:
{
  "title": "${scenario.topic}",
  "description": "Description with special characters and formulas",
  "content": "Detailed content with the requested special elements",
  "difficulty_level": 4,
  "learning_objectives": ["Learn formulas", "Understand concepts", "Apply knowledge"]
}`;

      try {
        const result = await geminiService.generateJSON(prompt, {
          model: 'gemini-1.5-flash',
          temperature: 0.8,
          maxTokens: 2500
        });
        
        console.log(`  ✅ ${scenario.name} SUCCESS`);
        console.log(`  📝 Description preview: ${result.description?.substring(0, 80)}...`);
        
      } catch (error) {
        console.log(`  ❌ ${scenario.name} FAILED: ${error.message}`);
        
        // Detailed error analysis
        if (error.message.includes('Unexpected end of JSON input')) {
          console.log(`  🔍 TRUNCATION ERROR detected`);
        } else if (error.message.includes('Unterminated string')) {
          console.log(`  🔍 STRING TERMINATION ERROR detected`);
        } else if (error.message.includes('Unexpected token')) {
          console.log(`  🔍 MALFORMED JSON ERROR detected`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

  } catch (initError) {
    console.error('❌ Failed to initialize Gemini service:', initError.message);
  }
}

// Run the test
testBulkGeneration().then(() => {
  console.log('\n🏁 Bulk generation testing completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});
