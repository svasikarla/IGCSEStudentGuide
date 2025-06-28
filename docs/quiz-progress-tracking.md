# Quiz Attempt and Progress Tracking Implementation

This document outlines the implementation of quiz attempt and progress tracking features in the IGCSE Student Guide application.

## Overview

The quiz attempt and progress tracking system allows students to:
- Take quizzes on various topics
- View their quiz results with detailed feedback
- Track their progress across different subjects and topics
- Maintain a study streak for consistent engagement

## Database Schema

### Tables

1. **user_quiz_attempts**
   - Stores individual quiz attempts by users
   - Fields: id, user_id, quiz_id, started_at, completed_at, completed, answers, score_percentage, correct_answers, total_questions, time_taken_seconds, passed, created_at, updated_at

2. **user_topic_progress**
   - Tracks user mastery level for each topic
   - Fields: id, user_id, topic_id, mastery_level, last_studied_at, created_at, updated_at

3. **user_study_sessions**
   - Records daily study activity for streak tracking
   - Fields: id, user_id, study_date, duration_minutes, topic_id, subject_id, flashcards_reviewed, quizzes_completed, pages_read, created_at, updated_at

4. **user_flashcard_progress**
   - Tracks flashcard review progress
   - Fields: id, user_id, flashcard_id, topic_id, next_review_date, ease_factor, interval, cards_reviewed, created_at, updated_at

### Database Functions

1. **calculate_topic_progress**
   - Updates user_topic_progress based on quiz attempt results
   - Parameters: p_user_id, p_quiz_id, p_topic_id

2. **update_study_streak**
   - Updates or creates a study session record for the current day
   - Parameters: p_user_id

3. **get_user_study_streak**
   - Calculates the current study streak (consecutive days)
   - Parameters: p_user_id
   - Returns: JSON with streak_days

4. **get_flashcards_reviewed_this_week**
   - Counts flashcards reviewed in the past 7 days
   - Parameters: p_user_id
   - Returns: JSON with count

5. **get_best_subject_performance**
   - Identifies the subject with highest average quiz score
   - Parameters: p_user_id
   - Returns: subject_id, subject_name, average_score

## Frontend Components

### Quiz Player Component (`QuizPlayer.tsx`)
- Displays quiz questions one by one
- Handles user answers and quiz navigation
- Tracks time spent on quiz
- Submits completed quiz to backend

### Quiz Results Component (`QuizResults.tsx`)
- Shows quiz score and pass/fail status
- Displays detailed breakdown of correct/incorrect answers
- Provides explanations for questions
- Offers options to retake quiz or return to quiz list

### Quizzes Page (`QuizzesPage.tsx`)
- Lists available quizzes with descriptions
- Shows quiz statistics (quizzes taken, average score)
- Integrates QuizPlayer and QuizResults components
- Manages quiz taking workflow states

### Dashboard Page (`DashboardPage.tsx`)
- Displays study streak
- Shows quiz and flashcard statistics
- Lists recent activity from all learning activities
- Provides quick action buttons for common tasks

## Custom Hooks

### useQuizAttempts
- Manages quiz attempt data and operations
- Functions:
  - `getQuizAttempts`: Fetches user's quiz attempts
  - `createQuizAttempt`: Starts a new quiz attempt
  - `completeQuizAttempt`: Submits a completed quiz
  - `getUserQuizStats`: Gets quiz statistics for dashboard

## Progress Tracking Flow

1. **Starting a Quiz**
   - User selects a quiz from QuizzesPage
   - `createQuizAttempt` is called to record start time
   - QuizPlayer component loads quiz questions

2. **Completing a Quiz**
   - User answers all questions
   - `completeQuizAttempt` is called with answers and score
   - Quiz attempt record is updated with results

3. **Updating Progress**
   - `calculate_topic_progress` function is called
   - Topic mastery level is updated based on quiz performance
   - Study streak is updated via `update_study_streak`

4. **Viewing Progress**
   - Dashboard displays updated statistics
   - User can see their progress across topics
   - Study streak is shown to encourage consistent learning

## Testing

A test script (`scripts/test-quiz-progress.js`) is provided to verify the quiz attempt and progress tracking functionality. This script:
- Simulates a user taking a quiz
- Verifies that all database records are created correctly
- Checks that progress calculations are accurate
- Validates study streak functionality

## Future Enhancements

1. **Adaptive Difficulty**
   - Adjust quiz difficulty based on user performance

2. **Progress Visualization**
   - Add charts and graphs to visualize progress over time

3. **Achievement System**
   - Implement badges and achievements for learning milestones

4. **Study Recommendations**
   - Suggest topics to study based on mastery levels

5. **Spaced Repetition for Quizzes**
   - Recommend quiz retakes based on performance and time elapsed
