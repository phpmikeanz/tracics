-- Notification Triggers for Your Database Schema
-- These triggers automatically create notifications when events occur

-- 1. Assignment Submission Notifications
CREATE OR REPLACE FUNCTION notify_assignment_submission()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    assignment_title TEXT;
    course_title TEXT;
BEGIN
    -- Get course instructor and details
    SELECT c.instructor_id, c.title, a.title, p.full_name
    INTO course_instructor_id, course_title, assignment_title, student_name
    FROM courses c
    JOIN assignments a ON a.id = NEW.assignment_id
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = a.course_id;
    
    -- Notify faculty of submission
    INSERT INTO notifications (
        user_id, title, message, type, course_id, assignment_id, submission_id
    ) VALUES (
        course_instructor_id,
        CASE 
            WHEN NEW.status = 'submitted' AND OLD.status = 'draft' THEN '📚 New Assignment Submission'
            WHEN NEW.status = 'graded' AND OLD.status = 'submitted' THEN '✅ Assignment Graded'
            ELSE '📝 Assignment Updated'
        END,
        CASE 
            WHEN NEW.status = 'submitted' AND OLD.status = 'draft' THEN 
                student_name || ' submitted "' || assignment_title || '" in ' || course_title
            WHEN NEW.status = 'graded' AND OLD.status = 'submitted' THEN 
                'You graded "' || assignment_title || '" for ' || student_name || ' (Score: ' || COALESCE(NEW.grade::text, 'N/A') || ')'
            ELSE 
                'Assignment "' || assignment_title || '" was updated for ' || student_name
        END,
        CASE 
            WHEN NEW.status = 'submitted' THEN 'assignment'
            WHEN NEW.status = 'graded' THEN 'grade'
            ELSE 'assignment'
        END,
        (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
        NEW.assignment_id,
        NEW.id
    );
    
    -- Notify student of grade (if graded)
    IF NEW.status = 'graded' AND OLD.status = 'submitted' THEN
        INSERT INTO notifications (
            user_id, title, message, type, course_id, assignment_id, submission_id
        ) VALUES (
            NEW.student_id,
            '🎉 Assignment Graded!',
            'Your assignment "' || assignment_title || '" has been graded. Score: ' || COALESCE(NEW.grade::text, 'N/A'),
            'grade',
            (SELECT course_id FROM assignments WHERE id = NEW.assignment_id),
            NEW.assignment_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignment submissions
DROP TRIGGER IF EXISTS trigger_notify_assignment_submission ON assignment_submissions;
CREATE TRIGGER trigger_notify_assignment_submission
    AFTER UPDATE ON assignment_submissions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_assignment_submission();

-- 2. Quiz Attempt Notifications
CREATE OR REPLACE FUNCTION notify_quiz_attempt()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    quiz_title TEXT;
    course_title TEXT;
BEGIN
    -- Get course instructor and details
    SELECT c.instructor_id, c.title, q.title, p.full_name
    INTO course_instructor_id, course_title, quiz_title, student_name
    FROM courses c
    JOIN quizzes q ON q.id = NEW.quiz_id
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = q.course_id;
    
    -- Notify faculty of quiz completion
    IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id, attempt_id
        ) VALUES (
            course_instructor_id,
            '📊 Quiz Completed',
            student_name || ' completed "' || quiz_title || '" in ' || course_title || 
            ' (Score: ' || COALESCE(NEW.score::text, 'N/A') || ')',
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
            'You completed "' || quiz_title || '" with a score of ' || COALESCE(NEW.score::text, 'N/A'),
            'quiz',
            (SELECT course_id FROM quizzes WHERE id = NEW.quiz_id),
            NEW.quiz_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quiz attempts
DROP TRIGGER IF EXISTS trigger_notify_quiz_attempt ON quiz_attempts;
CREATE TRIGGER trigger_notify_quiz_attempt
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_quiz_attempt();

-- 3. Enrollment Notifications
CREATE OR REPLACE FUNCTION notify_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    course_instructor_id UUID;
    student_name TEXT;
    course_title TEXT;
BEGIN
    -- Get course instructor and student details
    SELECT c.instructor_id, c.title, p.full_name
    INTO course_instructor_id, course_title, student_name
    FROM courses c
    JOIN profiles p ON p.id = NEW.student_id
    WHERE c.id = NEW.course_id;
    
    -- Notify faculty of enrollment request
    IF NEW.status = 'pending' AND OLD.status IS NULL THEN
        INSERT INTO notifications (
            user_id, title, message, type, course_id, enrollment_id
        ) VALUES (
            course_instructor_id,
            '👥 New Enrollment Request',
            student_name || ' has requested to enroll in ' || course_title,
            'enrollment',
            NEW.course_id,
            NEW.id
        );
        
        -- Notify student of request
        INSERT INTO notifications (
            user_id, title, message, type, course_id, enrollment_id
        ) VALUES (
            NEW.student_id,
            '📝 Enrollment Requested',
            'You have requested to enroll in ' || course_title || '. Waiting for approval.',
            'enrollment',
            NEW.course_id,
            NEW.id
        );
    END IF;
    
    -- Notify student of enrollment status change
    IF OLD.status IS NOT NULL AND OLD.status != NEW.status THEN
        INSERT INTO notifications (
            user_id, title, message, type, course_id, enrollment_id
        ) VALUES (
            NEW.student_id,
            CASE 
                WHEN NEW.status = 'approved' THEN '🎉 Enrollment Approved!'
                WHEN NEW.status = 'declined' THEN '❌ Enrollment Declined'
                ELSE '📝 Enrollment Status Updated'
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 
                    'Your enrollment request for ' || course_title || ' has been approved! You can now access the course.'
                WHEN NEW.status = 'declined' THEN 
                    'Your enrollment request for ' || course_title || ' has been declined.'
                ELSE 
                    'Your enrollment status for ' || course_title || ' has been updated.'
            END,
            'enrollment',
            NEW.course_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enrollments
DROP TRIGGER IF EXISTS trigger_notify_enrollment ON enrollments;
CREATE TRIGGER trigger_notify_enrollment
    AFTER INSERT OR UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION notify_enrollment();

-- 4. New Assignment Notifications
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
BEGIN
    -- Notify all enrolled students about new assignment
    FOR student_record IN 
        SELECT e.student_id, p.full_name
        FROM enrollments e
        JOIN profiles p ON p.id = e.student_id
        WHERE e.course_id = NEW.course_id 
        AND e.status = 'approved'
    LOOP
        INSERT INTO notifications (
            user_id, title, message, type, course_id, assignment_id
        ) VALUES (
            student_record.student_id,
            '📚 New Assignment Available',
            'A new assignment "' || NEW.title || '" has been posted in ' || 
            (SELECT title FROM courses WHERE id = NEW.course_id),
            'assignment',
            NEW.course_id,
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new assignments
DROP TRIGGER IF EXISTS trigger_notify_new_assignment ON assignments;
CREATE TRIGGER trigger_notify_new_assignment
    AFTER INSERT ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_assignment();

-- 5. New Quiz Notifications
CREATE OR REPLACE FUNCTION notify_new_quiz()
RETURNS TRIGGER AS $$
DECLARE
    student_record RECORD;
BEGIN
    -- Notify all enrolled students about new quiz
    FOR student_record IN 
        SELECT e.student_id, p.full_name
        FROM enrollments e
        JOIN profiles p ON p.id = e.student_id
        WHERE e.course_id = NEW.course_id 
        AND e.status = 'approved'
    LOOP
        INSERT INTO notifications (
            user_id, title, message, type, course_id, quiz_id
        ) VALUES (
            student_record.student_id,
            '📝 New Quiz Available',
            'A new quiz "' || NEW.title || '" has been posted in ' || 
            (SELECT title FROM courses WHERE id = NEW.course_id),
            'quiz',
            NEW.course_id,
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new quizzes
DROP TRIGGER IF EXISTS trigger_notify_new_quiz ON quizzes;
CREATE TRIGGER trigger_notify_new_quiz
    AFTER INSERT ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_quiz();

-- 6. Assignment Due Date Reminders (Manual function to call)
CREATE OR REPLACE FUNCTION send_assignment_reminders()
RETURNS INTEGER AS $$
DECLARE
    assignment_record RECORD;
    student_record RECORD;
    reminder_count INTEGER := 0;
BEGIN
    -- Find assignments due in the next 24 hours
    FOR assignment_record IN 
        SELECT a.id, a.title, a.due_date, c.title as course_title, c.id as course_id
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        WHERE a.due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    LOOP
        -- Notify all enrolled students
        FOR student_record IN 
            SELECT e.student_id, p.full_name
            FROM enrollments e
            JOIN profiles p ON p.id = e.student_id
            WHERE e.course_id = assignment_record.course_id 
            AND e.status = 'approved'
        LOOP
            INSERT INTO notifications (
                user_id, title, message, type, course_id, assignment_id
            ) VALUES (
                student_record.student_id,
                '⏰ Assignment Due Soon',
                'Assignment "' || assignment_record.title || '" is due soon in ' || assignment_record.course_title,
                'assignment',
                assignment_record.course_id,
                assignment_record.id
            );
            
            reminder_count := reminder_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_assignment_reminders() TO authenticated;

-- Create a function to manually send notifications
CREATE OR REPLACE FUNCTION send_course_announcement(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_sender_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    student_record RECORD;
    notification_count INTEGER := 0;
BEGIN
    -- Send announcement to all enrolled students
    FOR student_record IN 
        SELECT e.student_id
        FROM enrollments e
        WHERE e.course_id = p_course_id 
        AND e.status = 'approved'
    LOOP
        INSERT INTO notifications (
            user_id, title, message, type, course_id
        ) VALUES (
            student_record.student_id,
            '📢 ' || p_title,
            p_message,
            'announcement',
            p_course_id
        );
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_course_announcement(UUID, TEXT, TEXT, UUID) TO authenticated;
