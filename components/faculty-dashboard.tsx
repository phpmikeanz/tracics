"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { BookOpen, LogOut, Plus, BarChart3, Calendar, MessageSquare } from "lucide-react"
import { useState, useEffect } from "react"
import { CourseManagement } from "@/components/courses/course-management"
import { AssignmentManagement } from "@/components/assignments/assignment-management"
import { QuizManagement } from "@/components/quizzes/quiz-management"
import { EnrollmentManagement } from "@/components/enrollment/enrollment-management"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { getCoursesByInstructor } from "@/lib/courses"

export function FacultyDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return

      try {
        setLoading(true)
        const coursesData = await getCoursesByInstructor(user.id)
        setCourses(coursesData)
      } catch (error) {
        console.error("Error loading faculty data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

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

            <div className="flex items-center gap-4">
              <NotificationCenter />
              <div className="flex items-center">
                <span className="text-sm font-medium">{user?.full_name || user?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ... existing mobile navigation code ... */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "overview" && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name || user?.name}!</h2>
              <p className="text-gray-600">Manage your courses and track student progress.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      My Courses
                    </CardTitle>
                    <Button size="sm" onClick={() => setActiveTab("courses")}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Course
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {courses.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Create your first course to get started with teaching.
                        </p>
                        <Button onClick={() => setActiveTab("courses")}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Course
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-primary" />
                              <div>
                                <h3 className="font-medium">{course.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {course.code} • {course.credits} credits
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">{course.enrollments?.length || 0} students</div>
                                <div className="text-xs text-gray-500">Active</div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setActiveTab("courses")}>
                                Manage
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      className="w-full justify-start bg-transparent"
                      variant="outline"
                      onClick={() => setActiveTab("assignments")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                    <Button
                      className="w-full justify-start bg-transparent"
                      variant="outline"
                      onClick={() => setActiveTab("quizzes")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Quiz
                    </Button>
                    <Button className="w-full justify-start bg-transparent" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                    <Button className="w-full justify-start bg-transparent" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Students
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Courses</span>
                      <span className="font-semibold">{courses.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Students</span>
                      <span className="font-semibold">
                        {courses.reduce((total, course) => total + (course.enrollments?.length || 0), 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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
