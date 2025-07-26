import { defaultLLMAdapter, ILLMAdapter, LLMOptions, LLMProvider } from './llmAdapter';
export { LLMProvider };

// Types for LLM service options (extending the adapter options)
export interface LLMServiceOptions extends LLMOptions {}

// Default options (without model - will be set based on provider)
const defaultOptions: LLMServiceOptions = {
  temperature: 0.7,
  maxTokens: 1000,
  provider: LLMProvider.OPENAI
};

// Provider-specific default models
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  [LLMProvider.OPENAI]: 'gpt-4o',
  [LLMProvider.GOOGLE]: 'gemini-1.5-flash',
  [LLMProvider.AZURE]: 'gpt-4o',
  [LLMProvider.ANTHROPIC]: 'claude-3-sonnet',
  [LLMProvider.HUGGINGFACE]: 'meta-llama/Llama-3.1-8B-Instruct',
  [LLMProvider.CUSTOM]: 'custom-model'
};

/**
 * LLM Service for generating educational content
 * Uses the adapter pattern to support multiple LLM providers
 */
export class LLMService {
  private adapter: ILLMAdapter;
  
  constructor(adapter: ILLMAdapter = defaultLLMAdapter) {
    this.adapter = adapter;
  }
  
  /**
   * Set a different LLM adapter
   * @param adapter The new adapter to use
   */
  setAdapter(adapter: ILLMAdapter): void {
    this.adapter = adapter;
  }
  
  /**
   * Generate content using LLM API via adapter
   * @param prompt The prompt to send to the API
   * @param options Configuration options
   * @returns Generated content as string
   */
  async generateContent(prompt: string, options: LLMServiceOptions = {}): Promise<string | null> {
    try {
      const mergedOptions = { ...defaultOptions, ...options };

      // Use provider-specific default model if not explicitly specified in options
      if (!options.model && mergedOptions.provider) {
        mergedOptions.model = DEFAULT_MODELS[mergedOptions.provider];
      }

      const result = await this.adapter.generateText(prompt, mergedOptions);
      return result;
    } catch (error) {
      console.error('Error generating content with LLM:', error);
      throw new Error(`LLM API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content and parse as JSON
   * @param prompt The prompt to send to the API
   * @param options Configuration options
   * @returns Parsed JSON object
   */
  async generateJSON<T>(prompt: string, options: LLMServiceOptions = {}): Promise<T> {
    try {
      const mergedOptions = { ...defaultOptions, ...options };

      // Use provider-specific default model if not explicitly specified in options
      if (!options.model && mergedOptions.provider) {
        mergedOptions.model = DEFAULT_MODELS[mergedOptions.provider];
      }

      return await this.adapter.generateJSON<T>(prompt, mergedOptions);
    } catch (error) {
      console.error('Error generating JSON from LLM:', error);
      throw new Error(`JSON generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive curriculum structure
   * @param subjectName The subject name
   * @param gradeLevel The grade level
   * @param curriculumBoard The curriculum board (e.g., Cambridge IGCSE)
   * @param tier The curriculum tier (e.g., Core, Extended)
   * @param options Configuration options
   * @returns Comprehensive curriculum data
   */
  async generateCurriculum(
    subjectName: string,
    gradeLevel: string,
    curriculumBoard: string = 'Cambridge IGCSE',
    tier?: string,
    options: LLMServiceOptions = {}
  ): Promise<any> {
    try {
      const mergedOptions = { ...defaultOptions, ...options };

      // Use provider-specific default model if not explicitly specified in options
      if (!options.model && mergedOptions.provider) {
        mergedOptions.model = DEFAULT_MODELS[mergedOptions.provider];
      }

      return await this.adapter.generateCurriculum(
        subjectName,
        gradeLevel,
        curriculumBoard,
        tier,
        mergedOptions
      );
    } catch (error) {
      console.error('Error generating curriculum from LLM:', error);
      throw new Error(`Curriculum generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const llmService = new LLMService();
