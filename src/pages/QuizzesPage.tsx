import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizAttempts, Quiz, QuizWithQuestions } from '../hooks/useQuizAttempts';
import { useEnhancedQuizzes, QuizFilters as QuizFiltersType } from '../hooks/useEnhancedQuizzes';
import QuizPlayer from '../components/quiz/QuizPlayer';
import QuizResults from '../components/quiz/QuizResults';
import QuizFilters from '../components/quiz/QuizFilters';
import QuizStatsDashboard from '../components/quiz/QuizStatsDashboard';
import SubjectQuizGroup from '../components/quiz/SubjectQuizGroup';
import EnhancedQuizCard from '../components/quiz/EnhancedQuizCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const QuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchQuizWithQuestions } = useQuizAttempts();
  const {
    quizzes,
    statistics,
    loading,
    error,
    applyFilters,
    getQuizzesBySubject,
    getAvailableSubjects,
    refreshData
  } = useEnhancedQuizzes();

  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithQuestions | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'quiz' | 'results'>('list');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');
  const [showFilters, setShowFilters] = useState(false);

  // Handle filter changes
  const handleFiltersChange = (filters: QuizFiltersType) => {
    applyFilters(filters);
  };

  // Refresh data when quiz is completed
  const handleQuizCompleted = () => {
    refreshData();
  };

  // Handle starting a quiz
  const handleStartQuiz = async (quizId: string) => {
    const quizWithQuestions = await fetchQuizWithQuestions(quizId);
    if (quizWithQuestions) {
      setSelectedQuiz(quizWithQuestions);
      setView('quiz');
    }
  };

  // Handle quiz completion
  const handleQuizComplete = (attemptId: string) => {
    setCurrentAttemptId(attemptId);
    setView('results');
    handleQuizCompleted(); // Refresh data to update statistics
  };

  // Handle retaking a quiz
  const handleRetakeQuiz = () => {
    if (selectedQuiz) {
      setView('quiz');
    }
  };

  // Handle returning to quiz list
  const handleBackToList = () => {
    setSelectedQuiz(null);
    setCurrentAttemptId(null);
    setView('list');
  };

  // Render quiz player
  if (view === 'quiz' && selectedQuiz) {
    return (
      <div>
        <div className="mb-4">
          <button 
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Quizzes
          </button>
        </div>
        <QuizPlayer 
          quiz={selectedQuiz} 
          onComplete={(attempt) => handleQuizComplete(attempt.id)}
        />
      </div>
    );
  }

  // Render quiz results
  if (view === 'results' && currentAttemptId) {
    return (
      <div>
        <div className="mb-4">
          <button 
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Quizzes
          </button>
        </div>
        <QuizResults 
          attemptId={currentAttemptId} 
          onRetake={handleRetakeQuiz}
        />
      </div>
    );
  }

  // Render quiz list (default view)
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Practice Quizzes</h1>
          <p className="text-neutral-600 mt-2">
            Test your knowledge with quizzes designed to reinforce learning and identify gaps.
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5" />
              </svg>
              Grouped
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <QuizStatsDashboard statistics={statistics} loading={loading} />

      {/* Filters */}
      {showFilters && (
        <QuizFilters
          subjects={getAvailableSubjects()}
          onFiltersChange={handleFiltersChange}
          totalQuizzes={quizzes.length}
          filteredCount={quizzes.length}
        />
      )}

      {/* Quiz Content */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-neutral-200 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-neutral-200 rounded-full"></div>
                <div className="h-6 bg-neutral-200 rounded w-48"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-neutral-50 p-4 rounded-lg">
                    <div className="h-5 bg-neutral-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                    <div className="h-10 bg-neutral-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error loading quizzes</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      ) : quizzes.length > 0 ? (
        viewMode === 'grouped' ? (
          // Grouped by Subject View
          <div className="space-y-6">
            {getQuizzesBySubject().map((subjectGroup) => (
              <SubjectQuizGroup
                key={subjectGroup.subject_id}
                {...subjectGroup}
                onStartQuiz={handleStartQuiz}
              />
            ))}
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <EnhancedQuizCard
                key={quiz.id}
                quiz={quiz}
                onStartQuiz={handleStartQuiz}
                showSubjectInfo={true}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white p-12 rounded-lg border border-neutral-200 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Quizzes Available</h3>
          <p className="text-neutral-600 mb-4">
            There are currently no quizzes available that match your criteria.
          </p>
          {showFilters && (
            <button
              onClick={() => handleFiltersChange({})}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizzesPage;
