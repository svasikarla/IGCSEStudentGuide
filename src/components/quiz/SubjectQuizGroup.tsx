/**
 * Subject Quiz Group Component
 * Groups and displays quizzes by subject with collapsible sections
 */

import React, { useState } from 'react';
import { EnhancedQuiz } from '../../hooks/useEnhancedQuizzes';
import EnhancedQuizCard from './EnhancedQuizCard';

interface SubjectQuizGroupProps {
  subject_name: string;
  subject_id: string;
  subject_code: string;
  subject_color_hex: string;
  subject_icon_name: string;
  quizzes: EnhancedQuiz[];
  onStartQuiz: (quizId: string) => void;
  defaultExpanded?: boolean;
}

const SubjectQuizGroup: React.FC<SubjectQuizGroupProps> = ({
  subject_name,
  subject_id,
  subject_code,
  subject_color_hex,
  subject_icon_name,
  quizzes,
  onStartQuiz,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate subject statistics
  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter(q => q.completion_status === 'completed' || q.completion_status === 'passed').length;
  const passedQuizzes = quizzes.filter(q => q.completion_status === 'passed').length;
  const averageScore = quizzes
    .filter(q => q.user_best_score !== null)
    .reduce((sum, q, _, arr) => sum + (q.user_best_score! / arr.length), 0);

  // Group quizzes by topic
  const quizzesByTopic = quizzes.reduce((acc, quiz) => {
    if (!acc[quiz.topic_title]) {
      acc[quiz.topic_title] = [];
    }
    acc[quiz.topic_title].push(quiz);
    return acc;
  }, {} as Record<string, EnhancedQuiz[]>);

  const topicNames = Object.keys(quizzesByTopic).sort();

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
      {/* Subject Header */}
      <div 
        className="p-4 border-b border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Subject Color Indicator */}
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: subject_color_hex }}
            ></div>
            
            {/* Subject Info */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {subject_name}
              </h2>
              <p className="text-sm text-neutral-600">
                {subject_code} • {totalQuizzes} quiz{totalQuizzes !== 1 ? 'es' : ''} available
              </p>
            </div>
          </div>

          {/* Subject Statistics */}
          <div className="flex items-center gap-6">
            {/* Progress Summary */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-neutral-900">{completedQuizzes}</div>
                <div className="text-neutral-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{passedQuizzes}</div>
                <div className="text-neutral-500">Passed</div>
              </div>
              {averageScore > 0 && (
                <div className="text-center">
                  <div className={`font-medium ${averageScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                    {averageScore.toFixed(1)}%
                  </div>
                  <div className="text-neutral-500">Avg Score</div>
                </div>
              )}
            </div>

            {/* Expand/Collapse Icon */}
            <svg 
              className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        {totalQuizzes > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
              <span>Progress</span>
              <span>{Math.round((completedQuizzes / totalQuizzes) * 100)}% completed</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedQuizzes / totalQuizzes) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Quizzes Content */}
      {isExpanded && (
        <div className="p-4">
          {topicNames.length > 1 ? (
            // Multiple topics - group by topic
            <div className="space-y-6">
              {topicNames.map(topicName => (
                <div key={topicName}>
                  <h3 className="text-md font-medium text-neutral-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.414 1.414 0 01-2.828 0l-7-7A1.414 1.414 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {topicName}
                    <span className="text-sm text-neutral-500">
                      ({quizzesByTopic[topicName].length} quiz{quizzesByTopic[topicName].length !== 1 ? 'es' : ''})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzesByTopic[topicName].map(quiz => (
                      <EnhancedQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        onStartQuiz={onStartQuiz}
                        showSubjectInfo={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single topic - show quizzes directly
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map(quiz => (
                <EnhancedQuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onStartQuiz={onStartQuiz}
                  showSubjectInfo={false}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {quizzes.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No quizzes available for {subject_name}</p>
              <p className="text-sm mt-1">Check back later for new content</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectQuizGroup;
