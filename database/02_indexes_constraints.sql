-- =====================================================
-- IGCSE Student Guide - Database Indexes & Constraints
-- File 2: Performance Optimization
-- =====================================================
-- Execute this file after creating tables to add indexes and constraints

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- User Profiles Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_grade_level ON public.user_profiles(grade_level);
CREATE INDEX idx_user_profiles_target_subjects ON public.user_profiles USING GIN(target_subjects);

-- Subjects Indexes
CREATE INDEX idx_subjects_code ON public.subjects(code);
CREATE INDEX idx_subjects_is_active ON public.subjects(is_active);
CREATE INDEX idx_subjects_display_order ON public.subjects(display_order);
CREATE INDEX idx_subjects_grade_levels ON public.subjects USING GIN(grade_levels);

-- Topics Indexes
CREATE INDEX idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX idx_topics_parent_topic_id ON public.topics(parent_topic_id);
CREATE INDEX idx_topics_slug ON public.topics(slug);
CREATE INDEX idx_topics_difficulty_level ON public.topics(difficulty_level);
CREATE INDEX idx_topics_is_published ON public.topics(is_published);
CREATE INDEX idx_topics_display_order ON public.topics(subject_id, display_order);
CREATE INDEX idx_topics_prerequisites ON public.topics USING GIN(prerequisites);

-- Flashcards Indexes
CREATE INDEX idx_flashcards_topic_id ON public.flashcards(topic_id);
CREATE INDEX idx_flashcards_difficulty_level ON public.flashcards(difficulty_level);
CREATE INDEX idx_flashcards_card_type ON public.flashcards(card_type);
CREATE INDEX idx_flashcards_is_active ON public.flashcards(is_active);
CREATE INDEX idx_flashcards_tags ON public.flashcards USING GIN(tags);

-- Quizzes Indexes
CREATE INDEX idx_quizzes_topic_id ON public.quizzes(topic_id);
CREATE INDEX idx_quizzes_quiz_type ON public.quizzes(quiz_type);
CREATE INDEX idx_quizzes_difficulty_level ON public.quizzes(difficulty_level);
CREATE INDEX idx_quizzes_is_published ON public.quizzes(is_published);

-- Quiz Questions Indexes
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_question_type ON public.quiz_questions(question_type);
CREATE INDEX idx_quiz_questions_display_order ON public.quiz_questions(quiz_id, display_order);

-- User Flashcard Progress Indexes
CREATE INDEX idx_user_flashcard_progress_user_id ON public.user_flashcard_progress(user_id);
CREATE INDEX idx_user_flashcard_progress_flashcard_id ON public.user_flashcard_progress(flashcard_id);
CREATE INDEX idx_user_flashcard_progress_next_review ON public.user_flashcard_progress(next_review_date);
CREATE INDEX idx_user_flashcard_progress_is_learned ON public.user_flashcard_progress(is_learned);
CREATE INDEX idx_user_flashcard_progress_is_favorite ON public.user_flashcard_progress(is_favorite);
CREATE INDEX idx_user_flashcard_progress_user_next_review ON public.user_flashcard_progress(user_id, next_review_date);

-- User Quiz Attempts Indexes
CREATE INDEX idx_user_quiz_attempts_user_id ON public.user_quiz_attempts(user_id);
CREATE INDEX idx_user_quiz_attempts_quiz_id ON public.user_quiz_attempts(quiz_id);
CREATE INDEX idx_user_quiz_attempts_completed_at ON public.user_quiz_attempts(completed_at);
CREATE INDEX idx_user_quiz_attempts_score ON public.user_quiz_attempts(score_percentage);
CREATE INDEX idx_user_quiz_attempts_user_quiz ON public.user_quiz_attempts(user_id, quiz_id, attempt_number);

-- User Topic Progress Indexes
CREATE INDEX idx_user_topic_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX idx_user_topic_progress_topic_id ON public.user_topic_progress(topic_id);
CREATE INDEX idx_user_topic_progress_completion ON public.user_topic_progress(completion_percentage);
CREATE INDEX idx_user_topic_progress_is_completed ON public.user_topic_progress(is_completed);
CREATE INDEX idx_user_topic_progress_last_studied ON public.user_topic_progress(last_studied_at);

-- User Study Sessions Indexes
CREATE INDEX idx_user_study_sessions_user_id ON public.user_study_sessions(user_id);
CREATE INDEX idx_user_study_sessions_topic_id ON public.user_study_sessions(topic_id);
CREATE INDEX idx_user_study_sessions_subject_id ON public.user_study_sessions(subject_id);
CREATE INDEX idx_user_study_sessions_session_type ON public.user_study_sessions(session_type);
CREATE INDEX idx_user_study_sessions_started_at ON public.user_study_sessions(started_at);
CREATE INDEX idx_user_study_sessions_user_date ON public.user_study_sessions(user_id, started_at);

-- =====================================================
-- ADDITIONAL CONSTRAINTS
-- =====================================================

-- Ensure valid email format in user profiles
ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure positive values for time and score fields
ALTER TABLE public.topics 
ADD CONSTRAINT check_positive_study_time 
CHECK (estimated_study_time_minutes > 0);

ALTER TABLE public.quizzes 
ADD CONSTRAINT check_positive_time_limit 
CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);

ALTER TABLE public.quizzes 
ADD CONSTRAINT check_valid_passing_score 
CHECK (passing_score_percentage BETWEEN 0 AND 100);

ALTER TABLE public.quiz_questions 
ADD CONSTRAINT check_positive_points 
CHECK (points > 0);

ALTER TABLE public.user_flashcard_progress 
ADD CONSTRAINT check_valid_ease_factor 
CHECK (ease_factor >= 1.3 AND ease_factor <= 5.0);

ALTER TABLE public.user_flashcard_progress 
ADD CONSTRAINT check_positive_interval 
CHECK (interval_days > 0);

ALTER TABLE public.user_flashcard_progress 
ADD CONSTRAINT check_valid_repetitions 
CHECK (repetitions >= 0);

ALTER TABLE public.user_flashcard_progress 
ADD CONSTRAINT check_valid_reviews 
CHECK (total_reviews >= 0 AND correct_reviews >= 0 AND correct_reviews <= total_reviews);

ALTER TABLE public.user_quiz_attempts 
ADD CONSTRAINT check_positive_attempt_number 
CHECK (attempt_number > 0);

ALTER TABLE public.user_quiz_attempts 
ADD CONSTRAINT check_valid_score_percentage 
CHECK (score_percentage IS NULL OR (score_percentage >= 0 AND score_percentage <= 100));

ALTER TABLE public.user_quiz_attempts 
ADD CONSTRAINT check_valid_answers 
CHECK (correct_answers >= 0 AND correct_answers <= total_questions);

ALTER TABLE public.user_topic_progress 
ADD CONSTRAINT check_valid_completion_percentage 
CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

ALTER TABLE public.user_topic_progress 
ADD CONSTRAINT check_valid_flashcard_counts 
CHECK (flashcards_mastered >= 0 AND flashcards_total >= 0 AND flashcards_mastered <= flashcards_total);

ALTER TABLE public.user_topic_progress 
ADD CONSTRAINT check_valid_quiz_counts 
CHECK (quizzes_passed >= 0 AND quizzes_attempted >= 0 AND quizzes_passed <= quizzes_attempted);

ALTER TABLE public.user_study_sessions 
ADD CONSTRAINT check_positive_duration 
CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE public.user_study_sessions 
ADD CONSTRAINT check_valid_session_end 
CHECK (ended_at IS NULL OR ended_at >= started_at);

-- =====================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================

-- Create full-text search indexes for content search
CREATE INDEX idx_topics_content_search ON public.topics 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')));

CREATE INDEX idx_flashcards_content_search ON public.flashcards 
USING GIN(to_tsvector('english', front_content || ' ' || back_content || ' ' || COALESCE(explanation, '')));

CREATE INDEX idx_quiz_questions_content_search ON public.quiz_questions 
USING GIN(to_tsvector('english', question_text || ' ' || COALESCE(explanation, '')));

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =====================================================

-- For finding user's due flashcards
CREATE INDEX idx_user_flashcard_due ON public.user_flashcard_progress(user_id, next_review_date) 
WHERE next_review_date <= NOW();

-- For finding user's recent quiz attempts
CREATE INDEX idx_user_recent_quiz_attempts ON public.user_quiz_attempts(user_id, completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- For finding active flashcards by topic
CREATE INDEX idx_active_flashcards_by_topic ON public.flashcards(topic_id, is_active) 
WHERE is_active = true;

-- For finding published quizzes by topic
CREATE INDEX idx_published_quizzes_by_topic ON public.quizzes(topic_id, is_published) 
WHERE is_published = true;

-- For user progress analytics
CREATE INDEX idx_user_progress_analytics ON public.user_topic_progress(user_id, completion_percentage DESC, last_studied_at DESC);

-- =====================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Index only incomplete topics for progress tracking
CREATE INDEX idx_incomplete_topic_progress ON public.user_topic_progress(user_id, topic_id) 
WHERE is_completed = false;

-- Index only active flashcards that need review
CREATE INDEX idx_flashcards_due_review ON public.user_flashcard_progress(user_id, flashcard_id) 
WHERE next_review_date <= NOW() AND is_learned = false;

-- Index only recent study sessions for analytics
CREATE INDEX idx_recent_study_sessions ON public.user_study_sessions(user_id, started_at) 
WHERE started_at >= NOW() - INTERVAL '30 days';

-- Add comments for documentation
COMMENT ON INDEX idx_user_flashcard_due IS 'Optimizes queries for finding flashcards due for review';
COMMENT ON INDEX idx_topics_content_search IS 'Enables full-text search across topic content';
COMMENT ON INDEX idx_user_progress_analytics IS 'Optimizes user progress dashboard queries';
COMMENT ON INDEX idx_incomplete_topic_progress IS 'Optimizes queries for tracking incomplete topics';
COMMENT ON INDEX idx_flashcards_due_review IS 'Optimizes spaced repetition review queries';
