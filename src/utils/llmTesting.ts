/**
 * LLM Testing Framework
 * 
 * This utility provides tools to compare output quality across different LLM providers.
 * It helps evaluate which provider gives the best results for educational content generation.
 */

import { LLMProvider, createLLMAdapter } from '../services/llmAdapter';
import { LLMService, LLMServiceOptions } from '../services/llmService';

// Test case structure
export interface LLMTestCase {
  id: string;
  name: string;
  prompt: string;
  options?: LLMServiceOptions;
  expectedOutputContains?: string[];
  evaluationCriteria?: string[];
}

// Test result structure
export interface LLMTestResult {
  testCase: LLMTestCase;
  provider: LLMProvider;
  output: string;
  responseTime: number;
  tokenCount?: number;
  score?: number;
  evaluationNotes?: string;
}

// Test suite for running multiple test cases
export class LLMTestSuite {
  private testCases: LLMTestCase[] = [];
  private providers: LLMProvider[] = [];
  private results: LLMTestResult[] = [];
  
  constructor(providers: LLMProvider[] = [LLMProvider.OPENAI]) {
    this.providers = providers;
  }
  
  /**
   * Add a test case to the suite
   */
  addTestCase(testCase: LLMTestCase): void {
    this.testCases.push(testCase);
  }
  
  /**
   * Add multiple test cases to the suite
   */
  addTestCases(testCases: LLMTestCase[]): void {
    this.testCases.push(...testCases);
  }
  
  /**
   * Add a provider to test
   */
  addProvider(provider: LLMProvider): void {
    if (!this.providers.includes(provider)) {
      this.providers.push(provider);
    }
  }
  
  /**
   * Run all test cases against all providers
   */
  async runTests(): Promise<LLMTestResult[]> {
    this.results = [];
    
    for (const provider of this.providers) {
      const adapter = createLLMAdapter(provider);
      const llmService = new LLMService(adapter);
      
      for (const testCase of this.testCases) {
        console.log(`Running test "${testCase.name}" with provider "${provider}"...`);
        
        const startTime = Date.now();
        let output: string;
        
        try {
          output = await llmService.generateContent(testCase.prompt, testCase.options) || '';
          
          const result: LLMTestResult = {
            testCase,
            provider,
            output,
            responseTime: Date.now() - startTime,
          };
          
          this.results.push(result);
        } catch (error) {
          console.error(`Error running test "${testCase.name}" with provider "${provider}":`, error);
          
          this.results.push({
            testCase,
            provider,
            output: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            responseTime: Date.now() - startTime,
          });
        }
      }
    }
    
    return this.results;
  }
  
  /**
   * Evaluate test results based on criteria
   */
  evaluateResults(): LLMTestResult[] {
    return this.results.map(result => {
      if (result.output.startsWith('ERROR:')) {
        return {
          ...result,
          score: 0,
          evaluationNotes: 'Failed to generate output'
        };
      }
      
      let score = 5; // Start with a perfect score
      const notes: string[] = [];
      
      // Check if output contains expected content
      if (result.testCase.expectedOutputContains) {
        for (const expectedContent of result.testCase.expectedOutputContains) {
          if (!result.output.toLowerCase().includes(expectedContent.toLowerCase())) {
            score -= 1;
            notes.push(`Missing expected content: "${expectedContent}"`);
          }
        }
      }
      
      // Evaluate based on custom criteria
      if (result.testCase.evaluationCriteria) {
        // This would ideally be evaluated by a human or another LLM
        notes.push('Custom criteria evaluation requires manual review');
      }
      
      // Evaluate response time (penalize very slow responses)
      if (result.responseTime > 10000) { // More than 10 seconds
        score -= 1;
        notes.push('Response time was slow (>10s)');
      }
      
      return {
        ...result,
        score: Math.max(0, score),
        evaluationNotes: notes.join('; ')
      };
    });
  }
  
  /**
   * Get summary of test results
   */
  getSummary(): Record<string, any> {
    const evaluatedResults = this.evaluateResults();
    
    const providerScores: Record<string, { total: number, count: number, avg: number }> = {};
    
    // Initialize provider scores
    for (const provider of this.providers) {
      providerScores[provider] = { total: 0, count: 0, avg: 0 };
    }
    
    // Calculate scores
    for (const result of evaluatedResults) {
      if (typeof result.score === 'number') {
        providerScores[result.provider].total += result.score;
        providerScores[result.provider].count += 1;
      }
    }
    
    // Calculate averages
    for (const provider in providerScores) {
      const { total, count } = providerScores[provider];
      providerScores[provider].avg = count > 0 ? total / count : 0;
    }
    
    // Get best provider
    let bestProvider = this.providers[0];
    let bestScore = providerScores[bestProvider].avg;
    
    for (const provider of this.providers) {
      if (providerScores[provider].avg > bestScore) {
        bestScore = providerScores[provider].avg;
        bestProvider = provider;
      }
    }
    
    return {
      totalTests: this.testCases.length,
      totalProviders: this.providers.length,
      providerScores,
      bestProvider,
      bestScore,
      detailedResults: evaluatedResults
    };
  }
}

// Predefined test cases for educational content
export const educationalTestCases: LLMTestCase[] = [
  {
    id: 'subject-1',
    name: 'Generate Biology Subject',
    prompt: 'Generate a detailed description for an IGCSE Biology subject. Include key topics covered, learning objectives, and why it\'s important for students.',
    expectedOutputContains: ['biology', 'topics', 'objectives'],
    evaluationCriteria: [
      'Comprehensiveness of subject description',
      'Accuracy of IGCSE curriculum alignment',
      'Clarity and educational value'
    ]
  },
  {
    id: 'topic-1',
    name: 'Generate Physics Topic',
    prompt: 'Generate a detailed description for the IGCSE Physics topic "Forces and Motion". Include key concepts, formulas, and practical applications.',
    expectedOutputContains: ['forces', 'motion', 'newton'],
    evaluationCriteria: [
      'Accuracy of physics concepts',
      'Inclusion of relevant formulas',
      'Age-appropriate explanations'
    ]
  },
  {
    id: 'flashcard-1',
    name: 'Generate Chemistry Flashcards',
    prompt: 'Generate 3 flashcards for IGCSE Chemistry on the topic of "Periodic Table". Each flashcard should have a question on one side and the answer on the other.',
    options: {
      maxTokens: 500
    },
    expectedOutputContains: ['periodic table', 'element', 'question', 'answer'],
    evaluationCriteria: [
      'Accuracy of chemistry facts',
      'Appropriate difficulty level for IGCSE',
      'Clear question and answer format'
    ]
  },
  {
    id: 'quiz-1',
    name: 'Generate Math Quiz',
    prompt: 'Generate a 5-question quiz for IGCSE Mathematics on the topic of "Quadratic Equations". Include multiple-choice options and the correct answer for each question.',
    options: {
      maxTokens: 800
    },
    expectedOutputContains: ['quadratic', 'equation', 'question', 'answer'],
    evaluationCriteria: [
      'Mathematical accuracy',
      'Appropriate difficulty progression',
      'Clear question and answer format'
    ]
  }
];

// Helper function to run a quick comparison test between providers
export async function compareProviders(
  providers: LLMProvider[] = [LLMProvider.OPENAI, LLMProvider.AZURE],
  testCases: LLMTestCase[] = educationalTestCases
): Promise<Record<string, any>> {
  const testSuite = new LLMTestSuite(providers);
  testSuite.addTestCases(testCases);
  
  await testSuite.runTests();
  return testSuite.getSummary();
}
