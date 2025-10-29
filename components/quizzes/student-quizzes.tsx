"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircle, Calendar, Clock, Play, Eye, CheckCircle, AlertCircle, BarChart3, Loader2, Lock, RefreshCw } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getQuizzesForStudent, getStudentQuizAttempt, startQuizAttempt, getQuizQuestions, forceRefreshStudentQuizAttempt } from "@/lib/quizzes"
import { QuizTaking } from "./quiz-taking"
import { QuizResultsView } from "./quiz-results-view"
import type { Database } from "@/lib/types"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  attempt?: Database["public"]["Tables"]["quiz_attempts"]["Row"] | null
  questionCount?: number
}

export function StudentQuizzes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [startingQuiz, setStartingQuiz] = useState<string | null>(null)

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null, formatString: string): string => {
    if (!dateString) return 'N/A'
    
    try {
      const date = parseISO(dateString)
      if (isValid(date)) {
        return format(date, formatString)
      }
      return 'Invalid date'
    } catch (error) {
      console.warn('Error formatting date:', dateString, error)
      return 'Invalid date'
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadQuizzes()
    }
  }, [user?.id])


  const loadQuizzes = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      console.log('Loading quizzes for student:', user.id)
      
      const quizzesData = await getQuizzesForStudent(user.id)
      console.log('Quizzes data from getQuizzesForStudent:', quizzesData)
      
      // Load attempts and question counts for each quiz (optimized)
      const quizzesWithDetails = await Promise.all(
        quizzesData.map(async (quiz) => {
          // Load attempt and questions in parallel for better performance
          const [attempt, questions] = await Promise.all([
            forceRefreshStudentQuizAttempt(user.id, quiz.id),
            getQuizQuestions(quiz.id)
          ])
          
          return {
            ...quiz,
            attempt,
            questionCount: questions.length
          }
        })
      )
      
      console.log('Final quizzes with details:', quizzesWithDetails)
      setQuizzes(quizzesWithDetails)
    } catch (error) {
      console.error('Error loading quizzes:', error)
      toast({
        title: "Error",
        description: "Failed to load quizzes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Force refresh function to get latest scores
  const forceRefreshQuizzes = async () => {
    if (!user?.id) return
    
    try {
      console.log('Force refreshing quizzes for student:', user.id)
      
      // Store current scores to check for changes
      const currentScores = quizzes.map(quiz => ({
        id: quiz.id,
        score: quiz.attempt?.score || 0,
        status: quiz.attempt?.status
      }))
      
      await loadQuizzes()
      
      // Check if any scores changed
      const updatedQuizzes = quizzes.filter(quiz => {
        const currentQuiz = currentScores.find(c => c.id === quiz.id)
        return currentQuiz && (
          currentQuiz.score !== (quiz.attempt?.score || 0) ||
          currentQuiz.status !== quiz.attempt?.status
        )
      })
      
      if (updatedQuizzes.length > 0) {
        toast({
          title: "Scores Updated!",
          description: `${updatedQuizzes.length} quiz score(s) have been updated.`,
        })
      } else {
        toast({
          title: "Success",
          description: "Quizzes refreshed successfully!",
        })
      }
    } catch (error) {
      console.error('Error force refreshing quizzes:', error)
      toast({
        title: "Error",
        description: "Failed to refresh quizzes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getQuizStatus = (quiz: Quiz) => {
    // Check if quiz is closed by faculty
    if (quiz.status === 'closed') {
      if (quiz.attempt?.status === 'graded') {
        return 'completed_closed'
      } else if (quiz.attempt?.status === 'completed') {
        return 'pending_grading_closed'
      }
      return 'closed'
    }
    
    if (quiz.attempt?.status === 'graded') {
      return 'completed'
    }
    
    if (quiz.attempt?.status === 'completed') {
      return 'pending_grading'
    }
    
    if (quiz.attempt?.status === 'in_progress') {
      return 'in_progress'
    }
    
    if (quiz.due_date) {
      try {
        const dueDate = parseISO(quiz.due_date)
        if (isValid(dueDate) && dueDate < new Date()) {
          return 'overdue'
        }
      } catch (error) {
        console.warn('Invalid due date format:', quiz.due_date)
      }
    }
    
    // Check attempts
    if (quiz.attempt && quiz.max_attempts && quiz.max_attempts <= 1) {
      return 'locked'
    }
    
    return 'available'
  }

  const getStatusBadge = (quiz: Quiz) => {
    const status = getQuizStatus(quiz)
    
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="text-green-700 bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case 'pending_grading':
        return (
          <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending Grading
          </Badge>
        )
      case 'completed_closed':
        return (
          <Badge variant="secondary" className="text-green-700 bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed (Closed)
          </Badge>
        )
      case 'pending_grading_closed':
        return (
          <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending Grading (Closed)
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="destructive" className="text-red-700 bg-red-100">
            <Lock className="w-3 h-3 mr-1" />
            Closed
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="default" className="text-blue-700 bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        )
      case 'locked':
        return (
          <Badge variant="secondary" className="text-gray-600 bg-gray-100">
            Locked
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-blue-700 border-blue-300">
            <Play className="w-3 h-3 mr-1" />
            Available
          </Badge>
        )
    }
  }

  const handleStartQuiz = async (quiz: Quiz) => {
    if (!user?.id) return
    
    try {
      setStartingQuiz(quiz.id)
      
      // If there's already an in-progress attempt, continue with it
      if (quiz.attempt?.status === 'in_progress') {
        setSelectedQuiz(quiz)
        setIsDialogOpen(true)
        return
      }
      
      // Start a new attempt
          console.log('Starting quiz attempt for quiz ID:', quiz.id)
          console.log('Student ID:', user.id)
          
          const attempt = await startQuizAttempt(user.id, quiz.id)
          console.log('Quiz attempt created:', attempt)
          
          if (attempt) {
            // Create updated quiz object with the new attempt
            const updatedQuiz = { ...quiz, attempt }
            console.log('Updated quiz object:', updatedQuiz)
            setSelectedQuiz(updatedQuiz)
            setIsDialogOpen(true)
            
            // Reload quizzes to get updated attempt data in background
            loadQuizzes()
          } else {
            console.error('Failed to create quiz attempt')
          }
    } catch (error) {
      console.error('Error starting quiz:', error)
      toast({
        title: "Error",
        description: "Failed to start quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setStartingQuiz(null)
    }
  }

  const handleViewResults = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowResults(true)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setShowResults(false)
    setSelectedQuiz(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading quizzes...</span>
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-8">
        <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Quizzes Available</h3>
        <p className="text-gray-600">No quizzes have been assigned to your courses yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Quizzes</h2>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={forceRefreshQuizzes}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-sm">
            {quizzes.length} {quizzes.length === 1 ? 'Quiz' : 'Quizzes'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {quizzes.map((quiz) => {
          const status = getQuizStatus(quiz)
          const isDisabled = status === 'overdue' || status === 'locked' || status === 'closed'
          
          return (
            <Card key={quiz.id} className={`hover:shadow-md transition-shadow ${
              isDisabled ? 'opacity-60 bg-gray-50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{quiz.title}</h3>
                      {getStatusBadge(quiz)}
                    </div>
                    <p className="text-gray-600 mb-2">{quiz.description}</p>
                    <p className="text-sm text-blue-600 font-medium">
                      {quiz.courses?.title} ({quiz.courses?.course_code})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Time Limit: {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Questions: {quiz.questionCount || 0}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Attempts: {quiz.attempt ? 1 : 0}/{quiz.max_attempts || 1}
                  </div>
                </div>

                {quiz.due_date && (
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    Due: {safeFormatDate(quiz.due_date, "MMM d, yyyy 'at' h:mm a")}
                  </div>
                )}

                {status === 'closed' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="flex items-center text-sm text-red-700">
                      <Lock className="w-4 h-4 mr-2" />
                      <span className="font-medium">This quiz has been closed by your instructor.</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      You can view the quiz details but cannot attempt it.
                    </p>
                  </div>
                )}

                {(status === 'pending_grading' || status === 'pending_grading_closed') && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center text-sm text-yellow-700">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-medium">Your quiz is being graded by your instructor.</span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Results will be available once grading is complete.
                    </p>
                    {/* Debug info - remove this in production */}
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: Attempt status: {quiz.attempt?.status || 'No attempt'}
                    </p>
                  </div>
                )}

                {quiz.attempt?.score !== null && quiz.attempt?.score !== undefined && (status === 'completed' || status === 'completed_closed') && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-green-800">Quiz Results</h4>
                      <Badge variant="default" className="bg-green-600 text-white">
                        Graded
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-700">{quiz.attempt.score}</p>
                        <p className="text-sm text-green-600">Points Earned</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {quiz.questionCount && quiz.questionCount > 0 
                            ? Math.round((quiz.attempt.score / (quiz.questionCount * 10)) * 100) 
                            : 0}%
                        </p>
                        <p className="text-sm text-green-600">Percentage</p>
                      </div>
                    </div>
                    {quiz.attempt.completed_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Completed: {safeFormatDate(quiz.attempt.completed_at, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {status === 'available' || status === 'in_progress' ? (
                    <Button 
                      onClick={() => handleStartQuiz(quiz)}
                      disabled={startingQuiz === quiz.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {startingQuiz === quiz.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : status === 'in_progress' ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Continue Quiz
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  ) : status === 'completed' || status === 'completed_closed' ? (
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewResults(quiz)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                  ) : status === 'pending_grading' || status === 'pending_grading_closed' ? (
                    <Button variant="outline" disabled className="text-yellow-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Pending Grading
                    </Button>
                  ) : status === 'closed' ? (
                    <Button variant="outline" disabled className="text-gray-500">
                      <Lock className="w-4 h-4 mr-2" />
                      Quiz Closed
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      {status === 'overdue' ? 'Overdue' : 'No attempts left'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quiz Taking/Results Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showResults ? `Quiz Results - ${selectedQuiz?.title}` : selectedQuiz?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedQuiz && selectedQuiz.attempt && (
            <>
              {showResults ? (
                <QuizResultsView 
                  quiz={selectedQuiz} 
                  attempt={selectedQuiz.attempt}
                  onClose={handleCloseDialog}
                />
              ) : (
                <QuizTaking 
                  quiz={selectedQuiz} 
                  attempt={selectedQuiz.attempt}
                  onComplete={() => {
                    handleCloseDialog()
                    loadQuizzes() // Reload to get updated data
                  }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
