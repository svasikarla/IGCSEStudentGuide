/**
 * LLM Adapter Interface
 * 
 * This file defines interfaces for different LLM providers to ensure consistent integration.
 * It allows for easy switching between providers like OpenAI, Azure, Anthropic, etc.
 */

// Common options for all LLM providers
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: LLMProvider;
  authToken?: string;
}

// Supported LLM providers
export enum LLMProvider {
  OPENAI = 'openai',
  AZURE = 'azure',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  HUGGINGFACE = 'huggingface',
  CUSTOM = 'custom'
}

// Interface for LLM adapter implementations
export interface ILLMAdapter {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T>;
  generateCurriculum(
    subjectName: string,
    gradeLevel: string,
    curriculumBoard?: string,
    tier?: string,
    options?: LLMOptions
  ): Promise<any>;
}

// Base adapter implementation that uses our backend proxy
export class BaseLLMAdapter implements ILLMAdapter {
  protected apiBaseUrl: string;
  protected defaultProvider: LLMProvider;

  constructor(
    apiBaseUrl: string = process.env.REACT_APP_API_BASE_URL || '/api',
    defaultProvider: LLMProvider = LLMProvider.OPENAI
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.defaultProvider = defaultProvider;
  }

  async generateText(prompt: string, options: LLMOptions = {}): Promise<string> {
    try {
      const provider = options.provider || this.defaultProvider;

      // Prepare headers with authentication if token is provided
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if auth token is provided
      if (options.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      }

      const response = await fetch(`${this.apiBaseUrl}/content-generation/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens, // Note: backend expects maxTokens
          provider: provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `Error calling ${provider} LLM API`);
      }

      const data = await response.json();
      // The unified endpoint returns { content: "...", metadata: ... }
      return data.content;
    } catch (error) {
      console.error('Error generating text with LLM:', error);
      throw new Error(`LLM API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateJSON<T>(prompt: string, options: LLMOptions = {}): Promise<T> {
    try {
      const provider = options.provider || this.defaultProvider;

      // Prepare headers with authentication if token is provided
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add Authorization header if auth token is provided
      if (options.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      } else {
        console.warn('No auth token provided for LLM API call. This may cause authentication errors.');
      }

      console.log(`Making request to ${this.apiBaseUrl}/content-generation/generate`);

      // For JSON generation, we use the same generic endpoint but append instructions to the prompt
      // The backend unified endpoint handles this better
      const jsonPrompt = `${prompt}\n\nIMPORTANT: Provide your response as a valid JSON object. Do not include markdown formatting like \`\`\`json.`;

      const response = await fetch(`${this.apiBaseUrl}/content-generation/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: jsonPrompt,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          provider: provider,
          // We can pass response_format if the backend supports it, but for now relying on prompt
        }),
      });

      // Log the raw response status
      console.log('Response status:', response.status);

      const responseClone = response.clone();
      const rawText = await responseClone.text();

      if (!response.ok) {
        // ... error handling logic (kept similar but simplified for brevity in this replacement)
        try {
          const errorData = JSON.parse(rawText);
          throw new Error(errorData.error || `Error: ${response.status}`);
        } catch (e) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
      }

      // Parse the response from the unified endpoint
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        throw new Error('Server returned invalid JSON');
      }

      // The unified endpoint returns { content: "...", metadata: ... }
      // We need to parse the 'content' field as JSON
      if (result.content) {
        try {
          // Clean up potential markdown code blocks if the LLM ignored instructions
          let cleanContent = result.content.trim();

          // Remove markdown code blocks
          if (cleanContent.includes('```json')) {
            cleanContent = cleanContent.replace(/```json\s*([\s\S]*?)\s*```/, '$1');
          } else if (cleanContent.includes('```')) {
            cleanContent = cleanContent.replace(/```\s*([\s\S]*?)\s*```/, '$1');
          }

          // Find the first '{' or '[' and the last '}' or ']'
          const firstBrace = cleanContent.indexOf('{');
          const firstBracket = cleanContent.indexOf('[');
          const firstChar = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

          const lastBrace = cleanContent.lastIndexOf('}');
          const lastBracket = cleanContent.lastIndexOf(']');
          const lastChar = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;

          if (firstChar !== -1 && lastChar !== -1) {
            cleanContent = cleanContent.substring(firstChar, lastChar + 1);
          }

          return JSON.parse(cleanContent) as T;
        } catch (e) {
          console.error('Failed to parse inner content as JSON:', result.content);
          // Try to fix common JSON errors if simple parse fails
          try {
            // Simple fix for unquoted property names or single quotes (basic attempt)
            const fixedContent = result.content
              .replace(/(\w+):/g, '"$1":')
              .replace(/'/g, '"');
            return JSON.parse(fixedContent) as T;
          } catch (retryError) {
            throw new Error('LLM response was not valid JSON');
          }
        }
      } else {
        throw new Error('Unexpected response format from content generation API');
      }

    } catch (error) {
      console.error('Error generating JSON from LLM:', error);
      throw new Error(`JSON generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCurriculum(
    subjectName: string,
    gradeLevel: string,
    curriculumBoard: string = 'Cambridge IGCSE',
    tier?: string,
    options: LLMOptions = {}
  ): Promise<any> {
    // For curriculum, we'll use the generic generate endpoint with a specific prompt
    // since there isn't a dedicated curriculum endpoint in the new unified router yet
    // (The wizard uses useTopicListGeneration hook which calls generateJSON directly or via this adapter)

    const prompt = `Generate a comprehensive curriculum structure for:
      Subject: ${subjectName}
      Grade: ${gradeLevel}
      Board: ${curriculumBoard}
      ${tier ? `Tier: ${tier}` : ''}
      
      Return a JSON array of chapters, where each chapter has a title, description, and list of topics.`;

    return this.generateJSON(prompt, options);
  }
}

// OpenAI-specific adapter (currently same as base, but could be extended)
export class OpenAIAdapter extends BaseLLMAdapter {
  constructor(apiBaseUrl?: string) {
    super(apiBaseUrl, LLMProvider.OPENAI);
  }
}

// Azure OpenAI adapter
export class AzureAdapter extends BaseLLMAdapter {
  constructor(apiBaseUrl?: string) {
    super(apiBaseUrl, LLMProvider.AZURE);
  }
}

// Anthropic Claude adapter
export class AnthropicAdapter extends BaseLLMAdapter {
  constructor(apiBaseUrl?: string) {
    super(apiBaseUrl, LLMProvider.ANTHROPIC);
  }
}

// Google (Gemini/Vertex AI) adapter
export class GoogleAdapter extends BaseLLMAdapter {
  constructor(apiBaseUrl?: string) {
    super(apiBaseUrl, LLMProvider.GOOGLE);
  }
}

// Hugging Face adapter
export class HuggingFaceAdapter extends BaseLLMAdapter {
  constructor(apiBaseUrl?: string) {
    super(apiBaseUrl, LLMProvider.HUGGINGFACE);
  }
}

// Factory function to create the appropriate adapter based on provider
export function createLLMAdapter(provider: LLMProvider = LLMProvider.OPENAI, apiBaseUrl?: string): ILLMAdapter {
  switch (provider) {
    case LLMProvider.AZURE:
      return new AzureAdapter(apiBaseUrl);
    case LLMProvider.ANTHROPIC:
      return new AnthropicAdapter(apiBaseUrl);
    case LLMProvider.GOOGLE:
      return new GoogleAdapter(apiBaseUrl);
    case LLMProvider.HUGGINGFACE:
      return new HuggingFaceAdapter(apiBaseUrl);
    case LLMProvider.OPENAI:
    default:
      return new OpenAIAdapter(apiBaseUrl);
  }
}

// Default adapter instance using OpenAI
export const defaultLLMAdapter = createLLMAdapter(
  (process.env.REACT_APP_DEFAULT_LLM_PROVIDER as LLMProvider) || LLMProvider.OPENAI
);
