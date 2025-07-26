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
    apiBaseUrl: string = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
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
      
      const response = await fetch(`${this.apiBaseUrl}/llm/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          provider: provider,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error calling ${provider} LLM API`);
      }
      
      const data = await response.json();
      return data.text;
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
      
      console.log(`Making request to ${this.apiBaseUrl}/llm/generate-json`);
      console.log('Request payload:', {
        prompt: `${prompt}\n\nProvide your response as a valid JSON object.`,
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        provider: provider,
        response_format: { type: 'json_object' }
      });

      const response = await fetch(`${this.apiBaseUrl}/llm/generate-json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: `${prompt}\n\nProvide your response as a valid JSON object.`,
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          provider: provider,
          response_format: { type: 'json_object' }
        }),
      });
      
      // Log the raw response status and headers
      console.log('Response status:', response.status);
      
      // Log headers in a way compatible with older TypeScript targets
      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      console.log('Response headers:', headerObj);
      
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      console.log('Raw response text:', rawText);
      
      // Handle different HTTP status codes with specific error messages
      if (!response.ok) {
        try {
          const errorData = JSON.parse(rawText);
          console.error(`Server error response (${response.status}):`, errorData);
          
          // Handle specific status codes
          switch (response.status) {
            case 401:
              throw new Error('Authentication failed. Please log in again.');
            case 403:
              throw new Error('You do not have permission to access this resource. Admin privileges required.');
            case 400:
              throw new Error(`Bad request: ${errorData.error || 'Invalid request parameters'}`);
            default:
              throw new Error(errorData.error || `Error calling ${provider} LLM JSON API: ${response.status}`);
          }
        } catch (parseError) {
          // If we can't parse the error as JSON, just use the status text
          console.error('Could not parse error response as JSON:', parseError);
          throw new Error(`Error calling ${provider} LLM JSON API: ${response.status} ${response.statusText}`);
        }
      }
      
      // Try to parse the raw text as JSON
      let result;
      try {
        result = JSON.parse(rawText);
        console.log('API response parsed as JSON:', result);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', rawText);
        throw new Error('Server returned invalid JSON');
      }
      
      // Check for error field in the response
      if (result.error) {
        throw new Error(`API error: ${result.error}`);
      }
      
      // For the /generate-json endpoint, the server returns the parsed JSON directly
      // For other endpoints, we need to handle different response formats
      if (result && typeof result === 'object' && !result.error) {
        // The server already parsed the JSON and returned it directly
        return result as T;
      } else if (result.data) {
        return result.data as T;
      } else if (result.text) {
        try {
          return JSON.parse(result.text) as T;
        } catch (parseError) {
          console.error('Failed to parse text as JSON:', result.text);
          throw new Error('Failed to parse LLM response as JSON');
        }
      } else if (result.choices && result.choices.length > 0 && result.choices[0].message?.content) {
        // Handle OpenAI direct API response format
        try {
          return JSON.parse(result.choices[0].message.content) as T;
        } catch (parseError) {
          console.error('Failed to parse content as JSON:', result.choices[0].message.content);
          throw new Error('Failed to parse LLM response as JSON');
        }
      } else {
        console.error('Unexpected API response structure:', result);
        throw new Error('API response has an unexpected structure');
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

      const response = await fetch(`${this.apiBaseUrl}/llm/generate-curriculum`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subjectName,
          gradeLevel,
          curriculumBoard,
          tier,
          model: options.model,
          temperature: options.temperature,
          provider: provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating curriculum:', error);
      throw new Error(`Curriculum generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
