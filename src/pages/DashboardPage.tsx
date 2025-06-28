import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuizAttempts } from '../hooks/useQuizAttempts';
import { supabase } from '../lib/supabase';

interface RecentActivity {
  id: string;
  type: 'quiz' | 'flashcard' | 'study';
  title: string;
  details: string;
  timestamp: string;
  score?: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getUserQuizStats } = useQuizAttempts();
  
  const [studyStreak, setStudyStreak] = useState<number>(0);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState<number>(0);
  const [quizzesCompleted, setQuizzesCompleted] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch quiz stats
      const quizStats = await getUserQuizStats();
      console.log('Quiz statistics loaded:', quizStats);
      if (quizStats) {
        setQuizzesCompleted(quizStats.quizzesTakenThisWeek || 0);
        setAverageScore(quizStats.averageScore);
      } else {
        console.warn('No quiz stats returned from getUserQuizStats');
      }
      
      // Fetch study streak
      const { data: streakData, error: streakError } = await supabase.rpc(
        'get_user_study_streak',
        { p_user_id: user.id }
      );
      
      if (streakError) {
        console.error('Error fetching study streak:', streakError);
      } else {
        setStudyStreak(streakData.streak_days || 0);
        console.log('Study streak loaded:', streakData);
      }
      
      // Fetch flashcards reviewed this week
      const { data: flashcardData, error: flashcardError } = await supabase.rpc(
        'get_flashcards_reviewed_this_week',
        { p_user_id: user.id }
      );
      
      if (flashcardError) {
        console.error('Error fetching recent flashcard reviews:', flashcardError);
      } else {
        setFlashcardsReviewed(flashcardData.count || 0);
        console.log('Flashcards reviewed loaded:', flashcardData);
      }
      
      // Fetch recent activity
      const { data: recentQuizzes, error: quizError } = await supabase
        .from('user_quiz_attempts')
        .select('id, created_at, score_percentage, quiz:quizzes(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (quizError) {
        console.error('Error fetching recent quizzes:', quizError);
        setRecentActivity([]);
      } else if (recentQuizzes && recentQuizzes.length > 0) {
        const quizActivity = recentQuizzes.map(attempt => ({
          id: attempt.id,
          type: 'quiz' as const,
          title: `Completed Quiz: ${attempt.quiz && 'title' in attempt.quiz ? attempt.quiz.title : 'Unknown Quiz'}`,
          details: `Score: ${attempt.score_percentage.toFixed(0)}%`,
          timestamp: new Date(attempt.created_at).toISOString(),
          score: attempt.score_percentage
        }));
        console.log('Recent quiz attempts loaded:', recentQuizzes.length, 'attempts');
        
        // Fetch recent flashcard reviews
        const { data: recentFlashcards, error: flashcardReviewError } = await supabase
          .from('user_flashcard_progress')
          .select('id, updated_at, flashcards(topics(title))')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);
        
        if (flashcardReviewError) {
          console.error('Error fetching recent flashcard reviews:', flashcardReviewError);
          setRecentActivity(quizActivity);
        } else if (recentFlashcards && recentFlashcards.length > 0) {
          const flashcardActivity = (recentFlashcards as any[]).map(review => {
            // The nested select can be tricky for TS to infer. Let's access it safely.
            const topicTitle = review.flashcards?.topics?.title ?? 'Unknown Topic';
            return {
              id: review.id,
              type: 'flashcard' as const,
              title: `Reviewed Flashcards: ${topicTitle}`,
              details: `Flashcard review`,
              timestamp: new Date(review.updated_at).toISOString()
            };
          });
          
          // Combine and sort all activity
          const allActivity = [...quizActivity, ...flashcardActivity]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
          
          setRecentActivity(allActivity);
          console.log('Recent flashcard reviews loaded:', recentFlashcards.length, 'reviews');
        } else {
          console.warn('No recent flashcard reviews returned');
          setRecentActivity(quizActivity);
        }
      } else {
        console.warn('No recent quizzes returned');
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getUserQuizStats]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };
  
  const handleStartQuiz = () => {
    navigate('/quizzes');
  };
  
  const handleReviewFlashcards = () => {
    navigate('/flashcards');
  };
  
  const handleBrowseSubjects = () => {
    navigate('/subjects');
  };
  
  return (
    <div>
      <div className="mb-8">
        <h1>Your Dashboard</h1>
        <p className="text-neutral-600">Welcome back, {user?.email?.split('@')[0] || 'Student'}!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Study Streak</h3>
          {loading ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">
                {studyStreak} {studyStreak === 1 ? 'day' : 'days'}
              </p>
              <p className="text-neutral-500 text-sm mt-1">Keep it going!</p>
            </>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Flashcards Reviewed</h3>
          {loading ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{flashcardsReviewed}</p>
              <p className="text-neutral-500 text-sm mt-1">This week</p>
            </>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Quizzes Completed</h3>
          {loading ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">{quizzesCompleted}</p>
              <p className="text-neutral-500 text-sm mt-1">This week</p>
            </>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Average Score</h3>
          {loading ? (
            <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
          ) : (
            <>
              <p className="text-3xl font-bold text-primary-600">
                {averageScore ? `${averageScore.toFixed(0)}%` : '--'}
              </p>
              <p className="text-neutral-500 text-sm mt-1">Across all quizzes</p>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={`border-l-4 pl-4 py-1 ${
                      activity.type === 'quiz' 
                        ? 'border-primary-500' 
                        : activity.type === 'flashcard'
                        ? 'border-secondary-500'
                        : 'border-neutral-500'
                    }`}
                  >
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-neutral-500">
                      {activity.details} • {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500">No recent activity. Start a quiz or review flashcards!</p>
            )}
          </div>
        </div>
        
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={handleStartQuiz}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Start New Quiz
              </button>
              <button 
                onClick={handleReviewFlashcards}
                className="w-full bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Review Flashcards
              </button>
              <button 
                onClick={handleBrowseSubjects}
                className="w-full border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Browse Subjects
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;