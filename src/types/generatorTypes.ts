/**
 * Types related to content generation
 */

/**
 * Language Model Provider options
 */
export enum LLMProvider {
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  GOOGLE_CLOUD = 'google_cloud',
  ANTHROPIC = 'anthropic',
  LOCAL = 'local'
}

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generator response
 */
export interface GeneratorResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
