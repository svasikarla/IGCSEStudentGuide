/**
 * Question Statistics Dashboard
 * Comprehensive overview of question generation across all subjects and topics
 */

import React, { useState } from 'react';
import { useRealtimeQuestionCounts } from '../../hooks/useQuestionStatistics';
import QuestionCounter from './QuestionCounter';

const QuestionStatsDashboard: React.FC = () => {
  const {
    questionCounts,
    subjectSummaries,
    totalQuestions,
    totalGeneratedQuestions,
    getTopicsNeedingQuestions,
    loading,
    error
  } = useRealtimeQuestionCounts();

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showOnlyNeedingQuestions, setShowOnlyNeedingQuestions] = useState(false);

  const topicsNeedingQuestions = getTopicsNeedingQuestions(10);
  const filteredCounts = questionCounts.filter(count => {
    const subjectMatch = selectedSubject === 'all' || count.subject_name === selectedSubject;
    const needsQuestionsMatch = !showOnlyNeedingQuestions || count.total_questions < 10;
    return subjectMatch && needsQuestionsMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-neutral-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Error loading question statistics</span>
        </div>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Question Statistics</h2>
          <p className="text-neutral-600 mt-1">Track question generation progress across all subjects and topics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Real-time updates • Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-neutral-600">Total Questions</span>
          </div>
          <div className="text-3xl font-bold text-primary-600">{totalQuestions.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-sm font-medium text-neutral-600">AI Generated</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{totalGeneratedQuestions.toLocaleString()}</div>
          <div className="text-sm text-neutral-500 mt-1">
            {totalQuestions > 0 ? Math.round((totalGeneratedQuestions / totalQuestions) * 100) : 0}% of total
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-neutral-600">Need Questions</span>
          </div>
          <div className="text-3xl font-bold text-amber-600">{topicsNeedingQuestions.length}</div>
          <div className="text-sm text-neutral-500 mt-1">Topics with &lt;10 questions</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium text-neutral-600">Subjects</span>
          </div>
          <div className="text-3xl font-bold text-neutral-600">{subjectSummaries.length}</div>
          <div className="text-sm text-neutral-500 mt-1">With questions</div>
        </div>
      </div>

      {/* Subject Summaries */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Subject Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {subjectSummaries.map(summary => (
            <QuestionCounter
              key={summary.subject_name}
              subjectName={summary.subject_name}
              compact={true}
            />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-700 mb-2">Filter by Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Subjects</option>
            {subjectSummaries.map(summary => (
              <option key={summary.subject_name} value={summary.subject_name}>
                {summary.subject_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={showOnlyNeedingQuestions}
              onChange={(e) => setShowOnlyNeedingQuestions(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Show only topics needing questions
          </label>
        </div>
      </div>

      {/* Topic Details */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Topic Details</h3>
          <span className="text-sm text-neutral-500">
            Showing {filteredCounts.length} of {questionCounts.length} topics
          </span>
        </div>

        {filteredCounts.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No topics match the current filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCounts.map(count => (
              <div key={count.topic_id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-neutral-900">{count.topic_title}</h4>
                    <p className="text-sm text-neutral-600">{count.subject_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary-600">{count.total_questions}</div>
                    <div className="text-sm text-neutral-500">questions</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-600">AI Generated:</span>
                    <span className="ml-1 font-medium text-green-600">{count.generated_questions}</span>
                  </div>
                  <div>
                    <span className="text-neutral-600">Manual:</span>
                    <span className="ml-1 font-medium text-neutral-700">{count.manual_questions}</span>
                  </div>
                  {count.avg_quality_score && (
                    <div>
                      <span className="text-neutral-600">Quality:</span>
                      <span className={`ml-1 font-medium ${
                        count.avg_quality_score >= 0.8 ? 'text-green-600' :
                        count.avg_quality_score >= 0.6 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {(count.avg_quality_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionStatsDashboard;
