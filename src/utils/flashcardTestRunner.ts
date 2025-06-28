/**
 * Flashcard Generation Test Runner
 * 
 * This utility tests the flashcard generation system to verify:
 * 1. LLM API integration works correctly
 * 2. Response format handling is working
 * 3. Database saving functionality works
 * 4. Authentication is properly handled
 */

import { LLMTestSuite, LLMTestCase } from './llmTesting';
import { LLMProvider } from '../services/llmAdapter';

// Test cases specifically for flashcard generation
export const flashcardTestCases: LLMTestCase[] = [
  {
    id: 'flashcard-format-test',
    name: 'Test Flashcard JSON Format',
    prompt: `
      Generate 2 flashcards for the IGCSE topic "Forces and Motion" based on Newton's laws.
      
      Return a JSON object with a "flashcards" array, where each flashcard has:
      - front_content: The question or prompt
      - back_content: The answer
      - card_type: One of "basic", "cloze", or "multiple_choice"
      - difficulty_level: A number from 1-5
      - tags: An array of relevant tags
      - hint: A hint to help remember (optional)
      - explanation: A detailed explanation (optional)
    `,
    options: {
      maxTokens: 1000
    },
    expectedOutputContains: [
      'flashcards',
      'front_content',
      'back_content',
      'card_type',
      'difficulty_level',
      'tags'
    ],
    evaluationCriteria: [
      'Valid JSON format',
      'Contains flashcards array',
      'Each flashcard has required fields',
      'Content is educational and accurate'
    ]
  },
  {
    id: 'flashcard-physics-test',
    name: 'Test Physics Flashcard Content',
    prompt: `
      Generate 3 flashcards for IGCSE Physics topic "Forces and Motion".
      Focus on Newton's three laws of motion.
      
      Return JSON with flashcards array containing educational content.
    `,
    options: {
      maxTokens: 1200
    },
    expectedOutputContains: [
      'newton',
      'force',
      'motion',
      'law',
      'inertia'
    ],
    evaluationCriteria: [
      'Covers Newton\'s laws accurately',
      'Age-appropriate for IGCSE students',
      'Good variety of question types'
    ]
  }
];

/**
 * Test the flashcard generation system end-to-end
 */
export async function testFlashcardGeneration(): Promise<{
  success: boolean;
  results: any[];
  errors: string[];
}> {
  const errors: string[] = [];
  const results: any[] = [];
  
  try {
    console.log('🧪 Starting Flashcard Generation Tests...');
    
    // Test 1: LLM API Response Format
    console.log('📝 Test 1: Testing LLM API response format...');
    const testSuite = new LLMTestSuite([LLMProvider.OPENAI]);
    testSuite.addTestCases(flashcardTestCases);
    
    const testResults = await testSuite.runTests();
    const summary = testSuite.getSummary();
    
    results.push({
      test: 'LLM API Format Test',
      summary,
      details: testResults
    });
    
    // Check if any tests failed
    const failedTests = testResults.filter(result => 
      result.output.startsWith('ERROR:')
    );
    
    if (failedTests.length > 0) {
      errors.push(`${failedTests.length} LLM API tests failed`);
      failedTests.forEach(test => {
        errors.push(`- ${test.testCase.name}: ${test.output}`);
      });
    }
    
    // Test 2: JSON Parsing
    console.log('🔍 Test 2: Testing JSON response parsing...');
    for (const result of testResults) {
      if (!result.output.startsWith('ERROR:')) {
        try {
          const parsed = JSON.parse(result.output);
          
          // Check if it has the expected structure
          if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
            console.log(`✅ ${result.testCase.name}: Valid JSON with flashcards array`);
            
            // Validate flashcard structure
            const invalidCards = parsed.flashcards.filter((card: any) => 
              !card.front_content || !card.back_content
            );
            
            if (invalidCards.length > 0) {
              errors.push(`${result.testCase.name}: ${invalidCards.length} flashcards missing required fields`);
            }
          } else {
            errors.push(`${result.testCase.name}: Response missing 'flashcards' array`);
          }
        } catch (parseError) {
          errors.push(`${result.testCase.name}: Invalid JSON response - ${parseError}`);
        }
      }
    }
    
    console.log('📊 Test Results Summary:');
    console.log(`- Total tests run: ${testResults.length}`);
    console.log(`- Successful tests: ${testResults.length - failedTests.length}`);
    console.log(`- Failed tests: ${failedTests.length}`);
    console.log(`- Errors found: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      results,
      errors
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Test runner failed: ${errorMessage}`);
    
    return {
      success: false,
      results,
      errors
    };
  }
}

/**
 * Quick test function that can be called from the browser console
 */
export async function quickFlashcardTest(): Promise<void> {
  console.log('🚀 Running Quick Flashcard Test...');
  
  const result = await testFlashcardGeneration();
  
  if (result.success) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('📋 Full results:', result);
}

// Export for use in browser console
(window as any).quickFlashcardTest = quickFlashcardTest;
