"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircle, Calendar, Clock, Play, Eye, CheckCircle, AlertCircle, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { QuizTaking } from "./quiz-taking"

type Quiz = {
  id: string
  title: string
  description: string
  course: string
  timeLimit: number
  attempts: number
  attemptsUsed: number
  dueDate: Date
  totalPoints: number
  questions: number
  status: "available" | "completed" | "overdue" | "locked" | "graded"
  bestScore?: number
  lastAttempt?: Date
}

export function StudentQuizzes({ refreshTrigger }: { refreshTrigger?: any } = {}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  // Fetch quizzes and attempts from Supabase
  const fetchQuizzes = async () => {
    setLoading(true)
    const supabase = createClient()
    // Get all quizzes for enrolled courses
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, description, time_limit, due_date, max_attempts, course_id, status, quiz_questions(count), course: courses(title)')
      .eq('status', 'published')
    if (quizError) {
      setLoading(false)
      return
    }
    // Get student's quiz attempts
    // Get authenticated user id from Supabase auth
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    if (userError || !user) {
      setLoading(false)
      return
    }
    // Use user.id to fetch profile and quiz attempts
    const studentId = user.id
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, score, status, completed_at, started_at')
      .eq('student_id', studentId)
    if (attemptsError) {
      setLoading(false)
      return
    }
    // Map attempts to quizzes
    const quizzesMapped: Quiz[] = quizData.map((quiz: any) => {
      const attempt = attemptsData.find((a: any) => a.quiz_id === quiz.id)
      let status: Quiz["status"] = "available"
      if (attempt) {
        if (attempt.status === "graded") status = "completed"
        else if (attempt.status === "completed" || attempt.status === "submitted") status = "completed"
        else if (attempt.status === "in_progress") status = "available"
      }
      // Overdue logic
      const dueDate = new Date(quiz.due_date)
      if (dueDate < new Date() && status === "available") status = "overdue"
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course?.title || "",
        timeLimit: quiz.time_limit,
        attempts: quiz.max_attempts,
        attemptsUsed: attempt ? 1 : 0,
        dueDate,
        totalPoints: quiz.quiz_questions?.count || 0,
        questions: quiz.quiz_questions?.count || 0,
        status,
        bestScore: attempt?.score,
        lastAttempt: attempt?.completed_at ? new Date(attempt.completed_at) : undefined,
      }
    })
    setQuizzes(quizzesMapped)
    setLoading(false)
  }

  // Initial fetch and refresh on trigger
  useEffect(() => {
    fetchQuizzes()
    // Optionally, listen for refreshTrigger changes
  }, [refreshTrigger])

  // Expose refreshQuizzes for parent/grading UI
  // ...existing code...

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (filterStatus === "all") return true
    return quiz.status === filterStatus
  })

  const getStatusIcon = (status: Quiz["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "available":
        return <Play className="h-4 w-4 text-blue-500" />
      case "locked":
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Quiz["status"]) => {
    switch (status) {
      case "completed":
        return "default"
      case "overdue":
        return "destructive"
      case "available":
        return "secondary"
      case "locked":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: Quiz["status"]) => {
    switch (status) {
      case "available":
        return "Available"
      case "completed":
        return "Completed"
      case "overdue":
        return "Overdue"
      case "locked":
        return "Locked"
      default:
        return status
    }
  }

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleStartQuiz = () => {
    setIsStartDialogOpen(false)
    setIsQuizStarted(true)
  }

  if (loading) {
    return <div className="text-center py-12">Loading quizzes...</div>
  }
  if (isQuizStarted) {
    return <QuizTaking />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Quizzes</h2>
          <p className="text-gray-600">Take quizzes and track your progress</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold">{quizzes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold">{quizzes.filter((q) => q.status === "available").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{quizzes.filter((q) => q.status === "completed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold">84%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {filteredQuizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(quiz.status)}
                    <h3 className="text-lg font-semibold">{quiz.title}</h3>
                    <Badge variant={getStatusColor(quiz.status)}>{getStatusText(quiz.status)}</Badge>
                  </div>

                  <p className="text-gray-600 mb-3">{quiz.course}</p>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{quiz.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(quiz.dueDate, "MMM d")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.timeLimit} minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-4 w-4" />
                      <span>{quiz.questions} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{quiz.totalPoints} points</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      Attempts: {quiz.attemptsUsed}/{quiz.attempts}
                    </span>
                    {quiz.bestScore && (
                      <span>
                        Best Score: {quiz.bestScore}/{quiz.totalPoints} (
                        {Math.round((quiz.bestScore / quiz.totalPoints) * 100)}%)
                      </span>
                    )}
                  </div>

                  {quiz.status === "completed" && quiz.lastAttempt && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        Completed on {format(quiz.lastAttempt, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  )}

                  {quiz.status === "overdue" && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        This quiz was due {Math.abs(getDaysUntilDue(quiz.dueDate))} days ago
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  {quiz.status === "available" && getDaysUntilDue(quiz.dueDate) > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{getDaysUntilDue(quiz.dueDate)} days left</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {quiz.status === "completed" && (
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                    )}

                    {quiz.status === "available" && quiz.attemptsUsed < quiz.attempts && (
                      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setSelectedQuiz(quiz)}>
                            <Play className="h-4 w-4 mr-1" />
                            {quiz.attemptsUsed > 0 ? "Retake" : "Start Quiz"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Start Quiz: {selectedQuiz?.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">Quiz Instructions</h4>
                              <ul className="text-sm text-blue-800 space-y-1">
                                <li>• You have {selectedQuiz?.timeLimit} minutes to complete this quiz</li>
                                <li>• You can navigate between questions freely</li>
                                <li>• Your progress is automatically saved</li>
                                <li>
                                  • You have {selectedQuiz && selectedQuiz.attempts - selectedQuiz.attemptsUsed}{" "}
                                  attempt(s) remaining
                                </li>
                                <li>• Make sure you have a stable internet connection</li>
                              </ul>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <p>
                                  <span className="font-medium">Course:</span> {selectedQuiz?.course}
                                </p>
                                <p>
                                  <span className="font-medium">Questions:</span> {selectedQuiz?.questions}
                                </p>
                                <p>
                                  <span className="font-medium">Points:</span> {selectedQuiz?.totalPoints}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p>
                                  <span className="font-medium">Time Limit:</span> {selectedQuiz?.timeLimit} minutes
                                </p>
                                <p>
                                  <span className="font-medium">Due Date:</span>{" "}
                                  {selectedQuiz && format(selectedQuiz.dueDate, "MMM d, yyyy")}
                                </p>
                                <p>
                                  <span className="font-medium">Attempts:</span> {selectedQuiz?.attemptsUsed}/
                                  {selectedQuiz?.attempts}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleStartQuiz}>Start Quiz</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {quiz.status === "available" && quiz.attemptsUsed >= quiz.attempts && (
                      <Button variant="outline" size="sm" disabled>
                        No Attempts Left
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
          <p className="text-gray-600">Check back later for new quizzes from your instructors.</p>
        </div>
      )}
    </div>
  )
}
