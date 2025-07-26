-- Ollama Question Generation Schema Updates
-- Add generation tracking fields to quiz_questions table

-- Add generation tracking columns
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS generation_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS generation_model TEXT,
ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);

-- Add index for generation queries
CREATE INDEX IF NOT EXISTS idx_quiz_questions_generation 
ON quiz_questions(generation_method, generation_timestamp);

-- Add comments for documentation
COMMENT ON COLUMN quiz_questions.generation_method IS 'Method used to generate question: manual, ollama_gemma, openai, etc.';
COMMENT ON COLUMN quiz_questions.generation_model IS 'Specific model used for generation: gemma3:4b, gpt-4o, etc.';
COMMENT ON COLUMN quiz_questions.quality_score IS 'Quality score from 0.0 to 1.0 based on validation';
COMMENT ON COLUMN quiz_questions.generation_timestamp IS 'Timestamp when question was generated';

-- Function to get topic question counts with generation breakdown
CREATE OR REPLACE FUNCTION get_topic_question_counts()
RETURNS TABLE (
    topic_id UUID,
    topic_title TEXT,
    subject_name TEXT,
    total_questions BIGINT,
    generated_questions BIGINT,
    manual_questions BIGINT,
    avg_quality_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as topic_id,
        t.title as topic_title,
        s.name as subject_name,
        COALESCE(COUNT(qq.id), 0) as total_questions,
        COALESCE(COUNT(qq.id) FILTER (WHERE qq.generation_method != 'manual' AND qq.generation_method IS NOT NULL), 0) as generated_questions,
        COALESCE(COUNT(qq.id) FILTER (WHERE qq.generation_method = 'manual' OR qq.generation_method IS NULL), 0) as manual_questions,
        ROUND(AVG(qq.quality_score), 2) as avg_quality_score
    FROM topics t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN quizzes q ON t.id = q.topic_id
    LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
    GROUP BY t.id, t.title, s.name
    ORDER BY s.name, t.title;
END;
$$ LANGUAGE plpgsql;

-- Function to get generation statistics
CREATE OR REPLACE FUNCTION get_generation_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    generation_date DATE,
    generation_method TEXT,
    questions_count BIGINT,
    avg_quality_score DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(qq.generation_timestamp) as generation_date,
        qq.generation_method,
        COUNT(*) as questions_count,
        ROUND(AVG(qq.quality_score), 2) as avg_quality_score
    FROM quiz_questions qq
    WHERE qq.generation_timestamp >= CURRENT_DATE - INTERVAL '%s days' % days_back
    AND qq.generation_method IS NOT NULL
    GROUP BY DATE(qq.generation_timestamp), qq.generation_method
    ORDER BY generation_date DESC, generation_method;
END;
$$ LANGUAGE plpgsql;

-- Function to get quality distribution
CREATE OR REPLACE FUNCTION get_quality_distribution()
RETURNS TABLE (
    quality_range TEXT,
    question_count BIGINT,
    percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH quality_ranges AS (
        SELECT 
            CASE 
                WHEN quality_score >= 0.9 THEN 'Excellent (0.9-1.0)'
                WHEN quality_score >= 0.8 THEN 'Good (0.8-0.9)'
                WHEN quality_score >= 0.7 THEN 'Acceptable (0.7-0.8)'
                WHEN quality_score >= 0.6 THEN 'Poor (0.6-0.7)'
                ELSE 'Very Poor (<0.6)'
            END as range_label,
            COUNT(*) as count
        FROM quiz_questions 
        WHERE quality_score IS NOT NULL
        GROUP BY range_label
    ),
    total_count AS (
        SELECT SUM(count) as total FROM quality_ranges
    )
    SELECT 
        qr.range_label as quality_range,
        qr.count as question_count,
        ROUND((qr.count::DECIMAL / tc.total * 100), 2) as percentage
    FROM quality_ranges qr
    CROSS JOIN total_count tc
    ORDER BY 
        CASE qr.range_label
            WHEN 'Excellent (0.9-1.0)' THEN 1
            WHEN 'Good (0.8-0.9)' THEN 2
            WHEN 'Acceptable (0.7-0.8)' THEN 3
            WHEN 'Poor (0.6-0.7)' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

-- Create a view for generation monitoring
CREATE OR REPLACE VIEW generation_monitoring AS
SELECT 
    qq.id,
    qq.question_text,
    qq.generation_method,
    qq.generation_model,
    qq.generation_timestamp,
    qq.quality_score,
    t.title as topic_title,
    s.name as subject_name,
    q.title as quiz_title
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
JOIN topics t ON q.topic_id = t.id
JOIN subjects s ON t.subject_id = s.id
WHERE qq.generation_method IS NOT NULL
ORDER BY qq.generation_timestamp DESC;

-- Grant necessary permissions
GRANT SELECT ON generation_monitoring TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_topic_question_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_generation_stats(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_quality_distribution() TO anon, authenticated;
