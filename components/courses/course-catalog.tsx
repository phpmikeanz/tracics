"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { Search, BookOpen, Users, Calendar, Star, Loader2, CheckCircle } from "lucide-react"
import { getAllCourses } from "@/lib/courses"
import { requestEnrollment, getEnrollmentsByStudent } from "@/lib/enrollments"

export function CourseCatalog() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [enrollingCourseId, setEnrollingCourseId] = useState(null)

  // Load courses and user's enrollments
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return
      
      try {
        setLoading(true)
        setError("")
        
        console.log("[CourseCatalog] Loading courses and enrollments")
        
        // Load all available courses
        const allCourses = await getAllCourses()
        console.log("[CourseCatalog] Loaded courses:", allCourses)
        setCourses(allCourses)
        
        // Load user's enrollments to check enrollment status
        const userEnrollments = await getEnrollmentsByStudent(user.id)
        console.log("[CourseCatalog] Loaded enrollments:", userEnrollments)
        setEnrollments(userEnrollments)
        
      } catch (error) {
        console.error("[CourseCatalog] Error loading data:", error)
        setError("Failed to load courses. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const handleEnrollRequest = async (courseId: string) => {
    if (!user?.id) return
    
    try {
      setEnrollingCourseId(courseId)
      
      await requestEnrollment({
        student_id: user.id,
        course_id: courseId,
        status: "pending"
      })
      
      // Reload enrollments to update UI
      const userEnrollments = await getEnrollmentsByStudent(user.id)
      setEnrollments(userEnrollments)
      
      console.log("[CourseCatalog] Enrollment request sent for course:", courseId)
    } catch (error) {
      console.error("[CourseCatalog] Error requesting enrollment:", error)
      alert("Failed to request enrollment. Please try again.")
    } finally {
      setEnrollingCourseId(null)
    }
  }

  // Check if user is enrolled or has pending request
  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find(e => e.course_id === courseId)
    return enrollment?.status || null
  }

  // Filter courses based on search
  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading courses...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Course Catalog</h2>
        <p className="text-muted-foreground">Browse and enroll in available courses</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          {courses.length === 0 ? (
            <>
              <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
              <p className="text-muted-foreground">
                No courses have been created yet. Check back later or contact your administrator.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms to find courses.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const enrollmentStatus = getEnrollmentStatus(course.id)
            const enrollmentCount = course.enrollments?.[0]?.count || 0
            const instructorName = course.profiles?.full_name || "Unknown Instructor"
            
            return (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-xs">
                      {course.course_code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {course.credits} credits
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {instructorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{instructorName}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {course.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{enrollmentCount}/{course.max_students} students</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    {enrollmentStatus === "approved" ? (
                      <Button disabled className="w-full" variant="secondary">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Enrolled
                      </Button>
                    ) : enrollmentStatus === "pending" ? (
                      <Button disabled className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Request Pending
                      </Button>
                    ) : enrollmentStatus === "declined" ? (
                      <Button disabled className="w-full" variant="destructive">
                        Request Declined
                      </Button>
                    ) : enrollmentCount >= course.max_students ? (
                      <Button disabled className="w-full">
                        Course Full
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleEnrollRequest(course.id)}
                        disabled={enrollingCourseId === course.id}
                        className="w-full"
                      >
                        {enrollingCourseId === course.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Requesting...
                          </>
                        ) : (
                          "Request Enrollment"
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
