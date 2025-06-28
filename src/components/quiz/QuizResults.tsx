import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizAttempt, QuizWithQuestions, useQuizAttempts } from '../../hooks/useQuizAttempts';
import { supabase } from '../../lib/supabase';

interface QuizResultsProps {
  attemptId: string;
  onRetake?: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ attemptId, onRetake }) => {
  const navigate = useNavigate();
  const { loading, error } = useQuizAttempts();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch the attempt and quiz data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setLoadError(null);
        
        // Fetch the attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from('user_quiz_attempts')
          .select('*')
          .eq('id', attemptId)
          .single();
        
        if (attemptError) throw new Error(attemptError.message);
        if (!attemptData) throw new Error('Quiz attempt not found');
        
        setAttempt(attemptData);
        
        // Fetch the quiz with questions
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*, quiz_questions(*)')
          .eq('id', attemptData.quiz_id)
          .single();
        
        if (quizError) throw new Error(quizError.message);
        if (!quizData) throw new Error('Quiz not found');
        
        setQuiz({
          ...quizData,
          questions: quizData.quiz_questions || []
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load quiz results';
        setLoadError(errorMessage);
        console.error('Error loading quiz results:', err);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, [attemptId]);

  // Format time taken as MM:SS
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loadingData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (loadError || !attempt || !quiz) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{loadError || 'Failed to load quiz results'}</p>
        </div>
        <button
          onClick={() => navigate('/quizzes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  // Get user's answers from the attempt
  const userAnswers = attempt.answers || {};
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-600 mb-2">{quiz.title} - Results</h2>
      
      {/* Results summary */}
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Score</p>
            <p className="text-2xl font-bold text-blue-600">{attempt.score_percentage.toFixed(1)}%</p>
          </div>
          <div className="text-center p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Correct Answers</p>
            <p className="text-2xl font-bold text-green-600">{attempt.correct_answers} / {attempt.total_questions}</p>
          </div>
          <div className="text-center p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-gray-500">Time Taken</p>
            <p className="text-2xl font-bold text-blue-600">{formatTime(attempt.time_taken_seconds)}</p>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <div className={`inline-block px-4 py-2 rounded-full font-medium ${
            attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {attempt.passed ? 'PASSED' : 'FAILED'}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {attempt.passed 
              ? 'Congratulations! You passed this quiz.' 
              : 'You need 60% or higher to pass. Keep practicing!'}
          </p>
        </div>
      </div>
      
      {/* Question review */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Question Review</h3>
      
      <div className="space-y-6">
        {quiz.questions.map((question, index) => {
          const userAnswerIndex = userAnswers[question.id];

          // Convert user's selected index to the corresponding option text
          const userAnswerText = userAnswerIndex !== undefined && question.options && Array.isArray(question.options)
            ? question.options[parseInt(userAnswerIndex)]
            : undefined;

          const isCorrect = userAnswerText === question.correct_answer;
          
          return (
            <div 
              key={question.id} 
              className={`p-4 border rounded-md ${
                isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-medium text-gray-800">Question {index + 1}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              
              <p className="text-gray-700 mb-3">{question.question_text}</p>
              
              <div className="space-y-2 mb-4">
                {question.options.map((option, optionIndex) => {
                  const isUserSelected = userAnswerIndex === optionIndex.toString();
                  const isCorrectAnswer = option === question.correct_answer;

                  return (
                    <div
                      key={optionIndex}
                      className={`p-2 border rounded ${
                        isUserSelected && isCorrectAnswer
                          ? 'bg-green-100 border-green-500' // User selected correct answer
                          : isUserSelected
                          ? 'bg-red-100 border-red-500' // User selected wrong answer
                          : isCorrectAnswer
                          ? 'bg-green-50 border-green-300' // Correct answer not selected
                          : 'bg-white border-gray-200' // Other options
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center mr-3 ${
                          isCorrectAnswer
                          ? 'border-green-500 bg-green-500'
                          : isUserSelected
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300'
                      }`}>
                        {isCorrectAnswer && (
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {isUserSelected && !isCorrectAnswer && (
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-700">{option}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              {/* Explanation */}
              {question.explanation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                  <p className="text-sm text-blue-700">{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => navigate('/quizzes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Quizzes
        </button>
        
        {onRetake && (
          <button
            onClick={onRetake}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizResults;
