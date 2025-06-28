import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizWithQuestions, QuizAttempt, useQuizAttempts } from '../../hooks/useQuizAttempts';

interface QuizPlayerProps {
  quiz: QuizWithQuestions;
  onComplete?: (attempt: QuizAttempt) => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onComplete }) => {
  const navigate = useNavigate();
  const { startQuizAttempt, submitQuizAttempt, loading, error } = useQuizAttempts();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(quiz.time_limit_minutes * 60);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Start the quiz and create an attempt
  const handleStartQuiz = async () => {
    const newAttempt = await startQuizAttempt(quiz.id);
    if (newAttempt) {
      setAttempt(newAttempt);
      setQuizStarted(true);
      setStartTime(new Date());
    }
  };

  // Handle selecting an answer
  const handleSelectAnswer = (questionId: string, answerIndex: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  // Navigate to the next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to the previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit the quiz
  const handleSubmitQuiz = async () => {
    if (!attempt) return;
    
    setSubmitting(true);
    
    // Calculate time taken
    const endTime = new Date();
    const timeTakenSeconds = startTime 
      ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      : quiz.time_limit_minutes * 60;
    
    const submittedAttempt = await submitQuizAttempt(
      attempt.id,
      selectedAnswers,
      timeTakenSeconds
    );
    
    if (submittedAttempt) {
      setQuizCompleted(true);
      if (onComplete) {
        onComplete(submittedAttempt);
      }
    }
    
    setSubmitting(false);
  };

  // Timer effect
  useEffect(() => {
    if (!quizStarted || quizCompleted) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted]);

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (Object.keys(selectedAnswers).length / quiz.questions.length) * 100;

  // Get current question
  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Render quiz completion screen
  if (quizCompleted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Quiz Completed!</h2>
        <p className="text-gray-700 mb-4">
          Your answers have been submitted successfully. You'll see your results shortly.
        </p>
        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => navigate('/quizzes')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            View All Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Render quiz start screen
  if (!quizStarted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-2">{quiz.title}</h2>
        <p className="text-gray-700 mb-4">{quiz.description}</p>
        
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Quiz Information:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Number of questions: {quiz.questions.length}</li>
            <li>• Time limit: {quiz.time_limit_minutes} minutes</li>
            <li>• Difficulty level: {quiz.difficulty_level}/5</li>
            <li>• Passing score: 60%</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Once you start the quiz, the timer will begin. You must complete all questions within the time limit.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleStartQuiz}
          disabled={loading}
          className={`w-full py-3 rounded-md text-white font-medium ${
            loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
          } transition-colors`}
        >
          {loading ? 'Starting Quiz...' : 'Start Quiz'}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Render quiz questions
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      {/* Quiz header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-blue-600">{quiz.title}</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            Time: {formatTime(timeRemaining)}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          {currentQuestion.question_text}
        </h3>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <div 
              key={index}
              onClick={() => handleSelectAnswer(currentQuestion.id, index.toString())}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedAnswers[currentQuestion.id] === index.toString()
                  ? 'bg-blue-50 border-blue-500'
                  : 'hover:bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center mr-3 ${
                  selectedAnswers[currentQuestion.id] === index.toString()
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-400'
                }`}>
                  {selectedAnswers[currentQuestion.id] === index.toString() && (
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-700">{option}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-md ${
            currentQuestionIndex === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } transition-colors`}
        >
          Previous
        </button>
        
        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button
            onClick={handleNextQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className={`px-4 py-2 rounded-md text-white ${
              submitting
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } transition-colors`}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
      
      {/* Question navigation */}
      <div className="mt-8">
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : selectedAnswers[quiz.questions[index].id] !== undefined
                  ? 'bg-green-100 text-green-800 border border-green-500'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;
