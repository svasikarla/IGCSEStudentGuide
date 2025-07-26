/**
 * Question Counter Component
 * Displays question counts, progress indicators, and generation recommendations
 */

import React from 'react';
import { useQuestionStatistics, QuestionCount } from '../../hooks/useQuestionStatistics';

interface QuestionCounterProps {
  topicId?: string;
  subjectName?: string;
  showRecommendations?: boolean;
  showProgressBar?: boolean;
  compact?: boolean;
  onGenerateMore?: (recommendedCount: number) => void;
}

const QuestionCounter: React.FC<QuestionCounterProps> = ({
  topicId,
  subjectName,
  showRecommendations = true,
  showProgressBar = true,
  compact = false,
  onGenerateMore
}) => {
  const {
    getTopicQuestionCount,
    getSubjectQuestionCount,
    getRecommendedQuestionCount,
    topicNeedsMoreQuestions,
    loading,
    error
  } = useQuestionStatistics();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-32 mb-2"></div>
        <div className="h-2 bg-neutral-200 rounded w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
        <span className="font-medium">Error loading question counts:</span> {error}
      </div>
    );
  }

  // Topic-specific display
  if (topicId) {
    const topicCount = getTopicQuestionCount(topicId);
    const recommendedCount = getRecommendedQuestionCount(topicId);
    const needsMore = topicNeedsMoreQuestions(topicId);

    if (!topicCount) {
      return (
        <div className={`${compact ? 'p-3' : 'p-4'} bg-neutral-50 rounded-lg border border-neutral-200`}>
          <div className="flex items-center gap-2 text-neutral-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">No questions generated yet</span>
          </div>
          {showRecommendations && onGenerateMore && (
            <button
              onClick={() => onGenerateMore(10)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Generate {10} questions to get started
            </button>
          )}
        </div>
      );
    }

    const progressPercentage = Math.min((topicCount.total_questions / 20) * 100, 100); // Assume 20 is "complete"

    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-white rounded-lg border border-neutral-200 shadow-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-neutral-900">
              {topicCount.total_questions} Questions Generated
            </span>
          </div>
          <div className="flex items-center gap-2">
            {needsMore && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                Needs More
              </span>
            )}
            {topicCount.total_questions >= 20 && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Well Covered
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgressBar && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-neutral-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  progressPercentage >= 100 ? 'bg-green-500' :
                  progressPercentage >= 50 ? 'bg-primary-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary-600">{topicCount.generated_questions}</div>
            <div className="text-xs text-neutral-600">AI Generated</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-700">{topicCount.manual_questions}</div>
            <div className="text-xs text-neutral-600">Manual</div>
          </div>
        </div>

        {/* Quality Score */}
        {topicCount.avg_quality_score && (
          <div className="mb-3 p-2 bg-neutral-50 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Avg. Quality Score</span>
              <span className={`text-sm font-medium ${
                topicCount.avg_quality_score >= 0.8 ? 'text-green-600' :
                topicCount.avg_quality_score >= 0.6 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {(topicCount.avg_quality_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {showRecommendations && onGenerateMore && recommendedCount > 0 && (
          <div className="pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-900">Recommendation</div>
                <div className="text-xs text-neutral-600">
                  Generate {recommendedCount} more questions for better coverage
                </div>
              </div>
              <button
                onClick={() => onGenerateMore(recommendedCount)}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Generate {recommendedCount}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Subject-specific display
  if (subjectName) {
    const subjectSummary = getSubjectQuestionCount(subjectName);

    if (!subjectSummary) {
      return (
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-neutral-600 text-sm">No data available for {subjectName}</div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium text-neutral-900">{subjectName} Overview</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{subjectSummary.total_questions}</div>
            <div className="text-sm text-neutral-600">Total Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-700">{subjectSummary.total_topics}</div>
            <div className="text-sm text-neutral-600">Topics</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{subjectSummary.topics_with_questions}</div>
            <div className="text-sm text-neutral-600">With Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{subjectSummary.avg_questions_per_topic.toFixed(1)}</div>
            <div className="text-sm text-neutral-600">Avg per Topic</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuestionCounter;
