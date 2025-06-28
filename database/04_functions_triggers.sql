-- =====================================================
-- IGCSE Student Guide - Database Functions & Triggers
-- File 4: Business Logic & Automation
-- =====================================================
-- Execute this file after creating tables, indexes, and RLS policies

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SPACED REPETITION FUNCTIONS
-- =====================================================

-- Function to calculate next review date using SM-2 algorithm
CREATE OR REPLACE FUNCTION public.calculate_next_review(
    current_ease_factor DECIMAL,
    current_interval INTEGER,
    repetitions INTEGER,
    review_rating INTEGER
)
RETURNS TABLE(
    new_ease_factor DECIMAL,
    new_interval INTEGER,
    new_repetitions INTEGER,
    next_review_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    ease DECIMAL := current_ease_factor;
    interval_days INTEGER := current_interval;
    reps INTEGER := repetitions;
BEGIN
    -- SM-2 Algorithm implementation
    IF review_rating >= 3 THEN
        -- Correct response
        IF reps = 0 THEN
            interval_days := 1;
        ELSIF reps = 1 THEN
            interval_days := 6;
        ELSE
            interval_days := ROUND(interval_days * ease);
        END IF;
        reps := reps + 1;
    ELSE
        -- Incorrect response - reset
        reps := 0;
        interval_days := 1;
    END IF;
    
    -- Update ease factor
    ease := ease + (0.1 - (5 - review_rating) * (0.08 + (5 - review_rating) * 0.02));
    
    -- Ensure ease factor stays within bounds
    IF ease < 1.3 THEN
        ease := 1.3;
    END IF;
    
    RETURN QUERY SELECT 
        ease,
        interval_days,
        reps,
        (NOW() + (interval_days || ' days')::INTERVAL)::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Function to update flashcard progress after review
CREATE OR REPLACE FUNCTION public.update_flashcard_progress(
    p_user_id UUID,
    p_flashcard_id UUID,
    p_rating INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_progress RECORD;
    new_values RECORD;
BEGIN
    -- Get current progress or create default values
    SELECT * INTO current_progress
    FROM public.user_flashcard_progress
    WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;
    
    IF NOT FOUND THEN
        -- Create initial progress record
        INSERT INTO public.user_flashcard_progress (
            user_id, flashcard_id, ease_factor, interval_days, repetitions,
            next_review_date, total_reviews, correct_reviews, last_review_date, last_review_rating
        ) VALUES (
            p_user_id, p_flashcard_id, 2.5, 1, 0,
            NOW(), 1, CASE WHEN p_rating >= 3 THEN 1 ELSE 0 END, NOW(), p_rating
        );
        RETURN;
    END IF;
    
    -- Calculate new values using SM-2 algorithm
    SELECT * INTO new_values
    FROM public.calculate_next_review(
        current_progress.ease_factor,
        current_progress.interval_days,
        current_progress.repetitions,
        p_rating
    );
    
    -- Update progress record
    UPDATE public.user_flashcard_progress
    SET
        ease_factor = new_values.new_ease_factor,
        interval_days = new_values.new_interval,
        repetitions = new_values.new_repetitions,
        next_review_date = new_values.next_review_date,
        total_reviews = total_reviews + 1,
        correct_reviews = correct_reviews + CASE WHEN p_rating >= 3 THEN 1 ELSE 0 END,
        last_review_date = NOW(),
        last_review_rating = p_rating,
        is_learned = CASE WHEN new_values.new_repetitions >= 3 AND new_values.new_interval >= 21 THEN true ELSE false END,
        updated_at = NOW()
    WHERE user_id = p_user_id AND flashcard_id = p_flashcard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROGRESS CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate topic progress for a user
CREATE OR REPLACE FUNCTION public.calculate_topic_progress(
    p_user_id UUID,
    p_topic_id UUID
)
RETURNS VOID AS $$
DECLARE
    flashcard_stats RECORD;
    quiz_stats RECORD;
    completion_pct DECIMAL := 0;
BEGIN
    -- Get flashcard statistics
    SELECT 
        COUNT(*) as total_flashcards,
        COUNT(CASE WHEN ufp.is_learned = true THEN 1 END) as mastered_flashcards
    INTO flashcard_stats
    FROM public.flashcards f
    LEFT JOIN public.user_flashcard_progress ufp ON f.id = ufp.flashcard_id AND ufp.user_id = p_user_id
    WHERE f.topic_id = p_topic_id AND f.is_active = true;
    
    -- Get quiz statistics
    SELECT 
        COUNT(DISTINCT q.id) as total_quizzes,
        COUNT(DISTINCT CASE WHEN uqa.passed = true THEN q.id END) as passed_quizzes,
        MAX(uqa.score_percentage) as best_score
    INTO quiz_stats
    FROM public.quizzes q
    LEFT JOIN public.user_quiz_attempts uqa ON q.id = uqa.quiz_id AND uqa.user_id = p_user_id
    WHERE q.topic_id = p_topic_id AND q.is_published = true;
    
    -- Calculate completion percentage
    -- 70% weight for flashcards, 30% weight for quizzes
    IF flashcard_stats.total_flashcards > 0 THEN
        completion_pct := completion_pct + (flashcard_stats.mastered_flashcards::DECIMAL / flashcard_stats.total_flashcards * 70);
    END IF;
    
    IF quiz_stats.total_quizzes > 0 THEN
        completion_pct := completion_pct + (quiz_stats.passed_quizzes::DECIMAL / quiz_stats.total_quizzes * 30);
    END IF;
    
    -- Insert or update topic progress
    INSERT INTO public.user_topic_progress (
        user_id, topic_id, completion_percentage, flashcards_mastered, flashcards_total,
        quizzes_passed, quizzes_attempted, best_quiz_score, last_studied_at,
        is_completed, completed_at, updated_at
    ) VALUES (
        p_user_id, p_topic_id, completion_pct, flashcard_stats.mastered_flashcards, flashcard_stats.total_flashcards,
        quiz_stats.passed_quizzes, 
        (SELECT COUNT(DISTINCT quiz_id) FROM public.user_quiz_attempts WHERE user_id = p_user_id AND quiz_id IN (SELECT id FROM public.quizzes WHERE topic_id = p_topic_id)),
        COALESCE(quiz_stats.best_score, 0), NOW(),
        completion_pct >= 90, CASE WHEN completion_pct >= 90 THEN NOW() ELSE NULL END, NOW()
    )
    ON CONFLICT (user_id, topic_id) DO UPDATE SET
        completion_percentage = EXCLUDED.completion_percentage,
        flashcards_mastered = EXCLUDED.flashcards_mastered,
        flashcards_total = EXCLUDED.flashcards_total,
        quizzes_passed = EXCLUDED.quizzes_passed,
        quizzes_attempted = EXCLUDED.quizzes_attempted,
        best_quiz_score = GREATEST(user_topic_progress.best_quiz_score, EXCLUDED.best_quiz_score),
        last_studied_at = EXCLUDED.last_studied_at,
        is_completed = EXCLUDED.is_completed,
        completed_at = CASE WHEN EXCLUDED.is_completed AND user_topic_progress.completed_at IS NULL THEN NOW() ELSE user_topic_progress.completed_at END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's daily study streak
CREATE OR REPLACE FUNCTION public.get_user_study_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    has_activity BOOLEAN;
BEGIN
    LOOP
        -- Check if user had any study activity on this date
        SELECT EXISTS(
            SELECT 1 FROM public.user_study_sessions
            WHERE user_id = p_user_id 
            AND DATE(started_at) = check_date
            AND ended_at IS NOT NULL
            AND duration_minutes > 5 -- Minimum 5 minutes to count
        ) INTO has_activity;
        
        IF has_activity THEN
            streak_count := streak_count + 1;
            check_date := check_date - 1;
        ELSE
            -- If today has no activity, don't break the streak yet
            IF check_date = CURRENT_DATE THEN
                check_date := check_date - 1;
                CONTINUE;
            END IF;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get user dashboard statistics
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE(
    study_streak INTEGER,
    flashcards_reviewed_today INTEGER,
    flashcards_due INTEGER,
    quizzes_completed_this_week INTEGER,
    average_quiz_score DECIMAL,
    total_study_time_this_week INTEGER,
    topics_completed INTEGER,
    topics_in_progress INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        public.get_user_study_streak(p_user_id),
        (SELECT COUNT(*) FROM public.user_flashcard_progress 
         WHERE user_id = p_user_id AND DATE(last_review_date) = CURRENT_DATE)::INTEGER,
        (SELECT COUNT(*) FROM public.user_flashcard_progress 
         WHERE user_id = p_user_id AND next_review_date <= NOW())::INTEGER,
        (SELECT COUNT(*) FROM public.user_quiz_attempts 
         WHERE user_id = p_user_id AND completed_at >= DATE_TRUNC('week', NOW()))::INTEGER,
        (SELECT AVG(score_percentage) FROM public.user_quiz_attempts 
         WHERE user_id = p_user_id AND completed_at IS NOT NULL)::DECIMAL,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM public.user_study_sessions 
         WHERE user_id = p_user_id AND started_at >= DATE_TRUNC('week', NOW()))::INTEGER,
        (SELECT COUNT(*) FROM public.user_topic_progress 
         WHERE user_id = p_user_id AND is_completed = true)::INTEGER,
        (SELECT COUNT(*) FROM public.user_topic_progress 
         WHERE user_id = p_user_id AND is_completed = false AND completion_percentage > 0)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp on user profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at timestamp on topics
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at timestamp on flashcards
CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON public.flashcards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at timestamp on quizzes
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at timestamp on user flashcard progress
CREATE TRIGGER update_user_flashcard_progress_updated_at
    BEFORE UPDATE ON public.user_flashcard_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at timestamp on user topic progress
CREATE TRIGGER update_user_topic_progress_updated_at
    BEFORE UPDATE ON public.user_topic_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to automatically calculate topic progress when flashcard progress changes
CREATE OR REPLACE FUNCTION public.trigger_update_topic_progress()
RETURNS TRIGGER AS $$
DECLARE
    topic_id_to_update UUID;
BEGIN
    -- Get the topic ID from the flashcard
    SELECT f.topic_id INTO topic_id_to_update
    FROM public.flashcards f
    WHERE f.id = COALESCE(NEW.flashcard_id, OLD.flashcard_id);
    
    -- Update topic progress
    PERFORM public.calculate_topic_progress(
        COALESCE(NEW.user_id, OLD.user_id),
        topic_id_to_update
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_topic_progress_on_flashcard_change
    AFTER INSERT OR UPDATE OR DELETE ON public.user_flashcard_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_topic_progress();

-- Trigger to automatically calculate topic progress when quiz attempts change
CREATE OR REPLACE FUNCTION public.trigger_update_topic_progress_quiz()
RETURNS TRIGGER AS $$
DECLARE
    topic_id_to_update UUID;
BEGIN
    -- Get the topic ID from the quiz
    SELECT q.topic_id INTO topic_id_to_update
    FROM public.quizzes q
    WHERE q.id = COALESCE(NEW.quiz_id, OLD.quiz_id);
    
    -- Update topic progress
    PERFORM public.calculate_topic_progress(
        COALESCE(NEW.user_id, OLD.user_id),
        topic_id_to_update
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_topic_progress_on_quiz_change
    AFTER INSERT OR UPDATE ON public.user_quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_topic_progress_quiz();

-- Add function comments
COMMENT ON FUNCTION public.calculate_next_review(DECIMAL, INTEGER, INTEGER, INTEGER) IS 'Implements SM-2 spaced repetition algorithm';
COMMENT ON FUNCTION public.update_flashcard_progress(UUID, UUID, INTEGER) IS 'Updates user flashcard progress after review session';
COMMENT ON FUNCTION public.calculate_topic_progress(UUID, UUID) IS 'Calculates and updates user progress for a specific topic';
COMMENT ON FUNCTION public.get_user_study_streak(UUID) IS 'Calculates consecutive days of study activity';
COMMENT ON FUNCTION public.get_user_dashboard_stats(UUID) IS 'Returns comprehensive dashboard statistics for a user';

-- =====================================================
-- USER REGISTRATION TRIGGER
-- =====================================================

-- Function to automatically create user profile after registration
CREATE OR REPLACE FUNCTION public.create_user_profile_on_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a user profile record for the new user
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NOW(),
        NOW()
    )
    -- Do nothing if the profile already exists (prevents duplicate errors)
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile after user registration
CREATE TRIGGER create_user_profile_after_registration
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_profile_on_registration();

COMMENT ON FUNCTION public.create_user_profile_on_registration() IS 'Creates a user profile record when a new user registers';
