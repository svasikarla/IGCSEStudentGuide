/**
 * Semantic Search Service
 * 
 * This service provides semantic search capabilities using vector embeddings
 * and integrates with the RAG (Retrieval-Augmented Generation) system.
 */

import { supabase } from '../lib/supabase';

// Types for semantic search results
export interface SemanticSearchResult {
  content_type: 'topic' | 'flashcard' | 'quiz_question' | 'exam_question';
  content_id: string;
  title: string;
  content: string;
  subject_name: string;
  topic_title: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface SearchOptions {
  matchCount?: number;
  similarityThreshold?: number;
  subjectId?: string;
  topicId?: string;
  contentTypes?: Array<'topic' | 'flashcard' | 'quiz_question' | 'exam_question'>;
}

export interface RAGContext {
  query: string;
  context: string;
  sources: SemanticSearchResult[];
  totalResults: number;
}

export class SemanticSearchService {
  private static instance: SemanticSearchService;
  private embeddingCache = new Map<string, number[]>();
  
  public static getInstance(): SemanticSearchService {
    if (!SemanticSearchService.instance) {
      SemanticSearchService.instance = new SemanticSearchService();
    }
    return SemanticSearchService.instance;
  }

  /**
   * Generate embedding for a text query using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      // Call our backend API to generate embedding
      const response = await fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.embedding;

      // Cache the result
      this.embeddingCache.set(text, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Perform semantic search across all content types
   */
  async searchAll(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      matchCount = 10,
      similarityThreshold = 0.7,
      contentTypes
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Call the semantic search RPC function
      const { data, error } = await supabase.rpc('semantic_search_all', {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        similarity_threshold: similarityThreshold
      });

      if (error) {
        throw new Error(`Semantic search failed: ${error.message}`);
      }

      let results = data || [];

      // Filter by content types if specified
      if (contentTypes && contentTypes.length > 0) {
        results = results.filter((result: SemanticSearchResult) => 
          contentTypes.includes(result.content_type)
        );
      }

      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search within a specific subject
   */
  async searchBySubject(
    query: string,
    subjectId: string,
    options: SearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      matchCount = 10,
      similarityThreshold = 0.7
    } = options;

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      const { data, error } = await supabase.rpc('semantic_search_by_subject', {
        query_embedding: queryEmbedding,
        subject_id: subjectId,
        match_count: matchCount,
        similarity_threshold: similarityThreshold
      });

      if (error) {
        throw new Error(`Subject search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in subject search:', error);
      throw error;
    }
  }

  /**
   * Perform semantic search within a specific topic
   */
  async searchByTopic(
    query: string,
    topicId: string,
    options: SearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      matchCount = 10,
      similarityThreshold = 0.7
    } = options;

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      const { data, error } = await supabase.rpc('semantic_search_by_topic', {
        query_embedding: queryEmbedding,
        topic_id: topicId,
        match_count: matchCount,
        similarity_threshold: similarityThreshold
      });

      if (error) {
        throw new Error(`Topic search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in topic search:', error);
      throw error;
    }
  }

  /**
   * Get RAG context for a query - formatted for LLM consumption
   */
  async getRAGContext(
    query: string,
    options: SearchOptions = {}
  ): Promise<RAGContext> {
    const {
      matchCount = 5,
      similarityThreshold = 0.7,
      subjectId
    } = options;

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Get formatted context using the RPC function
      const { data: contextText, error } = await supabase.rpc('get_rag_context', {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        subject_id: subjectId || null,
        similarity_threshold: similarityThreshold
      });

      if (error) {
        throw new Error(`RAG context retrieval failed: ${error.message}`);
      }

      // Also get the individual results for source tracking
      const searchFunction = subjectId ? 'semantic_search_by_subject' : 'semantic_search_all';
      const searchParams = subjectId 
        ? { query_embedding: queryEmbedding, subject_id: subjectId, match_count: matchCount, similarity_threshold: similarityThreshold }
        : { query_embedding: queryEmbedding, match_count: matchCount, similarity_threshold: similarityThreshold };

      const { data: sources, error: sourcesError } = await supabase.rpc(searchFunction, searchParams);

      if (sourcesError) {
        console.warn('Failed to get source details:', sourcesError);
      }

      return {
        query,
        context: contextText || '',
        sources: sources || [],
        totalResults: (sources || []).length
      };
    } catch (error) {
      console.error('Error getting RAG context:', error);
      throw error;
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.embeddingCache.size,
      keys: Array.from(this.embeddingCache.keys())
    };
  }
}

// Export singleton instance
export const semanticSearchService = SemanticSearchService.getInstance();
