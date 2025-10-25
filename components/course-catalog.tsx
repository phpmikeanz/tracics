"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Users, Clock, Search, Star, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAllCourses } from "@/lib/courses"
import { getEnrollmentsByStudent, requestEnrollment } from "@/lib/enrollments"
import type { Database } from "@/lib/types"

type Course = Database["public"]["Tables"]["courses"]["Row"] & {
  profiles?: { full_name: string | null } | null
  enrollments?: { count: number }[]
}

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"]

export function CourseCatalog() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])

  // Load courses and user enrollments
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Load all available courses
      const allCourses = await getAllCourses()
      setCourses(allCourses)
      
      // Load user's enrollments
      const userEnrollments = await getEnrollmentsByStudent(user.id)
      setEnrollments(userEnrollments)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  // ... existing filter logic ...

  // Filter courses based on search
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const handleRequestEnrollment = async (course: Course) => {
    if (!user?.id) return
    
    try {
      setEnrollingCourseId(course.id)
      
      await requestEnrollment({
        student_id: user.id,
        course_id: course.id,
        status: "pending"
      })
      
      // Reload enrollments to update UI
      const userEnrollments = await getEnrollmentsByStudent(user.id)
      setEnrollments(userEnrollments)
      
      toast({
        title: "Request Sent",
        description: `Enrollment request sent for ${course.title}`,
      })
    } catch (error) {
      console.error('Error requesting enrollment:', error)
      toast({
        title: "Error",
        description: "Failed to request enrollment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setEnrollingCourseId(null)
    }
  }

  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find((e) => e.course_id === courseId)
    return enrollment?.status || null
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view courses.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading courses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Course Catalog</h2>
        <p className="text-muted-foreground">Browse and request enrollment in available courses</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses, instructors, or course codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCourses.map((course) => {
          const enrollmentStatus = getEnrollmentStatus(course.id)

          return (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {course.course_code} • {course.credits} credits
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {enrollmentStatus === "approved" && <Badge variant="default">Enrolled</Badge>}
                    {enrollmentStatus === "pending" && <Badge variant="secondary">Pending</Badge>}
                    {enrollmentStatus === "declined" && <Badge variant="destructive">Declined</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>

                {/* Instructor */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{course.profiles?.full_name?.charAt(0) || "I"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{course.profiles?.full_name || "Instructor"}</p>
                  </div>
                </div>

                {/* Course Details */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {course.enrollments?.[0]?.count || 0}/{course.max_students} students
                  </span>
                </div>

                {/* Enrollment Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Enrollment</span>
                    <span className="font-medium">{Math.round(((course.enrollments?.[0]?.count || 0) / course.max_students) * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${((course.enrollments?.[0]?.count || 0) / course.max_students) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  {enrollmentStatus === "approved" ? (
                    <Button variant="outline" className="w-full bg-transparent">
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Course
                    </Button>
                  ) : enrollmentStatus === "pending" ? (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      <Clock className="h-4 w-4 mr-2" />
                      Request Pending
                    </Button>
                  ) : enrollmentStatus === "declined" ? (
                    <Button
                      className="w-full"
                      onClick={() => handleRequestEnrollment(course)}
                      disabled={(course.enrollments?.[0]?.count || 0) >= course.max_students || enrollingCourseId === course.id}
                    >
                      {enrollingCourseId === course.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Request Again
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleRequestEnrollment(course)}
                      disabled={(course.enrollments?.[0]?.count || 0) >= course.max_students || enrollingCourseId === course.id}
                    >
                      {enrollingCourseId === course.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {(course.enrollments?.[0]?.count || 0) >= course.max_students ? "Course Full" : "Request Enrollment"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  )
}
