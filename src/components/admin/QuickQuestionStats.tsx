/**
 * Quick Question Statistics Widget
 * Compact overview for the main quiz generation interface
 */

import React from 'react';
import { useQuestionStatistics } from '../../hooks/useQuestionStatistics';

interface QuickQuestionStatsProps {
  className?: string;
}

const QuickQuestionStats: React.FC<QuickQuestionStatsProps> = ({ className = '' }) => {
  const {
    totalQuestions,
    totalGeneratedQuestions,
    subjectSummaries,
    getTopicsNeedingQuestions,
    loading,
    error
  } = useQuestionStatistics();

  const topicsNeedingQuestions = getTopicsNeedingQuestions(10);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-neutral-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-32 mb-3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="h-6 bg-neutral-200 rounded w-8 mx-auto mb-1"></div>
                <div className="h-3 bg-neutral-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Unable to load question statistics</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-neutral-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Question Overview
        </h3>
        <button
          onClick={() => {
            // This would navigate to the question stats tab
            const event = new CustomEvent('navigate-to-question-stats');
            window.dispatchEvent(event);
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          View Details →
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-primary-600">{totalQuestions.toLocaleString()}</div>
          <div className="text-xs text-neutral-600">Total Questions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{totalGeneratedQuestions.toLocaleString()}</div>
          <div className="text-xs text-neutral-600">AI Generated</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-amber-600">{topicsNeedingQuestions.length}</div>
          <div className="text-xs text-neutral-600">Need More</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-neutral-600 mb-1">
          <span>AI Generation Progress</span>
          <span>{totalQuestions > 0 ? Math.round((totalGeneratedQuestions / totalQuestions) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ 
              width: `${totalQuestions > 0 ? (totalGeneratedQuestions / totalQuestions) * 100 : 0}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Subject Breakdown */}
      {subjectSummaries.length > 0 && (
        <div>
          <div className="text-xs font-medium text-neutral-700 mb-2">Top Subjects</div>
          <div className="space-y-1">
            {subjectSummaries
              .sort((a, b) => b.total_questions - a.total_questions)
              .slice(0, 3)
              .map(subject => (
                <div key={subject.subject_name} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 truncate flex-1 mr-2">{subject.subject_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{subject.total_questions}</span>
                    <div className="w-8 bg-neutral-200 rounded-full h-1">
                      <div
                        className="bg-primary-500 h-1 rounded-full"
                        style={{ 
                          width: `${Math.min((subject.total_questions / Math.max(...subjectSummaries.map(s => s.total_questions))) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Alert for Topics Needing Questions */}
      {topicsNeedingQuestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-2 text-amber-600 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">
              {topicsNeedingQuestions.length} topic{topicsNeedingQuestions.length !== 1 ? 's' : ''} need{topicsNeedingQuestions.length === 1 ? 's' : ''} more questions
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Consider generating questions for topics with fewer than 10 questions
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickQuestionStats;
