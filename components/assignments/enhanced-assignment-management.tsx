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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  CalendarIcon, 
  Users, 
  Download, 
  Eye, 
  MessageSquare, 
  Loader2, 
  FileText, 
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Bell,
  Send
} from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAssignmentsByInstructor, createAssignment, getSubmissionsByAssignment, gradeSubmission, updateAssignment, testUpdateAssignment } from "@/lib/assignments"
import { getCoursesByInstructor } from "@/lib/courses"
import { downloadAssignmentFile, getFileNameFromUrl } from "@/lib/file-upload"
import { 
  notifyAssignmentGraded, 
  notifyNewAssignment, 
  notifyAssignmentSubmitted,
  notifyCourseAnnouncement,
  getEnrolledStudents
} from "@/lib/ttrac-notifications"
import { AssignmentNotificationSync, NotificationIndicator } from "@/components/notifications/assignment-notification-sync"
import type { Database } from "@/lib/types"

type Assignment = Database["public"]["Tables"]["assignments"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  assignment_submissions?: { count: number }[]
}

type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"]
type AssignmentUpdate = Database["public"]["Tables"]["assignments"]["Update"]

type Submission = Database["public"]["Tables"]["assignment_submissions"]["Row"] & {
  profiles?: { full_name: string; email: string } | null
}

type Course = Database["public"]["Tables"]["courses"]["Row"]

export function EnhancedAssignmentManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [updating, setUpdating] = useState(false)

  // Load assignments and courses when component mounts
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const [assignmentsData, coursesData] = await Promise.all([
        getAssignmentsByInstructor(user.id),
        getCoursesByInstructor(user.id)
      ])
      
      setAssignments(assignmentsData)
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    try {
      setLoadingSubmissions(true)
      const submissionsData = await getSubmissionsByAssignment(assignmentId)
      setSubmissions(submissionsData)
    } catch (error) {
      console.error('Error loading submissions:', error)
      toast({
        title: "Error",
        description: "Failed to load submissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const handleCreateAssignment = async (formData: FormData) => {
    if (!user?.id) return
    
    try {
      setCreating(true)
      
      const dueDateValue = formData.get("due_date") as string
      const assignmentData: AssignmentInsert = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        course_id: formData.get("course") as string,
        due_date: dueDateValue ? new Date(dueDateValue).toISOString() : null,
        max_points: Number.parseInt(formData.get("points") as string),
      }

      const newAssignment = await createAssignment(assignmentData)
      
      // Notify all enrolled students about the new assignment
      if (newAssignment) {
        await notifyNewAssignment(
          assignmentData.course_id,
          assignmentData.title,
          assignmentData.due_date
        )
      }
      
      // Reload assignments to get updated data with relations
      await loadData()
      
      setIsCreateDialogOpen(false)
      setSelectedDate(undefined)
      
      toast({
        title: "Success",
        description: "Assignment created successfully!",
      })
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      await gradeSubmission(submissionId, grade, feedback)
      
      // Find the submission and notify the student
      const submission = submissions.find(s => s.id === submissionId)
      if (submission?.student_id && selectedAssignment) {
        await notifyAssignmentGraded(
          submission.student_id,
          selectedAssignment.title,
          grade,
          selectedAssignment.max_points
        )
      }
      
      // Reload submissions to get updated data
      if (selectedAssignment) {
        await loadSubmissions(selectedAssignment.id)
      }
      
      toast({
        title: "Success",
        description: "Grade saved successfully!",
      })
    } catch (error) {
      console.error('Error grading submission:', error)
      toast({
        title: "Error",
        description: "Failed to save grade. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!selectedAssignment || !user?.id) {
      toast({
        title: "Error",
        description: "Unable to update assignment. Please try again.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setUpdating(true)
      
      const formData = new FormData(e.currentTarget)
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const points = formData.get("points") as string
      const dueDateValue = formData.get("due_date") as string
      
      // Validate required fields
      if (!title?.trim()) {
        toast({
          title: "Error",
          description: "Assignment title is required.",
          variant: "destructive",
        })
        return
      }
      
      if (!description?.trim()) {
        toast({
          title: "Error",
          description: "Assignment description is required.",
          variant: "destructive",
        })
        return
      }
      
      if (!points || isNaN(Number.parseInt(points)) || Number.parseInt(points) <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid number of points.",
          variant: "destructive",
        })
        return
      }
      
      const updateData: AssignmentUpdate = {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDateValue ? new Date(dueDateValue).toISOString() : null,
        max_points: Number.parseInt(points),
      }

      await updateAssignment(selectedAssignment.id, updateData)
      
      // Notify students about assignment updates
      if (selectedAssignment.course_id) {
        try {
          const studentIds = await getEnrolledStudents(selectedAssignment.course_id)
          await createBulkNotifications(studentIds, {
            title: "Assignment Updated",
            message: `The assignment "${updateData.title}" has been updated. Please check for changes.`,
            type: "assignment"
          })
        } catch (notificationError) {
          console.log("Notification failed, but assignment was updated:", notificationError)
        }
      }
      
      await loadData()
      setIsEditDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Assignment updated successfully!",
      })
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const sendAnnouncement = async (message: string) => {
    if (!selectedAssignment?.course_id) return
    
    try {
      const instructorName = user?.full_name || "Instructor"
      await notifyCourseAnnouncement(
        selectedAssignment.course_id,
        `Assignment: ${selectedAssignment.title}`,
        message,
        instructorName
      )
      
      toast({
        title: "Success",
        description: "Announcement sent to all students!",
      })
    } catch (error) {
      console.error('Error sending announcement:', error)
      toast({
        title: "Error",
        description: "Failed to send announcement. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to manage assignments.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assignments...</span>
      </div>
    )
  }

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "graded":
        return "default"
      case "submitted":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getSubmissionStats = () => {
    const total = submissions.length
    const graded = submissions.filter(s => s.status === "graded").length
    const pending = submissions.filter(s => s.status === "submitted").length
    const averageGrade = submissions.filter(s => s.grade).length > 0 
      ? Math.round(submissions.reduce((acc, s) => acc + (s.grade || 0), 0) / submissions.filter(s => s.grade).length)
      : 0
    
    return { total, graded, pending, averageGrade }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
            <NotificationIndicator />
          </div>
          <p className="text-gray-600">Create and manage course assignments with integrated notifications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <form action={handleCreateAssignment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input id="title" name="title" placeholder="e.g., Programming Assignment 1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed assignment instructions and requirements"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Select name="course" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title} ({course.course_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Assignment Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <div className="relative">
                    <Input
                      id="due-date"
                      name="due_date"
                      type="datetime-local"
                      className="w-full"
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(new Date(e.target.value))
                        }
                      }}
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500">Select the assignment due date and time</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input id="points" name="points" type="number" placeholder="100" required />
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
                    "Create Assignment"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <p className="text-sm text-gray-600">{assignment.courses?.title || "Course"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Assignment
                  </Badge>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Due: {assignment.due_date ? format(new Date(assignment.due_date), "MMM d, yyyy") : "No due date"}</span>
                </div>
                <span className="font-medium">{assignment.max_points} pts</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {assignment.assignment_submissions?.[0]?.count || 0} submissions
                  </span>
                </div>
                <Badge variant="default">Published</Badge>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min((assignment.assignment_submissions?.[0]?.count || 0) * 10, 100)}%` }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={async () => {
                    setSelectedAssignment(assignment)
                    await loadSubmissions(assignment.id)
                    setIsEditDialogOpen(true)
                    setActiveTab("overview")
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Assignment Details Dialog with Tabs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedAssignment?.title}
              <Badge variant="outline" className="ml-2">
                {selectedAssignment?.courses?.course_code}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="submissions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Submissions
              </TabsTrigger>
              <TabsTrigger value="grading" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Grading
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assignment Details */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Assignment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <p className="mt-1 text-sm">{selectedAssignment?.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Due Date</Label>
                        <p className="mt-1 text-sm">
                          {selectedAssignment?.due_date ? format(new Date(selectedAssignment.due_date), "PPP") : "No due date"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Points</Label>
                        <p className="mt-1 text-sm">{selectedAssignment?.max_points}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Course</Label>
                        <p className="mt-1 text-sm">{selectedAssignment?.courses?.title || "Course"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <Badge className="mt-1" variant="default">
                          Published
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const stats = getSubmissionStats()
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Submissions</span>
                            <span className="font-semibold">{stats.total}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Graded</span>
                            <span className="font-semibold text-green-600">{stats.graded}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending</span>
                            <span className="font-semibold text-orange-600">{stats.pending}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Average Grade</span>
                            <span className="font-semibold">{stats.averageGrade}%</span>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Completion Rate</span>
                              <span>{stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0}%</span>
                            </div>
                            <Progress value={stats.total > 0 ? (stats.graded / stats.total) * 100 : 0} className="h-2" />
                          </div>
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Notification Sync */}
              <AssignmentNotificationSync 
                assignmentId={selectedAssignment?.id} 
                showDetails={true} 
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const message = prompt("Enter announcement message:")
                        if (message) sendAnnouncement(message)
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Announcement
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab("submissions")}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Submissions
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab("grading")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Grade Submissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Submissions Tab */}
            <TabsContent value="submissions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Student Submissions</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Grades
                  </Button>
                </div>
              </div>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
                  <p className="text-gray-600">Students haven't submitted any work for this assignment yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      selectedAssignment={selectedAssignment}
                      getSubmissionStatusColor={getSubmissionStatusColor}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Grading Tab */}
            <TabsContent value="grading" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grading Interface</h3>

                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading submissions...</span>
                  </div>
                ) : submissions.filter((s) => s.status === "submitted").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions to Grade</h3>
                    <p className="text-gray-600">All submissions have been graded or there are no submissions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions
                      .filter((s) => s.status === "submitted")
                      .map((submission) => (
                        <GradingCard
                          key={submission.id}
                          submission={submission}
                          selectedAssignment={selectedAssignment}
                          onGradeSubmission={handleGradeSubmission}
                          getSubmissionStatusColor={getSubmissionStatusColor}
                        />
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Assignment Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateAssignment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input 
                          id="edit-title" 
                          name="title" 
                          defaultValue={selectedAssignment?.title} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-points">Points</Label>
                        <Input 
                          id="edit-points" 
                          name="points" 
                          type="number" 
                          defaultValue={selectedAssignment?.max_points} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea 
                        id="edit-description" 
                        name="description" 
                        defaultValue={selectedAssignment?.description} 
                        rows={4} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-due-date">Due Date</Label>
                      <Input 
                        id="edit-due-date" 
                        name="due_date" 
                        type="datetime-local"
                        defaultValue={selectedAssignment?.due_date ? 
                          new Date(selectedAssignment.due_date).toISOString().slice(0, 16) : 
                          ""
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updating} className="w-full">
                        {updating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-submissions">Notify on New Submissions</Label>
                      <p className="text-sm text-gray-600">Get notified when students submit assignments</p>
                    </div>
                    <Switch id="notify-submissions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-late">Notify on Late Submissions</Label>
                      <p className="text-sm text-gray-600">Get notified when students submit after due date</p>
                    </div>
                    <Switch id="notify-late" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-reminders">Send Due Date Reminders</Label>
                      <p className="text-sm text-gray-600">Automatically remind students before due date</p>
                    </div>
                    <Switch id="notify-reminders" defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Submission Card Component
function SubmissionCard({ 
  submission, 
  selectedAssignment, 
  getSubmissionStatusColor 
}: {
  submission: Submission
  selectedAssignment: Assignment | null
  getSubmissionStatusColor: (status: string) => string
}) {
  const { toast } = useToast()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {submission.profiles?.full_name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{submission.profiles?.full_name || "Unknown Student"}</p>
              <p className="text-sm text-gray-600">Student ID: {submission.student_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a") : "Not submitted"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getSubmissionStatusColor(submission.status)}>{submission.status}</Badge>
                {submission.grade && <span className="text-sm font-medium">{submission.grade}/{selectedAssignment?.max_points}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {submission.file_url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      await downloadAssignmentFile(
                        submission.file_url!,
                        getFileNameFromUrl(submission.file_url!)
                      )
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to download file",
                        variant: "destructive",
                      })
                    }
                  }}
                  title="Download submission file"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {submission.feedback && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">{submission.feedback}</p>
          </div>
        )}
        {submission.content && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{submission.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Grading Card Component
function GradingCard({ 
  submission, 
  selectedAssignment, 
  onGradeSubmission,
  getSubmissionStatusColor 
}: {
  submission: Submission
  selectedAssignment: Assignment | null
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => Promise<void>
  getSubmissionStatusColor: (status: string) => string
}) {
  const [grade, setGrade] = useState(submission.grade?.toString() || "")
  const [feedback, setFeedback] = useState(submission.feedback || "")
  const [saving, setSaving] = useState(false)

  const handleSaveGrade = async () => {
    if (!grade) return
    
    // Validate grade doesn't exceed max points
    const gradeValue = parseInt(grade)
    if (isNaN(gradeValue)) {
      console.error('Invalid grade value')
      return
    }
    
    if (selectedAssignment && gradeValue > selectedAssignment.max_points) {
      console.error(`Grade (${gradeValue}) cannot exceed maximum points (${selectedAssignment.max_points})`)
      return
    }
    
    setSaving(true)
    await onGradeSubmission(submission.id, gradeValue, feedback)
    setSaving(false)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {submission.profiles?.full_name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{submission.profiles?.full_name || "Unknown Student"}</p>
              <p className="text-sm text-gray-600">
                Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a") : "Not submitted"}
              </p>
            </div>
          </div>
          <Badge variant={getSubmissionStatusColor(submission.status)}>{submission.status}</Badge>
        </div>

        {submission.content && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium text-gray-600">Submission Content:</Label>
            <p className="text-sm text-gray-700 mt-1">{submission.content}</p>
          </div>
        )}

        {submission.file_url && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <Label className="text-sm font-medium text-blue-700">Attached File:</Label>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-blue-800">{getFileNameFromUrl(submission.file_url)}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await downloadAssignmentFile(
                      submission.file_url!,
                      getFileNameFromUrl(submission.file_url!)
                    )
                  } catch (error) {
                    console.error('Download error:', error)
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`grade-${submission.id}`}>
              Grade (out of {selectedAssignment?.max_points})
            </Label>
            <Input
              id={`grade-${submission.id}`}
              type="number"
              placeholder="Enter grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              max={selectedAssignment?.max_points}
              className={
                grade && !isNaN(parseInt(grade)) && parseInt(grade) > (selectedAssignment?.max_points || 0)
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : ""
              }
            />
            {grade && !isNaN(parseInt(grade)) && parseInt(grade) > (selectedAssignment?.max_points || 0) && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ Grade cannot exceed {selectedAssignment?.max_points} points
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`feedback-${submission.id}`}>Feedback</Label>
            <Textarea
              id={`feedback-${submission.id}`}
              placeholder="Provide feedback to the student"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveGrade} 
            disabled={
              saving || 
              !grade || 
              (grade && !isNaN(parseInt(grade)) && parseInt(grade) > (selectedAssignment?.max_points || 0))
            }
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Grade"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
