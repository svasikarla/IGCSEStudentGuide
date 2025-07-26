/**
 * Simple test for Hugging Face JSON fixing
 */

console.log('🧪 Testing Hugging Face JSON Fixes...');

try {
  const HuggingFaceService = require('./services/huggingFaceService');
  console.log('✅ HuggingFaceService loaded successfully');
  
  // Create a test instance (without API key)
  const testJson = `{
  "title": "Test Quiz",
  difficulty_level: 3,
  "questions": [
    {
      "text": "What is H2O?",
      "answer": "Water"
    }
  ]`;
  
  console.log('📝 Testing JSON with unquoted property name...');
  console.log('Original:', testJson.substring(0, 100) + '...');
  
  // Test the methods directly
  const service = new HuggingFaceService();
  
  try {
    const cleaned = service._cleanupJsonString(testJson);
    console.log('✅ Cleanup completed');
    
    try {
      const parsed = JSON.parse(cleaned);
      console.log('✅ JSON parsed successfully after cleanup');
      console.log('Result:', JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.log('🔧 Parse failed, trying smart fix...');
      const fixed = service._smartJsonFix(cleaned);
      console.log('Fixed JSON:', fixed.substring(0, 200) + '...');
      
      try {
        const parsed = JSON.parse(fixed);
        console.log('✅ JSON parsed successfully after smart fix');
        console.log('Result:', JSON.stringify(parsed, null, 2));
      } catch (finalError) {
        console.log('❌ Smart fix failed:', finalError.message);
        
        // Try fallback
        const fallback = service._createFallbackJson(testJson, finalError.message);
        console.log('🔄 Using fallback:', fallback);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
  
} catch (error) {
  console.error('❌ Failed to load HuggingFaceService:', error.message);
}

console.log('🏁 Test completed');
