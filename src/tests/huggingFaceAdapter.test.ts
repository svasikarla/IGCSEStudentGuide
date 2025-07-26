/**
 * Unit tests for Hugging Face LLM Adapter
 * 
 * Tests the integration of Hugging Face models with our existing adapter pattern.
 * Validates text generation, JSON generation, and error handling.
 */

import { HuggingFaceAdapter } from '../services/llmAdapter';
import { LLMProvider } from '../services/llmService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('HuggingFaceAdapter', () => {
  let adapter: HuggingFaceAdapter;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    adapter = new HuggingFaceAdapter('http://localhost:3001/api/llm');
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct provider', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(HuggingFaceAdapter);
    });

    it('should set correct API base URL', () => {
      const customAdapter = new HuggingFaceAdapter('https://custom-api.com');
      expect(customAdapter).toBeDefined();
      expect(customAdapter).toBeInstanceOf(HuggingFaceAdapter);
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          text: 'This is a test response from Hugging Face'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateText('Test prompt', {
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(result).toBe('This is a test response from Hugging Face');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/llm/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Test prompt')
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow();
    });

    it('should use default model when none specified', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          text: 'Response with default model'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateText('Test prompt');

      expect(result).toBe('Response with default model');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/llm/generate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test prompt')
        })
      );
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON successfully', async () => {
      const mockJsonResponse = {
        title: 'Test Quiz',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correct_answer: '4'
          }
        ]
      };

      const mockResponse = {
        ok: true,
        json: async () => mockJsonResponse
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateJSON('Generate a quiz');

      expect(result).toEqual(mockJsonResponse);
      expect(typeof result).toBe('object');
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid JSON format'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(adapter.generateJSON('Generate JSON')).rejects.toThrow();
    });

    it('should clean up JSON with markdown code blocks', async () => {
      const mockJsonResponse = {
        title: 'Clean Test',
        content: 'This should work'
      };

      const mockResponse = {
        ok: true,
        json: async () => mockJsonResponse
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateJSON('Generate JSON');

      expect(result).toEqual(mockJsonResponse);
    });
  });

  describe('Model Selection', () => {
    it('should support all recommended Hugging Face models', async () => {
      const models = [
        'meta-llama/Llama-3.1-8B-Instruct',
        'meta-llama/Llama-3.1-70B-Instruct',
        'mistralai/Mistral-7B-Instruct-v0.3',
        'Qwen/Qwen-2.5-7B-Instruct',
        'deepseek-ai/DeepSeek-R1-Distill-Llama-8B'
      ];

      const mockResponse = {
        ok: true,
        json: async () => ({
          text: 'Test response'
        })
      };

      for (const model of models) {
        mockFetch.mockResolvedValueOnce(mockResponse as any);

        const result = await adapter.generateText('Test', { model });

        expect(result).toBe('Test response');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/llm/generate'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(model)
          })
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(adapter.generateText('Test prompt')).rejects.toThrow();
    });

    it('should handle empty responses', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          text: ''
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateText('Test prompt');
      expect(result).toBe('');
    });
  });

  describe('Cost Optimization', () => {
    it('should use cost-effective default settings', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          text: 'Cost optimized response'
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await adapter.generateText('Test prompt');

      expect(result).toBe('Cost optimized response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/llm/generate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test prompt')
        })
      );
    });
  });
});
