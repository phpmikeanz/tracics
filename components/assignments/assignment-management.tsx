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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, CalendarIcon, Users, Download, Eye, MessageSquare, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAssignmentsByInstructor, createAssignment, getSubmissionsByAssignment, gradeSubmission } from "@/lib/assignments"
import { getCoursesByInstructor } from "@/lib/courses"
import { downloadAssignmentFile, getFileNameFromUrl } from "@/lib/file-upload"
import { createClient } from "@/lib/supabase/client"
import { notifyAssignmentGraded, notifyNewAssignment } from "@/lib/notifications"
import { 
  notifyNewAssignmentCreated, 
  notifyAssignmentSubmitted, 
  notifyAssignmentGraded as notifyGraded,
  notifyAssignmentUpdated,
  notifyDueDateReminder,
  notifyLateSubmission,
  notifyAssignmentAnnouncement
} from "@/lib/assignment-notifications"
import { useAssignmentNotifications } from "@/hooks/use-assignment-notifications"
import { useFacultyNotifications } from "@/hooks/use-faculty-notifications"
import type { Database } from "@/lib/types"

type Assignment = Database["public"]["Tables"]["assignments"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  assignment_submissions?: { count: number }[]
}

type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"]

type Submission = Database["public"]["Tables"]["assignment_submissions"]["Row"] & {
  profiles?: { full_name: string; email: string } | null
}

type Course = Database["public"]["Tables"]["courses"]["Row"]

export function AssignmentManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  // Enhanced notification integration
  const { notifications, unreadCount, markAsRead } = useAssignmentNotifications()
  const facultyNotifications = useFacultyNotifications()
  
  // Get real notification count from database
  const [realUnreadCount, setRealUnreadCount] = useState(0)
  
  // Load real notification count
  useEffect(() => {
    const loadRealCount = async () => {
      if (!user?.id) return
      
      try {
        const supabase = createClient()
        
        // First, let's see what notifications exist
        const { data: allNotifications, error: allError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (allError) {
          console.error('Error fetching all notifications:', allError)
          return
        }
        
        console.log("[AssignmentManagement] All notifications:", allNotifications?.length || 0)
        console.log("[AssignmentManagement] All notifications data:", allNotifications)
        
        // Get unread count
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        
        if (error) {
          console.error('Error fetching real unread count:', error)
          return
        }
        
        console.log("[AssignmentManagement] Real unread count from DB:", count)
        setRealUnreadCount(count || 0)
        
        // If count seems too high, let's clean up old notifications
        if (count && count > 10) {
          console.log("[AssignmentManagement] High notification count detected, cleaning up...")
          // Mark old notifications as read
          const { error: cleanupError } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days ago
          
          if (!cleanupError) {
            console.log("[AssignmentManagement] Cleaned up old notifications")
            // Reload count after cleanup
            const { count: newCount } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false)
            
            setRealUnreadCount(newCount || 0)
            console.log("[AssignmentManagement] New unread count after cleanup:", newCount)
          }
        }
      } catch (error) {
        console.error('Error loading real notification count:', error)
      }
    }
    
    loadRealCount()
  }, [user?.id])
  
  // Use real count from database
  const actualUnreadCount = realUnreadCount
  
  // Debug notification data
  useEffect(() => {
    console.log("[AssignmentManagement] Assignment notifications:", notifications.length)
    console.log("[AssignmentManagement] Assignment unread count:", unreadCount)
    console.log("[AssignmentManagement] Faculty unread count:", facultyNotifications.unreadCount)
    console.log("[AssignmentManagement] Real unread count:", realUnreadCount)
    console.log("[AssignmentManagement] Final unread count:", actualUnreadCount)
  }, [notifications, unreadCount, facultyNotifications.unreadCount, realUnreadCount, actualUnreadCount])

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [defaultTab, setDefaultTab] = useState("overview")

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
      
      // Enhanced notification system for new assignments
      if (newAssignment) {
        // Get instructor name for notification
        const instructorName = user.full_name || "Instructor"
        
        await notifyNewAssignmentCreated({
          assignmentId: newAssignment.id,
          courseId: assignmentData.course_id,
          title: assignmentData.title,
          description: assignmentData.description,
          dueDate: assignmentData.due_date,
          maxPoints: assignmentData.max_points,
          instructorId: user.id,
          instructorName: instructorName
        })
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
      
      // Enhanced notification system for graded assignments
      const submission = submissions.find(s => s.id === submissionId)
      if (submission?.student_id && selectedAssignment) {
        await notifyGraded({
          submissionId: submission.id,
          assignmentId: selectedAssignment.id,
          assignmentTitle: selectedAssignment.title,
          studentId: submission.student_id,
          grade: grade,
          maxPoints: selectedAssignment.max_points,
          feedback: feedback,
          gradedAt: new Date().toISOString()
        })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
            {/* Notification badge hidden as requested */}
            {/* {actualUnreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {actualUnreadCount} new notification{actualUnreadCount > 1 ? 's' : ''}
              </Badge>
            )} */}
          </div>
          <p className="text-gray-600">Create and manage course assignments with real-time notifications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[100vw] max-w-[100vw] sm:max-w-2xl p-3 sm:p-6 max-h-[85vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-none sm:rounded-lg">
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
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <p className="text-sm text-gray-600">{assignment.courses?.title || "Course"}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline">
                    Assignment
                  </Badge>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-1" title="Assignment due date">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Due: {assignment.due_date ? format(new Date(assignment.due_date), "MMM d, yyyy") : "No due date"}</span>
                </div>
                <span className="font-medium" title="Maximum points for this assignment">{assignment.max_points} pts</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-1" title="Number of student submissions received">
                  <Users className="h-4 w-4" />
                  <span>
                    {assignment.assignment_submissions?.[0]?.count || 0} submissions
                  </span>
                </div>
                <Badge variant="default" title="Assignment is published and visible to students">Published</Badge>
              </div>

              <div 
                className="w-full bg-gray-200 rounded-full h-2" 
                title={`Submission progress: ${assignment.assignment_submissions?.[0]?.count || 0} students have submitted`}
              >
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min((assignment.assignment_submissions?.[0]?.count || 0) * 10, 100)}%` }}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  title="Open assignment management panel to view submissions, grade students, and edit settings"
                  onClick={() => {
                    setSelectedAssignment(assignment)
                    setDefaultTab("submissions")
                    setIsEditDialogOpen(true)
                    // Load submissions in background after modal opens
                    loadSubmissions(assignment.id)
                  }}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignment Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[100vw] max-w-[100vw] sm:max-w-6xl p-2 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Assignment: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sticky top-0 bg-background z-10 overflow-x-hidden">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="submissions" className="text-xs sm:text-sm">Submissions</TabsTrigger>
            <TabsTrigger value="grading" className="text-xs sm:text-sm">Grading</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <p className="mt-1">{selectedAssignment?.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Due Date</Label>
                      <p className="mt-1">{selectedAssignment?.due_date ? format(new Date(selectedAssignment.due_date), "PPP") : "No due date"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Points</Label>
                      <p className="mt-1">{selectedAssignment?.max_points}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                      <Label className="text-sm font-medium text-gray-600">Course</Label>
                      <p className="mt-1">{selectedAssignment?.courses?.title || "Course"}</p>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Submission Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Submissions</span>
                      <span className="font-semibold">{submissions.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Graded</span>
                      <span className="font-semibold">{submissions.filter(s => s.status === "graded").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="font-semibold">{submissions.filter(s => s.status === "submitted").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Grade</span>
                      <span className="font-semibold">
                        {submissions.filter(s => s.grade).length > 0 
                          ? Math.round(submissions.reduce((acc, s) => acc + (s.grade || 0), 0) / submissions.filter(s => s.grade).length)
                          : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base sm:text-lg font-semibold">Student Submissions</h3>
                <div className="flex gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-auto whitespace-nowrap"
                    title="Download all submission files as a ZIP archive"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-auto whitespace-nowrap"
                    title="Export student grades to CSV/Excel file"
                  >
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
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {submission.profiles?.full_name?.charAt(0) || "S"}
                              </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                              <p className="font-medium truncate">{submission.profiles?.full_name || "Unknown Student"}</p>
                              <p className="text-sm text-gray-600 truncate break-all">Student ID: {submission.student_id}</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-sm font-medium break-words">
                                Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a") : "Not submitted"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getSubmissionStatusColor(submission.status)}>{submission.status}</Badge>
                                {submission.grade && <span className="text-sm font-medium">{submission.grade}/{selectedAssignment?.max_points}</span>}
                              </div>
                          </div>
                            <div className="flex gap-2 flex-nowrap overflow-x-auto justify-end w-full sm:w-auto">
                              {submission.file_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-auto h-9 px-3 whitespace-nowrap"
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-auto h-9 px-3 whitespace-nowrap"
                                onClick={() => {
                                  // Toggle feedback section visibility
                                  const feedbackSection = document.getElementById(`feedback-${submission.id}`)
                                  if (feedbackSection) {
                                    feedbackSection.scrollIntoView({ behavior: 'smooth' })
                                    // Focus on the textarea
                                    const textarea = feedbackSection.querySelector('textarea')
                                    if (textarea) {
                                      setTimeout(() => textarea.focus(), 300)
                                    }
                                  }
                                }}
                                title="Add or edit feedback for this submission"
                              >
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
                      
                      {/* Feedback Input Section */}
                      <div id={`feedback-${submission.id}`} className="mt-4 p-4 border rounded-lg bg-gray-50">
                        <Label className="text-sm font-medium text-gray-700">Add Feedback:</Label>
                        <Textarea
                          placeholder="Enter feedback for this submission..."
                          className="mt-2"
                          rows={3}
                          defaultValue={submission.feedback || ""}
                          onChange={(e) => {
                            // Update feedback in real-time
                            const updatedSubmissions = submissions.map(s => 
                              s.id === submission.id ? { ...s, feedback: e.target.value } : s
                            )
                            setSubmissions(updatedSubmissions)
                          }}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const feedbackText = (document.querySelector(`#feedback-${submission.id} textarea`) as HTMLTextAreaElement)?.value
                              if (feedbackText) {
                                try {
                                  await gradeSubmission(submission.id, submission.grade || 0, feedbackText)
                                  toast({
                                    title: "💬 Feedback Saved",
                                    description: "Your feedback has been saved and sent to the student.",
                                    duration: 3000,
                                  })
                                } catch (error) {
                                  toast({
                                    title: "❌ Feedback Save Failed",
                                    description: "Unable to save your feedback. Please try again.",
                                    variant: "destructive",
                                    duration: 4000,
                                  })
                                }
                              }
                            }}
                          >
                            Save Feedback
                          </Button>
                        </div>
                      </div>
                        {submission.content && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{submission.content}</p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </TabsContent>

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

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" defaultValue={selectedAssignment?.title} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-points">Points</Label>
                        <Input id="edit-points" type="number" defaultValue={selectedAssignment?.max_points} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea id="edit-description" defaultValue={selectedAssignment?.description} rows={4} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsEditDialogOpen(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={async () => {
                          if (!selectedAssignment) return
                          
                          try {
                            const titleInput = document.getElementById('edit-title') as HTMLInputElement
                            const pointsInput = document.getElementById('edit-points') as HTMLInputElement
                            const descriptionInput = document.getElementById('edit-description') as HTMLTextAreaElement
                            
                            const updatedData = {
                              title: titleInput?.value || selectedAssignment.title,
                              max_points: parseInt(pointsInput?.value || "0"),
                              description: descriptionInput?.value || selectedAssignment.description,
                            }
                            
                            // Update assignment in database
                            const supabase = createClient()
                            const { error } = await supabase
                              .from('assignments')
                              .update(updatedData)
                              .eq('id', selectedAssignment.id)
                            
                            if (error) throw error
                            
                            // Update local state
                            setAssignments(prev => 
                              prev.map(a => a.id === selectedAssignment.id ? { ...a, ...updatedData } : a)
                            )
                            
                            toast({
                              title: "✅ Assignment Updated Successfully",
                              description: "Your changes have been saved to the database.",
                              duration: 4000,
                            })
                            
                            // Close dialog
                            setIsEditDialogOpen(false)
                            
                          } catch (error) {
                            console.error('Error updating assignment:', error)
                            toast({
                              title: "❌ Save Failed",
                              description: "Unable to save your changes. Please check your connection and try again.",
                              variant: "destructive",
                              duration: 5000,
                            })
                          }
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate grading card component to avoid useState in map
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
    
    setSaving(true)
    await onGradeSubmission(submission.id, parseInt(grade), feedback)
    setSaving(false)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {submission.profiles?.full_name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{submission.profiles?.full_name || "Unknown Student"}</p>
              <p className="text-sm text-gray-600 truncate">
                Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a") : "Not submitted"}
              </p>
            </div>
          </div>
          <div className="sm:self-start">
            <Badge variant={getSubmissionStatusColor(submission.status)}>{submission.status}</Badge>
          </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
              <span className="text-sm text-blue-800 truncate">{getFileNameFromUrl(submission.file_url)}</span>
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
            />
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

        <div className="flex justify-end gap-2 mt-4 flex-wrap">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button size="sm" onClick={handleSaveGrade} disabled={saving || !grade} className="w-full sm:w-auto">
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
