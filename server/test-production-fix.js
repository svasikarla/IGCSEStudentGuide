/**
 * Test the enhanced JSON repair logic with real Gemini API calls
 * This will test the actual production scenario
 */

require('dotenv').config();
const GeminiService = require('./services/geminiService');

// Initialize with real API key
const geminiService = new GeminiService(process.env.GOOGLE_API_KEY);

/**
 * Test with content that previously caused truncation issues
 */
async function testProductionScenarios() {
  console.log('🧪 Testing Enhanced JSON Repair with Real Gemini API\n');
  
  const testPrompts = [
    {
      name: 'Long Physics Content (Wave Phenomena)',
      prompt: `Generate comprehensive educational content for IGCSE Physics topic: "Wave Phenomena: Diffraction of Waves". 

Include:
- Detailed explanation of wave diffraction
- Mathematical relationships and formulas
- Real-world examples and applications
- Common misconceptions and how to address them
- Practice problems with solutions
- Key learning objectives
- Difficulty assessment

Format as JSON with fields: title, description, content, difficulty_level, learning_objectives, key_concepts, practice_problems.`
    },
    {
      name: 'Long Physics Content (Forces)',
      prompt: `Generate comprehensive educational content for IGCSE Physics topic: "Newton's Laws of Motion: Mastering Resultant Forces".

Include:
- Detailed explanation of resultant forces
- Vector addition techniques
- Newton's laws applications
- Worked examples with diagrams
- Common student errors
- Assessment criteria
- Extension activities

Format as JSON with fields: title, description, content, difficulty_level, learning_objectives, key_concepts, practice_problems.`
    },
    {
      name: 'Long Physics Content (Energy)',
      prompt: `Generate comprehensive educational content for IGCSE Physics topic: "Energy Changes During Motion: Kinetic and Potential Energy".

Include:
- Energy transformation principles
- Mathematical calculations
- Conservation of energy examples
- Real-world applications
- Laboratory investigations
- Assessment rubrics
- Cross-curricular connections

Format as JSON with fields: title, description, content, difficulty_level, learning_objectives, key_concepts, practice_problems.`
    }
  ];
  
  let successCount = 0;
  let totalTests = testPrompts.length;
  
  for (const test of testPrompts) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('=' + '='.repeat(test.name.length + 10));
    
    try {
      const startTime = Date.now();
      
      // Use higher token limit to encourage longer responses that might truncate
      const result = await geminiService.generateJSON(test.prompt, {
        maxTokens: 3000,
        temperature: 0.3
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Generation time: ${duration}ms`);
      
      // Validate the result structure
      const requiredFields = ['title', 'description', 'content'];
      const missingFields = requiredFields.filter(field => !result[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present');
        console.log(`   📝 Title: ${result.title.substring(0, 60)}...`);
        console.log(`   📄 Description length: ${result.description.length} chars`);
        console.log(`   📚 Content length: ${result.content.length} chars`);
        
        if (result.difficulty_level) {
          console.log(`   🎯 Difficulty: ${result.difficulty_level}`);
        }
        
        if (result.learning_objectives) {
          console.log(`   🎓 Learning objectives: ${Array.isArray(result.learning_objectives) ? result.learning_objectives.length : 'Present'}`);
        }
        
        successCount++;
      } else {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error type: ${error.constructor.name}`);
    }
  }
  
  console.log(`\n📊 Production Test Results: ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 All production tests passed! The enhanced JSON repair logic is working correctly in production.');
  } else {
    console.log('⚠️ Some production tests failed. Further investigation may be needed.');
  }
}

/**
 * Test with deliberately problematic content
 */
async function testEdgeCases() {
  console.log('\n🔬 Testing Edge Cases\n');
  
  const edgeCases = [
    {
      name: 'Very Long Content',
      prompt: `Generate extremely detailed educational content for "Electromagnetic Waves and Light" including comprehensive theory, multiple worked examples, detailed explanations, historical context, modern applications, laboratory procedures, safety considerations, assessment criteria, extension activities, cross-curricular links, and common misconceptions. Make it as comprehensive as possible.

Format as JSON with: title, description, content, difficulty_level, learning_objectives.`
    },
    {
      name: 'Content with Special Characters',
      prompt: `Generate educational content about "Chemical Equations and Reactions" including:
- Equations with symbols like H₂SO₄, NaOH, Ca(OH)₂
- Mathematical expressions with Greek letters (α, β, γ, λ, μ)
- Quotes and apostrophes: "reaction rates", student's understanding
- Special punctuation: em-dashes—like this, ellipses...

Format as JSON with: title, description, content.`
    }
  ];
  
  for (const test of edgeCases) {
    console.log(`\n🧪 Edge Case: ${test.name}`);
    
    try {
      const result = await geminiService.generateJSON(test.prompt, {
        maxTokens: 4000,
        temperature: 0.2
      });
      
      console.log('✅ Successfully generated and parsed JSON');
      console.log(`   Content length: ${result.content ? result.content.length : 0} chars`);
      
    } catch (error) {
      console.log(`❌ Edge case failed: ${error.message}`);
    }
  }
}

// Run the tests
if (require.main === module) {
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  testProductionScenarios()
    .then(() => testEdgeCases())
    .then(() => {
      console.log('\n✅ All production testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Production test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testProductionScenarios, testEdgeCases };
