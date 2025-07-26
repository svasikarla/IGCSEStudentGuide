/**
 * Quiz Statistics Dashboard Component
 * Displays comprehensive quiz statistics and progress overview
 */

import React from 'react';
import { QuizStatistics } from '../../hooks/useEnhancedQuizzes';

interface QuizStatsDashboardProps {
  statistics: QuizStatistics | null;
  loading: boolean;
}

const QuizStatsDashboard: React.FC<QuizStatsDashboardProps> = ({
  statistics,
  loading
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-neutral-200 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-neutral-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-neutral-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-white p-6 rounded-lg border border-neutral-200 mb-6">
        <div className="text-center text-neutral-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No quiz statistics available</p>
        </div>
      </div>
    );
  }

  const completionRate = statistics.total_quizzes > 0 
    ? (statistics.completed_quizzes / statistics.total_quizzes) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quizzes */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-neutral-700">Available Quizzes</h3>
          </div>
          <p className="text-3xl font-bold text-primary-600 mb-1">
            {statistics.total_quizzes}
          </p>
          <p className="text-sm text-neutral-500">
            Across {statistics.subjects_with_quizzes} subject{statistics.subjects_with_quizzes !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Completed Quizzes */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-neutral-700">Completed</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">
            {statistics.completed_quizzes}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-neutral-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="text-sm text-neutral-500">{completionRate.toFixed(0)}%</span>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="font-medium text-neutral-700">Average Score</h3>
          </div>
          <p className="text-3xl font-bold text-amber-600 mb-1">
            {statistics.average_score > 0 ? `${statistics.average_score.toFixed(1)}%` : '--'}
          </p>
          <p className="text-sm text-neutral-500">
            {statistics.average_score >= 70 ? 'Above passing grade' : 
             statistics.average_score > 0 ? 'Below passing grade' : 'No attempts yet'}
          </p>
        </div>

        {/* Best Subject */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-medium text-neutral-700">Best Subject</h3>
          </div>
          <p className="text-lg font-bold text-blue-600 mb-1 line-clamp-2">
            {statistics.best_subject || 'No data yet'}
          </p>
          <p className="text-sm text-neutral-500">
            {statistics.best_subject ? 'Highest average score' : 'Complete quizzes to see'}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      {statistics.recent_activity && statistics.recent_activity.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-medium text-neutral-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {statistics.recent_activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">
                      {activity.quiz_title}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {activity.subject_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className={`font-medium ${
                        activity.score >= 70 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {activity.score.toFixed(1)}%
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(activity.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      activity.score >= 70 ? 'bg-green-500' : 'bg-amber-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-6">
        <h3 className="font-medium text-primary-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Performance Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-lg p-4">
            <h4 className="font-medium text-neutral-900 mb-2">Progress Status</h4>
            <p className="text-sm text-neutral-700">
              {statistics.completed_quizzes === 0 
                ? "Start taking quizzes to track your progress and identify areas for improvement."
                : statistics.average_score >= 70
                ? "Great work! You're performing well across your quizzes. Keep up the excellent progress."
                : "You're making progress! Focus on reviewing incorrect answers to improve your scores."
              }
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-4">
            <h4 className="font-medium text-neutral-900 mb-2">Next Steps</h4>
            <p className="text-sm text-neutral-700">
              {statistics.completed_quizzes < statistics.total_quizzes / 2
                ? "Try completing more quizzes to get a comprehensive view of your knowledge across all subjects."
                : statistics.average_score < 70
                ? "Review your incorrect answers and retake quizzes where you scored below 70%."
                : "Excellent progress! Consider challenging yourself with harder difficulty levels."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizStatsDashboard;
