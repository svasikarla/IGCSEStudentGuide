/**
 * React Hook for RAG (Retrieval-Augmented Generation)
 * 
 * Provides intelligent Q&A functionality with context-aware responses
 * and conversation management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ragService, RAGResponse, RAGOptions, ConversationContext } from '../services/ragService';
import { LLMProvider } from '../services/llmService';

export interface UseRAGOptions extends RAGOptions {
  conversationId?: string;
  autoGenerateConversationId?: boolean;
}

export interface RAGState {
  response: RAGResponse | null;
  loading: boolean;
  error: string | null;
  conversation: ConversationContext | undefined;
}

export interface UseRAGReturn extends RAGState {
  askQuestion: (query: string, options?: RAGOptions) => Promise<RAGResponse | null>;
  generateStudySuggestions: (query: string, options?: RAGOptions) => Promise<string[]>;
  clearConversation: () => void;
  setConversationContext: (context: { subjectId?: string; topicId?: string }) => void;
  conversationId: string;
}

export function useRAG(options: UseRAGOptions = {}): UseRAGReturn {
  const {
    conversationId: providedConversationId,
    autoGenerateConversationId = true,
    ...defaultRAGOptions
  } = options;

  // Generate conversation ID if not provided
  const conversationIdRef = useRef<string>(
    providedConversationId || 
    (autoGenerateConversationId ? `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : '')
  );

  const [state, setState] = useState<RAGState>({
    response: null,
    loading: false,
    error: null,
    conversation: undefined
  });

  // Update conversation state when conversation changes
  const updateConversationState = useCallback(() => {
    if (conversationIdRef.current) {
      const conversation = ragService.getConversation(conversationIdRef.current);
      setState(prev => ({ ...prev, conversation }));
    }
  }, []);

  /**
   * Ask a question and get an intelligent response
   */
  const askQuestion = useCallback(async (
    query: string,
    options: RAGOptions = {}
  ): Promise<RAGResponse | null> => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, error: 'Question cannot be empty' }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const mergedOptions = { ...defaultRAGOptions, ...options };
      
      let response: RAGResponse;

      if (conversationIdRef.current) {
        // Use conversational RAG if conversation ID is available
        response = await ragService.generateConversationalAnswer(
          query,
          conversationIdRef.current,
          mergedOptions
        );
      } else {
        // Use standard RAG
        response = await ragService.generateAnswer(query, mergedOptions);
      }

      setState(prev => ({
        ...prev,
        response,
        loading: false,
        error: null
      }));

      // Update conversation state
      updateConversationState();

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate answer';
      setState(prev => ({
        ...prev,
        response: null,
        loading: false,
        error: errorMessage
      }));

      return null;
    }
  }, [defaultRAGOptions, updateConversationState]);

  /**
   * Generate study suggestions based on a query
   */
  const generateStudySuggestions = useCallback(async (
    query: string,
    options: RAGOptions = {}
  ): Promise<string[]> => {
    try {
      const mergedOptions = { ...defaultRAGOptions, ...options };
      return await ragService.generateStudySuggestions(query, mergedOptions);
    } catch (error) {
      console.error('Failed to generate study suggestions:', error);
      return [];
    }
  }, [defaultRAGOptions]);

  /**
   * Clear the current conversation
   */
  const clearConversation = useCallback(() => {
    if (conversationIdRef.current) {
      ragService.clearConversation(conversationIdRef.current);
      setState(prev => ({
        ...prev,
        response: null,
        conversation: undefined,
        error: null
      }));
    }
  }, []);

  /**
   * Set conversation context (subject/topic)
   */
  const setConversationContext = useCallback((
    context: { subjectId?: string; topicId?: string }
  ) => {
    if (conversationIdRef.current) {
      ragService.setConversationContext(conversationIdRef.current, context);
      updateConversationState();
    }
  }, [updateConversationState]);

  // Initialize conversation state on mount
  useEffect(() => {
    updateConversationState();
  }, [updateConversationState]);

  return {
    ...state,
    askQuestion,
    generateStudySuggestions,
    clearConversation,
    setConversationContext,
    conversationId: conversationIdRef.current
  };
}

/**
 * Hook for enhanced content generation with RAG context
 */
export function useRAGContentGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate enhanced content using RAG context
   */
  const generateWithContext = useCallback(async (
    prompt: string,
    options: {
      contextQuery?: string;
      subjectId?: string;
      topicId?: string;
      provider?: LLMProvider;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const {
        contextQuery,
        subjectId,
        topicId,
        provider = LLMProvider.OPENAI,
        temperature = 0.7,
        maxTokens = 1500
      } = options;

      let enhancedPrompt = prompt;

      // If context query is provided, get relevant context
      if (contextQuery) {
        const ragResponse = await ragService.generateAnswer(contextQuery, {
          subjectId,
          topicId,
          provider,
          temperature,
          maxTokens: 500, // Smaller token limit for context
          matchCount: 3,
          similarityThreshold: 0.6
        });

        if (ragResponse && ragResponse.context.context) {
          enhancedPrompt = `Context from existing content:
${ragResponse.context.context}

${prompt}`;
        }
      }

      // Generate content with enhanced prompt
      const { llmService } = await import('../services/llmService');
      const result = await llmService.generateContent(enhancedPrompt, {
        provider,
        temperature,
        maxTokens
      });

      setLoading(false);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Content generation failed';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  return {
    generateWithContext,
    loading,
    error
  };
}
