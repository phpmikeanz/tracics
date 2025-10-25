"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Upload, Download, Eye, Filter } from "lucide-react"
import { format } from "date-fns"

interface Assignment {
  id: string
  title: string
  description: string
  course: string
  dueDate: Date
  points: number
  type: "homework" | "project" | "essay" | "lab"
  status: "not_started" | "in_progress" | "submitted" | "graded" | "overdue"
  grade?: number
  feedback?: string
  attachments?: string[]
  submittedAt?: Date
}

export function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "1",
      title: "Programming Assignment 1",
      description:
        "Implement basic sorting algorithms and analyze their time complexity. Submit your code along with a detailed analysis report.",
      course: "Computer Science 101",
      dueDate: new Date("2024-01-15"),
      points: 100,
      type: "homework",
      status: "submitted",
      submittedAt: new Date("2024-01-14T10:30:00"),
      attachments: ["sorting_algorithms.py", "analysis_report.pdf"],
    },
    {
      id: "2",
      title: "Final Project Proposal",
      description: "Submit a detailed proposal for your final project including objectives, methodology, and timeline.",
      course: "Advanced Programming",
      dueDate: new Date("2024-01-20"),
      points: 50,
      type: "project",
      status: "in_progress",
    },
    {
      id: "3",
      title: "Calculus Problem Set 3",
      description: "Complete problems 1-15 from Chapter 5. Show all work and provide detailed explanations.",
      course: "Mathematics",
      dueDate: new Date("2024-01-12"),
      points: 75,
      type: "homework",
      status: "graded",
      grade: 92,
      feedback: "Excellent work! Your solutions are clear and well-explained. Minor error in problem 7.",
      submittedAt: new Date("2024-01-11T16:45:00"),
    },
    {
      id: "4",
      title: "Physics Lab Report",
      description: "Write a comprehensive lab report on the pendulum experiment conducted in class.",
      course: "Physics",
      dueDate: new Date("2024-01-10"),
      points: 60,
      type: "lab",
      status: "overdue",
    },
    {
      id: "5",
      title: "Literature Essay",
      description: "Write a 5-page essay analyzing the themes in Shakespeare's Hamlet.",
      course: "English Literature",
      dueDate: new Date("2024-01-25"),
      points: 100,
      type: "essay",
      status: "not_started",
    },
  ])

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredAssignments = assignments.filter((assignment) => {
    if (filterStatus === "all") return true
    return assignment.status === filterStatus
  })

  const getStatusIcon = (status: Assignment["status"]) => {
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

  const getStatusColor = (status: Assignment["status"]) => {
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

  const getStatusText = (status: Assignment["status"]) => {
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

  const handleSubmitAssignment = (assignmentId: string, formData: FormData) => {
    setAssignments(
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, status: "submitted" as const, submittedAt: new Date() } : a,
      ),
    )
    setIsSubmissionDialogOpen(false)
  }

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
                  {assignments.filter((a) => a.status === "not_started" || a.status === "in_progress").length}
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
                  {assignments.filter((a) => a.status === "submitted" || a.status === "graded").length}
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
                <p className="text-2xl font-bold">{assignments.filter((a) => a.status === "overdue").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(assignment.status)}
                    <h3 className="text-lg font-semibold">{assignment.title}</h3>
                    <Badge variant="outline" className="capitalize">
                      {assignment.type}
                    </Badge>
                    <Badge variant={getStatusColor(assignment.status)}>{getStatusText(assignment.status)}</Badge>
                  </div>

                  <p className="text-gray-600 mb-3">{assignment.course}</p>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{assignment.description}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(assignment.dueDate, "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{assignment.points} points</span>
                    </div>
                    {assignment.submittedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Submitted: {format(assignment.submittedAt, "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  {assignment.status === "graded" && assignment.grade && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-900">
                          Grade: {assignment.grade}/{assignment.points}
                        </span>
                        <span className="text-blue-700">
                          {Math.round((assignment.grade / assignment.points) * 100)}%
                        </span>
                      </div>
                      {assignment.feedback && <p className="text-sm text-blue-800">{assignment.feedback}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  {assignment.status === "overdue" && (
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">Overdue</p>
                      <p className="text-xs text-red-500">{Math.abs(getDaysUntilDue(assignment.dueDate))} days late</p>
                    </div>
                  )}

                  {(assignment.status === "not_started" || assignment.status === "in_progress") && (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {getDaysUntilDue(assignment.dueDate) > 0
                          ? `${getDaysUntilDue(assignment.dueDate)} days left`
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

                    {(assignment.status === "not_started" || assignment.status === "in_progress") && (
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
        ))}
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
                  <p className="mt-1">{selectedAssignment?.course}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="mt-1">{selectedAssignment?.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Due Date</Label>
                    <p className="mt-1">{selectedAssignment && format(selectedAssignment.dueDate, "PPP")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Points</Label>
                    <p className="mt-1">{selectedAssignment?.points}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <p className="mt-1 capitalize">{selectedAssignment?.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission Form */}
            {selectedAssignment &&
              (selectedAssignment.status === "not_started" || selectedAssignment.status === "in_progress") && (
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
                          rows={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload Files</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Drag and drop files here, or click to browse</p>
                          <Input id="file-upload" name="files" type="file" multiple className="mt-2" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsSubmissionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Submit Assignment</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

            {/* Previous Submission (if exists) */}
            {selectedAssignment &&
              (selectedAssignment.status === "submitted" || selectedAssignment.status === "graded") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Submitted on:</p>
                        <p className="text-sm text-gray-600">
                          {selectedAssignment.submittedAt && format(selectedAssignment.submittedAt, "PPP 'at' p")}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(selectedAssignment.status)}>
                        {getStatusText(selectedAssignment.status)}
                      </Badge>
                    </div>

                    {selectedAssignment.status === "graded" && selectedAssignment.grade && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">
                            Grade: {selectedAssignment.grade}/{selectedAssignment.points}
                          </span>
                          <span className="text-blue-700 font-semibold">
                            {Math.round((selectedAssignment.grade / selectedAssignment.points) * 100)}%
                          </span>
                        </div>
                        {selectedAssignment.feedback && (
                          <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                            <p className="text-sm text-blue-800">{selectedAssignment.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Submitted Files:</p>
                        <div className="space-y-2">
                          {selectedAssignment.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{file}</span>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
