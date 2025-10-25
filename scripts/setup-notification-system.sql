-- Setup Comprehensive Notification System for Supabase
-- This script ensures all necessary tables and relationships are in place

-- Enable RLS (Row Level Security) if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Update notifications table to match your schema
-- Add missing columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES assignment_submissions(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_course_id ON notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_assignment_id ON notifications(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_quiz_id ON notifications(quiz_id);
CREATE INDEX IF NOT EXISTS idx_notifications_enrollment_id ON notifications(enrollment_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for notifications
-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notifications
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Faculty can see notifications for their courses
DROP POLICY IF EXISTS "Faculty can view course notifications" ON notifications;
CREATE POLICY "Faculty can view course notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = notifications.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Your tables already exist, so we'll just add any missing indexes
-- Add indexes for better performance on existing tables
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);

-- Remove duplicate indexes (already created above)

-- RLS Policies for enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON enrollments;
CREATE POLICY "Students can view own enrollments" ON enrollments
    FOR SELECT USING (auth.uid() = student_id);

-- Faculty can view enrollments for their courses
DROP POLICY IF EXISTS "Faculty can view course enrollments" ON enrollments;
CREATE POLICY "Faculty can view course enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Students can insert their own enrollment requests
DROP POLICY IF EXISTS "Students can request enrollment" ON enrollments;
CREATE POLICY "Students can request enrollment" ON enrollments
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Faculty can update enrollment status for their courses
DROP POLICY IF EXISTS "Faculty can update enrollment status" ON enrollments;
CREATE POLICY "Faculty can update enrollment status" ON enrollments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Create function to get notification count
CREATE OR REPLACE FUNCTION get_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = user_uuid AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE, updated_at = NOW()
    WHERE id = notification_uuid AND user_id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET read = TRUE, updated_at = NOW()
    WHERE user_id = user_uuid AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_course_id UUID DEFAULT NULL,
    p_assignment_id UUID DEFAULT NULL,
    p_quiz_id UUID DEFAULT NULL,
    p_enrollment_id UUID DEFAULT NULL,
    p_submission_id UUID DEFAULT NULL,
    p_attempt_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, course_id, assignment_id, quiz_id, 
        enrollment_id, submission_id, attempt_id
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_course_id, p_assignment_id, p_quiz_id,
        p_enrollment_id, p_submission_id, p_attempt_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON assignments TO authenticated;
GRANT ALL ON quizzes TO authenticated;
GRANT ALL ON enrollments TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID) TO authenticated;

-- Create view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE read = TRUE) as read_count,
    COUNT(*) FILTER (WHERE type = 'assignment') as assignment_notifications,
    COUNT(*) FILTER (WHERE type = 'quiz') as quiz_notifications,
    COUNT(*) FILTER (WHERE type = 'grade') as grade_notifications,
    COUNT(*) FILTER (WHERE type = 'enrollment') as enrollment_notifications,
    COUNT(*) FILTER (WHERE type = 'announcement') as announcement_notifications,
    MAX(created_at) as latest_notification
FROM notifications
GROUP BY user_id;

-- Grant access to notification stats view
GRANT SELECT ON notification_stats TO authenticated;

-- Create function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_notifications(INTEGER) TO authenticated;

-- Sample data insertion removed to avoid null user_id errors
-- You can manually create test notifications after setting up the system

COMMIT;
