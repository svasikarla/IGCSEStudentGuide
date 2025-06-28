import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizAttempts, Quiz, QuizWithQuestions } from '../hooks/useQuizAttempts';
import QuizPlayer from '../components/quiz/QuizPlayer';
import QuizResults from '../components/quiz/QuizResults';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const QuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchQuizzes, fetchQuizWithQuestions, getUserQuizStats, loading, error } = useQuizAttempts();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithQuestions | null>(null);
  const [quizStats, setQuizStats] = useState<{
    totalQuizzesTaken: number;
    quizzesTakenThisWeek: number;
    averageScore: number;
  } | null>(null);
  const [bestSubject, setBestSubject] = useState<string>('--');
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [view, setView] = useState<'list' | 'quiz' | 'results'>('list');

  // Fetch quizzes on component mount
  useEffect(() => {
    const loadQuizzes = async () => {
      setLoadingQuizzes(true);
      const quizData = await fetchQuizzes();
      setQuizzes(quizData);
      setLoadingQuizzes(false);
    };
    
    loadQuizzes();
  }, [fetchQuizzes]);

  // Fetch user quiz stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      setLoadingStats(true);
      
      // Get quiz stats
      const stats = await getUserQuizStats();
      setQuizStats(stats);
      
      // Get best subject (if any attempts exist)
      try {
        const { data: subjectData, error: subjectError } = await supabase.rpc(
          'get_best_subject_performance',
          { p_user_id: user.id }
        );
        
        if (subjectError) throw new Error(subjectError.message);
        if (subjectData && subjectData.length > 0) {
          setBestSubject(subjectData[0].subject_name || '--');
        }
      } catch (err) {
        console.error('Error fetching best subject:', err);
      }
      
      setLoadingStats(false);
    };
    
    loadStats();
  }, [user, getUserQuizStats]);

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
    <div>
      <div className="mb-8">
        <h1>Practice Quizzes</h1>
        <p className="text-neutral-600">
          Test your knowledge with quizzes designed to reinforce learning and identify gaps.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Quizzes Taken</h3>
          {loadingStats ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">
                {quizStats?.quizzesTakenThisWeek || 0}
              </p>
              <p className="text-neutral-500 text-sm mt-1">This week</p>
            </>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Average Score</h3>
          {loadingStats ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">
                {quizStats?.averageScore ? `${quizStats.averageScore.toFixed(1)}%` : '--%'}
              </p>
              <p className="text-neutral-500 text-sm mt-1">Across all quizzes</p>
            </>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Best Subject</h3>
          {loadingStats ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{bestSubject}</p>
              <p className="text-neutral-500 text-sm mt-1">Highest average</p>
            </>
          )}
        </div>
      </div>
      
      {loadingQuizzes ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{quiz.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  quiz.difficulty_level <= 2 ? 'bg-green-100 text-green-800' :
                  quiz.difficulty_level <= 4 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {quiz.difficulty_level <= 2 ? 'Easy' : 
                   quiz.difficulty_level <= 4 ? 'Medium' : 'Hard'}
                </span>
              </div>
              <p className="text-neutral-600 mb-2">{quiz.description}</p>
              <p className="text-sm text-neutral-500 mb-4">Time limit: {quiz.time_limit_minutes} minutes</p>
              <button 
                onClick={() => handleStartQuiz(quiz.id)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-lg font-semibold mb-2">No Quizzes Available</h3>
          <p className="text-neutral-600">
            There are currently no quizzes available. Please check back later or contact your teacher.
          </p>
        </div>
      )}
      
      {/* Features section - keep this to show upcoming features */}
      <div className="bg-secondary-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Quiz Features</h2>
        <ul className="space-y-2 text-neutral-600">
          <li className="flex items-center">
            <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Interactive multiple-choice questions
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Immediate feedback and explanations
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Detailed performance analytics
          </li>
          <li className="flex items-center">
            <svg className="w-5 h-5 text-secondary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Progress tracking across subjects
          </li>
        </ul>
      </div>
    </div>
  );
};

export default QuizzesPage;
