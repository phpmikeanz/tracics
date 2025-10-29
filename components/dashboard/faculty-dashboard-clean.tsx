"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { BookOpen, FileText, Bell, LogOut, Plus, BarChart3, Calendar, MessageSquare, Loader2, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { CourseManagement } from "@/components/courses/course-management"
import { AssignmentManagement } from "@/components/assignments/assignment-management"
import { QuizManagement } from "@/components/quizzes/quiz-management"
import { EnrollmentManagement } from "@/components/enrollment/enrollment-management"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { getCoursesByInstructor } from "@/lib/courses"

export function FacultyDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  
  // Real data states
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50 relative">
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

            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationCenter />
              <span className="hidden sm:block text-sm font-medium text-foreground">{user?.full_name || user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout()
                  router.push("/auth/login")
                }}
                className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
              
              {/* Hamburger Menu Button - Always visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Hamburger Menu Dropdown - Right side positioned */}
          {isMobileMenuOpen && (
            <div className="absolute right-4 top-16 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="py-2 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full text-left text-sm font-medium px-4 py-3 rounded-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading your dashboard...</span>
              </div>
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
                        <span className="font-semibold">0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pending Grades</span>
                        <span className="font-semibold text-orange-600">0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Assignments</span>
                        <span className="font-semibold">0</span>
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
      </div>
    </div>
  )
}
