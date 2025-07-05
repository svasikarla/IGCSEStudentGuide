/**
 * Test script to validate the enhanced JSON truncation handling
 * This tests the specific error patterns found in the production logs
 */

const GeminiService = require('./services/geminiService');

// Mock the Google AI SDK for testing
const mockGenAI = {
  getGenerativeModel: () => ({
    generateContent: async () => ({
      response: {
        text: () => mockResponse
      }
    })
  })
};

let mockResponse = '';

// Initialize service with mock
const geminiService = new GeminiService('test-key');
geminiService.genAI = mockGenAI;

/**
 * Test cases based on actual error logs
 */
const testCases = [
  {
    name: 'Unterminated String - Wave Phenomena',
    response: `{
  "title": "Wave Phenomena: Diffraction of Waves",
  "description": "This topic explores the bending of waves as they pass through an opening or around an obstacle.  It explains how diffraction depends on the wavelength and size of the obstacle.",
  "content": "## Wave Phenomena: Diffraction of Waves\\n\\nDiffraction is the spreading out of waves as they pass through an aperture (opening) or around an obstacle.  All types of waves – water waves, sound waves, and light waves – can be diffracted. The a`,
    expectedError: 'Unterminated string in JSON'
  },
  {
    name: 'Unterminated String - Newton\'s Laws',
    response: `{
  "title": "Newton's Laws of Motion: Mastering Resultant Forces",
  "description": "This topic explores how to calculate resultant forces using vector addition, applying Newton's First and Second Laws to understand motion and equilibrium.",
  "content": "## Newton's Laws of Motion: Mastering Resultant Forces\\n\\nThis section delves into calculating resultant forces, a crucial aspect of understanding motion governed by Newton's Laws.  We'll focus on applying vector addition techniques to solve proble`,
    expectedError: 'Unterminated string in JSON'
  },
  {
    name: 'Unexpected End of JSON - Energy Changes',
    response: `{
  "title": "Energy Changes During Motion: Kinetic and Potential Energy",
  "description": "This topic explores the relationship between the movement of objects and their energy, focusing on kinetic and potential energy and the conversions between them.",
  "content": "## Energy Changes During Motion: Kinetic and Potential Energy\\n\\nThis topic investigates how energy transforms between **kinetic energy** (energy of motion) and **potential energy** (stored energy) during the movement of objects.  Und`,
    expectedError: 'Unexpected end of JSON input'
  },
  {
    name: 'Malformed JSON with Extra Brace',
    response: `{
  "title": "Energy Changes During Motion: Kinetic and Potential Energy",
  "description": "This topic explores the relationship between the movement of objects and their energy, focusing on kinetic and potential energy and the conversions between them.",
  "content": "Content here with proper motion.",}`,
    expectedError: 'Unexpected token'
  }
];

/**
 * Run all test cases
 */
async function runTests() {
  console.log('🧪 Testing Enhanced JSON Truncation Handling\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`Expected Error: ${testCase.expectedError}`);
    console.log(`Response Length: ${testCase.response.length} chars`);
    
    try {
      // Set the mock response
      mockResponse = testCase.response;
      
      // Test the original response (should fail)
      let originalFailed = false;
      try {
        JSON.parse(testCase.response);
      } catch (error) {
        originalFailed = true;
        console.log(`✅ Original response fails as expected: ${error.message.substring(0, 50)}...`);
      }
      
      if (!originalFailed) {
        console.log(`❌ Original response should have failed but didn't`);
        continue;
      }
      
      // Test our enhanced JSON generation
      const result = await geminiService.generateJSON('Test prompt for ' + testCase.name);
      
      // Validate the result
      if (result && typeof result === 'object') {
        console.log(`✅ Successfully parsed JSON!`);
        console.log(`   Title: ${result.title ? result.title.substring(0, 50) + '...' : 'Missing'}`);
        console.log(`   Description: ${result.description ? 'Present' : 'Missing'}`);
        console.log(`   Content: ${result.content ? 'Present' : 'Missing'}`);
        passedTests++;
      } else {
        console.log(`❌ Failed to parse JSON or invalid result`);
      }
      
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Enhanced JSON repair logic is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. The JSON repair logic needs further improvement.');
  }
}

/**
 * Test individual repair methods
 */
async function testRepairMethods() {
  console.log('\n🔧 Testing Individual Repair Methods\n');
  
  const testString = `{
  "title": "Test Title",
  "description": "Test description with unterminated content`;
  
  console.log('Original:', testString);
  console.log('Length:', testString.length);
  
  // Test truncation detection
  const isTruncated = geminiService._isResponseTruncated(testString);
  console.log('Is Truncated:', isTruncated);
  
  // Test truncation handling
  const handled = geminiService._handleTruncatedResponse(testString);
  console.log('After Truncation Handling:', handled);
  
  // Test unterminated string fixing
  const fixed = geminiService._fixUnterminatedStrings(handled);
  console.log('After String Fixing:', fixed);
  
  // Test final parsing
  try {
    const parsed = JSON.parse(fixed);
    console.log('✅ Successfully parsed:', parsed);
  } catch (error) {
    console.log('❌ Still failed to parse:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => testRepairMethods())
    .then(() => {
      console.log('\n✅ Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testRepairMethods };
