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
import { notifyAssignmentGraded, notifyNewAssignment } from "@/lib/notifications"
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

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
          <p className="text-gray-600">Create and manage course assignments</p>
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
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first assignment for your courses.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      ) : (
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
      )}

      {/* Assignment Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Assignment: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="grading">Grading</TabsTrigger>
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
                    <Card key={submission.id}>
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
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
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
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="grading" className="space-y-4">
              <GradingInterface 
                submissions={submissions}
                selectedAssignment={selectedAssignment}
                loadingSubmissions={loadingSubmissions}
                onGradeSubmission={handleGradeSubmission}
                getSubmissionStatusColor={getSubmissionStatusColor}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate grading component to avoid useState in map
function GradingInterface({ 
  submissions, 
  selectedAssignment, 
  loadingSubmissions, 
  onGradeSubmission,
  getSubmissionStatusColor 
}: {
  submissions: Submission[]
  selectedAssignment: Assignment | null
  loadingSubmissions: boolean
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => Promise<void>
  getSubmissionStatusColor: (status: string) => string
}) {
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const handleSaveGrade = async (submissionId: string) => {
    const grade = grades[submissionId]
    const feedback = feedbacks[submissionId] || ""
    
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
    
    setSaving(prev => ({ ...prev, [submissionId]: true }))
    await onGradeSubmission(submissionId, gradeValue, feedback)
    setSaving(prev => ({ ...prev, [submissionId]: false }))
  }

  return (
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
        submissions
          .filter((s) => s.status === "submitted")
          .map((submission) => (
            <Card key={submission.id}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`grade-${submission.id}`}>
                      Grade (out of {selectedAssignment?.max_points})
                    </Label>
                    <Input
                      id={`grade-${submission.id}`}
                      type="number"
                      placeholder="Enter grade"
                      value={grades[submission.id] || submission.grade?.toString() || ""}
                      onChange={(e) => setGrades(prev => ({ ...prev, [submission.id]: e.target.value }))}
                      max={selectedAssignment?.max_points}
                      className={
                        grades[submission.id] && !isNaN(parseInt(grades[submission.id])) && parseInt(grades[submission.id]) > (selectedAssignment?.max_points || 0)
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    {grades[submission.id] && !isNaN(parseInt(grades[submission.id])) && parseInt(grades[submission.id]) > (selectedAssignment?.max_points || 0) && (
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
                      value={feedbacks[submission.id] || submission.feedback || ""}
                      onChange={(e) => setFeedbacks(prev => ({ ...prev, [submission.id]: e.target.value }))}
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
                    onClick={() => handleSaveGrade(submission.id)} 
                    disabled={
                      saving[submission.id] || 
                      !grades[submission.id] || 
                      (grades[submission.id] && !isNaN(parseInt(grades[submission.id])) && parseInt(grades[submission.id]) > (selectedAssignment?.max_points || 0)
                    }
                  >
                    {saving[submission.id] ? (
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
          ))
      )}
    </div>
  )
}