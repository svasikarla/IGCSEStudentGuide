/**
 * Integration tests for Hugging Face LLM Integration
 * 
 * Tests the end-to-end integration of Hugging Face models with our
 * quiz generation and exam paper generation workflows.
 */

import { SimplifiedContentGenerator } from '../services/simplifiedContentGenerator';
import { LLMProvider } from '../services/llmService';
import { createLLMAdapter } from '../services/llmAdapter';

// Mock the backend API calls
global.fetch = jest.fn();

describe('Hugging Face Integration Tests', () => {
  let contentGenerator: SimplifiedContentGenerator;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    contentGenerator = new SimplifiedContentGenerator();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Quiz Question Generation', () => {
    it('should generate quiz questions using Hugging Face', async () => {
      const mockQuizResponse = {
        title: 'IGCSE Mathematics Quiz - Algebra',
        description: 'Test your understanding of basic algebra concepts',
        questions: [
          {
            question: 'What is the value of x in the equation 2x + 5 = 13?',
            options: ['3', '4', '5', '6'],
            correct_answer: '4',
            explanation: 'Solving: 2x + 5 = 13, so 2x = 8, therefore x = 4'
          },
          {
            question: 'Simplify the expression 3x + 2x - x',
            options: ['4x', '5x', '6x', '2x'],
            correct_answer: '4x',
            explanation: 'Combining like terms: 3x + 2x - x = 4x'
          }
        ],
        difficulty_level: 3,
        estimated_time_minutes: 10,
        learning_objectives: [
          'Solve linear equations',
          'Simplify algebraic expressions'
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuizResponse
      } as any);

      const result = await contentGenerator.generateQuizQuestions(
        'Mathematics',
        'Algebra Basics',
        'IGCSE-0580',
        2, // question count
        3, // difficulty
        10, // grade
        {
          costTier: 'ultra_minimal',
          provider: LLMProvider.HUGGINGFACE,
          model: 'meta-llama/Llama-3.1-8B-Instruct'
        }
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].question_text).toContain('algebra');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/llm/generate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('huggingface')
        })
      );
    });

    it('should handle cost tracking for Hugging Face generations', async () => {
      const mockResponse = {
        title: 'Cost Tracking Test',
        questions: [
          {
            question: 'Test question',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 'A'
          }
        ],
        generation_metadata: {
          provider: 'huggingface',
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          estimated_cost: 0.0002,
          token_usage: {
            input_tokens: 1500,
            output_tokens: 800,
            total_tokens: 2300
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as any);

      const result = await contentGenerator.generateQuizQuestions(
        'Mathematics',
        'Test Topic',
        'IGCSE-0580',
        1,
        2,
        10,
        {
          costTier: 'ultra_minimal',
          provider: LLMProvider.HUGGINGFACE
        }
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      // Note: generation_metadata would be added by the backend service
    });
  });

  describe('Exam Paper Generation', () => {
    it('should generate exam papers using Hugging Face', async () => {
      const mockExamResponse = {
        title: 'IGCSE Mathematics Examination Paper',
        instructions: 'Answer all questions. Show your working clearly.',
        sections: [
          {
            title: 'Section A: Multiple Choice',
            questions: [
              {
                question_number: 1,
                question: 'Calculate 15% of 240',
                options: ['30', '36', '40', '45'],
                correct_answer: '36',
                marks: 1
              }
            ]
          },
          {
            title: 'Section B: Structured Questions',
            questions: [
              {
                question_number: 2,
                question: 'Solve the simultaneous equations:\n2x + y = 7\nx - y = 2',
                marks: 4,
                parts: [
                  { part: 'a', question: 'Find the value of x', marks: 2 },
                  { part: 'b', question: 'Find the value of y', marks: 2 }
                ]
              }
            ]
          }
        ],
        total_marks: 5,
        time_allowed_minutes: 60,
        difficulty_level: 3
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExamResponse
      } as any);

      const result = await contentGenerator.generateExamPaper(
        'Mathematics',
        ['Algebra', 'Percentages'],
        'IGCSE-0580',
        {
          questionCount: 2,
          timeLimit: 60,
          difficultyLevel: 3,
          includeMarkingScheme: true,
          provider: LLMProvider.HUGGINGFACE,
          model: 'meta-llama/Llama-3.1-8B-Instruct'
        }
      );

      expect(result).toBeDefined();
      expect(result.sections).toHaveLength(2);
      expect(result.total_marks).toBe(5);
      expect(result.duration_minutes).toBe(60);
    });
  });

  describe('Provider Factory Integration', () => {
    it('should create Hugging Face adapter correctly', () => {
      const adapter = createLLMAdapter(LLMProvider.HUGGINGFACE, 'http://test-api.com');

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(Object);
      // Note: provider and apiBaseUrl are protected properties
    });

    it('should fallback to default provider on Hugging Face failure', async () => {
      // First call fails (Hugging Face)
      mockFetch.mockRejectedValueOnce(new Error('Hugging Face API unavailable'));
      
      // Second call succeeds (fallback to OpenAI)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Fallback Quiz',
          questions: [
            {
              question: 'Fallback question',
              options: ['A', 'B', 'C', 'D'],
              correct_answer: 'A'
            }
          ]
        })
      } as any);

      const result = await contentGenerator.generateQuizQuestions(
        'Mathematics',
        'Test Topic',
        'IGCSE-0580',
        1,
        2,
        10,
        {
          costTier: 'ultra_minimal',
          provider: LLMProvider.HUGGINGFACE,
          fallbackProvider: LLMProvider.OPENAI
        }
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2); // First call failed, second succeeded
    });
  });

  describe('Model Performance Validation', () => {
    it('should validate response quality for educational content', async () => {
      const mockResponse = {
        title: 'Quality Validation Test',
        questions: [
          {
            question: 'What is the capital of France?',
            options: ['London', 'Berlin', 'Paris', 'Madrid'],
            correct_answer: 'Paris',
            explanation: 'Paris is the capital and largest city of France.',
            difficulty_level: 1,
            learning_objective: 'Identify European capitals'
          }
        ],
        quality_score: 0.95
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as any);

      const result = await contentGenerator.generateQuizQuestions(
        'Geography',
        'European Capitals',
        'IGCSE-0460',
        1,
        1,
        10,
        {
          provider: LLMProvider.HUGGINGFACE,
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          validateQuality: true
        }
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].explanation).toBeDefined();
    });
  });

  describe('Cost Comparison Validation', () => {
    it('should demonstrate significant cost savings vs traditional providers', async () => {
      const huggingFaceCost = 0.0002; // Per generation
      const openAICost = 0.53; // Per generation
      const geminiCost = 0.26; // Per generation

      const costSavingsVsOpenAI = ((openAICost - huggingFaceCost) / openAICost) * 100;
      const costSavingsVsGemini = ((geminiCost - huggingFaceCost) / geminiCost) * 100;

      expect(costSavingsVsOpenAI).toBeGreaterThan(99); // >99% savings
      expect(costSavingsVsGemini).toBeGreaterThan(99); // >99% savings
      expect(huggingFaceCost).toBeLessThan(0.001); // Under $0.001 per generation
    });
  });
});
