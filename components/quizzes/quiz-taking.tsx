"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight, Flag } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getQuizQuestions, submitQuizAttempt, getQuestionGrades, saveQuizAnswers } from "@/lib/quizzes"
import { notifyFacultyQuizStarted, notifyFacultyQuizCompleted, trackStudentActivity } from "@/lib/faculty-activity-notifications"
import type { Database } from "@/lib/types"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses?: { title: string; course_code: string } | null
}

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]

type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"]

interface QuizTakingProps {
  quiz: Quiz
  attempt: QuizAttempt
  onComplete?: () => void
}

interface QuizState {
  answers: Record<string, string>
  timeRemaining: number
  currentQuestion: number
  isSubmitted: boolean
  questions: QuizQuestion[]
  isAutoSubmitting: boolean
  isAutoSaving: boolean
}

export function QuizTaking({ quiz, attempt, onComplete }: QuizTakingProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Calculate time remaining based on started_at timestamp (persistent timer)
  const calculateTimeRemaining = () => {
    if (!attempt.started_at || !quiz.time_limit) return 0
    
    const startTime = new Date(attempt.started_at).getTime()
    const currentTime = new Date().getTime()
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
    const totalTimeSeconds = quiz.time_limit * 60
    const remaining = Math.max(0, totalTimeSeconds - elapsedSeconds)
    
    console.log('Persistent timer calculation:', {
      startedAt: attempt.started_at,
      currentTime: new Date().toISOString(),
      elapsedSeconds,
      totalTimeSeconds,
      remaining,
      isExpired: remaining === 0
    })
    
    return remaining
  }

  // Check if quiz has already expired when component loads
  const checkQuizExpiration = () => {
    const remaining = calculateTimeRemaining()
    if (remaining === 0 && !quizState.isSubmitted && !quizState.isAutoSubmitting) {
      console.log('Quiz has already expired, auto-submitting...')
      handleAutoSubmitQuiz()
    }
  }

  const [quizState, setQuizState] = useState<QuizState>({
    answers: (attempt.answers as Record<string, string>) || {},
    timeRemaining: calculateTimeRemaining(),
    currentQuestion: 0,
    isSubmitted: attempt.status === 'completed' || attempt.status === 'submitted' || attempt.status === 'graded',
    questions: [],
    isAutoSubmitting: false,
    isAutoSaving: false
  })

  const [loading, setLoading] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [manualGrades, setManualGrades] = useState<Database["public"]["Tables"]["quiz_question_grades"]["Row"][]>([])

  // Seeded random number generator for consistent shuffling
  const seededRandom = (seed: string) => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return () => {
      hash = (hash * 9301 + 49297) % 233280
      return hash / 233280
    }
  }

  // Shuffle array function using Fisher-Yates algorithm with seed
  const shuffleArray = <T,>(array: T[], seed?: string): T[] => {
    const shuffled = [...array]
    const random = seed ? seededRandom(seed) : Math.random
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Shuffle multiple choice options within questions
  const shuffleQuestionOptions = (questions: QuizQuestion[], seed?: string): QuizQuestion[] => {
    return questions.map((question, index) => {
      if (question.type === 'multiple_choice' && question.options && question.options.length > 1) {
        // Use question ID and index as seed for consistent option shuffling
        const optionSeed = seed ? `${seed}-${question.id}-${index}` : undefined
        const shuffledOptions = shuffleArray(question.options, optionSeed)
        return {
          ...question,
          options: shuffledOptions
        }
      }
      return question
    })
  }

  // Check for quiz expiration when component mounts
  useEffect(() => {
    checkQuizExpiration()
  }, [])

  // Add beforeunload event listener to save answers when user tries to leave
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (!quizState.isSubmitted && !quizState.isAutoSubmitting && Object.keys(quizState.answers).length > 0) {
        // Try to save answers before the page unloads
        try {
          // Use navigator.sendBeacon for more reliable sending during page unload
          const data = JSON.stringify({
            attemptId: attempt.id,
            answers: quizState.answers
          })
          
          // Fallback to regular fetch if sendBeacon is not available
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/save-quiz-answers', data)
          } else {
            // Synchronous fetch as last resort
            fetch('/api/save-quiz-answers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: data,
              keepalive: true
            }).catch(() => {
              // Ignore errors during page unload
            })
          }
        } catch (error) {
          console.error('Error saving answers on page unload:', error)
        }
        
        // Show warning to user
        event.preventDefault()
        event.returnValue = 'You have unsaved quiz answers. Are you sure you want to leave?'
        return event.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [quizState.answers, quizState.isSubmitted, quizState.isAutoSubmitting, attempt.id])

  // Periodic auto-save effect (every 30 seconds)
  useEffect(() => {
    if (!quizState.isSubmitted && !quizState.isAutoSubmitting && Object.keys(quizState.answers).length > 0) {
      const autoSaveInterval = setInterval(async () => {
        try {
          // Get the most current answers from state
          const currentAnswers = { ...quizState.answers }
          await saveQuizAnswers(attempt.id, currentAnswers)
          console.log('Periodic auto-save completed with', Object.keys(currentAnswers).length, 'answers')
        } catch (error) {
          console.error('Periodic auto-save failed:', error)
          // Try one more time after a short delay
          setTimeout(async () => {
            try {
              const currentAnswers = { ...quizState.answers }
              await saveQuizAnswers(attempt.id, currentAnswers)
              console.log('Periodic auto-save retry completed')
            } catch (retryError) {
              console.error('Periodic auto-save retry also failed:', retryError)
            }
          }, 1000)
        }
      }, 30000) // Save every 30 seconds

      return () => clearInterval(autoSaveInterval)
    }
  }, [quizState.answers, quizState.isSubmitted, quizState.isAutoSubmitting, attempt.id])

  // Load quiz questions when component mounts
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true)
        const questions = await getQuizQuestions(quiz.id)
        
        console.log('Questions received from getQuizQuestions:', questions)
        console.log('Questions length:', questions.length)
        console.log('Quiz ID being used:', quiz.id)
        
        if (questions.length === 0) {
          console.error('No questions found for quiz:', quiz.id)
          console.error('This could be due to:')
          console.error('1. Quiz ID mismatch')
          console.error('2. RLS policy blocking access')
          console.error('3. Database connection issue')
          console.error('4. Questions not properly linked to quiz')
          
          // Try to debug the issue
          try {
            const { debugQuizQuestions } = await import('@/lib/quizzes')
            const debugResult = await debugQuizQuestions(quiz.id)
            console.log('Debug result:', debugResult)
          } catch (debugError) {
            console.error('Debug failed:', debugError)
          }
          
          toast({
            title: "No Questions Available",
            description: "This quiz doesn't have any questions yet, or you may not have access. Please contact your instructor.",
            variant: "destructive",
          })
          return
        }
        
        // Use attempt ID as seed for consistent shuffling across page refreshes
        const shuffleSeed = attempt.id
        
        // Shuffle questions for each student attempt
        const shuffledQuestions = shuffleArray(questions, shuffleSeed)
        
        // Also shuffle multiple choice options within each question
        const fullyShuffledQuestions = shuffleQuestionOptions(shuffledQuestions, shuffleSeed)
        
        console.log('Questions shuffled for student attempt:', {
          attemptId: attempt.id,
          originalOrder: questions.map(q => q.id),
          shuffledOrder: fullyShuffledQuestions.map(q => q.id)
        })
        
        setQuizState(prev => ({ ...prev, questions: fullyShuffledQuestions }))
      } catch (error) {
        console.error('Error loading quiz questions:', error)
        
        let errorMessage = "Failed to load quiz questions. Please try again."
        
        if (error instanceof Error) {
          if (error.message.includes('not enrolled')) {
            errorMessage = "You are not enrolled in this course or your enrollment is not approved."
          } else if (error.message.includes('Quiz not found')) {
            errorMessage = "This quiz is no longer available."
          } else if (error.message.includes('Cannot access quiz')) {
            errorMessage = "You don't have permission to access this quiz."
          }
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [quiz.id, toast])

  // Timer effect with persistent time calculation
  useEffect(() => {
    if (!quizState.isSubmitted && !quizState.isAutoSubmitting) {
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining()
        setQuizState((prev) => ({ ...prev, timeRemaining: remaining }))
        
        // Auto-submit when time runs out
        if (remaining === 0) {
          console.log('Time expired, triggering auto-submit with current answers:', quizState.answers)
          handleAutoSubmitQuiz()
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [quizState.isSubmitted, quizState.isAutoSubmitting, quizState.answers])

  // Warning effects for low time
  useEffect(() => {
    if (quizState.timeRemaining === 60 && !quizState.isSubmitted && !quizState.isAutoSubmitting) {
      toast({
        title: "⚠️ 1 Minute Warning",
        description: "You have 1 minute remaining. The quiz will be automatically submitted when time runs out.",
        variant: "destructive",
      })
    } else if (quizState.timeRemaining === 30 && !quizState.isSubmitted && !quizState.isAutoSubmitting) {
      toast({
        title: "🚨 30 Seconds Warning",
        description: "Only 30 seconds left! The quiz will be auto-submitted soon.",
        variant: "destructive",
      })
    } else if (quizState.timeRemaining === 10 && !quizState.isSubmitted && !quizState.isAutoSubmitting) {
      toast({
        title: "⏰ Final Warning",
        description: "10 seconds remaining! Auto-submitting quiz...",
        variant: "destructive",
      })
    }
  }, [quizState.timeRemaining, quizState.isSubmitted, quizState.isAutoSubmitting, toast])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = async (questionId: string, answer: string) => {
    const newAnswers = { ...quizState.answers, [questionId]: answer }
    
    setQuizState((prev) => ({
      ...prev,
      answers: newAnswers,
      isAutoSaving: true
    }))

    // Auto-save the answer immediately with retry logic
    let saveSuccess = false
    let retryCount = 0
    const maxRetries = 2
    
    while (!saveSuccess && retryCount < maxRetries) {
      try {
        await saveQuizAnswers(attempt.id, newAnswers)
        saveSuccess = true
        console.log('Answer auto-saved for question:', questionId, 'on attempt:', retryCount + 1)
      } catch (error) {
        retryCount++
        console.error(`Failed to auto-save answer for question ${questionId} on attempt ${retryCount}:`, error)
        if (retryCount < maxRetries) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }
    
    if (!saveSuccess) {
      console.error('Failed to auto-save answer after all retries for question:', questionId)
      // Don't show error to user as it might be distracting, but log it
    }
    
    setQuizState((prev) => ({
      ...prev,
      isAutoSaving: false
    }))
  }

  const handleNextQuestion = () => {
    if (quizState.currentQuestion < quizState.questions.length - 1) {
      setQuizState((prev) => ({ ...prev, currentQuestion: prev.currentQuestion + 1 }))
    }
  }

  const handlePreviousQuestion = () => {
    if (quizState.currentQuestion > 0) {
      setQuizState((prev) => ({ ...prev, currentQuestion: prev.currentQuestion - 1 }))
    }
  }

  const handleQuestionNavigation = (questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < quizState.questions.length) {
      setQuizState((prev) => ({ ...prev, currentQuestion: questionIndex }))
    }
  }

  const toggleFlag = (questionIndex: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex)
      } else {
        newSet.add(questionIndex)
      }
      return newSet
    })
  }

  const handleSubmitQuiz = async () => {
    try {
      // Final save of all answers before submission
      console.log('Final save before manual submission:', quizState.answers)
      await saveQuizAnswers(attempt.id, quizState.answers)
      
      // Submit the quiz
      await submitQuizAttempt(attempt.id, quizState.answers)
      
      // Enhanced faculty notification for quiz completion
      if (user?.id && quiz.course_id) {
        try {
          const supabase = require("@/lib/supabase/client").createClient()
          
          // Get course and student information
          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("instructor_id, title")
            .eq("id", quiz.course_id)
            .single()

          const { data: studentData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

          if (!courseError && courseData?.instructor_id) {
            const studentName = studentData?.full_name || "Student"
            const courseTitle = courseData.title || "Course"
            const completedAt = new Date().toISOString()
            
            // Notify faculty about quiz completion
            await notifyFacultyQuizCompleted(
              courseData.instructor_id,
              studentName,
              quiz.title,
              courseTitle,
              completedAt
            )
            
            // Track student activity for comprehensive monitoring
            await trackStudentActivity(
              user.id,
              quiz.course_id,
              'quiz_completed',
              {
                quizTitle: quiz.title,
                completedAt: completedAt
              }
            )
            
            console.log("Enhanced faculty notification sent for quiz completion:", quiz.title)
          }
        } catch (notificationError) {
          console.log("Enhanced notification failed, but quiz was submitted:", notificationError)
        }
      }
      
      setQuizState((prev) => ({ ...prev, isSubmitted: true }))
      setShowSubmitDialog(false)
      
      const answeredCount = Object.keys(quizState.answers).length
      toast({
        title: "Success",
        description: `Quiz submitted successfully! ${answeredCount} answers have been saved.`,
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAutoSubmitQuiz = async () => {
    try {
      // Set auto-submitting state to prevent multiple submissions
      setQuizState((prev) => ({ ...prev, isAutoSubmitting: true }))
      
      // Show immediate notification
      toast({
        title: "⏰ Time's Up!",
        description: "Quiz automatically submitted due to time limit.",
        variant: "destructive",
      })

      // Get the most current answers from state
      const currentAnswers = { ...quizState.answers }
      console.log('Final auto-save before submission:', currentAnswers)
      
      // Ensure we have the latest answers by doing a final save with retry
      let saveSuccess = false
      let retryCount = 0
      const maxRetries = 3
      
      while (!saveSuccess && retryCount < maxRetries) {
        try {
          await saveQuizAnswers(attempt.id, currentAnswers)
          saveSuccess = true
          console.log('Final save successful on attempt:', retryCount + 1)
        } catch (saveError) {
          retryCount++
          console.error(`Final save failed on attempt ${retryCount}:`, saveError)
          if (retryCount < maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      if (!saveSuccess) {
        console.warn('Final save failed after all retries, proceeding with submission anyway')
      }
      
      // Submit the quiz with all current answers
      console.log('Submitting quiz with answers:', currentAnswers)
      await submitQuizAttempt(attempt.id, currentAnswers)
      
      // Enhanced faculty notification for auto-submitted quiz
      if (user?.id && quiz.course_id) {
        try {
          const supabase = require("@/lib/supabase/client").createClient()
          
          // Get course and student information
          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("instructor_id, title")
            .eq("id", quiz.course_id)
            .single()

          const { data: studentData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

          if (!courseError && courseData?.instructor_id) {
            const studentName = studentData?.full_name || "Student"
            const courseTitle = courseData.title || "Course"
            const completedAt = new Date().toISOString()
            
            // Notify faculty about auto-submitted quiz completion
            await notifyFacultyQuizCompleted(
              courseData.instructor_id,
              studentName,
              quiz.title,
              courseTitle,
              completedAt
            )
            
            // Track student activity for comprehensive monitoring
            await trackStudentActivity(
              user.id,
              quiz.course_id,
              'quiz_completed',
              {
                quizTitle: quiz.title,
                completedAt: completedAt,
                isAutoSubmitted: true
              }
            )
            
            console.log("Enhanced faculty notification sent for auto-submitted quiz:", quiz.title)
          }
        } catch (notificationError) {
          console.log("Enhanced notification failed, but quiz was auto-submitted:", notificationError)
        }
      }
      
      // Update state
      setQuizState((prev) => ({ ...prev, isSubmitted: true, isAutoSubmitting: false }))
      
      // Show success notification with answer count
      const answeredCount = Object.keys(currentAnswers).length
      toast({
        title: "Quiz Auto-Submitted",
        description: `Your quiz has been automatically submitted. ${answeredCount} answers have been saved.`,
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Error auto-submitting quiz:', error)
      setQuizState((prev) => ({ ...prev, isAutoSubmitting: false }))
      toast({
        title: "Auto-Submit Error",
        description: "Failed to auto-submit quiz. Please contact your instructor.",
        variant: "destructive",
      })
    }
  }

  const getAnsweredCount = () => {
    return Object.keys(quizState.answers).length
  }

  const getTotalPoints = () => {
    if (!quizState.questions || quizState.questions.length === 0) return 0
    return quizState.questions.reduce((total, q) => {
      const points = q.points || 0
      return total + points
    }, 0)
  }

  // Get points earned for a specific question
  const getPointsEarned = (questionId: string) => {
    const question = quizState.questions.find(q => q.id === questionId)
    if (!question) return 0

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      // Auto-graded questions
      const studentAnswer = quizState.answers[questionId]
      return studentAnswer === question.correct_answer ? question.points : 0
    } else if (question.type === 'short_answer' || question.type === 'essay') {
      // Manually graded questions
      const grade = manualGrades.find(g => g.question_id === questionId)
      return grade ? grade.points_awarded : 0
    }
    
    return 0
  }

  // Get total points earned (including manual grades)
  const getTotalPointsEarned = () => {
    return quizState.questions.reduce((total, q) => total + getPointsEarned(q.id), 0)
  }

  // Load manual grades when quiz is graded
  const loadManualGrades = async () => {
    if (attempt.status === 'graded') {
      try {
        const grades = await getQuestionGrades(attempt.id)
        setManualGrades(grades)
        console.log('Manual grades loaded:', grades)
      } catch (error) {
        console.error('Error loading manual grades:', error)
      }
    }
  }

  // Load manual grades when component mounts or attempt status changes
  useEffect(() => {
    loadManualGrades()
  }, [attempt.status, attempt.id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p>Loading quiz...</p>
      </div>
    )
  }

  // Safety checks for currentQuestion and questions array
  if (!quizState.questions || quizState.questions.length === 0) {
    const handleDebug = async () => {
      try {
        const { debugQuizQuestions } = await import('@/lib/quizzes')
        const debugResult = await debugQuizQuestions(quiz.id)
        console.log('Manual debug result:', debugResult)
        
        toast({
          title: "Debug Complete",
          description: "Check the browser console for detailed debug information.",
        })
      } catch (error) {
        console.error('Debug failed:', error)
        toast({
          title: "Debug Failed",
          description: "Failed to run debug. Check console for errors.",
          variant: "destructive",
        })
      }
    }

    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600 mb-4">
            This quiz doesn't have any questions yet, or you may not have access to view them.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• The instructor hasn't added questions to this quiz yet</li>
              <li>• You may not be enrolled in this course</li>
              <li>• Your enrollment may not be approved yet</li>
              <li>• The quiz may still be in draft status</li>
            </ul>
            <p className="text-sm text-blue-800 mt-3">
              Please contact your instructor if you believe this is an error.
            </p>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Technical Debug Info:</strong><br/>
              Quiz ID: {quiz.id}<br/>
              Questions Length: {quizState.questions?.length || 0}
            </p>
            <Button 
              onClick={handleDebug}
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Run Debug
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Now safely calculate currentQuestion and progress
  const currentQuestion = quizState.questions[quizState.currentQuestion]
  const progress = ((quizState.currentQuestion + 1) / quizState.questions.length) * 100

  // Debug logging
  console.log('Quiz Taking Debug:', {
    questionsLength: quizState.questions?.length,
    currentQuestionIndex: quizState.currentQuestion,
    currentQuestion: currentQuestion,
    questions: quizState.questions
  })

  if (!currentQuestion || quizState.currentQuestion >= quizState.questions.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Question Not Found</h3>
          <p className="text-gray-600">The current question could not be loaded.</p>
        </div>
      </div>
    )
  }

  if (quizState.isSubmitted && showResults && attempt.status === 'graded') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Graded!</CardTitle>
            <p className="text-gray-600">Your quiz has been graded. Here are your results:</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{getTotalPointsEarned()}</p>
                <p className="text-sm text-gray-600">Points Earned</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{getTotalPoints()}</p>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {getTotalPoints() > 0 ? Math.round((getTotalPointsEarned() / getTotalPoints()) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Percentage</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{getAnsweredCount()}</p>
                <p className="text-sm text-gray-600">Answered</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Review</h3>
              {quizState.questions.map((question, index) => (
                <Card key={question.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">
                        Q{index + 1}: {question.question}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPointsEarned(question.id) === question.points ? "default" : "secondary"}>
                          {getPointsEarned(question.id)}/{question.points} pts
                        </Badge>
                        {question.type === 'short_answer' || question.type === 'essay' ? (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                    </div>

                    {question.type === "multiple_choice" && question.options && (
                      <div className="space-y-2 mt-3">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              quizState.answers[question.id] === option
                                ? option === question.correct_answer
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                : option === question.correct_answer
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-50"
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                            {quizState.answers[question.id] === option && " (Your answer)"}
                            {option === question.correct_answer && " ✓ (Correct)"}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "true_false" && (
                      <div className="mt-3 text-sm">
                        <p>
                          Your answer:{" "}
                          <span className="font-medium">{quizState.answers[question.id] || "Not answered"}</span>
                        </p>
                        <p>
                          Correct answer: <span className="font-medium text-green-600">{question.correct_answer}</span>
                        </p>
                      </div>
                    )}

                    {(question.type === "short_answer" || question.type === "essay") && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-gray-50 rounded text-sm">
                          <p className="font-medium mb-1">Your answer:</p>
                          <p>{quizState.answers[question.id] || "Not answered"}</p>
                        </div>
                        
                        {(() => {
                          const grade = manualGrades.find(g => g.question_id === question.id)
                          if (grade) {
                            return (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium text-blue-800">Instructor Feedback:</p>
                                  <Badge variant="outline" className="text-blue-600">
                                    {grade.points_awarded}/{question.points} points
                                  </Badge>
                                </div>
                                {grade.feedback && (
                                  <p className="text-blue-700">{grade.feedback}</p>
                                )}
                                <p className="text-xs text-blue-600 mt-1">
                                  Graded on {new Date(grade.graded_at).toLocaleDateString()}
                                </p>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button onClick={() => window.location.reload()}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (quizState.isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              {attempt.status === 'graded' ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <Clock className="h-16 w-16 text-yellow-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {attempt.status === 'graded' ? 'Quiz Graded!' : 'Quiz Submitted!'}
            </CardTitle>
            <p className="text-gray-600">
              {attempt.status === 'graded' 
                ? 'Your quiz has been graded. You can view your results below.'
                : 'Your responses have been recorded. Results will be available once your instructor finishes grading.'
              }
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Shuffled
              </div>
            </div>
            <p className="text-gray-600">{quiz.courses?.course_code} - {quiz.courses?.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              Questions and answer options are randomized for each attempt
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <Clock className="w-3 h-3" />
                Persistent Timer
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                Auto-Save
              </div>
              <p className="text-xs text-gray-500">
                Timer continues running even if you close the browser. Answers are saved automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300 ${
                quizState.isAutoSubmitting 
                  ? "bg-orange-100 text-orange-800 animate-pulse" 
                  : quizState.timeRemaining <= 10 
                    ? "bg-red-100 text-red-800 animate-pulse" 
                    : quizState.timeRemaining <= 30 
                      ? "bg-red-50 text-red-700" 
                      : quizState.timeRemaining <= 60 
                        ? "bg-yellow-50 text-yellow-700" 
                        : "bg-blue-50 text-blue-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">
                {quizState.isAutoSubmitting ? "SUBMITTING..." : formatTime(quizState.timeRemaining)}
              </span>
              {quizState.timeRemaining <= 10 && !quizState.isAutoSubmitting && (
                <span className="text-xs font-bold animate-bounce">⚠️</span>
              )}
            </div>
            {attempt.status === 'graded' ? (
              <Button
                variant="outline"
                onClick={() => setShowResults(true)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                View Results
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(true)}
                disabled={quizState.isAutoSubmitting}
                className="text-green-600 border-green-600 hover:bg-green-50 disabled:opacity-50"
              >
                {quizState.isAutoSubmitting ? "Auto-Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>

        {/* Time Warning Banner */}
        {quizState.timeRemaining <= 60 && !quizState.isSubmitted && !quizState.isAutoSubmitting && (
          <div className={`p-3 rounded-lg border-l-4 mb-4 ${
            quizState.timeRemaining <= 10 
              ? "bg-red-50 border-red-500 text-red-800" 
              : quizState.timeRemaining <= 30 
                ? "bg-orange-50 border-orange-500 text-orange-800"
                : "bg-yellow-50 border-yellow-500 text-yellow-800"
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">
                  {quizState.timeRemaining <= 10 
                    ? "⚠️ FINAL WARNING: Quiz will auto-submit in 10 seconds!" 
                    : quizState.timeRemaining <= 30 
                      ? "🚨 30 seconds remaining - Quiz will auto-submit soon!"
                      : "⏰ 1 minute remaining - Quiz will auto-submit when time runs out!"
                  }
                </p>
                <p className="text-sm mt-1">
                  Make sure to save your answers. The quiz will be automatically submitted whether you like it or not! 
                  <strong> The timer continues running even if you close the browser.</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-submitting Banner */}
        {quizState.isAutoSubmitting && (
          <div className="p-3 rounded-lg border-l-4 mb-4 bg-orange-50 border-orange-500 text-orange-800">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-medium">⏰ Auto-Submitting Quiz...</p>
                <p className="text-sm mt-1">
                  Time's up! Your quiz is being automatically submitted. Please wait...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Quiz Warning */}
        {quizState.timeRemaining === 0 && !quizState.isSubmitted && !quizState.isAutoSubmitting && (
          <div className="p-3 rounded-lg border-l-4 mb-4 bg-red-50 border-red-500 text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">⏰ Quiz Time Expired</p>
                <p className="text-sm mt-1">
                  The quiz time limit has been reached. Your quiz will be automatically submitted with your current answers.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              Progress: {quizState.currentQuestion + 1} of {quizState.questions.length}
            </span>
            <div className="flex items-center gap-2">
              <span>{getAnsweredCount()} answered</span>
              {quizState.isAutoSaving && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Saving...
                </span>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questions</CardTitle>
              <p className="text-xs text-gray-500">Order randomized for each attempt</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                {quizState.questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={quizState.currentQuestion === index ? "default" : "outline"}
                    size="sm"
                    disabled={quizState.isAutoSubmitting}
                    className={`relative ${
                      quizState.answers[quizState.questions[index].id] ? "border-green-500 bg-green-50 text-green-700" : ""
                    } ${quizState.isAutoSubmitting ? "opacity-50" : ""}`}
                    onClick={() => handleQuestionNavigation(index)}
                  >
                    {index + 1}
                    {flaggedQuestions.has(index) && (
                      <Flag className="h-3 w-3 absolute -top-1 -right-1 text-orange-500" />
                    )}
                  </Button>
                ))}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-3 w-3 text-orange-500" />
                  <span>Flagged</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Question Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Question {quizState.currentQuestion + 1} of {quizState.questions.length}
                  </CardTitle>
                  <Badge variant="outline">{currentQuestion.points} points</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(quizState.currentQuestion)}
                  disabled={quizState.isAutoSubmitting}
                  className={`${flaggedQuestions.has(quizState.currentQuestion) ? "text-orange-500" : ""} ${quizState.isAutoSubmitting ? "opacity-50" : ""}`}
                >
                  <Flag className="h-4 w-4" />
                  {flaggedQuestions.has(quizState.currentQuestion) ? "Unflag" : "Flag"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>

                {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                  <RadioGroup
                    value={quizState.answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={quizState.isAutoSubmitting}
                  >
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQuestion.type === "true_false" && (
                  <RadioGroup
                    value={quizState.answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={quizState.isAutoSubmitting}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true" className="flex-1 cursor-pointer">
                          True
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false" className="flex-1 cursor-pointer">
                          False
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}

                {(currentQuestion.type === "short_answer" || currentQuestion.type === "essay") && (
                  <Textarea
                    value={quizState.answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    rows={currentQuestion.type === "essay" ? 8 : 3}
                    className="w-full"
                    disabled={quizState.isAutoSubmitting}
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousQuestion} 
                  disabled={quizState.currentQuestion === 0 || quizState.isAutoSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="text-sm text-gray-600">
                  {quizState.answers[currentQuestion.id] ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Answered
                    </span>
                  ) : (
                    <span className="text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Not answered
                    </span>
                  )}
                </div>

                {quizState.currentQuestion === quizState.questions.length - 1 ? (
                  <Button 
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={quizState.isAutoSubmitting}
                  >
                    {quizState.isAutoSubmitting ? "Auto-Submitting..." : "Submit Quiz"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={quizState.isAutoSubmitting}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to submit your quiz? You won't be able to make changes after submission.</p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The timer continues running even if you close the browser. 
                If you don't submit manually, the quiz will be auto-submitted when time runs out.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Questions answered:</span>
                <span className="font-medium">
                  {getAnsweredCount()} of {quizState.questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time remaining:</span>
                <span className="font-medium">{formatTime(quizState.timeRemaining)}</span>
              </div>
              {flaggedQuestions.size > 0 && (
                <div className="flex justify-between">
                  <span>Flagged questions:</span>
                  <span className="font-medium text-orange-600">{flaggedQuestions.size}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Continue Quiz
              </Button>
              <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
