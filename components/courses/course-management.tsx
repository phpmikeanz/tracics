"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { getEnrollmentsByCourse } from "@/lib/enrollments"
import { getCourseMaterials, createCourseMaterial, updateCourseMaterial, updateCourseMaterialWithFile, deleteCourseMaterial, uploadCourseMaterialFile, formatFileSize, getFileIcon, testCourseMaterialsConnection, testStorageBucket, testCourseMaterialInsert } from "@/lib/course-materials"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/types"

type Course = Database["public"]["Tables"]["courses"]["Row"] & {
  enrollments?: { count: number }[]
  assignments?: { count: number }[]
  quizzes?: { count: number }[]
}

type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"]
type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"]
type CourseMaterial = Database["public"]["Tables"]["course_materials"]["Row"]

interface EnrolledStudent {
  id: string
  student_id: string
  course_id: string
  status: "pending" | "approved" | "declined"
  progress: number
  created_at: string
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
  }
}

export function CourseManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [uploadingMaterial, setUploadingMaterial] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false)
  const [isEditMaterialDialogOpen, setIsEditMaterialDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null)

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

  const loadEnrolledStudents = async (courseId: string) => {
    try {
      setLoadingStudents(true)
      const data = await getEnrollmentsByCourse(courseId)
      setEnrolledStudents(data as EnrolledStudent[])
    } catch (error) {
      console.error('Error loading enrolled students:', error)
      toast({
        title: "Error",
        description: "Failed to load enrolled students. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  const loadCourseMaterials = async (courseId: string) => {
    try {
      setLoadingMaterials(true)
      const data = await getCourseMaterials(courseId)
      setCourseMaterials(data)
    } catch (error) {
      console.error('Error loading course materials:', error)
      toast({
        title: "Error",
        description: "Failed to load course materials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingMaterials(false)
    }
  }


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
        credits: Number.parseInt(formData.get("credits") as string) || 3,
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
        credits: Number.parseInt(formData.get("credits") as string),
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

  const handleAddMaterial = async (formData: FormData) => {
    if (!selectedCourse || !user?.id) return

    try {
      setUploadingMaterial(true)
      setUploadProgress(0)

      // Skip the tests and go directly to upload
      console.log('Starting material upload process...')

      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const materialType = formData.get("materialType") as string
      const isRequired = formData.get("isRequired") === "on"
      const file = formData.get("file") as File

      console.log('Add Material - Form data:', { 
        title, 
        description, 
        materialType, 
        isRequired, 
        hasFile: file && file.size > 0,
        fileSize: file?.size,
        fileName: file?.name
      })

      // Create material record
      const materialData = {
        course_id: selectedCourse.id,
        title,
        description: description || null,
        material_type: materialType as "document" | "video" | "link" | "assignment" | "quiz",
        is_required: isRequired,
        created_by: user.id,
      }

      console.log('Creating material with data:', materialData)
      setUploadProgress(20)
      const newMaterial = await createCourseMaterial(materialData)
      console.log('Material created:', newMaterial)

      // Upload file if provided
      if (file && file.size > 0) {
        console.log('Uploading file:', file.name, 'Size:', file.size)
        setUploadProgress(40)
        const { url, path } = await uploadCourseMaterialFile(file, selectedCourse.id, newMaterial.id)
        console.log('File uploaded:', { url, path })
        
        setUploadProgress(70)
        console.log('Updating material with file info...')
        console.log('File info to update:', {
          file_url: url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        })
        
        // Update material with file info
        const updatedMaterial = await updateCourseMaterial(newMaterial.id, {
          file_url: url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        })
        console.log('Material updated with file:', updatedMaterial)
        
        // Verify the update by fetching the material again
        console.log('Verifying update by fetching material...')
        const verifyMaterial = await getCourseMaterials(selectedCourse.id)
        const updatedMaterialFromList = verifyMaterial.find(m => m.id === newMaterial.id)
        console.log('Material from database after update:', updatedMaterialFromList)
      }

      setUploadProgress(90)
      console.log('Reloading materials...')
      // Reload materials
      await loadCourseMaterials(selectedCourse.id)
      setUploadProgress(100)
      
      setIsAddMaterialDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Material added successfully!",
      })
    } catch (error) {
      console.error('Error adding material:', error)
      toast({
        title: "Error",
        description: `Failed to add material: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setUploadingMaterial(false)
      setUploadProgress(0)
    }
  }

  const handleEditMaterial = async (formData: FormData) => {
    if (!selectedMaterial) {
      console.error('No selected material')
      return
    }

    try {
      setUploadingMaterial(true)
      setUploadProgress(0)
      
      console.log('Starting material update for:', selectedMaterial.id)
      
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const materialType = formData.get("materialType") as string
      const isRequired = formData.get("isRequired") === "on"
      const file = formData.get("file") as File

      console.log('Form data:', { title, description, materialType, isRequired, hasFile: file && file.size > 0 })

      const updates = {
        title,
        description: description || null,
        material_type: materialType as "document" | "video" | "link" | "assignment" | "quiz",
        is_required: isRequired,
        course_id: selectedMaterial.course_id,
      }

      console.log('Updates object:', updates)
      setUploadProgress(20)

      // Check if a new file was provided
      if (file && file.size > 0) {
        console.log('Updating with new file:', file.name)
        setUploadProgress(40)
        // Update with new file
        await updateCourseMaterialWithFile(selectedMaterial.id, updates, file, selectedMaterial.file_name || undefined)
        setUploadProgress(70)
      } else {
        console.log('Updating without file change')
        setUploadProgress(50)
        // Update without file change
        await updateCourseMaterial(selectedMaterial.id, updates)
        setUploadProgress(70)
      }

      console.log('Material update successful, reloading materials...')
      setUploadProgress(90)

      // Reload materials
      if (selectedCourse) {
        await loadCourseMaterials(selectedCourse.id)
      }
      setUploadProgress(100)
      
      setIsEditMaterialDialogOpen(false)
      setSelectedMaterial(null)
      
      toast({
        title: "Success",
        description: "Material updated successfully!",
      })
    } catch (error) {
      console.error('Error updating material:', error)
      toast({
        title: "Error",
        description: `Failed to update material: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setUploadingMaterial(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material? This action cannot be undone.")) {
      return
    }

    try {
      await deleteCourseMaterial(materialId)
      
      if (selectedCourse) {
        await loadCourseMaterials(selectedCourse.id)
      }
      
      toast({
        title: "Success",
        description: "Material deleted successfully!",
      })
    } catch (error) {
      console.error('Error deleting material:', error)
      toast({
        title: "Error",
        description: "Failed to delete material. Please try again.",
        variant: "destructive",
      })
    }
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input id="credits" name="credits" type="number" placeholder="3" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select name="semester" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Semester">1st Semester</SelectItem>
                      <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
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
                    loadEnrolledStudents(course.id)
                    loadCourseMaterials(course.id)
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

              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading students...</span>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No students enrolled in this course yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudents.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={enrollment.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.profiles.full_name)}&background=random&color=fff&size=128`} 
                            alt={enrollment.profiles.full_name}
                          />
                          <AvatarFallback>{enrollment.profiles.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{enrollment.profiles.full_name}</p>
                          <p className="text-sm text-gray-600">{enrollment.profiles.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Status: <span className={`font-semibold ${
                              enrollment.status === 'approved' ? 'text-green-600' : 
                              enrollment.status === 'pending' ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Progress: {enrollment.progress}% • Enrolled: {new Date(enrollment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="space-y-4 relative">
              {uploadingMaterial && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-lg shadow-lg border text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <h3 className="font-semibold mb-2">Processing Material</h3>
                    <p className="text-sm text-gray-600 mb-4">Please wait while we process your material...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{uploadProgress}% complete</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Course Materials</h3>
                <Dialog open={isAddMaterialDialogOpen} onOpenChange={setIsAddMaterialDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Course Material</DialogTitle>
                      <DialogDescription>Upload a file or add a link to course material.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      handleAddMaterial(formData)
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="material-title">Title</Label>
                        <Input id="material-title" name="title" placeholder="e.g., Course Syllabus" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="material-description">Description</Label>
                        <Textarea
                          id="material-description"
                          name="description"
                          placeholder="Optional description of the material"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="material-type">Material Type</Label>
                          <Select name="materialType" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="assignment">Assignment</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="material-file">File (Optional)</Label>
                          <Input id="material-file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.jpg,.png,.mp4" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="is-required" name="isRequired" />
                        <Label htmlFor="is-required">Required material</Label>
                      </div>
                      {uploadingMaterial && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Uploading material...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddMaterialDialogOpen(false)}
                          disabled={uploadingMaterial}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={uploadingMaterial}>
                          {uploadingMaterial ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {uploadProgress < 100 ? 'Uploading...' : 'Finalizing...'}
                            </>
                          ) : (
                            'Add Material'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Edit Material Dialog */}
              <Dialog open={isEditMaterialDialogOpen} onOpenChange={setIsEditMaterialDialogOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Course Material</DialogTitle>
                    <DialogDescription>Update the material information and file.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    handleEditMaterial(formData)
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-material-title">Title</Label>
                      <Input 
                        id="edit-material-title" 
                        name="title" 
                        defaultValue={selectedMaterial?.title}
                        placeholder="e.g., Course Syllabus" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-material-description">Description</Label>
                      <Textarea
                        id="edit-material-description"
                        name="description"
                        defaultValue={selectedMaterial?.description || ''}
                        placeholder="Optional description of the material"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-material-type">Material Type</Label>
                        <Select name="materialType" defaultValue={selectedMaterial?.material_type} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="assignment">Assignment</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-material-file">New File (Optional)</Label>
                        <Input id="edit-material-file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.jpg,.png,.mp4" />
                        {selectedMaterial?.file_name && (
                          <p className="text-xs text-gray-500">
                            Current: {selectedMaterial.file_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="edit-is-required" 
                        name="isRequired" 
                        defaultChecked={selectedMaterial?.is_required}
                      />
                      <Label htmlFor="edit-is-required">Required material</Label>
                    </div>
                    {uploadingMaterial && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Updating material...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditMaterialDialogOpen(false)}
                        disabled={uploadingMaterial}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploadingMaterial}>
                        {uploadingMaterial ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {uploadProgress < 100 ? 'Updating...' : 'Finalizing...'}
                          </>
                        ) : (
                          'Update Material'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {loadingMaterials ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading materials...</span>
                </div>
              ) : courseMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No materials added to this course yet.</p>
                  <p className="text-sm">Click "Add Material" to get started.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {courseMaterials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getFileIcon(material.file_type || '')}
                        </div>
                        <div>
                          <p className="font-medium">{material.title}</p>
                          <p className="text-sm text-gray-600">
                            {material.file_name && material.file_size 
                              ? `${material.file_name} • ${formatFileSize(material.file_size)}`
                              : material.material_type.charAt(0).toUpperCase() + material.material_type.slice(1)
                            }
                          </p>
                          {material.description && (
                            <p className="text-xs text-gray-500 mt-1">{material.description}</p>
                          )}
                          {material.is_required && (
                            <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mt-1">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {material.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedMaterial(material)
                            setIsEditMaterialDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
