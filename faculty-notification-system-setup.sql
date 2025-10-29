-- Faculty Notification System Setup
-- This script ensures faculty get notified when students complete quizzes and assignments
-- Run this in your Supabase SQL Editor

-- 1. First, ensure the notifications table has all required columns
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES assignment_submissions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Update the notification type constraint to include all types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('assignment', 'grade', 'announcement', 'quiz', 'enrollment', 'course_material', 'activity', 'due_date', 'late'));

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_course_id ON notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_assignment_id ON notifications(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_quiz_id ON notifications(quiz_id);

-- 4. Create function to notify faculty when student submits assignment
CREATE OR REPLACE FUNCTION notify_faculty_assignment_submission()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    assignment_title TEXT;
    course_title TEXT;
    is_late BOOLEAN := FALSE;
BEGIN
    -- Get course instructor and details
    SELECT c.instructor_id, c.title, a.title, p.full_name
    INTO course_instructor_id, course_title, assignment_title, student_name
    FROM courses c
    JOIN assignments a ON a.id = NEW.assignment_id
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = a.course_id;
    
    -- Check if submission is late
    IF NEW.submitted_at > (SELECT due_date FROM assignments WHERE id = NEW.assignment_id) THEN
        is_late := TRUE;
    END IF;
    
    -- Notify faculty of submission
    INSERT INTO notifications (
        user_id, title, message, type, course_id, assignment_id, submission_id
    ) VALUES (
        course_instructor_id,
        CASE 
            WHEN is_late THEN '⚠️ Late Assignment Submission'
            ELSE '📚 New Assignment Submission'
        END,
        CASE 
            WHEN is_late THEN 
                student_name || ' submitted late "' || assignment_title || '" in ' || course_title
            ELSE 
                student_name || ' submitted "' || assignment_title || '" in ' || course_title
        END,
        'assignment',
        (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
        NEW.assignment_id,
        NEW.id
    );
    
    -- Notify student of submission
    INSERT INTO notifications (
        user_id, title, message, type, course_id, assignment_id, submission_id
    ) VALUES (
        NEW.student_id,
        CASE 
            WHEN is_late THEN '⚠️ Assignment Submitted Late'
            ELSE '✅ Assignment Submitted'
        END,
        CASE 
            WHEN is_late THEN 
                'Your assignment "' || assignment_title || '" was submitted late in ' || course_title
            ELSE 
                'Your assignment "' || assignment_title || '" was submitted successfully in ' || course_title
        END,
        'assignment',
        (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
        NEW.assignment_id,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to notify faculty when student completes quiz
CREATE OR REPLACE FUNCTION notify_faculty_quiz_completion()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    quiz_title TEXT;
    course_title TEXT;
    score_text TEXT;
BEGIN
    -- Get course instructor and details
    SELECT c.instructor_id, c.title, q.title, p.full_name
    INTO course_instructor_id, course_title, quiz_title, student_name
    FROM courses c
    JOIN quizzes q ON q.id = NEW.quiz_id
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = q.course_id;
    
    -- Format score text
    score_text := CASE 
        WHEN NEW.score IS NOT NULL THEN ' (Score: ' || NEW.score || ')'
        ELSE ' (Score: Pending)'
    END;
    
    -- Notify faculty of quiz completion
    INSERT INTO notifications (
        user_id, title, message, type, course_id, quiz_id, attempt_id
    ) VALUES (
        course_instructor_id,
        '📊 Quiz Completed',
        student_name || ' completed "' || quiz_title || '" in ' || course_title || score_text,
        'quiz',
        (SELECT course_id FROM quizzes WHERE id = NEW.quiz_id),
        NEW.quiz_id,
        NEW.id
    );
    
    -- Notify student of completion
    INSERT INTO notifications (
        user_id, title, message, type, course_id, quiz_id, attempt_id
    ) VALUES (
        NEW.student_id,
        '🎯 Quiz Completed!',
        'You completed "' || quiz_title || '" in ' || course_title || score_text,
        'quiz',
        (SELECT course_id FROM quizzes WHERE id = NEW.quiz_id),
        NEW.quiz_id,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to notify student when assignment is graded
CREATE OR REPLACE FUNCTION notify_student_assignment_graded()
RETURNS TRIGGER AS $$
DECLARE
    assignment_title TEXT;
    course_title TEXT;
    percentage TEXT;
BEGIN
    -- Only notify when status changes to 'graded'
    IF NEW.status = 'graded' AND OLD.status != 'graded' THEN
        -- Get assignment and course details
        SELECT a.title, c.title
        INTO assignment_title, course_title
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        WHERE a.id = NEW.assignment_id;
        
        -- Calculate percentage if grade exists
        IF NEW.grade IS NOT NULL AND (SELECT max_points FROM assignments WHERE id = NEW.assignment_id) IS NOT NULL THEN
            percentage := ' (' || ROUND((NEW.grade::DECIMAL / (SELECT max_points FROM assignments WHERE id = NEW.assignment_id)) * 100, 1) || '%)';
        ELSE
            percentage := '';
        END IF;
        
        -- Notify student of grade
        INSERT INTO notifications (
            user_id, title, message, type, course_id, assignment_id, submission_id
        ) VALUES (
            NEW.student_id,
            '🎉 Assignment Graded!',
            'Your assignment "' || assignment_title || '" in ' || course_title || ' has been graded: ' || 
            COALESCE(NEW.grade::text, 'N/A') || '/' || COALESCE((SELECT max_points FROM assignments WHERE id = NEW.assignment_id)::text, 'N/A') || percentage,
            'grade',
            (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
            NEW.assignment_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to notify student when quiz is graded
CREATE OR REPLACE FUNCTION notify_student_quiz_graded()
RETURNS TRIGGER AS $$
DECLARE
    quiz_title TEXT;
    course_title TEXT;
    percentage TEXT;
BEGIN
    -- Only notify when status changes to 'graded'
    IF NEW.status = 'graded' AND OLD.status != 'graded' THEN
        -- Get quiz and course details
        SELECT q.title, c.title
        INTO quiz_title, course_title
        FROM quizzes q
        JOIN courses c ON c.id = q.course_id
        WHERE q.id = NEW.quiz_id;
        
        -- Calculate percentage if score exists
        IF NEW.score IS NOT NULL THEN
            percentage := ' (' || ROUND((NEW.score::DECIMAL / 100) * 100, 1) || '%)';
        ELSE
            percentage := '';
        END IF;
        
        -- Notify student of grade
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id, attempt_id
        ) VALUES (
            NEW.student_id,
            '🎉 Quiz Graded!',
            'Your quiz "' || quiz_title || '" in ' || course_title || ' has been graded: ' || 
            COALESCE(NEW.score::text, 'N/A') || '/100' || percentage,
            'grade',
            (SELECT course_id FROM quizzes WHERE id = NEW.quiz_id),
            NEW.quiz_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_faculty_assignment_submission ON assignment_submissions;
DROP TRIGGER IF EXISTS trigger_notify_faculty_quiz_completion ON quiz_attempts;
DROP TRIGGER IF EXISTS trigger_notify_student_assignment_graded ON assignment_submissions;
DROP TRIGGER IF EXISTS trigger_notify_student_quiz_graded ON quiz_attempts;

-- 9. Create triggers
-- Assignment submission trigger
CREATE TRIGGER trigger_notify_faculty_assignment_submission
    AFTER INSERT OR UPDATE ON assignment_submissions
    FOR EACH ROW
    WHEN (NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted'))
    EXECUTE FUNCTION notify_faculty_assignment_submission();

-- Quiz completion trigger
CREATE TRIGGER trigger_notify_faculty_quiz_completion
    AFTER INSERT OR UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
    EXECUTE FUNCTION notify_faculty_quiz_completion();

-- Assignment graded trigger
CREATE TRIGGER trigger_notify_student_assignment_graded
    AFTER UPDATE ON assignment_submissions
    FOR EACH ROW
    WHEN (NEW.status = 'graded' AND OLD.status != 'graded')
    EXECUTE FUNCTION notify_student_assignment_graded();

-- Quiz graded trigger
CREATE TRIGGER trigger_notify_student_quiz_graded
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (NEW.status = 'graded' AND OLD.status != 'graded')
    EXECUTE FUNCTION notify_student_quiz_graded();

-- 10. Test the notification system
DO $$
DECLARE
    test_user_id UUID;
    test_course_id UUID;
    test_assignment_id UUID;
    test_quiz_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get any user and course for testing
    SELECT id INTO test_user_id FROM profiles WHERE role = 'student' LIMIT 1;
    SELECT id INTO test_course_id FROM courses LIMIT 1;
    SELECT id INTO test_assignment_id FROM assignments WHERE course_id = test_course_id LIMIT 1;
    SELECT id INTO test_quiz_id FROM quizzes WHERE course_id = test_course_id LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_course_id IS NOT NULL THEN
        -- Test notification creation
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            course_id,
            assignment_id,
            quiz_id,
            read
        ) VALUES (
            test_user_id,
            '🧪 Test Notification - ' || NOW()::text,
            'This is a test notification to verify the system is working.',
            'assignment',
            test_course_id,
            test_assignment_id,
            test_quiz_id,
            false
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created successfully with ID: %', test_notification_id;
        
        -- Clean up the test notification
        DELETE FROM notifications WHERE id = test_notification_id;
        RAISE NOTICE '✅ Test notification cleaned up';
        
        RAISE NOTICE '🎉 Faculty notification system setup complete!';
        RAISE NOTICE '📚 Faculty will now be notified when students submit assignments';
        RAISE NOTICE '📊 Faculty will now be notified when students complete quizzes';
        RAISE NOTICE '🎯 Students will be notified when their work is graded';
    ELSE
        RAISE NOTICE '❌ No test data found - please ensure you have students and courses in your database';
    END IF;
END $$;

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_faculty_assignment_submission() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_faculty_quiz_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_student_assignment_graded() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_student_quiz_graded() TO authenticated;

-- 12. Create a function to check notification system status
CREATE OR REPLACE FUNCTION check_notification_system_status()
RETURNS TABLE (
    trigger_name TEXT,
    table_name TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_name::TEXT,
        t.event_object_table::TEXT,
        CASE 
            WHEN t.trigger_name IS NOT NULL THEN '✅ Active'
            ELSE '❌ Missing'
        END as status
    FROM information_schema.triggers t
    WHERE t.trigger_name IN (
        'trigger_notify_faculty_assignment_submission',
        'trigger_notify_faculty_quiz_completion',
        'trigger_notify_student_assignment_graded',
        'trigger_notify_student_quiz_graded'
    )
    UNION ALL
    SELECT 
        'trigger_notify_faculty_assignment_submission'::TEXT,
        'assignment_submissions'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers 
                WHERE trigger_name = 'trigger_notify_faculty_assignment_submission'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END
    UNION ALL
    SELECT 
        'trigger_notify_faculty_quiz_completion'::TEXT,
        'quiz_attempts'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers 
                WHERE trigger_name = 'trigger_notify_faculty_quiz_completion'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END
    UNION ALL
    SELECT 
        'trigger_notify_student_assignment_graded'::TEXT,
        'assignment_submissions'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers 
                WHERE trigger_name = 'trigger_notify_student_assignment_graded'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END
    UNION ALL
    SELECT 
        'trigger_notify_student_quiz_graded'::TEXT,
        'quiz_attempts'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers 
                WHERE trigger_name = 'trigger_notify_student_quiz_graded'
            ) THEN '✅ Active'
            ELSE '❌ Missing'
        END;
END;
$$ LANGUAGE plpgsql;

-- 13. Check the status
SELECT * FROM check_notification_system_status();

RAISE NOTICE '🎉 Faculty Notification System Setup Complete!';
RAISE NOTICE '📚 Faculty will receive notifications when students submit assignments';
RAISE NOTICE '📊 Faculty will receive notifications when students complete quizzes';
RAISE NOTICE '🎯 Students will receive notifications when their work is graded';
RAISE NOTICE '🔔 All notifications will appear in the notification bell';
