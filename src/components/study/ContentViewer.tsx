import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Topic } from '../../hooks/useTopics';

interface ContentViewerProps {
  topic: Topic;
  className?: string;
}

const ContentViewer: React.FC<ContentViewerProps> = ({ topic, className = '' }) => {
  const getDifficultyLabel = (level: number): string => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Elementary';
      case 3: return 'Intermediate';
      case 4: return 'Advanced';
      case 5: return 'Expert';
      default: return 'Unknown';
    }
  };

  const getDifficultyColor = (level: number): string => {
    switch (level) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Topic Header */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">
              {topic.title}
            </h1>
            
            {topic.description && (
              <p className="text-lg text-neutral-600 leading-relaxed">
                {topic.description}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Difficulty:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(topic.difficulty_level)}`}>
                {getDifficultyLabel(topic.difficulty_level)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-neutral-600">
                {topic.estimated_study_time_minutes} min study time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {topic.learning_objectives && topic.learning_objectives.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-primary-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Learning Objectives
          </h2>
          <ul className="space-y-3">
            {topic.learning_objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                  {index + 1}
                </span>
                <span className="text-primary-800 leading-relaxed">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prerequisites */}
      {topic.prerequisites && topic.prerequisites.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prerequisites
          </h2>
          <p className="text-amber-800 mb-3">
            Before studying this topic, make sure you understand:
          </p>
          <ul className="space-y-2">
            {topic.prerequisites.map((prerequisite, index) => (
              <li key={index} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-amber-800">{prerequisite}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
        {topic.content ? (
          <div className="prose prose-lg max-w-none prose-headings:text-neutral-900 prose-headings:font-semibold prose-p:text-neutral-700 prose-p:leading-relaxed prose-strong:text-neutral-900 prose-ul:text-neutral-700 prose-ol:text-neutral-700 prose-li:text-neutral-700">
            <ReactMarkdown>{topic.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Content Available</h3>
            <p className="text-neutral-600">
              Content for this topic is currently being developed. Please check back later.
            </p>
          </div>
        )}
      </div>

      {/* Study Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-soft hover:shadow-medium">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Practice with Flashcards
          </span>
        </button>
        
        <button className="flex-1 bg-secondary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-secondary-700 transition-colors shadow-soft hover:shadow-medium">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Take Quiz
          </span>
        </button>
      </div>
    </div>
  );
};

export default ContentViewer;
