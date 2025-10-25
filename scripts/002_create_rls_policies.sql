-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses policies
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Faculty can create courses" ON public.courses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'faculty')
);
CREATE POLICY "Faculty can update own courses" ON public.courses FOR UPDATE USING (
  instructor_id = auth.uid()
);
CREATE POLICY "Faculty can delete own courses" ON public.courses FOR DELETE USING (
  instructor_id = auth.uid()
);

-- Enrollments policies
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (
  student_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Students can create enrollment requests" ON public.enrollments FOR INSERT WITH CHECK (
  student_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Faculty can update enrollments for their courses" ON public.enrollments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Faculty can delete enrollments for their courses" ON public.enrollments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- Assignments policies
CREATE POLICY "Students can view assignments for enrolled courses" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = assignments.course_id AND student_id = auth.uid() AND status = 'approved') OR
  EXISTS (SELECT 1 FROM public.courses WHERE id = assignments.course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Faculty can manage assignments for own courses" ON public.assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- Assignment submissions policies
CREATE POLICY "Students can manage own submissions" ON public.assignment_submissions FOR ALL USING (
  student_id = auth.uid()
);
CREATE POLICY "Faculty can view submissions for their courses" ON public.assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON a.course_id = c.id 
          WHERE a.id = assignment_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Faculty can update submissions for their courses" ON public.assignment_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.assignments a JOIN public.courses c ON a.course_id = c.id 
          WHERE a.id = assignment_id AND c.instructor_id = auth.uid())
);

-- Quizzes policies
CREATE POLICY "Students can view quizzes for enrolled courses" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = quizzes.course_id AND student_id = auth.uid() AND status = 'approved') OR
  EXISTS (SELECT 1 FROM public.courses WHERE id = quizzes.course_id AND instructor_id = auth.uid())
);
CREATE POLICY "Faculty can manage quizzes for own courses" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- Quiz questions policies
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.enrollments e ON q.course_id = e.course_id 
          WHERE q.id = quiz_id AND e.student_id = auth.uid() AND e.status = 'approved') OR
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Faculty can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Quiz attempts policies
CREATE POLICY "Students can manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (
  student_id = auth.uid()
);
CREATE POLICY "Faculty can view quiz attempts for their courses" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id 
          WHERE q.id = quiz_id AND c.instructor_id = auth.uid())
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
