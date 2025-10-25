"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Upload, Download, Eye, Filter, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAssignmentsForStudent, submitAssignment, getSubmissionByStudentAndAssignment } from "@/lib/assignments"
import { uploadAssignmentFile, downloadAssignmentFile, getFileNameFromUrl } from "@/lib/file-upload"
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

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Load assignments when component mounts
  useEffect(() => {
    if (user?.id) {
      loadAssignments()
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
        
        toast({
          title: "Uploading...",
          description: `Uploading ${file.name}, please wait...`,
        })
        
        const uploadResult = await uploadAssignmentFile(file, user.id, assignmentId)
        
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
          <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
          <p className="text-gray-600">Track and submit your course assignments</p>
        </div>
        <div className="flex items-center gap-2">
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
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsSubmissionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
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
