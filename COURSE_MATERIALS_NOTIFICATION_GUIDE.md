# 🔔 Course Materials Notification System Guide

## ✅ **Updated for Course Materials Structure**

I've updated the comprehensive notification system to work with your existing database structure that uses `course_materials.course_id` instead of direct `course_id` references.

## 🗄️ **Database Structure**

### **Your Current Structure:**
```
courses
├── id (UUID)
├── title (TEXT)
├── instructor_id (UUID)
└── ...

course_materials
├── id (UUID)
├── title (TEXT)
├── course_id (UUID) → references courses(id)
└── ...

assignments
├── id (UUID)
├── title (TEXT)
├── course_material_id (UUID) → references course_materials(id)
└── ...

quizzes
├── id (UUID)
├── title (TEXT)
├── course_material_id (UUID) → references course_materials(id)
└── ...

enrollments
├── id (UUID)
├── student_id (UUID)
├── course_material_id (UUID) → references course_materials(id)
└── ...
```

## 🔧 **Updated Files**

### **1. Database Setup (`scripts/setup-notification-system.sql`)**
- ✅ **Updated to use `course_material_id`** instead of `course_id`
- ✅ **Proper foreign key relationships** with course_materials
- ✅ **RLS policies** updated for course_materials structure
- ✅ **Indexes** optimized for course_materials relationships

### **2. Supabase Integration (`lib/supabase-notification-integration.ts`)**
- ✅ **Updated interface** to use `course_material_id`
- ✅ **Updated functions** to work with course_materials
- ✅ **Proper joins** with course_materials → courses
- ✅ **Real data fetching** from your existing structure

### **3. Comprehensive System (`lib/comprehensive-notification-system.ts`)**
- ✅ **Updated notification creation** to use course_material_id
- ✅ **Real assignment data** from course_materials structure
- ✅ **Real quiz data** from course_materials structure
- ✅ **Real enrollment data** from course_materials structure

## 🚀 **How It Works**

### **Assignment Notifications**
```typescript
// When student submits assignment
const assignmentResult = await getSupabaseAssignmentDetails(assignmentId)
// Returns: { id, title, course_material_id, course_materials: { title, courses: { title, instructor_id } } }

const notificationResult = await createSupabaseNotification({
  user_id: facultyId,
  title: "📚 Assignment Submitted",
  message: `${student.full_name} submitted "${assignment.title}" in ${assignment.course_materials.courses.title}`,
  type: "assignment",
  course_material_id: assignment.course_material_id,
  assignment_id: assignmentId
})
```

### **Quiz Notifications**
```typescript
// When student completes quiz
const quizResult = await getSupabaseQuizDetails(quizId)
// Returns: { id, title, course_material_id, course_materials: { title, courses: { title, instructor_id } } }

const notificationResult = await createSupabaseNotification({
  user_id: facultyId,
  title: "📊 Quiz Completed",
  message: `${student.full_name} completed "${quiz.title}" in ${quiz.course_materials.courses.title}`,
  type: "quiz",
  course_material_id: quiz.course_material_id,
  quiz_id: quizId
})
```

### **Enrollment Notifications**
```typescript
// When student requests enrollment
const enrollmentResult = await getSupabaseEnrollmentDetails(enrollmentId)
// Returns: { student_id, course_material_id, course_materials: { title, courses: { title, instructor_id } } }

const notificationResult = await createSupabaseNotification({
  user_id: facultyId,
  title: "👥 New Enrollment Request",
  message: `${student.full_name} has requested to enroll in ${enrollment.course_materials.courses.title}`,
  type: "enrollment",
  course_material_id: enrollment.course_material_id
})
```

## 📊 **Database Queries**

### **Get Notifications with Course Materials**
```sql
SELECT 
    n.*,
    cm.title as course_material_title,
    c.title as course_title,
    a.title as assignment_title,
    q.title as quiz_title
FROM notifications n
LEFT JOIN course_materials cm ON n.course_material_id = cm.id
LEFT JOIN courses c ON cm.course_id = c.id
LEFT JOIN assignments a ON n.assignment_id = a.id
LEFT JOIN quizzes q ON n.quiz_id = q.id
WHERE n.user_id = $1
ORDER BY n.created_at DESC;
```

### **Get Faculty Notifications for Their Courses**
```sql
SELECT n.*
FROM notifications n
JOIN course_materials cm ON n.course_material_id = cm.id
JOIN courses c ON cm.course_id = c.id
WHERE c.instructor_id = $1
ORDER BY n.created_at DESC;
```

## 🔒 **Security & RLS**

### **Row Level Security Policies**
```sql
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Faculty can see notifications for their course materials
CREATE POLICY "Faculty can view course notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM course_materials 
            JOIN courses ON courses.id = course_materials.course_id
            WHERE course_materials.id = notifications.course_material_id 
            AND courses.instructor_id = auth.uid()
        )
    );
```

## 🎯 **Integration Examples**

### **Assignment Submission Flow**
```typescript
// 1. Student submits assignment
const submissionResult = await submitAssignment(assignmentData)

// 2. Get assignment details with course material info
const assignmentResult = await getSupabaseAssignmentDetails(assignmentId)
const assignment = assignmentResult.assignment

// 3. Create notification for faculty
await createSupabaseNotification({
  user_id: facultyId,
  title: "📚 Assignment Submitted",
  message: `${student.full_name} submitted "${assignment.title}" in ${assignment.course_materials.courses.title}`,
  type: "assignment",
  course_material_id: assignment.course_material_id,
  assignment_id: assignmentId
})
```

### **Quiz Completion Flow**
```typescript
// 1. Student completes quiz
const quizResult = await submitQuiz(quizData)

// 2. Get quiz details with course material info
const quizDetails = await getSupabaseQuizDetails(quizId)
const quiz = quizDetails.quiz

// 3. Create notification for faculty
await createSupabaseNotification({
  user_id: facultyId,
  title: "📊 Quiz Completed",
  message: `${student.full_name} completed "${quiz.title}" in ${quiz.course_materials.courses.title}`,
  type: "quiz",
  course_material_id: quiz.course_material_id,
  quiz_id: quizId
})
```

### **Enrollment Request Flow**
```typescript
// 1. Student requests enrollment
const enrollmentResult = await requestEnrollment(courseMaterialId)

// 2. Get course material details
const courseMaterialResult = await getSupabaseCourseMaterialDetails(courseMaterialId)
const courseMaterial = courseMaterialResult.courseMaterial

// 3. Create notification for faculty
await createSupabaseNotification({
  user_id: facultyId,
  title: "👥 New Enrollment Request",
  message: `${student.full_name} has requested to enroll in ${courseMaterial.courses.title}`,
  type: "enrollment",
  course_material_id: courseMaterialId
})
```

## 🧪 **Testing**

### **Run the Setup Script**
```sql
-- Execute in Supabase SQL editor
\i scripts/setup-notification-system.sql
```

### **Run the Test Script**
```sql
-- Verify everything works
\i scripts/test-notification-setup.sql
```

### **Test with Real Data**
```typescript
// Test notification creation
const result = await createSupabaseNotification({
  user_id: "your-user-id",
  title: "Test Notification",
  message: "Testing the course materials notification system",
  type: "test",
  course_material_id: "your-course-material-id"
})
```

## 🎉 **Benefits**

### **Real Data Integration**
- ✅ **Works with your existing database structure**
- ✅ **Uses course_materials.course_id relationships**
- ✅ **Proper foreign key constraints**
- ✅ **Real assignment, quiz, and enrollment data**

### **Performance Optimized**
- ✅ **Indexed queries** for fast performance
- ✅ **Efficient joins** with course_materials
- ✅ **RLS policies** for secure access
- ✅ **Optimized for your data structure**

### **Fully Integrated**
- ✅ **Real-time notifications** from Supabase
- ✅ **Role-based access** (faculty vs students)
- ✅ **Secure data access** with RLS
- ✅ **Scalable architecture** with your existing structure

The notification system is now fully compatible with your course_materials database structure and will work seamlessly with your existing LMS!
