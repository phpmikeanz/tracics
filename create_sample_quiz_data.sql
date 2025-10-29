-- COMPLETE QUIZ FIX - SAMPLE DATA CREATION
-- This script creates sample quiz data to resolve the "No Questions Available" issue

-- ===========================================
-- STEP 1: CREATE SAMPLE QUIZ DATA
-- ===========================================

DO $$
DECLARE
    course_record RECORD;
    faculty_record RECORD;
    student_record RECORD;
    quiz_id UUID;
    question1_id UUID;
    question2_id UUID;
    question3_id UUID;
    enrollment_id UUID;
BEGIN
    -- Get first course
    SELECT * INTO course_record FROM courses LIMIT 1;
    
    IF course_record IS NULL THEN
        RAISE NOTICE 'No courses found. Please create a course first.';
        RETURN;
    END IF;
    
    -- Get first faculty member
    SELECT * INTO faculty_record FROM profiles WHERE role = 'faculty' LIMIT 1;
    
    IF faculty_record IS NULL THEN
        RAISE NOTICE 'No faculty found. Please create a faculty profile first.';
        RETURN;
    END IF;
    
    -- Get first student
    SELECT * INTO student_record FROM profiles WHERE role = 'student' LIMIT 1;
    
    IF student_record IS NULL THEN
        RAISE NOTICE 'No students found. Please create a student profile first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating quiz for course: %', course_record.title;
    RAISE NOTICE 'Faculty: %', faculty_record.full_name;
    RAISE NOTICE 'Student: %', student_record.full_name;
    
    -- Create quiz
    INSERT INTO quizzes (id, title, description, course_id, status, time_limit, max_attempts, due_date, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'Quiz 1: ' || course_record.title || ' Fundamentals',
        'A comprehensive quiz covering the fundamentals of ' || course_record.title,
        course_record.id,
        'published',
        30,
        3,
        NOW() + INTERVAL '7 days',
        NOW(),
        NOW()
    ) RETURNING id INTO quiz_id;
    
    RAISE NOTICE 'Created quiz with ID: %', quiz_id;
    
    -- Create questions
    question1_id := gen_random_uuid();
    question2_id := gen_random_uuid();
    question3_id := gen_random_uuid();
    
    INSERT INTO quiz_questions (id, quiz_id, question, type, options, correct_answer, points, order_index, created_at, updated_at)
    VALUES 
        (question1_id, quiz_id, 'What is the main purpose of ' || course_record.title || '?', 'multiple_choice', 
         '["To solve complex problems", "To create beautiful websites", "To manage databases", "To write documentation"]', 
         'To solve complex problems', 10, 1, NOW(), NOW()),
        (question2_id, quiz_id, 'Is ' || course_record.title || ' an important subject?', 'true_false', 
         NULL, 'true', 5, 2, NOW(), NOW()),
        (question3_id, quiz_id, 'Explain why ' || course_record.title || ' is important in modern education.', 'essay', 
         NULL, NULL, 15, 3, NOW(), NOW());
    
    RAISE NOTICE 'Created 3 questions for quiz';
    
    -- Create enrollment
    enrollment_id := gen_random_uuid();
    INSERT INTO enrollments (id, student_id, course_id, status, progress, created_at, updated_at)
    VALUES (enrollment_id, student_record.id, course_record.id, 'approved', 0, NOW(), NOW());
    
    RAISE NOTICE 'Created enrollment for student: %', student_record.full_name;
    
    RAISE NOTICE 'Sample data creation completed successfully!';
    RAISE NOTICE 'Quiz ID: %', quiz_id;
    RAISE NOTICE 'Enrollment ID: %', enrollment_id;
    
END $$;

-- ===========================================
-- STEP 2: VERIFY CREATED DATA
-- ===========================================

-- Check quizzes
SELECT 
    q.id,
    q.title,
    q.status,
    c.title as course_title,
    COUNT(qq.id) as question_count
FROM quizzes q
JOIN courses c ON q.course_id = c.id
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, c.title
ORDER BY q.created_at DESC;

-- Check enrollments
SELECT 
    e.id,
    e.status,
    p.full_name as student_name,
    c.title as course_title
FROM enrollments e
JOIN profiles p ON e.student_id = p.id
JOIN courses c ON e.course_id = c.id
ORDER BY e.created_at DESC;

-- Check questions
SELECT 
    qq.id,
    qq.question,
    qq.type,
    qq.points,
    q.title as quiz_title
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
ORDER BY qq.order_index;

-- ===========================================
-- STEP 3: SUMMARY
-- ===========================================

SELECT 
    'Data Summary' as info,
    (SELECT COUNT(*) FROM quizzes) as quiz_count,
    (SELECT COUNT(*) FROM quiz_questions) as question_count,
    (SELECT COUNT(*) FROM enrollments WHERE status = 'approved') as enrollment_count;


