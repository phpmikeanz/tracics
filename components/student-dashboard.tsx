"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { BookOpen, FileText, LogOut, Clock, CheckCircle, AlertCircle, UserCheck } from "lucide-react"
import { CourseCatalog } from "@/components/courses/course-catalog"
import { StudentAssignments } from "@/components/assignments/student-assignments"
import { StudentQuizzes } from "@/components/quizzes/student-quizzes"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { getEnrolledCourses } from "@/lib/courses"
import { getEnrollmentsByStudent } from "@/lib/enrollments"
import { getAssignmentsForStudent } from "@/lib/assignments"

export function StudentDashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return

      try {
        setLoading(true)
        setError("")
        
        console.log("[StudentDashboard] Loading data for student:", user.id)
        
        const [coursesData, assignmentsData, enrollmentsData] = await Promise.all([
          getEnrolledCourses(user.id),
          getAssignmentsForStudent(user.id),
          getEnrollmentsByStudent(user.id),
        ])

        console.log("[StudentDashboard] Loaded courses:", coursesData)
        console.log("[StudentDashboard] Loaded assignments:", assignmentsData)
        console.log("[StudentDashboard] Loaded enrollments:", enrollmentsData)
        
        setCourses(coursesData)
        setAssignments(assignmentsData)
        setEnrollments(enrollmentsData)
      } catch (error) {
        console.error("Error loading student data:", error)
        setError("Failed to load dashboard data. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
              </div>
            </div>

            {/* ... existing navigation code ... */}

            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationCenter />
              <div className="hidden sm:flex items-center">
                <span className="text-sm font-medium text-foreground">{user?.full_name || user?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ... existing mobile navigation code ... */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "overview" && (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back, {user?.full_name || user?.name}!</h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Here's what's happening in your courses today.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1 xl:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    My Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Enrolled Courses</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        You haven't enrolled in any courses yet. Browse the course catalog to get started.
                      </p>
                      <Button onClick={() => setActiveTab("courses")}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Browse Courses
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-2 sm:gap-3 p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md overflow-hidden"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full">
                            <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0 mt-1 sm:mt-0" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm sm:text-base text-foreground truncate">
                                {course.title || course.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {course.course_code || course.code} • {course.credits} credits
                              </p>
                            </div>
                          </div>
                          <div className="sm:text-right sm:flex-shrink-0 sm:ml-2 self-start sm:self-auto">
                            <Badge variant="outline" className="text-xs">Enrolled</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No assignments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.slice(0, 3).map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm text-foreground line-clamp-1">{assignment.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {assignment.courses?.title || assignment.courses?.name || "Course"}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {assignment.max_points || assignment.points || 0} points
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === "courses" && <CourseCatalog />}
        {activeTab === "enrollment" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">My Enrollment Requests</h2>
              <p className="text-muted-foreground">Track the status of your course enrollment requests</p>
            </div>

            <div className="grid gap-4">
              {enrollments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Enrollment Requests</h3>
                    <p className="text-muted-foreground text-center">
                      You haven't submitted any enrollment requests yet. Browse the course catalog to get started.
                    </p>
                    <Button className="mt-4" onClick={() => setActiveTab("courses")}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Courses
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                enrollments.map((enrollment) => (
                  <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{enrollment.courses?.title || "Course"}</h3>
                            <Badge
                              variant={
                                enrollment.status === "approved"
                                  ? "default"
                                  : enrollment.status === "declined"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {enrollment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{enrollment.courses?.course_code || "N/A"}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Requested: {new Date(enrollment.created_at).toLocaleDateString()}</span>
                            {enrollment.updated_at !== enrollment.created_at && (
                              <span>Updated: {new Date(enrollment.updated_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {enrollment.status === "pending" && <Clock className="h-5 w-5 text-yellow-500" />}
                          {enrollment.status === "approved" && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {enrollment.status === "declined" && <AlertCircle className="h-5 w-5 text-red-500" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === "assignments" && <StudentAssignments />}
        {activeTab === "quizzes" && <StudentQuizzes />}
      </div>
    </div>
  )
}
