-- =====================================================
-- IGCSE Student Guide - Quiz Statistics Function
-- File 6: User Quiz Statistics
-- =====================================================
-- Execute this file after creating tables, indexes, RLS policies, and other functions

-- =====================================================
-- QUIZ STATISTICS FUNCTION
-- =====================================================

-- Function to get comprehensive quiz statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_quiz_statistics(p_user_id UUID)
RETURNS TABLE(
    total_quizzes INTEGER,
    completed_quizzes INTEGER,
    average_score DECIMAL,
    total_time_spent INTEGER,
    subjects_with_quizzes INTEGER,
    best_subject TEXT,
    recent_activity JSONB
) AS $$
DECLARE
    v_total_quizzes INTEGER;
    v_completed_quizzes INTEGER;
    v_average_score DECIMAL;
    v_total_time_spent INTEGER;
    v_subjects_with_quizzes INTEGER;
    v_best_subject TEXT;
    v_recent_activity JSONB;
BEGIN
    -- Get total number of published quizzes
    SELECT COUNT(*) INTO v_total_quizzes
    FROM public.quizzes
    WHERE is_published = true;

    -- Get number of completed quizzes by user
    SELECT COUNT(DISTINCT quiz_id) INTO v_completed_quizzes
    FROM public.user_quiz_attempts
    WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

    -- Get average score across all completed quizzes
    SELECT COALESCE(AVG(score_percentage), 0) INTO v_average_score
    FROM public.user_quiz_attempts
    WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

    -- Get total time spent on quizzes (in minutes)
    -- Assuming time_limit_minutes from quiz is used as approximation
    SELECT COALESCE(SUM(q.time_limit_minutes), 0) INTO v_total_time_spent
    FROM public.user_quiz_attempts uqa
    JOIN public.quizzes q ON q.id = uqa.quiz_id
    WHERE uqa.user_id = p_user_id
    AND uqa.completed_at IS NOT NULL;

    -- Get number of unique subjects with quizzes attempted
    SELECT COUNT(DISTINCT s.id) INTO v_subjects_with_quizzes
    FROM public.user_quiz_attempts uqa
    JOIN public.quizzes q ON q.id = uqa.quiz_id
    JOIN public.topics t ON t.id = q.topic_id
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE uqa.user_id = p_user_id
    AND uqa.completed_at IS NOT NULL;

    -- Get best performing subject (by average score)
    SELECT s.name INTO v_best_subject
    FROM public.user_quiz_attempts uqa
    JOIN public.quizzes q ON q.id = uqa.quiz_id
    JOIN public.topics t ON t.id = q.topic_id
    JOIN public.subjects s ON s.id = t.subject_id
    WHERE uqa.user_id = p_user_id
    AND uqa.completed_at IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY AVG(uqa.score_percentage) DESC
    LIMIT 1;

    -- Get recent activity (last 5 completed quiz attempts)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'quiz_id', uqa.quiz_id,
                'quiz_title', q.title,
                'subject_name', s.name,
                'score', uqa.score_percentage,
                'completed_at', uqa.completed_at
            )
            ORDER BY uqa.completed_at DESC
        ),
        '[]'::jsonb
    ) INTO v_recent_activity
    FROM (
        SELECT uqa.quiz_id, uqa.score_percentage, uqa.completed_at
        FROM public.user_quiz_attempts uqa
        WHERE uqa.user_id = p_user_id
        AND uqa.completed_at IS NOT NULL
        ORDER BY uqa.completed_at DESC
        LIMIT 5
    ) uqa
    JOIN public.quizzes q ON q.id = uqa.quiz_id
    JOIN public.topics t ON t.id = q.topic_id
    JOIN public.subjects s ON s.id = t.subject_id;

    -- Return the results
    RETURN QUERY SELECT 
        v_total_quizzes,
        v_completed_quizzes,
        v_average_score,
        v_total_time_spent,
        v_subjects_with_quizzes,
        v_best_subject,
        v_recent_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_quiz_statistics(UUID) IS 'Returns comprehensive quiz statistics for a user including totals, averages, and recent activity';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_quiz_statistics(UUID) TO authenticated;
