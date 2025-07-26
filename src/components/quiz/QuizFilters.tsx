/**
 * Quiz Filters Component
 * Provides filtering and search functionality for quizzes
 */

import React, { useState, useEffect } from 'react';
import { QuizFilters as QuizFiltersType } from '../../hooks/useEnhancedQuizzes';

interface Subject {
  id: string;
  name: string;
  code: string;
  color_hex: string;
  icon_name: string;
}

interface QuizFiltersProps {
  subjects: Subject[];
  onFiltersChange: (filters: QuizFiltersType) => void;
  totalQuizzes: number;
  filteredCount: number;
}

const QuizFilters: React.FC<QuizFiltersProps> = ({
  subjects,
  onFiltersChange,
  totalQuizzes,
  filteredCount
}) => {
  const [filters, setFilters] = useState<QuizFiltersType>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Apply filters when they change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof QuizFiltersType, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      {/* Filter Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <h3 className="font-medium text-neutral-900">Filter Quizzes</h3>
            <span className="text-sm text-neutral-500">
              {filteredCount} of {totalQuizzes} quizzes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-neutral-500 hover:text-neutral-700"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search quizzes by title, subject, or topic..."
            value={filters.search_query || ''}
            onChange={(e) => handleFilterChange('search_query', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {filters.search_query && (
            <button
              onClick={() => handleFilterChange('search_query', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Subject</label>
              <select
                value={filters.subject_id || ''}
                onChange={(e) => handleFilterChange('subject_id', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Difficulty</label>
              <select
                value={filters.difficulty_level || ''}
                onChange={(e) => handleFilterChange('difficulty_level', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Levels</option>
                <option value="1">1 - Very Easy</option>
                <option value="2">2 - Easy</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Hard</option>
                <option value="5">5 - Very Hard</option>
              </select>
            </div>

            {/* Completion Status Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
              <select
                value={filters.completion_status || ''}
                onChange={(e) => handleFilterChange('completion_status', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="passed">Passed</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-neutral-600">Active filters:</span>
                {filters.subject_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs">
                    Subject: {subjects.find(s => s.id === filters.subject_id)?.name}
                    <button
                      onClick={() => handleFilterChange('subject_id', '')}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.difficulty_level && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                    Difficulty: Level {filters.difficulty_level}
                    <button
                      onClick={() => handleFilterChange('difficulty_level', undefined)}
                      className="text-amber-600 hover:text-amber-800"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.completion_status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Status: {filters.completion_status.replace('_', ' ')}
                    <button
                      onClick={() => handleFilterChange('completion_status', '')}
                      className="text-green-600 hover:text-green-800"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.search_query && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-800 rounded-full text-xs">
                    Search: "{filters.search_query}"
                    <button
                      onClick={() => handleFilterChange('search_query', '')}
                      className="text-neutral-600 hover:text-neutral-800"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizFilters;
