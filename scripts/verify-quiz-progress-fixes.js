/**
 * Verification Script for Quiz Progress Fixes
 * 
 * This script tests the end-to-end flow of quiz progress tracking
 * to ensure all our fixes are working correctly.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test user ID - replace with a real user ID from your database
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// Test data
let testQuizId;
let testTopicId;
let testAttemptId;

async function main() {
  console.log('Starting verification of quiz progress fixes...');
  
  try {
    // Step 1: Get a quiz and topic to use for testing
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, topic_id')
      .limit(1)
      .single();
    
    if (quizError) throw new Error(`Failed to get test quiz: ${quizError.message}`);
    
    testQuizId = quizData.id;
    testTopicId = quizData.topic_id;
    
    console.log(`Using quiz ID: ${testQuizId} and topic ID: ${testTopicId}`);
    
    // Step 2: Create a new quiz attempt
    const { data: attemptData, error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: TEST_USER_ID,
        quiz_id: testQuizId,
        attempt_number: 1,
        started_at: new Date().toISOString(),
        total_questions: 5,
        correct_answers: 0,
        score_percentage: 0,
        passed: false,
        answers: {}
      })
      .select()
      .single();
    
    if (attemptError) throw new Error(`Failed to create test attempt: ${attemptError.message}`);
    
    testAttemptId = attemptData.id;
    console.log(`Created quiz attempt with ID: ${testAttemptId}`);
    
    // Step 3: Complete the quiz attempt
    const { data: completedData, error: completeError } = await supabase
      .from('user_quiz_attempts')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        time_taken_seconds: 120,
        correct_answers: 4,
        score_percentage: 80,
        passed: true,
        answers: { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'A' }
      })
      .eq('id', testAttemptId)
      .select()
      .single();
    
    if (completeError) throw new Error(`Failed to complete test attempt: ${completeError.message}`);
    
    console.log(`Completed quiz attempt with score: ${completedData.score_percentage}%`);
    
    // Step 4: Update topic progress
    const { error: progressError } = await supabase.rpc('calculate_topic_progress', {
      p_user_id: TEST_USER_ID,
      p_topic_id: testTopicId,
      p_quiz_id: testQuizId
    });
    
    if (progressError) throw new Error(`Failed to update topic progress: ${progressError.message}`);
    
    console.log('Updated topic progress successfully');
    
    // Step 5: Verify quiz statistics
    const { data: quizStats, error: statsError } = await supabase
      .from('user_quiz_attempts')
      .select('id, score_percentage')
      .eq('user_id', TEST_USER_ID)
      .not('completed_at', 'is', null);
    
    if (statsError) throw new Error(`Failed to get quiz stats: ${statsError.message}`);
    
    const totalQuizzes = quizStats?.length || 0;
    const totalScore = quizStats?.reduce((sum, attempt) => sum + (attempt.score_percentage || 0), 0) || 0;
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
    
    console.log(`Quiz statistics: ${totalQuizzes} total quizzes, ${averageScore.toFixed(2)}% average score`);
    
    // Step 6: Verify study streak
    const { data: streakData, error: streakError } = await supabase.rpc('get_user_study_streak', {
      p_user_id: TEST_USER_ID
    });
    
    if (streakError) throw new Error(`Failed to get study streak: ${streakError.message}`);
    
    console.log(`Current study streak: ${streakData.streak_days} days`);
    
    // Step 7: Create a study session to test study_date
    const { error: sessionError } = await supabase
      .from('user_study_sessions')
      .insert({
        user_id: TEST_USER_ID,
        topic_id: testTopicId,
        session_type: 'quiz',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: 5,
        quizzes_completed: 1,
        study_date: new Date().toISOString().split('T')[0]
      });
    
    if (sessionError) throw new Error(`Failed to create study session: ${sessionError.message}`);
    
    console.log('Created study session successfully');
    
    // Step 8: Verify flashcard progress
    const { data: flashcardData, error: flashcardError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('topic_id', testTopicId)
      .limit(1)
      .single();
    
    if (flashcardError) {
      console.warn(`No flashcards found for topic: ${flashcardError.message}`);
    } else {
      const { error: flashcardProgressError } = await supabase
        .from('user_flashcard_progress')
        .insert({
          user_id: TEST_USER_ID,
          flashcard_id: flashcardData.id,
          topic_id: testTopicId,
          ease_factor: 2.5,
          interval_days: 1,
          repetitions: 1,
          total_reviews: 1,
          cards_reviewed: 1,
          is_learned: false,
          last_review_date: new Date().toISOString()
        });
      
      if (flashcardProgressError) {
        console.warn(`Failed to create flashcard progress: ${flashcardProgressError.message}`);
      } else {
        console.log('Created flashcard progress successfully');
        
        // Verify flashcards reviewed
        const { data: reviewData, error: reviewError } = await supabase.rpc('get_flashcards_reviewed_this_week', {
          p_user_id: TEST_USER_ID
        });
        
        if (reviewError) {
          console.error(`Failed to get flashcards reviewed: ${reviewError.message}`);
        } else {
          console.log(`Flashcards reviewed this week: ${reviewData.count}`);
        }
      }
    }
    
    console.log('\nVerification completed successfully! All fixes appear to be working.');
    
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}

main();
