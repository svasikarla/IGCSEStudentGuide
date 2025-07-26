/**
 * Enhanced Quiz Card Component
 * Displays quiz information with progress indicators and statistics
 */

import React from 'react';
import { EnhancedQuiz } from '../../hooks/useEnhancedQuizzes';

interface EnhancedQuizCardProps {
  quiz: EnhancedQuiz;
  onStartQuiz: (quizId: string) => void;
  showSubjectInfo?: boolean;
}

const EnhancedQuizCard: React.FC<EnhancedQuizCardProps> = ({
  quiz,
  onStartQuiz,
  showSubjectInfo = true
}) => {
  // Get difficulty color and label
  const getDifficultyInfo = (level: number) => {
    switch (level) {
      case 1:
        return { color: 'bg-green-100 text-green-800', label: 'Very Easy' };
      case 2:
        return { color: 'bg-green-100 text-green-800', label: 'Easy' };
      case 3:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' };
      case 4:
        return { color: 'bg-orange-100 text-orange-800', label: 'Hard' };
      case 5:
        return { color: 'bg-red-100 text-red-800', label: 'Very Hard' };
      default:
        return { color: 'bg-neutral-100 text-neutral-800', label: 'Unknown' };
    }
  };

  // Get completion status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'not_started':
        return { color: 'bg-neutral-100 text-neutral-700', label: 'Not Started', icon: 'play' };
      case 'in_progress':
        return { color: 'bg-blue-100 text-blue-700', label: 'In Progress', icon: 'clock' };
      case 'completed':
        return { color: 'bg-amber-100 text-amber-700', label: 'Completed', icon: 'check' };
      case 'passed':
        return { color: 'bg-green-100 text-green-700', label: 'Passed', icon: 'check-circle' };
      default:
        return { color: 'bg-neutral-100 text-neutral-700', label: 'Unknown', icon: 'question' };
    }
  };

  const difficultyInfo = getDifficultyInfo(quiz.difficulty_level);
  const statusInfo = getStatusInfo(quiz.completion_status);

  // Calculate progress percentage for visual indicator
  const progressPercentage = quiz.user_best_score || 0;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Card Header */}
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2">
              {quiz.title}
            </h3>
            {showSubjectInfo && (
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: quiz.subject_color_hex }}
                ></div>
                <span className="text-sm text-neutral-600">
                  {quiz.subject_name} • {quiz.topic_title}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${difficultyInfo.color}`}>
              {difficultyInfo.label}
            </span>
          </div>
        </div>
        
        {quiz.description && (
          <p className="text-sm text-neutral-600 line-clamp-2 mb-3">
            {quiz.description}
          </p>
        )}

        {/* Quiz Metadata */}
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{quiz.total_questions} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{quiz.time_limit_minutes} min</span>
          </div>
          {quiz.user_attempts > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{quiz.user_attempts} attempt{quiz.user_attempts !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {quiz.user_attempts > 0 && (
        <div className="p-4 bg-neutral-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">Your Progress</span>
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-neutral-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                quiz.completion_status === 'passed' ? 'bg-green-500' :
                quiz.completion_status === 'completed' ? 'bg-amber-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>Best Score: {quiz.user_best_score?.toFixed(1)}%</span>
            {quiz.user_last_attempt && (
              <span>
                Last: {new Date(quiz.user_last_attempt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Section */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {quiz.completion_status === 'passed' && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Passed</span>
              </div>
            )}
            {quiz.max_attempts && quiz.user_attempts >= quiz.max_attempts && quiz.completion_status !== 'passed' && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Max attempts reached</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => onStartQuiz(quiz.id)}
            disabled={quiz.max_attempts ? quiz.user_attempts >= quiz.max_attempts && quiz.completion_status !== 'passed' : false}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              quiz.max_attempts && quiz.user_attempts >= quiz.max_attempts && quiz.completion_status !== 'passed'
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : quiz.user_attempts > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {quiz.user_attempts > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuizCard;
