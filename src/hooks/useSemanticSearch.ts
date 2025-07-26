/**
 * React Hook for Semantic Search
 * 
 * Provides semantic search functionality with caching, debouncing,
 * and integration with the RAG system.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { semanticSearchService, SemanticSearchResult, SearchOptions, RAGContext } from '../services/semanticSearchService';

export interface UseSemanticSearchOptions extends SearchOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  cacheResults?: boolean;
}

export interface SemanticSearchState {
  results: SemanticSearchResult[];
  loading: boolean;
  error: string | null;
  query: string;
  totalResults: number;
  searchTime: number;
}

export interface UseSemanticSearchReturn extends SemanticSearchState {
  search: (query: string, options?: SearchOptions) => Promise<void>;
  searchBySubject: (query: string, subjectId: string, options?: SearchOptions) => Promise<void>;
  searchByTopic: (query: string, topicId: string, options?: SearchOptions) => Promise<void>;
  getRAGContext: (query: string, options?: SearchOptions) => Promise<RAGContext | null>;
  clearResults: () => void;
  setQuery: (query: string) => void;
}

export function useSemanticSearch(options: UseSemanticSearchOptions = {}): UseSemanticSearchReturn {
  const {
    debounceMs = 300,
    autoSearch = false,
    cacheResults = true,
    ...searchOptions
  } = options;

  // State
  const [state, setState] = useState<SemanticSearchState>({
    results: [],
    loading: false,
    error: null,
    query: '',
    totalResults: 0,
    searchTime: 0
  });

  // Refs for debouncing and caching
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, { results: SemanticSearchResult[]; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController>();

  // Cache TTL (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000;

  /**
   * Get cached results if available and not expired
   */
  const getCachedResults = useCallback((cacheKey: string): SemanticSearchResult[] | null => {
    if (!cacheResults) return null;

    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      cacheRef.current.delete(cacheKey);
      return null;
    }

    return cached.results;
  }, [cacheResults]);

  /**
   * Cache search results
   */
  const setCachedResults = useCallback((cacheKey: string, results: SemanticSearchResult[]) => {
    if (!cacheResults) return;

    cacheRef.current.set(cacheKey, {
      results,
      timestamp: Date.now()
    });

    // Clean up expired cache entries
    const now = Date.now();
    for (const [key, value] of Array.from(cacheRef.current.entries())) {
      if (now - value.timestamp > CACHE_TTL) {
        cacheRef.current.delete(key);
      }
    }
  }, [cacheResults]);

  /**
   * Perform semantic search across all content
   */
  const search = useCallback(async (query: string, options: SearchOptions = {}) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], totalResults: 0, error: null }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cachedResults = getCachedResults(cacheKey);

    if (cachedResults) {
      setState(prev => ({
        ...prev,
        results: cachedResults,
        totalResults: cachedResults.length,
        loading: false,
        error: null,
        query
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, query }));

    try {
      const startTime = Date.now();
      const mergedOptions = { ...searchOptions, ...options };
      const results = await semanticSearchService.searchAll(query, mergedOptions);
      const searchTime = Date.now() - startTime;

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setCachedResults(cacheKey, results);

      setState(prev => ({
        ...prev,
        results,
        totalResults: results.length,
        loading: false,
        error: null,
        searchTime
      }));
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setState(prev => ({
        ...prev,
        results: [],
        totalResults: 0,
        loading: false,
        error: errorMessage,
        searchTime: 0
      }));
    }
  }, [searchOptions, getCachedResults, setCachedResults]);

  /**
   * Search within a specific subject
   */
  const searchBySubject = useCallback(async (query: string, subjectId: string, options: SearchOptions = {}) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], totalResults: 0, error: null }));
      return;
    }

    const cacheKey = `subject:${subjectId}:${query}:${JSON.stringify(options)}`;
    const cachedResults = getCachedResults(cacheKey);

    if (cachedResults) {
      setState(prev => ({
        ...prev,
        results: cachedResults,
        totalResults: cachedResults.length,
        loading: false,
        error: null,
        query
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, query }));

    try {
      const startTime = Date.now();
      const mergedOptions = { ...searchOptions, ...options };
      const results = await semanticSearchService.searchBySubject(query, subjectId, mergedOptions);
      const searchTime = Date.now() - startTime;

      setCachedResults(cacheKey, results);

      setState(prev => ({
        ...prev,
        results,
        totalResults: results.length,
        loading: false,
        error: null,
        searchTime
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Subject search failed';
      setState(prev => ({
        ...prev,
        results: [],
        totalResults: 0,
        loading: false,
        error: errorMessage,
        searchTime: 0
      }));
    }
  }, [searchOptions, getCachedResults, setCachedResults]);

  /**
   * Search within a specific topic
   */
  const searchByTopic = useCallback(async (query: string, topicId: string, options: SearchOptions = {}) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], totalResults: 0, error: null }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, query }));

    try {
      const startTime = Date.now();
      const mergedOptions = { ...searchOptions, ...options };
      const results = await semanticSearchService.searchByTopic(query, topicId, mergedOptions);
      const searchTime = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        results,
        totalResults: results.length,
        loading: false,
        error: null,
        searchTime
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Topic search failed';
      setState(prev => ({
        ...prev,
        results: [],
        totalResults: 0,
        loading: false,
        error: errorMessage,
        searchTime: 0
      }));
    }
  }, [searchOptions]);

  /**
   * Get RAG context for a query
   */
  const getRAGContext = useCallback(async (query: string, options: SearchOptions = {}): Promise<RAGContext | null> => {
    if (!query.trim()) return null;

    try {
      const mergedOptions = { ...searchOptions, ...options };
      return await semanticSearchService.getRAGContext(query, mergedOptions);
    } catch (error) {
      console.error('Failed to get RAG context:', error);
      return null;
    }
  }, [searchOptions]);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      error: null,
      query: '',
      searchTime: 0
    }));
  }, []);

  /**
   * Set query with optional auto-search
   */
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));

    if (autoSearch) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for debounced search
      debounceTimeoutRef.current = setTimeout(() => {
        search(query);
      }, debounceMs);
    }
  }, [autoSearch, debounceMs, search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    search,
    searchBySubject,
    searchByTopic,
    getRAGContext,
    clearResults,
    setQuery
  };
}
