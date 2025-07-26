/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * This service combines semantic search with LLM generation to provide
 * contextual, intelligent responses to user queries.
 */

import { semanticSearchService, RAGContext } from './semanticSearchService';
import { llmService, LLMProvider } from './llmService';

export interface RAGOptions {
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  subjectId?: string;
  topicId?: string;
  matchCount?: number;
  similarityThreshold?: number;
  includeSourceCitations?: boolean;
}

export interface RAGResponse {
  answer: string;
  context: RAGContext;
  sources: Array<{
    title: string;
    content_type: string;
    similarity: number;
    url?: string;
  }>;
  confidence: number;
  processingTime: number;
}

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  subjectId?: string;
  topicId?: string;
}

export class RAGService {
  private static instance: RAGService;
  private conversationHistory = new Map<string, ConversationContext>();

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * Generate a contextual answer using RAG
   */
  async generateAnswer(
    query: string,
    options: RAGOptions = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      const {
        provider = LLMProvider.OPENAI,
        temperature = 0.7,
        maxTokens = 1000,
        subjectId,
        topicId,
        matchCount = 5,
        similarityThreshold = 0.7,
        includeSourceCitations = true
      } = options;

      // Step 1: Retrieve relevant context using semantic search
      const context = await semanticSearchService.getRAGContext(query, {
        subjectId,
        topicId,
        matchCount,
        similarityThreshold
      });

      if (!context || !context.context.trim()) {
        throw new Error('No relevant context found for the query');
      }

      // Step 2: Construct the RAG prompt
      const ragPrompt = this.constructRAGPrompt(query, context, {
        includeSourceCitations,
        subjectId
      });

      // Step 3: Generate response using LLM
      const answer = await llmService.generateContent(ragPrompt, {
        provider,
        temperature,
        maxTokens
      });

      if (!answer) {
        throw new Error('LLM service returned no response');
      }

      // Step 4: Calculate confidence based on similarity scores
      const confidence = this.calculateConfidence(context.sources);

      // Step 5: Format sources for response
      const sources = context.sources.map(source => ({
        title: source.title,
        content_type: source.content_type,
        similarity: source.similarity,
        url: this.generateSourceUrl(source)
      }));

      const processingTime = Date.now() - startTime;

      return {
        answer: answer.trim(),
        context,
        sources,
        confidence,
        processingTime
      };

    } catch (error) {
      console.error('RAG generation error:', error);
      throw new Error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate answer with conversation context
   */
  async generateConversationalAnswer(
    query: string,
    conversationId: string,
    options: RAGOptions = {}
  ): Promise<RAGResponse> {
    try {
      // Get conversation history
      const conversation = this.conversationHistory.get(conversationId) || {
        messages: [],
        subjectId: options.subjectId,
        topicId: options.topicId
      };

      // Enhance query with conversation context
      const contextualQuery = this.enhanceQueryWithHistory(query, conversation);

      // Generate answer
      const response = await this.generateAnswer(contextualQuery, {
        ...options,
        subjectId: conversation.subjectId || options.subjectId,
        topicId: conversation.topicId || options.topicId
      });

      // Update conversation history
      conversation.messages.push(
        { role: 'user', content: query, timestamp: new Date() },
        { role: 'assistant', content: response.answer, timestamp: new Date() }
      );

      // Keep only last 10 messages to prevent context overflow
      if (conversation.messages.length > 10) {
        conversation.messages = conversation.messages.slice(-10);
      }

      this.conversationHistory.set(conversationId, conversation);

      return response;

    } catch (error) {
      console.error('Conversational RAG error:', error);
      throw error;
    }
  }

  /**
   * Construct the RAG prompt for LLM
   */
  private constructRAGPrompt(
    query: string,
    context: RAGContext,
    options: { includeSourceCitations?: boolean; subjectId?: string } = {}
  ): string {
    const { includeSourceCitations = true, subjectId } = options;

    // Determine subject context
    let subjectContext = '';
    if (subjectId) {
      // You could fetch subject details here if needed
      subjectContext = 'This is an IGCSE educational query. ';
    }

    const prompt = `You are an expert IGCSE tutor. ${subjectContext}Answer the following question using the provided context. Be accurate, educational, and helpful.

CONTEXT:
${context.context}

QUESTION: ${query}

INSTRUCTIONS:
- Provide a clear, educational answer suitable for IGCSE students
- Use information from the context provided
- If the context doesn't contain enough information, say so clearly
- Explain concepts in a way that's easy to understand
- Include relevant examples when helpful
${includeSourceCitations ? '- Reference the source material when appropriate' : ''}

ANSWER:`;

    return prompt;
  }

  /**
   * Enhance query with conversation history
   */
  private enhanceQueryWithHistory(
    query: string,
    conversation: ConversationContext
  ): string {
    if (conversation.messages.length === 0) {
      return query;
    }

    // Get last few messages for context
    const recentMessages = conversation.messages.slice(-4);
    const contextMessages = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Previous conversation context:
${contextMessages}

Current question: ${query}`;
  }

  /**
   * Calculate confidence score based on similarity scores
   */
  private calculateConfidence(sources: Array<{ similarity: number }>): number {
    if (sources.length === 0) return 0;

    // Calculate weighted average of similarity scores
    const totalSimilarity = sources.reduce((sum, source) => sum + source.similarity, 0);
    const averageSimilarity = totalSimilarity / sources.length;

    // Apply confidence scaling (similarity scores are 0-1, we want 0-100)
    const confidence = Math.round(averageSimilarity * 100);

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Generate URL for source content
   */
  private generateSourceUrl(source: any): string | undefined {
    const { content_type, content_id } = source;

    switch (content_type) {
      case 'topic':
        return `/topics/${content_id}`;
      case 'flashcard':
        return `/flashcards/${content_id}`;
      case 'quiz_question':
        return `/quizzes/${content_id}`;
      case 'exam_question':
        return `/exam-papers/${content_id}`;
      default:
        return undefined;
    }
  }

  /**
   * Clear conversation history for a specific conversation
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversationHistory.get(conversationId);
  }

  /**
   * Set conversation context (subject/topic)
   */
  setConversationContext(
    conversationId: string,
    context: { subjectId?: string; topicId?: string }
  ): void {
    const conversation = this.conversationHistory.get(conversationId) || {
      messages: []
    };

    conversation.subjectId = context.subjectId;
    conversation.topicId = context.topicId;

    this.conversationHistory.set(conversationId, conversation);
  }

  /**
   * Generate study suggestions based on query
   */
  async generateStudySuggestions(
    query: string,
    options: RAGOptions = {}
  ): Promise<string[]> {
    try {
      const context = await semanticSearchService.getRAGContext(query, {
        subjectId: options.subjectId,
        matchCount: 3,
        similarityThreshold: 0.6
      });

      if (!context || context.sources.length === 0) {
        return [];
      }

      const prompt = `Based on the following educational content and the student's query "${query}", suggest 3-5 specific study topics or areas they should focus on:

CONTENT:
${context.context}

Provide suggestions as a simple list of study topics, one per line.`;

      const response = await llmService.generateContent(prompt, {
        provider: options.provider || LLMProvider.OPENAI,
        temperature: 0.8,
        maxTokens: 300
      });

      if (!response) {
        throw new Error('LLM service returned no response for study suggestions');
      }

      return response
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('-'))
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating study suggestions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ragService = RAGService.getInstance();
