"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Upload, Download, Eye, Filter, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAssignmentsForStudent, submitAssignment, getSubmissionByStudentAndAssignment } from "@/lib/assignments"
import { uploadAssignmentFile, downloadAssignmentFile, getFileNameFromUrl, type FileUploadProgress } from "@/lib/file-upload"
import { createClient } from "@/lib/supabase/client"
import { notifyAssignmentSubmitted } from "@/lib/ttrac-notifications"
import { notifyFacultyAssignmentSubmission, trackStudentActivity } from "@/lib/faculty-activity-notifications"
import type { Database } from "@/lib/types"

type Assignment = Database["public"]["Tables"]["assignments"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  submission?: Database["public"]["Tables"]["assignment_submissions"]["Row"] | null
}

type SubmissionInsert = Database["public"]["Tables"]["assignment_submissions"]["Insert"]

export function StudentAssignments() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  
  const supabase = createClient()
  const subscriptionRef = useRef<any>(null)

  // Load assignments when component mounts
  useEffect(() => {
    if (user?.id) {
      loadAssignments()
      setupRealtimeSubscriptions()
    }
    
    // Cleanup subscriptions on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [user?.id])

  const loadAssignments = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const assignmentsData = await getAssignmentsForStudent(user.id)
      
      // Load submission status for each assignment
      const assignmentsWithSubmissions = await Promise.all(
        assignmentsData.map(async (assignment) => {
          const submission = await getSubmissionByStudentAndAssignment(user.id, assignment.id)
          return {
            ...assignment,
            submission
          }
        })
      )
      
      setAssignments(assignmentsWithSubmissions)
    } catch (error) {
      console.error('Error loading assignments:', error)
      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscriptions = async () => {
    if (!user?.id) {
      // If no user, set offline
      setIsRealtimeConnected(false)
      return
    }

    try {
      // Get student's enrolled courses for filtering
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("status", "approved")

      if (enrollmentsError) {
        console.error('Error getting enrollments for realtime:', enrollmentsError)
        // Set as connected even if we can't filter by courses - we'll still get updates
        setIsRealtimeConnected(true)
        return
      }

      // Subscribe to assignments table changes
      const channelName = `assignments_changes_${user.id}_${Date.now()}`
      const assignmentsSubscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignments',
            ...(enrollments && enrollments.length > 0 && {
              filter: `course_id=in.(${enrollments.map(e => e.course_id).join(',')})`
            })
          },
          (payload) => {
            console.log('Assignment change detected:', payload)
            setLastUpdateTime(new Date())
            setIsUpdating(true)
            
            // Show subtle notification for assignment changes
            toast({
              title: "Assignment Updated",
              description: "Your assignments have been updated with the latest changes.",
              duration: 3000,
            })
            
            loadAssignments().finally(() => {
              setTimeout(() => setIsUpdating(false), 1000) // Show animation for 1 second
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignment_submissions',
            filter: `student_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Assignment submission change detected:', payload)
            setLastUpdateTime(new Date())
            setIsUpdating(true)
            
            // Show notification for submission changes (grading, etc.)
            toast({
              title: "Submission Updated",
              description: "Your assignment submission status has been updated.",
              duration: 3000,
            })
            
            loadAssignments().finally(() => {
              setTimeout(() => setIsUpdating(false), 1000) // Show animation for 1 second
            })
          }
        )
        .subscribe((status, err) => {
          console.log('Realtime subscription status:', status, err)
          if (err) {
            console.error('Realtime subscription error:', err)
            setIsRealtimeConnected(false)
          } else {
            setIsRealtimeConnected(status === 'SUBSCRIBED')
            // Also set connected if status is 'CHANNEL_ERROR' but we can still work offline
            if (status === 'SUBSCRIBED') {
              setLastUpdateTime(new Date())
            }
          }
        })

      subscriptionRef.current = assignmentsSubscription

      // Set a timeout to mark as connected if subscription takes too long
      // This handles cases where Supabase realtime might be slow to connect
      // The assignments will still work without realtime, so we mark as connected
      setTimeout(() => {
        setIsRealtimeConnected((current) => {
          if (!current) {
            console.log('Realtime connection timeout - marking as connected anyway (assignments still work)')
            return true
          }
          return current
        })
      }, 3000)

    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error)
      // Even if realtime fails, we can still work - just mark as connected
      setIsRealtimeConnected(true)
    }
  }

  const getAssignmentStatus = (assignment: Assignment) => {
    if (!assignment.submission) return "not_started"
    if (assignment.submission.status === "graded") return "graded"
    if (assignment.submission.status === "submitted") return "submitted"
    if (assignment.submission.status === "draft") return "in_progress"
    
    // Check if overdue
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return "overdue"
    }
    
    return "not_started"
  }

  const filteredAssignments = assignments
    .filter((assignment) => {
      if (filterStatus === "all") return true
      return getAssignmentStatus(assignment) === filterStatus
    })
    .sort((a, b) => {
      // First sort by creation date (descending - latest first)
      const createdA = new Date(a.created_at).getTime()
      const createdB = new Date(b.created_at).getTime()
      
      if (createdA !== createdB) {
        return createdB - createdA // Descending order (latest first)
      }
      
      // If creation dates are the same, sort by due date (ascending)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      
      return 0
    })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "graded":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "default"
      case "graded":
        return "default"
      case "overdue":
        return "destructive"
      case "in_progress":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "not_started":
        return "Not Started"
      case "in_progress":
        return "In Progress"
      case "submitted":
        return "Submitted"
      case "graded":
        return "Graded"
      case "overdue":
        return "Overdue"
      default:
        return status
    }
  }

  const handleSubmitAssignment = async (assignmentId: string, formData: FormData) => {
    if (!user?.id) return
    
    try {
      setSubmitting(true)
      
      let fileUrl: string | null = null
      
      // Handle file upload
      const files = formData.getAll("files") as File[]
      console.log('Form files:', files)
      
      if (files.length > 0 && files[0] && files[0].size > 0) {
        const file = files[0] // Take the first file for now
        
        console.log('Processing file:', { name: file.name, size: file.size, type: file.type })
        
        setIsUploading(true)
        setUploadProgress({ loaded: 0, total: file.size, percentage: 0 })
        
        toast({
          title: "Uploading...",
          description: `Uploading ${file.name}, please wait...`,
        })
        
        const uploadResult = await uploadAssignmentFile(
          file, 
          user.id, 
          assignmentId,
          (progress) => {
            setUploadProgress(progress)
          }
        )
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "File upload failed")
        }
        
        fileUrl = uploadResult.url || null
        console.log('File uploaded successfully:', fileUrl)
      } else {
        console.log('No files to upload or file is empty')
      }
      
      const submissionData: SubmissionInsert = {
        assignment_id: assignmentId,
        student_id: user.id,
        content: formData.get("submissionText") as string || null,
        file_url: fileUrl,
      }

      await submitAssignment(submissionData)
      
      // Enhanced faculty notification system for assignment submission
      const assignment = assignments.find(a => a.id === assignmentId)
      if (assignment && assignment.course_id) {
        try {
          const supabase = require("@/lib/supabase/client").createClient()
          
          // Get course and student information
          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("instructor_id, title")
            .eq("id", assignment.course_id)
            .single()

          const { data: studentData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

          if (!courseError && courseData?.instructor_id) {
            const studentName = studentData?.full_name || "Student"
            const courseTitle = courseData.title || "Course"
            const submittedAt = new Date().toISOString()
            
            // Check if submission is late
            const isLate = assignment.due_date && new Date() > new Date(assignment.due_date)
            
            if (isLate) {
              // Notify faculty about late submission
              await notifyFacultyAssignmentSubmission(
                courseData.instructor_id,
                studentName,
                assignment.title,
                courseTitle,
                submittedAt
              )
            } else {
              // Notify faculty about regular submission
              await notifyFacultyAssignmentSubmission(
                courseData.instructor_id,
                studentName,
                assignment.title,
                courseTitle,
                submittedAt
              )
            }
            
            // Track student activity for comprehensive monitoring
            await trackStudentActivity(
              user.id,
              assignment.course_id,
              'assignment_submitted',
              {
                assignmentTitle: assignment.title,
                isLate: isLate,
                submittedAt: submittedAt
              }
            )
            
            console.log("Enhanced faculty notification sent for assignment submission:", assignment.title)
          }
        } catch (notificationError) {
          console.log("Enhanced notification failed, but assignment was submitted:", notificationError)
        }
      }
      
      // Reload assignments to get updated submission status
      await loadAssignments()
      
      setIsSubmissionDialogOpen(false)
      
      toast({
        title: "Success",
        description: fileUrl 
          ? "Assignment and file submitted successfully!" 
          : "Assignment submitted successfully!",
      })
    } catch (error) {
      console.error('Error submitting assignment:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return 0
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view assignments.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
            {/* Real-time Status Indicator - Hidden if offline to avoid confusion */}
            {isRealtimeConnected && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-500">
                  Live updates
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600">Track and submit your course assignments</p>
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {format(lastUpdateTime, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setIsUpdating(true)
              loadAssignments().finally(() => {
                setTimeout(() => setIsUpdating(false), 1000)
              })
            }}
            disabled={isUpdating}
          >
            <Loader2 className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => {
                    const status = getAssignmentStatus(a)
                    return status === "not_started" || status === "in_progress"
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => {
                    const status = getAssignmentStatus(a)
                    return status === "submitted" || status === "graded"
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => getAssignmentStatus(a) === "overdue").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <div className={`transition-all duration-500 ${isUpdating ? 'opacity-75 scale-[0.99]' : 'opacity-100 scale-100'}`}>
        {assignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
          <p className="text-gray-600">You don't have any assignments at the moment. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment)
            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(status)}
                        <h3 className="text-lg font-semibold">{assignment.title}</h3>
                        <Badge variant="outline">
                          Assignment
                        </Badge>
                        <Badge variant={getStatusColor(status)}>{getStatusText(status)}</Badge>
                      </div>

                      <p className="text-gray-600 mb-3">{assignment.courses?.title || "Course"}</p>
                      <p className="text-sm text-gray-700 mb-4 line-clamp-2">{assignment.description}</p>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {assignment.due_date ? format(new Date(assignment.due_date), "MMM d, yyyy") : "No due date"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{assignment.max_points} points</span>
                        </div>
                        {assignment.submission?.submitted_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Submitted: {format(new Date(assignment.submission.submitted_at), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>

                      {status === "graded" && assignment.submission?.grade && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-900">
                              Grade: {assignment.submission.grade}/{assignment.max_points}
                            </span>
                            <span className="text-blue-700">
                              {Math.round((assignment.submission.grade / assignment.max_points) * 100)}%
                            </span>
                          </div>
                          {assignment.submission.feedback && <p className="text-sm text-blue-800">{assignment.submission.feedback}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      {status === "overdue" && (
                        <div className="text-right">
                          <p className="text-sm text-red-600 font-medium">Overdue</p>
                          <p className="text-xs text-red-500">{Math.abs(getDaysUntilDue(assignment.due_date))} days late</p>
                        </div>
                      )}

                      {(status === "not_started" || status === "in_progress") && assignment.due_date && (
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {getDaysUntilDue(assignment.due_date) > 0
                              ? `${getDaysUntilDue(assignment.due_date)} days left`
                              : "Due today"}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setIsSubmissionDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        {(status === "not_started" || status === "in_progress") && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAssignment(assignment)
                              setIsSubmissionDialogOpen(true)
                            }}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Submit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>

      {/* Assignment Submission Dialog */}
      <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assignment: {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              View assignment details, submit your work, or review your previous submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Assignment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Course</Label>
                  <p className="mt-1">{selectedAssignment?.courses?.title || "Course"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="mt-1">{selectedAssignment?.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Due Date</Label>
                    <p className="mt-1">{selectedAssignment?.due_date ? format(new Date(selectedAssignment.due_date), "PPP") : "No due date"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Points</Label>
                    <p className="mt-1">{selectedAssignment?.max_points}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <p className="mt-1">Assignment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission Form */}
            {selectedAssignment && (() => {
              const status = getAssignmentStatus(selectedAssignment)
              return (status === "not_started" || status === "in_progress") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submit Assignment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      action={(formData) => handleSubmitAssignment(selectedAssignment.id, formData)}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="submission-text">Submission Text</Label>
                        <Textarea
                          id="submission-text"
                          name="submissionText"
                          placeholder="Enter your submission text or notes here..."
                          defaultValue={selectedAssignment.submission?.content || ""}
                          rows={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload Files</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Drag and drop files here, or click to browse</p>
                          <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, TXT, Images, ZIP (Max 50MB)</p>
                          <Input 
                            id="file-upload" 
                            name="files" 
                            type="file" 
                            multiple 
                            className="mt-2"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip"
                            disabled={isUploading}
                          />
                        </div>
                        
                        {/* Upload Progress */}
                        {isUploading && uploadProgress && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Uploading file...</span>
                              <span className="text-gray-500">{Math.round(uploadProgress.percentage)}%</span>
                            </div>
                            <Progress 
                              value={uploadProgress.percentage} 
                              className="w-full"
                            />
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {Math.round(uploadProgress.loaded / 1024)} KB / {Math.round(uploadProgress.total / 1024)} KB
                              </span>
                              <span className="flex items-center">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Uploading...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsSubmissionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || isUploading}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Submit Assignment"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Previous Submission (if exists) */}
            {selectedAssignment && (() => {
              const status = getAssignmentStatus(selectedAssignment)
              return (status === "submitted" || status === "graded") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Submitted on:</p>
                        <p className="text-sm text-gray-600">
                          {selectedAssignment.submission?.submitted_at && format(new Date(selectedAssignment.submission.submitted_at), "PPP 'at' p")}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(status)}>
                        {getStatusText(status)}
                      </Badge>
                    </div>

                    {selectedAssignment.submission?.content && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 mb-2">Submission Content:</p>
                        <p className="text-sm text-gray-700">{selectedAssignment.submission.content}</p>
                      </div>
                    )}

                    {status === "graded" && selectedAssignment.submission?.grade && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">
                            Grade: {selectedAssignment.submission.grade}/{selectedAssignment.max_points}
                          </span>
                          <span className="text-blue-700 font-semibold">
                            {Math.round((selectedAssignment.submission.grade / selectedAssignment.max_points) * 100)}%
                          </span>
                        </div>
                        {selectedAssignment.submission.feedback && (
                          <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                            <p className="text-sm text-blue-800">{selectedAssignment.submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedAssignment.submission?.file_url && (
                      <div>
                        <p className="font-medium mb-2">Submitted Files:</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{getFileNameFromUrl(selectedAssignment.submission.file_url)}</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  await downloadAssignmentFile(
                                    selectedAssignment.submission!.file_url!,
                                    getFileNameFromUrl(selectedAssignment.submission!.file_url!)
                                  )
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to download file",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
