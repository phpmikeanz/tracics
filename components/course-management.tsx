"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BookOpen, Plus, Edit, Users, FileText, Settings, Trash2, Upload, Download, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { createCourse, getCoursesByInstructor, updateCourse } from "@/lib/courses"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/types"

type Course = Database["public"]["Tables"]["courses"]["Row"] & {
  enrollments?: { count: number }[]
  assignments?: { count: number }[]
  quizzes?: { count: number }[]
}

type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"]

interface Student {
  id: string
  name: string
  email: string
  enrolledDate: string
  grade?: string
}

export function CourseManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Load courses when component mounts
  useEffect(() => {
    if (user?.id) {
      loadCourses()
    }
  }, [user?.id])

  const loadCourses = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const data = await getCoursesByInstructor(user.id)
      setCourses(data)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Mock student data
  const courseStudents: Student[] = [
    { id: "1", name: "John Doe", email: "john@example.com", enrolledDate: "2024-01-15", grade: "A" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", enrolledDate: "2024-01-16", grade: "B+" },
    { id: "3", name: "Mike Johnson", email: "mike@example.com", enrolledDate: "2024-01-17" },
  ]

  const handleCreateCourse = async (formData: FormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a course.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      
      const courseData: CourseInsert = {
        title: formData.get("name") as string,
        course_code: formData.get("code") as string,
        description: formData.get("description") as string,
        instructor_id: user.id,
        credits: 3, // Default credits
        max_students: Number.parseInt(formData.get("maxStudents") as string),
      }

      const newCourse = await createCourse(courseData)
      setCourses([...courses, newCourse])
      setIsCreateDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Course created successfully!",
      })
    } catch (error) {
      console.error('Error creating course:', error)
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleEditCourse = async (formData: FormData) => {
    if (!selectedCourse) return

    try {
      setUpdating(true)
      
      const updates = {
        title: formData.get("name") as string,
        course_code: formData.get("code") as string,
        description: formData.get("description") as string,
        max_students: Number.parseInt(formData.get("maxStudents") as string),
      }

      const updatedCourse = await updateCourse(selectedCourse.id, updates)
      setCourses(courses.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)))
      setIsEditDialogOpen(false)
      setSelectedCourse(null)
      
      toast({
        title: "Success",
        description: "Course updated successfully!",
      })
    } catch (error) {
      console.error('Error updating course:', error)
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    // TODO: Implement course deletion with database
    // For now, just remove from local state
    setCourses(courses.filter((c) => c.id !== courseId))
    toast({
      title: "Course Deleted",
      description: "Course has been removed from your list.",
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to manage courses.</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
          <p className="text-gray-600">Create and manage your courses</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>Fill out the form below to create a new course for your students.</DialogDescription>
            </DialogHeader>
            <form action={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Course Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Computer Science 101" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Course Code</Label>
                  <Input id="code" name="code" placeholder="e.g., CS101" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Course description and objectives"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select name="semester" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                      <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                      <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Max Students</Label>
                  <Input id="maxStudents" name="maxStudents" type="number" placeholder="50" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Course"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <p className="text-sm text-gray-600">{course.course_code}</p>
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {course.enrollments?.[0]?.count || 0}/{course.max_students} students
                  </span>
                </div>
                <span className="text-gray-500">{course.credits} credits</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${((course.enrollments?.[0]?.count || 0) / course.max_students) * 100}%` }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setSelectedCourse(course)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Course: {selectedCourse?.title}</DialogTitle>
            <DialogDescription>Manage course details, students, materials, and settings.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <form action={handleEditCourse} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Course Name</Label>
                    <Input id="edit-name" name="name" defaultValue={selectedCourse?.title} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Course Code</Label>
                    <Input id="edit-code" name="code" defaultValue={selectedCourse?.course_code} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedCourse?.description}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-credits">Credits</Label>
                    <Input
                      id="edit-credits"
                      name="credits"
                      type="number"
                      defaultValue={selectedCourse?.credits}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-maxStudents">Max Students</Label>
                    <Input
                      id="edit-maxStudents"
                      name="maxStudents"
                      type="number"
                      defaultValue={selectedCourse?.max_students}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Enrolled Students</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {courseStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">Student</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{student.grade ? `Grade: ${student.grade}` : "No grade"}</p>
                        <p className="text-xs text-gray-500">Enrolled: {student.enrolledDate}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Course Materials</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Course Syllabus</p>
                      <p className="text-sm text-gray-600">PDF • 2.3 MB</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Lecture Notes - Week 1</p>
                      <p className="text-sm text-gray-600">PDF • 1.8 MB</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Course Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Course Status</p>
                        <p className="text-sm text-gray-600">Control course visibility and enrollment</p>
                      </div>
                      <Select defaultValue="active">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h4>
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-600">Delete Course</p>
                      <p className="text-sm text-gray-600">Permanently delete this course and all associated data</p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (selectedCourse && confirm("Are you sure you want to delete this course?")) {
                          handleDeleteCourse(selectedCourse.id)
                          setIsEditDialogOpen(false)
                        }
                      }}
                    >
                      Delete Course
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
