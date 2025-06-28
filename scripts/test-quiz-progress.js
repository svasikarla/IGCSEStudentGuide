/**
 * Test script for verifying quiz attempt and progress tracking functionality
 * 
 * This script simulates a user taking quizzes and checks if progress tracking
 * is working correctly by verifying database records.
 * 
 * To run this script:
 * 1. Make sure you have Node.js installed
 * 2. Install dependencies: npm install @supabase/supabase-js dotenv
 * 3. Create a .env file with SUPABASE_URL and SUPABASE_KEY
 * 4. Run: node scripts/test-quiz-progress.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials - replace with a test user in your system
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✓ ${message}`, colors.green);
const error = (message) => log(`✗ ${message}`, colors.red);
const info = (message) => log(`ℹ ${message}`, colors.blue);
const warning = (message) => log(`⚠ ${message}`, colors.yellow);

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function runTests() {
  log('\n=== QUIZ ATTEMPT AND PROGRESS TRACKING TEST ===\n', colors.cyan);
  
  try {
    // Step 1: Sign in test user
    info('Step 1: Signing in test user...');
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    
    if (signInError) throw new Error(`Sign in failed: ${signInError.message}`);
    success(`Signed in as ${user.email}`);
    
    // Step 2: Get available quizzes
    info('Step 2: Fetching available quizzes...');
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*');
    
    if (quizzesError) throw new Error(`Failed to fetch quizzes: ${quizzesError.message}`);
    if (!quizzes || quizzes.length === 0) throw new Error('No quizzes found in the database');
    
    success(`Found ${quizzes.length} quizzes`);
    
    // Step 3: Get quiz questions for the first quiz
    const testQuiz = quizzes[0];
    info(`Step 3: Fetching questions for quiz "${testQuiz.title}"...`);
    
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', testQuiz.id);
    
    if (questionsError) throw new Error(`Failed to fetch quiz questions: ${questionsError.message}`);
    if (!questions || questions.length === 0) throw new Error(`No questions found for quiz ${testQuiz.id}`);
    
    success(`Found ${questions.length} questions for the quiz`);
    
    // Step 4: Simulate taking a quiz - create a quiz attempt
    info('Step 4: Creating a quiz attempt...');
    
    const startTime = new Date();
    
    const { data: attempt, error: attemptError } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: testQuiz.id,
        started_at: startTime.toISOString(),
        completed: false,
      })
      .select()
      .single();
    
    if (attemptError) throw new Error(`Failed to create quiz attempt: ${attemptError.message}`);
    success(`Created quiz attempt with ID: ${attempt.id}`);
    
    // Step 5: Simulate answering questions
    info('Step 5: Simulating answering questions...');
    
    // Create answers object - simulate getting 70% correct
    const answers = {};
    let correctCount = 0;
    
    questions.forEach((question, index) => {
      // For test purposes, get 70% correct
      const isCorrect = index < Math.ceil(questions.length * 0.7);
      
      if (isCorrect) {
        answers[question.id] = question.correct_answer;
        correctCount++;
      } else {
        // Select a wrong answer
        const wrongOption = question.correct_answer === '0' ? '1' : '0';
        answers[question.id] = wrongOption;
      }
    });
    
    // Wait a bit to simulate time spent on quiz
    await sleep(2000);
    const endTime = new Date();
    const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
    
    // Step 6: Submit the quiz attempt
    info('Step 6: Submitting quiz attempt...');
    
    const scorePercentage = (correctCount / questions.length) * 100;
    const passed = scorePercentage >= 60; // Assuming 60% is passing
    
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('user_quiz_attempts')
      .update({
        completed: true,
        completed_at: endTime.toISOString(),
        answers: answers,
        score_percentage: scorePercentage,
        correct_answers: correctCount,
        total_questions: questions.length,
        time_taken_seconds: timeSpentSeconds,
        passed: passed
      })
      .eq('id', attempt.id)
      .select()
      .single();
    
    if (updateError) throw new Error(`Failed to update quiz attempt: ${updateError.message}`);
    success(`Quiz attempt submitted with score: ${scorePercentage.toFixed(1)}%`);
    
    // Step 7: Call the calculate_topic_progress function
    info('Step 7: Updating topic progress...');
    
    const { data: progressData, error: progressError } = await supabase.rpc(
      'calculate_topic_progress',
      { 
        p_user_id: user.id,
        p_quiz_id: testQuiz.id,
        p_topic_id: testQuiz.topic_id
      }
    );
    
    if (progressError) throw new Error(`Failed to update topic progress: ${progressError.message}`);
    success('Topic progress updated');
    
    // Step 8: Verify user_topic_progress record was created
    info('Step 8: Verifying topic progress record...');
    
    const { data: topicProgress, error: topicProgressError } = await supabase
      .from('user_topic_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('topic_id', testQuiz.topic_id)
      .single();
    
    if (topicProgressError) throw new Error(`Failed to fetch topic progress: ${topicProgressError.message}`);
    if (!topicProgress) throw new Error('No topic progress record found');
    
    success(`Topic progress record found with mastery level: ${topicProgress.mastery_level.toFixed(1)}%`);
    
    // Step 9: Verify study streak was updated
    info('Step 9: Verifying study streak...');
    
    const { data: streakData, error: streakError } = await supabase.rpc(
      'get_user_study_streak',
      { p_user_id: user.id }
    );
    
    if (streakError) throw new Error(`Failed to get study streak: ${streakError.message}`);
    success(`Study streak is now ${streakData.streak_days} days`);
    
    // Step 10: Verify study session was created
    info('Step 10: Verifying study session record...');
    
    const { data: studySessions, error: sessionError } = await supabase
      .from('user_study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (sessionError) throw new Error(`Failed to fetch study sessions: ${sessionError.message}`);
    if (!studySessions || studySessions.length === 0) throw new Error('No study session record found');
    
    success(`Study session record found for today with duration: ${studySessions[0].duration_minutes} minutes`);
    
    // Final summary
    log('\n=== TEST SUMMARY ===\n', colors.magenta);
    success('All tests passed successfully!');
    log('\nProgress tracking verification complete. The following records were created/updated:', colors.cyan);
    log(`- Quiz attempt with ID: ${attempt.id}`);
    log(`- Topic progress for topic ID: ${testQuiz.topic_id}`);
    log(`- Study streak: ${streakData.streak_days} days`);
    log(`- Study session for today\n`);
    
  } catch (err) {
    error(`Test failed: ${err.message}`);
    console.error(err);
  } finally {
    // Sign out
    await supabase.auth.signOut();
    info('Test user signed out');
  }
}

// Run the tests
runTests().catch(console.error);
