"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { BookOpen, FileText, Bell, LogOut, Plus, BarChart3, Calendar, MessageSquare } from "lucide-react"
import { useState, useEffect } from "react"
import { CourseManagement } from "@/components/courses/course-management"
import { AssignmentManagement } from "@/components/assignments/assignment-management"
import { QuizManagement } from "@/components/quizzes/quiz-management"
import { EnrollmentManagement } from "@/components/enrollment/enrollment-management"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { FacultyActivityDashboard } from "@/components/notifications/faculty-activity-dashboard"
import { FacultyNotificationSummary } from "@/components/notifications/faculty-notification-summary"
import { SectionLoader } from "@/components/ui/section-loader"
import { getCoursesByInstructor } from "@/lib/courses"
import { generateRealFacultyNotifications, createSampleRealNotifications } from "@/lib/generate-real-faculty-notifications"
import { createClient } from "@/lib/supabase/client"
import { SimpleUserNav } from "@/components/navigation/simple-user-nav"

export function FacultyDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  
  // Real data states
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [quickStats, setQuickStats] = useState({
    totalStudents: 0,
    pendingGrades: 0,
    activeAssignments: 0
  })

  // Function to calculate quick stats
  const calculateQuickStats = async (courseIds: string[]) => {
    if (!courseIds.length) return { totalStudents: 0, pendingGrades: 0, activeAssignments: 0 }
    
    try {
      const supabase = createClient()
      
      // Calculate total students across all courses
      console.log("[QuickStats] Course IDs:", courseIds)
      
      // First, let's check what enrollments exist for these courses
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, course_id, status, student_id')
        .in('course_id', courseIds)
      
      console.log("[QuickStats] Enrollments data:", enrollmentsData)
      console.log("[QuickStats] Enrollments error:", enrollmentsError)
      
      // Specifically check for approved students
      if (enrollmentsData) {
        const approvedStudents = enrollmentsData.filter(e => e.status === 'approved')
        console.log("[QuickStats] Approved students found:", approvedStudents.length)
        console.log("[QuickStats] Approved students details:", approvedStudents)
      }
      
      // Count unique students (in case a student is enrolled in multiple courses)
      const uniqueStudents = new Set()
      if (enrollmentsData) {
        enrollmentsData.forEach(enrollment => {
          // Focus on approved students first, then other active statuses
          if (enrollment.status === 'approved' || 
              enrollment.status === 'enrolled' || 
              enrollment.status === 'active' || 
              enrollment.status === 'accepted') {
            uniqueStudents.add(enrollment.student_id)
            console.log(`[QuickStats] Found student ${enrollment.student_id} with status: ${enrollment.status}`)
          }
        })
      }
      
      let totalStudents = uniqueStudents.size
      console.log("[QuickStats] Unique students count:", totalStudents)
      
      // Additional direct query for approved students only
      if (totalStudents === 0) {
        console.log("[QuickStats] Trying direct query for approved students...")
        try {
          const { data: approvedEnrollments, error: approvedError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('course_id', courseIds)
            .eq('status', 'approved')
          
          console.log("[QuickStats] Direct approved query result:", approvedEnrollments)
          console.log("[QuickStats] Direct approved query error:", approvedError)
          
          if (approvedEnrollments && approvedEnrollments.length > 0) {
            const uniqueApprovedStudents = new Set(approvedEnrollments.map(e => e.student_id))
            totalStudents = uniqueApprovedStudents.size
            console.log("[QuickStats] Direct approved students count:", totalStudents)
          }
        } catch (error) {
          console.log("[QuickStats] Direct approved query failed:", error)
        }
      }
      
      // If no students found, try a different approach - check all enrollments regardless of status
      if (totalStudents === 0 && enrollmentsData && enrollmentsData.length > 0) {
        console.log("[QuickStats] No students with enrolled status, checking all enrollments...")
        const allStudents = new Set()
        enrollmentsData.forEach(enrollment => {
          allStudents.add(enrollment.student_id)
        })
        totalStudents = allStudents.size
        console.log("[QuickStats] Total students (all statuses):", totalStudents)
      }
      
      // If still no students, try checking course_students table (alternative table structure)
      if (totalStudents === 0) {
        console.log("[QuickStats] Trying course_students table...")
        try {
          const { data: courseStudentsData, error: courseStudentsError } = await supabase
            .from('course_students')
            .select('student_id')
            .in('course_id', courseIds)
          
          if (courseStudentsData && courseStudentsData.length > 0) {
            const uniqueCourseStudents = new Set(courseStudentsData.map(cs => cs.student_id))
            totalStudents = uniqueCourseStudents.size
            console.log("[QuickStats] Found students in course_students table:", totalStudents)
          }
        } catch (error) {
          console.log("[QuickStats] course_students table doesn't exist or error:", error)
        }
      }
      
      // Calculate pending grades (submissions without grades)
      const { count: pendingGrades } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .in('assignment_id', 
          await supabase
            .from('assignments')
            .select('id')
            .in('course_id', courseIds)
            .then(({ data }) => data?.map(a => a.id) || [])
        )
        .is('grade', null)
      
      // Calculate active assignments (not past due date)
      const today = new Date().toISOString()
      const { count: activeAssignments } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .gte('due_date', today)
      
      return {
        totalStudents: totalStudents || 0,
        pendingGrades: pendingGrades || 0,
        activeAssignments: activeAssignments || 0
      }
    } catch (error) {
      console.error("Error calculating quick stats:", error)
      return { totalStudents: 0, pendingGrades: 0, activeAssignments: 0 }
    }
  }

  // Load real data from database
  useEffect(() => {
    async function loadFacultyData() {
      if (!user?.id) return
      
      try {
        setLoading(true)
        setError("")
        
        console.log("[FacultyDashboard] Loading data for instructor:", user.id)
        
        // Load instructor's courses
        const instructorCourses = await getCoursesByInstructor(user.id)
        console.log("[FacultyDashboard] Loaded courses:", instructorCourses)
        setCourses(instructorCourses)
        
        // Calculate quick stats
        const courseIds = instructorCourses.map(course => course.id)
        const stats = await calculateQuickStats(courseIds)
        setQuickStats(stats)
        console.log("[FacultyDashboard] Quick stats:", stats)
        
        // Generate real notifications from student activities
        console.log("[FacultyDashboard] Generating real notifications from student activities...")
        const notificationResult = await generateRealFacultyNotifications(user.id)
        if (notificationResult.success) {
          console.log(`[FacultyDashboard] Generated ${notificationResult.notificationsCreated} real notifications`)
        } else {
          console.log("[FacultyDashboard] No real notifications generated, creating sample notifications...")
          const sampleResult = await createSampleRealNotifications(user.id)
          if (sampleResult.success) {
            console.log(`[FacultyDashboard] Created ${sampleResult.notificationsCreated} sample notifications`)
          }
        }
        
      } catch (error) {
        console.error("[FacultyDashboard] Error loading data:", error)
        setError("Failed to load dashboard data. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }

    loadFacultyData()
  }, [user?.id])

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "enrollment", label: "Enrollment", icon: FileText },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "quizzes", label: "Quizzes", icon: FileText },
    { id: "activities", label: "Student Activities", icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <img src="/ttrac-logo.png" alt="TTRAC Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">TTRAC</h1>
                <p className="text-xs text-muted-foreground">Institute Computing Studies</p>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mt-1">
                  Faculty Account
                </Badge>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationCenter />
              <SimpleUserNav />
            </div>
          </div>

          <div className="md:hidden border-t border-border">
            <div className="flex overflow-x-auto py-2 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs font-medium px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "overview" && (
          <>
            {loading ? (
              <SectionLoader 
                message="Loading faculty dashboard..." 
                submessage="Fetching your courses and teaching data"
              />
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              </div>
            ) : (
              <>
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back, {user?.full_name || user?.name}!</h2>
                  <p className="text-muted-foreground text-sm sm:text-base mt-1">
                    Manage your courses and track student progress.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {/* Student Activity Notifications */}
                  <div className="lg:col-span-2 xl:col-span-3">
                    <FacultyNotificationSummary onNavigateToTab={setActiveTab} />
                  </div>
                  
                  {/* My Courses */}
                  <Card className="lg:col-span-2 xl:col-span-2">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        My Courses ({courses.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {courses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No Courses Created</p>
                          <p className="text-sm">You haven't created any courses yet.</p>
                          <Button 
                            className="mt-4" 
                            onClick={() => setActiveTab("courses")}
                          >
                            Create Course
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:gap-4">
                          {courses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition-all duration-200"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-sm sm:text-base text-foreground truncate">
                                    {course.title}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                    {course.course_code} • {course.credits} credits • Max: {course.max_students} students
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Courses</span>
                        <span className="font-semibold">{courses.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Students</span>
                        <span className="font-semibold">{quickStats.totalStudents}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pending Grades</span>
                        <span className="font-semibold text-orange-600">{quickStats.pendingGrades}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Assignments</span>
                        <span className="font-semibold">{quickStats.activeAssignments}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>


                {courses.length === 0 && (
                  <div className="mt-8 text-center">
                    <Card className="max-w-md mx-auto">
                      <CardContent className="pt-6">
                        <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Get Started</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first course to start managing students and assignments.
                        </p>
                        <Button onClick={() => setActiveTab("courses")}>
                          Create First Course
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "courses" && <CourseManagement />}
        {activeTab === "enrollment" && <EnrollmentManagement />}
        {activeTab === "assignments" && <AssignmentManagement />}
        {activeTab === "quizzes" && <QuizManagement />}
        {activeTab === "activities" && <FacultyActivityDashboard />}
      </div>
    </div>
  )
}
