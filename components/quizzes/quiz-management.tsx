"use client"

import { useState, useEffect, useRef } from "react"
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
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { HelpCircle, Plus, Edit, CalendarIcon, Clock, Users, BarChart3, Trash2, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { 
  getQuizzesByInstructor, 
  createQuiz, 
  getQuizQuestions, 
  addQuizQuestions, 
  getQuizAttempts,
  updateQuiz,
  deleteQuiz,
  deleteQuizQuestion,
  updateQuizQuestion,
  getQuizAttemptsForGrading,
  forceRefreshQuizAttempts,
  fixAllPendingQuizAttempts,
  fixQuizAttemptsWithManualGrades,
  debugQuizAttemptStatus,
  checkManualGradingConnection,
  testManualGradingForAttempt
} from "@/lib/quizzes"
import { getCoursesByInstructor } from "@/lib/courses"
import { notifyNewQuiz, notifyQuizGraded } from "@/lib/ttrac-notifications"
import { notifyFacultyQuizStarted, notifyFacultyQuizCompleted, trackStudentActivity } from "@/lib/faculty-activity-notifications"
import { ManualGrading } from "./manual-grading"
import type { Database } from "@/lib/types"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses?: { title: string; course_code: string } | null
  quiz_questions?: Database["public"]["Tables"]["quiz_questions"]["Row"][]
  quiz_attempts?: { count: number }[]
}

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]
type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"] & {
  profiles?: { full_name: string } | null
}

type Course = Database["public"]["Tables"]["courses"]["Row"]

interface CreateQuestionForm {
  type: "multiple_choice" | "true_false" | "short_answer" | "essay"
  question: string
  options?: string[]
  correct_answer?: string
  points: number
}

export function QuizManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState<QuizQuestion[]>([])
  const [selectedQuizAttempts, setSelectedQuizAttempts] = useState<QuizAttempt[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    quizId: string | null
    quizTitle: string
  }>({
    isOpen: false,
    quizId: null,
    quizTitle: ''
  })
  const [deleteQuestionDialog, setDeleteQuestionDialog] = useState<{
    isOpen: boolean
    questionId: string | null
    questionText: string
  }>({
    isOpen: false,
    questionId: null,
    questionText: ''
  })
  const [editQuestionDialog, setEditQuestionDialog] = useState<{
    isOpen: boolean
    question: QuizQuestion | null
  }>({
    isOpen: false,
    question: null
  })
  const [editQuestionForm, setEditQuestionForm] = useState<CreateQuestionForm>({
    type: "multiple_choice",
    question: "",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
  })
  const [quizSettingsForm, setQuizSettingsForm] = useState({
    title: '',
    time_limit: 0,
    description: '',
    max_attempts: 0,
    status: 'draft' as 'draft' | 'published' | 'closed',
    due_date: null as Date | null
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [showSettingsDatePicker, setShowSettingsDatePicker] = useState(false)
  const [settingsDatePickerRef, setSettingsDatePickerRef] = useState<HTMLDivElement | null>(null)
  const [manualGradingDialog, setManualGradingDialog] = useState<{
    isOpen: boolean
    attempt: QuizAttempt | null
  }>({
    isOpen: false,
    attempt: null
  })
  const [currentQuestion, setCurrentQuestion] = useState<CreateQuestionForm>({
    type: "multiple_choice",
    question: "",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
  })

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadQuizzes()
      loadCourses()
    }
  }, [user?.id])

  // Handle click outside to close date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false)
      }
      if (settingsDatePickerRef && !settingsDatePickerRef.contains(event.target as Node)) {
        setShowSettingsDatePicker(false)
      }
    }

    if (isDatePickerOpen || showSettingsDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDatePickerOpen, showSettingsDatePicker])

  const loadQuizzes = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const data = await getQuizzesByInstructor(user.id)
      setQuizzes(data)
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

  const loadCourses = async () => {
    if (!user?.id) return
    
    try {
      const data = await getCoursesByInstructor(user.id)
      setCourses(data)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadQuizDetails = async (quiz: Quiz) => {
    try {
      const [questions, attempts] = await Promise.all([
        getQuizQuestions(quiz.id),
        getQuizAttempts(quiz.id)
      ])
      setSelectedQuizQuestions(questions)
      setSelectedQuizAttempts(attempts)
      
      // Show warning if quiz has no questions
      if (questions.length === 0) {
        toast({
          title: "No Questions",
          description: "This quiz doesn't have any questions yet. Students won't be able to start it.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading quiz details:', error)
      toast({
        title: "Error",
        description: "Failed to load quiz details. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateQuiz = async (formData: FormData) => {
    try {
      setIsCreatingQuiz(true)
      const dueDateString = formData.get("dueDate") as string
      const dueDate = dueDateString ? new Date(dueDateString) : selectedDate
      
      // Validate required fields
      const courseId = formData.get("course") as string
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const timeLimit = formData.get("timeLimit") as string
      const attempts = formData.get("attempts") as string

      if (!courseId || !title || !description || !timeLimit || !attempts) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      if (courses.length === 0) {
        toast({
          title: "Error",
          description: "No courses available. Please create a course first.",
          variant: "destructive",
        })
        return
      }
      
      const quizData = {
        course_id: courseId,
        title: title,
        description: description,
        time_limit: Number.parseInt(timeLimit) || null,
        max_attempts: Number.parseInt(attempts) || 1,
        due_date: dueDate?.toISOString() || null,
        status: formData.get("status") as "draft" | "published" | "closed",
      }

      console.log('Creating quiz with data:', quizData)
      console.log('Available courses:', courses)
      const newQuiz = await createQuiz(quizData)
      console.log('Quiz created successfully:', newQuiz)
      
      if (newQuiz) {
        await loadQuizzes() // Reload to get updated list
        toast({
          title: "Success",
          description: "Quiz created successfully!",
        })
    setIsCreateDialogOpen(false)
    setSelectedDate(undefined)
        setIsDatePickerOpen(false)
      }
    } catch (error) {
      console.error('Error creating quiz:', error)
      toast({
        title: "Error",
        description: `Failed to create quiz: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  const handleAddQuestion = async (quizId: string, questionData: CreateQuestionForm) => {
    try {
      // For essay and short answer questions, correct_answer should be null
      // For multiple choice and true/false, it should be the selected answer
      const correctAnswer = (questionData.type === 'essay' || questionData.type === 'short_answer') 
        ? null 
        : questionData.correct_answer || null

      const questionToAdd = {
        quiz_id: quizId,
        question: questionData.question,
        type: questionData.type,
        options: questionData.options && questionData.options.filter(opt => opt.trim() !== '') || null,
        correct_answer: correctAnswer,
        points: questionData.points,
        order_index: selectedQuizQuestions.length,
      }

      console.log('Adding question:', questionToAdd)

      await addQuizQuestions([questionToAdd])
      
      // Reload quiz details to get updated questions
      if (selectedQuiz) {
        await loadQuizDetails(selectedQuiz)
      }
      
      toast({
        title: "Success",
        description: "Question added successfully!",
      })

      // Reset form
      setCurrentQuestion({
        type: "multiple_choice",
        question: "",
        options: ["", "", "", ""],
        correct_answer: "",
        points: 1,
      })
    } catch (error) {
      console.error('Error adding question:', error)
      toast({
        title: "Error",
        description: "Failed to add question. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateQuiz = async (quizId: string, updates: any) => {
    try {
      await updateQuiz(quizId, updates)
      await loadQuizzes() // Reload to get updated list
      toast({
        title: "Success",
        description: "Quiz updated successfully!",
      })
    } catch (error) {
      console.error('Error updating quiz:', error)
      toast({
        title: "Error",
        description: "Failed to update quiz. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    setDeleteConfirmDialog({
      isOpen: true,
      quizId,
      quizTitle
    })
  }

  const confirmDeleteQuiz = async () => {
    if (!deleteConfirmDialog.quizId) return

    try {
      await deleteQuiz(deleteConfirmDialog.quizId)
      await loadQuizzes() // Reload to get updated list
      toast({
        title: "Success",
        description: "Quiz deleted successfully!",
      })
    } catch (error) {
      console.error('Error deleting quiz:', error)
      toast({
        title: "Error",
        description: "Failed to delete quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirmDialog({
        isOpen: false,
        quizId: null,
        quizTitle: ''
      })
    }
  }

  const cancelDeleteQuiz = () => {
    setDeleteConfirmDialog({
      isOpen: false,
      quizId: null,
      quizTitle: ''
    })
  }

  const handleDeleteQuestion = (questionId: string, questionText: string) => {
    setDeleteQuestionDialog({
      isOpen: true,
      questionId,
      questionText
    })
  }

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionDialog.questionId) return

    try {
      await deleteQuizQuestion(deleteQuestionDialog.questionId)
      
      toast({
        title: "Success",
        description: "Question deleted successfully!",
      })
      
      // Reload quiz details to get updated questions
      if (selectedQuiz) {
        await loadQuizDetails(selectedQuiz)
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteQuestionDialog({
        isOpen: false,
        questionId: null,
        questionText: ''
      })
    }
  }

  const cancelDeleteQuestion = () => {
    setDeleteQuestionDialog({
      isOpen: false,
      questionId: null,
      questionText: ''
    })
  }

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditQuestionForm({
      type: question.type as any,
      question: question.question,
      options: question.options || ["", "", "", ""],
      correct_answer: question.correct_answer || "",
      points: question.points || 1,
    })
    setEditQuestionDialog({
      isOpen: true,
      question
    })
  }

  const handleUpdateQuestion = async () => {
    if (!editQuestionDialog.question) return

    try {
      const questionData = {
        question: editQuestionForm.question,
        type: editQuestionForm.type,
        options: editQuestionForm.type === "multiple_choice" ? editQuestionForm.options : null,
        correct_answer: editQuestionForm.correct_answer,
        points: editQuestionForm.points,
      }

      await updateQuizQuestion(editQuestionDialog.question.id, questionData)
      
      // Reload quiz details to get updated questions
      if (selectedQuiz) {
        await loadQuizDetails(selectedQuiz)
      }
      
      toast({
        title: "Success",
        description: "Question updated successfully!",
      })

      setEditQuestionDialog({
        isOpen: false,
        question: null
      })
    } catch (error) {
      console.error('Error updating question:', error)
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive",
      })
    }
  }

  const cancelEditQuestion = () => {
    setEditQuestionDialog({
      isOpen: false,
      question: null
    })
  }

  const handleSaveQuizSettings = async () => {
    if (!selectedQuiz) return

    // Validate required fields
    if (!quizSettingsForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Quiz title is required.",
        variant: "destructive",
      })
      return
    }

    if (quizSettingsForm.time_limit <= 0) {
      toast({
        title: "Validation Error",
        description: "Time limit must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (quizSettingsForm.max_attempts <= 0) {
      toast({
        title: "Validation Error",
        description: "Max attempts must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    setIsSavingSettings(true)
    try {
      const updates = {
        title: quizSettingsForm.title.trim(),
        time_limit: quizSettingsForm.time_limit,
        description: quizSettingsForm.description.trim(),
        max_attempts: quizSettingsForm.max_attempts,
        status: quizSettingsForm.status,
        due_date: quizSettingsForm.due_date?.toISOString() || null,
      }

      console.log('Updating quiz with data:', updates) // Debug log
      
      const updatedQuiz = await updateQuiz(selectedQuiz.id, updates)
      
      // Update the selectedQuiz state with the new data
      if (updatedQuiz) {
        setSelectedQuiz(updatedQuiz)
      }
      
      await loadQuizzes() // Reload to get updated list
      
      // Close date picker and dialog
      setShowSettingsDatePicker(false)
      
      toast({
        title: "Success",
        description: "Quiz settings updated successfully!",
      })
      
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating quiz settings:', error)
      toast({
        title: "Error",
        description: "Failed to update quiz settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleExportResults = () => {
    if (!selectedQuiz || selectedQuizAttempts.length === 0) {
      toast({
        title: "No Data",
        description: "No quiz results to export.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create CSV data
      const csvHeaders = ['Student Name', 'Email', 'Score', 'Status', 'Started At', 'Completed At']
      const csvData = selectedQuizAttempts.map(attempt => [
        attempt.profiles?.full_name || 'Unknown',
        'Unknown', // Email not available in current schema
        attempt.score || 'N/A',
        attempt.status,
        attempt.started_at ? format(new Date(attempt.started_at), "yyyy-MM-dd HH:mm:ss") : 'N/A',
        attempt.completed_at ? format(new Date(attempt.completed_at), "yyyy-MM-dd HH:mm:ss") : 'N/A'
      ])

      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${selectedQuiz.title}_results_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Quiz results exported successfully!",
      })
    } catch (error) {
      console.error('Error exporting results:', error)
      toast({
        title: "Error",
        description: "Failed to export results. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (quiz: Quiz | null) => {
    if (!quiz) return "bg-yellow-500"
    
    const now = new Date()
    const dueDate = quiz.due_date ? new Date(quiz.due_date) : null
    const questionsCount = quiz.quiz_questions?.length || 0
    
    if (dueDate && dueDate < now) {
      return "bg-gray-500" // closed/overdue
    }
    
    if (questionsCount === 0) {
      return "bg-yellow-500" // draft
    }
    
    return "bg-green-500" // published/active
  }

  const getQuizStatus = (quiz: Quiz | null) => {
    if (!quiz) return "draft"
    
    // Use the status field from the database if it exists
    if (quiz.status) {
      return quiz.status
    }
    
    // Fallback logic for quizzes without status field
    const now = new Date()
    const dueDate = quiz.due_date ? new Date(quiz.due_date) : null
    const questionsCount = quiz.quiz_questions?.length || 0
    
    if (dueDate && dueDate < now) {
      return "closed"
    }
    
    if (questionsCount === 0) {
      return "draft"
    }
    
    return "published"
  }

  const getTotalPoints = (questions: QuizQuestion[]) => {
    if (!questions || questions.length === 0) return 0
    return questions.reduce((total, q) => {
      const points = q.points || 0
      return total + points
    }, 0)
  }

  const handleEditQuiz = async (quiz: Quiz) => {
    if (!quiz) return
    
    setSelectedQuiz(quiz)
    
    // Initialize the settings form with current quiz data
    setQuizSettingsForm({
      title: quiz.title || '',
      time_limit: quiz.time_limit || 0,
      description: quiz.description || '',
      max_attempts: quiz.max_attempts || 0,
      status: (quiz.status || 'draft') as 'draft' | 'published' | 'closed',
      due_date: quiz.due_date ? new Date(quiz.due_date) : null
    })
    
    await loadQuizDetails(quiz)
    setIsEditDialogOpen(true)
  }

  const handleToggleQuizStatus = async (quiz: Quiz) => {
    try {
      const newStatus = quiz.status === 'published' ? 'draft' : 'published'
      
      const updatedQuiz = await updateQuiz(quiz.id, { status: newStatus })
      
      if (updatedQuiz) {
        await loadQuizzes() // Reload to get updated list
        toast({
          title: "Success",
          description: `Quiz ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!`,
        })
      }
    } catch (error) {
      console.error('Error updating quiz status:', error)
      toast({
        title: "Error",
        description: "Failed to update quiz status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenManualGrading = (attempt: QuizAttempt) => {
    setManualGradingDialog({
      isOpen: true,
      attempt
    })
  }

  const handleCloseManualGrading = () => {
    setManualGradingDialog({
      isOpen: false,
      attempt: null
    })
  }

  const handleFixPendingAttempts = async () => {
    try {
      console.log('Fixing all pending quiz attempts...')
      
      toast({
        title: "Processing",
        description: "Fixing pending quiz attempts...",
      })

      const result = await fixAllPendingQuizAttempts()
      
      console.log('Fix result:', result)
      
      if (result.updated > 0) {
        toast({
          title: "Success",
          description: `Fixed ${result.updated} quiz attempts! Students can now see their results.`,
        })
        
        // Refresh the quiz attempts list
        if (selectedQuiz) {
          const refreshedAttempts = await forceRefreshQuizAttempts(selectedQuiz.id)
          setSelectedQuizAttempts(refreshedAttempts)
        }
      } else {
        toast({
          title: "Info",
          description: "No pending quiz attempts found that need fixing.",
        })
      }
      
      if (result.errors.length > 0) {
        console.error('Errors during fix:', result.errors)
        toast({
          title: "Partial Success",
          description: `Fixed ${result.updated} attempts, but ${result.errors.length} had errors. Check console for details.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fixing pending attempts:', error)
      toast({
        title: "Error",
        description: "Failed to fix pending quiz attempts. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCheckConnections = async () => {
    try {
      console.log('Checking manual grading database connections...')
      
      toast({
        title: "Checking",
        description: "Analyzing manual grading database connections...",
      })

      const connectionResult = await checkManualGradingConnection()
      
      console.log('Connection check result:', connectionResult)
      
      if (connectionResult.error) {
        toast({
          title: "Error",
          description: `Database error: ${connectionResult.error}`,
          variant: "destructive",
        })
        return
      }

      const { totalCompletedAttempts, attemptsWithManualGrades, attemptsStuckInCompleted, needsFixing } = connectionResult

      if (needsFixing) {
        toast({
          title: "Issues Found",
          description: `Found ${attemptsStuckInCompleted} quiz attempts with manual grades that are stuck in 'completed' status. Check console for details.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "All Good",
          description: `Checked ${totalCompletedAttempts} completed attempts. Found ${attemptsWithManualGrades} with manual grades, all properly connected.`,
        })
      }

      // If there are issues, ask if user wants to fix them
      if (needsFixing) {
        const shouldFix = window.confirm(`Found ${attemptsStuckInCompleted} quiz attempts that are stuck in 'completed' status even though they have manual grades.\n\nWould you like to fix them automatically?`)
        
        if (shouldFix) {
          await handleFixPendingAttempts()
        }
      }

    } catch (error) {
      console.error('Error checking connections:', error)
      toast({
        title: "Error",
        description: "Failed to check database connections. See console for details.",
        variant: "destructive",
      })
    }
  }

  const handleFixManualGrades = async () => {
    try {
      console.log('Fixing quiz attempts with manual grades but wrong status...')
      
      toast({
        title: "Processing",
        description: "Fixing quiz attempts with manual grades...",
      })

      const result = await fixQuizAttemptsWithManualGrades()
      
      console.log('Fix manual grades result:', result)
      
      if (result.updated > 0) {
        toast({
          title: "Fixed!",
          description: `Fixed ${result.updated} quiz attempts! Students can now see their results.`,
        })
        
        // Refresh the quiz attempts list
        if (selectedQuiz) {
          const refreshedAttempts = await forceRefreshQuizAttempts(selectedQuiz.id)
          setSelectedQuizAttempts(refreshedAttempts)
        }
      } else {
        toast({
          title: "All Good",
          description: "No quiz attempts found with manual grades that need fixing.",
        })
      }
      
      if (result.errors.length > 0) {
        console.error('Errors during manual grade fix:', result.errors)
        toast({
          title: "Partial Success",
          description: `Fixed ${result.updated} attempts, but ${result.errors.length} had errors. Check console for details.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fixing manual grades:', error)
      toast({
        title: "Error",
        description: "Failed to fix manual grades. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleGradingComplete = async () => {
    // Force refresh quiz details to show updated scores
    if (selectedQuiz) {
      try {
        // Force refresh the attempts data
        const refreshedAttempts = await forceRefreshQuizAttempts(selectedQuiz.id)
        setSelectedQuizAttempts(refreshedAttempts)
        
        // Also reload the full quiz details
        await loadQuizDetails(selectedQuiz)
        
        toast({
          title: "Success",
          description: "Quiz graded successfully! Results have been updated.",
        })
      } catch (error) {
        console.error('Error refreshing quiz data after grading:', error)
        toast({
          title: "Warning",
          description: "Quiz was graded but there may be a display issue. Please refresh the page.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading quizzes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
          <p className="text-gray-600">Create and manage course quizzes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setSelectedDate(undefined)
            setIsDatePickerOpen(false)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
            </DialogHeader>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleCreateQuiz(formData)
              }} 
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input id="title" name="title" placeholder="e.g., Programming Fundamentals Quiz" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the quiz content and objectives"
                  rows={3}
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
                          {course.course_code} - {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <div className="relative" ref={datePickerRef}>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    {isDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 z-[9999] bg-white border rounded-md shadow-lg">
                        <Calendar 
                          mode="single" 
                          selected={selectedDate} 
                          onSelect={(date) => {
                            setSelectedDate(date)
                            setIsDatePickerOpen(false)
                          }} 
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return date < today
                          }}
                          initialFocus 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input id="timeLimit" name="timeLimit" type="number" placeholder="30" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attempts">Max Attempts</Label>
                  <Input id="attempts" name="attempts" type="number" placeholder="2" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Quiz Status</Label>
                <Select name="status" defaultValue="draft" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Not visible to students)</SelectItem>
                    <SelectItem value="published">Published (Visible to students)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Choose "Draft" to create the quiz without making it visible to students, or "Published" to make it immediately available.
                </p>
                {courses.length === 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> No courses found. Please create a course first before creating a quiz.
                    </p>
                  </div>
                )}
              </div>
              {/* Hidden input for selected date */}
              {selectedDate && (
                <input type="hidden" name="dueDate" value={selectedDate.toISOString()} />
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreatingQuiz}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingQuiz}>
                  {isCreatingQuiz ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Quiz"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quiz Grid */}
      {quizzes.length === 0 ? (
        <div className="text-center py-8">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Quizzes Yet</h3>
          <p className="text-gray-600">Create your first quiz to get started.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {quizzes.filter(quiz => quiz).map((quiz) => {
            const status = getQuizStatus(quiz)
            const questionsCount = quiz.quiz_questions?.length || 0
            const attemptsCount = quiz.quiz_attempts?.[0]?.count || 0
            
            return (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {quiz.courses?.course_code} - {quiz.courses?.title}
                      </p>
                </div>
                <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(quiz)}`} />
                      <Badge variant={status === "published" ? "default" : "secondary"}>{status}</Badge>
                      {questionsCount === 0 && (
                        <Badge variant="destructive" className="text-xs">
                          No Questions
                        </Badge>
                      )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                      <span>{quiz.time_limit || 0} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                      <span>{questionsCount} questions</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                      <span>
                        Due: {quiz.due_date ? format(new Date(quiz.due_date), "MMM d") : "No deadline"}
                      </span>
                </div>
                    <span className="font-medium">{getTotalPoints(quiz.quiz_questions || [])} pts</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                      <span>{attemptsCount} attempts</span>
                </div>
                    <span className="text-xs text-gray-500">Max: {quiz.max_attempts}</span>
              </div>

              <div className="flex gap-2">
                  <Button
                      variant="outline"
                    size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => handleEditQuiz(quiz)}
                  >
                      <Edit className="h-4 w-4 mr-1" />
                      Manage {/* Updated to Manage */}
                  </Button>
                    <Button
                      variant={quiz.status === 'published' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleQuizStatus(quiz)}
                      className={quiz.status === 'published' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-100 hover:bg-gray-200'}
                    >
                      {quiz.status === 'published' ? 'Published' : 'Draft'}
                    </Button>
                <Button
                  variant="outline"
                  size="sm"
                      onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
            )
          })}
      </div>
      )}

      {/* Quiz Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Quiz: {selectedQuiz?.title || 'Loading...'}</DialogTitle>
              {selectedQuiz && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedQuiz.status === 'published' ? 'bg-green-500' : 
                    selectedQuiz.status === 'draft' ? 'bg-gray-500' : 
                    'bg-red-500'
                  }`} />
                  <Badge variant={
                    selectedQuiz.status === 'published' ? 'default' : 
                    selectedQuiz.status === 'draft' ? 'secondary' : 
                    'destructive'
                  }>
                    {selectedQuiz.status}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedQuiz && (
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quiz Questions</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add New Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="question-type">Question Type</Label>
                        <Select
                          value={currentQuestion.type}
                          onValueChange={(value: CreateQuestionForm["type"]) => {
                            // Reset fields when changing question type
                            const resetFields = {
                              ...currentQuestion,
                              type: value,
                              correct_answer: "",
                              options: value === "multiple_choice" ? ["", "", "", ""] : undefined
                            }
                            setCurrentQuestion(resetFields)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True/False</SelectItem>
                            <SelectItem value="short_answer">Short Answer</SelectItem>
                            <SelectItem value="essay">Essay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="question-text">Question</Label>
                        <Textarea
                          id="question-text"
                          value={currentQuestion.question}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                          placeholder="Enter your question here..."
                          rows={3}
                        />
                      </div>

                      {currentQuestion.type === "multiple_choice" && (
                        <div className="space-y-3">
                          <Label>Answer Options</Label>
                          {currentQuestion.options?.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(currentQuestion.options || [])]
                                  newOptions[index] = e.target.value
                                  setCurrentQuestion({ ...currentQuestion, options: newOptions })
                                }}
                                placeholder={`Option ${index + 1}`}
                              />
                              <RadioGroup
                            value={currentQuestion.correct_answer}
                                onValueChange={(value) =>
                              setCurrentQuestion({ ...currentQuestion, correct_answer: value })
                                }
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value={option} id={`option-${index}`} />
                                  <Label htmlFor={`option-${index}`} className="text-sm">
                                    Correct
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          ))}
                        </div>
                      )}

                      {currentQuestion.type === "true_false" && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <RadioGroup
                            value={currentQuestion.correct_answer}
                            onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correct_answer: value })}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="true" />
                              <Label htmlFor="true">True</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="false" />
                              <Label htmlFor="false">False</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {(currentQuestion.type === "short_answer" || currentQuestion.type === "essay") && (
                        <div className="space-y-2">
                          <Label htmlFor="correct-answer">Correct Answer (Optional - for reference)</Label>
                          <Textarea
                            id="correct-answer"
                            value={currentQuestion.correct_answer}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                            placeholder="Enter the expected answer or key points..."
                            rows={currentQuestion.type === "essay" ? 4 : 2}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="points">Points</Label>
                          <Input
                            id="points"
                            type="number"
                            value={currentQuestion.points}
                            onChange={(e) =>
                              setCurrentQuestion({ ...currentQuestion, points: Number.parseInt(e.target.value) })
                            }
                            min="1"
                          />
                        </div>
                      </div>


                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedQuiz) {
                              handleAddQuestion(selectedQuiz.id, currentQuestion)
                            }
                          }}
                        >
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {selectedQuizQuestions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {question.type.replace("_", " ")}
                            </Badge>
                            <span className="text-sm text-gray-600">{question.points} pts</span>
                          </div>
                          <h4 className="font-medium mb-2">
                            Q{index + 1}: {question.question}
                          </h4>

                          {question.type === "multiple_choice" && question.options && (
                            <div className="space-y-1 text-sm">
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`p-2 rounded ${option === question.correct_answer ? "bg-green-50 text-green-800" : "bg-gray-50"}`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {option === question.correct_answer && " ✓"}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "true_false" && (
                            <div className="text-sm">
                              <span className="font-medium">Correct Answer: </span>
                              <span className="capitalize">{question.correct_answer}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id, question.question)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {selectedQuizQuestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No questions added yet. Click "Add Question" to get started.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input 
                        id="edit-title" 
                        value={quizSettingsForm.title}
                        onChange={(e) => setQuizSettingsForm({ ...quizSettingsForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-time-limit">Time Limit (minutes)</Label>
                      <Input 
                        id="edit-time-limit" 
                        type="number" 
                        value={quizSettingsForm.time_limit}
                        onChange={(e) => setQuizSettingsForm({ ...quizSettingsForm, time_limit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea 
                      id="edit-description" 
                      value={quizSettingsForm.description}
                      onChange={(e) => setQuizSettingsForm({ ...quizSettingsForm, description: e.target.value })}
                      rows={3} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-attempts">Max Attempts</Label>
                      <Input 
                        id="edit-attempts" 
                        type="number" 
                        value={quizSettingsForm.max_attempts}
                        onChange={(e) => setQuizSettingsForm({ ...quizSettingsForm, max_attempts: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quiz Status</Label>
                      <Select 
                        value={quizSettingsForm.status}
                        onValueChange={(value) => setQuizSettingsForm({ ...quizSettingsForm, status: value as 'draft' | 'published' | 'closed' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={setSettingsDatePickerRef}>
                        <Button
                          variant="outline"
                          onClick={() => setShowSettingsDatePicker(!showSettingsDatePicker)}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !quizSettingsForm.due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quizSettingsForm.due_date ? (
                            format(quizSettingsForm.due_date, "PPP")
                          ) : (
                            <span>Pick a due date</span>
                          )}
                        </Button>
                        {showSettingsDatePicker && (
                          <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                            <Calendar
                              mode="single"
                              selected={quizSettingsForm.due_date || undefined}
                              onSelect={(date) => {
                                setQuizSettingsForm({ ...quizSettingsForm, due_date: date || null })
                                setShowSettingsDatePicker(false)
                              }}
                              initialFocus
                            />
                          </div>
                        )}
                      </div>
                      {quizSettingsForm.due_date && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuizSettingsForm({ ...quizSettingsForm, due_date: null })}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>


                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                      setShowSettingsDatePicker(false)
                      setIsEditDialogOpen(false)
                    }} disabled={isSavingSettings}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveQuizSettings} disabled={isSavingSettings}>
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quiz Results</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      if (selectedQuiz) {
                        try {
                          const refreshedAttempts = await forceRefreshQuizAttempts(selectedQuiz.id)
                          setSelectedQuizAttempts(refreshedAttempts)
                          toast({
                            title: "Success",
                            description: "Results refreshed successfully!",
                          })
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to refresh results. Please try again.",
                            variant: "destructive",
                          })
                        }
                      }
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportResults}>
                    Export Results
                  </Button>
                  {/* Debug buttons hidden as requested */}
                  {/* <Button variant="outline" size="sm" onClick={handleFixPendingAttempts} className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                    Fix Pending Grades
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCheckConnections} className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                    Debug Connections
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFixManualGrades} className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100">
                    Fix Manual Grades
                  </Button> */}
                </div>
              </div>

              <div className="space-y-3">
                {selectedQuizAttempts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No submissions yet.</p>
                  </div>
                ) : (
                  selectedQuizAttempts.map((attempt) => (
                    <Card key={attempt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {attempt.profiles?.full_name?.charAt(0) || 'S'}
                              </AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-medium">{attempt.profiles?.full_name || 'Unknown Student'}</p>
                            <p className="text-sm text-gray-600">
                                {attempt.completed_at 
                                  ? `Submitted: ${attempt.completed_at ? format(new Date(attempt.completed_at), "MMM d, yyyy 'at' h:mm a") : 'N/A'}`
                                  : `Started: ${attempt.created_at ? format(new Date(attempt.created_at), "MMM d, yyyy 'at' h:mm a") : 'N/A'}`
                                }
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                              {attempt.score !== null && (
                            <div>
                              <p className="text-lg font-semibold">
                                    {attempt.score}
                              </p>
                              <p className="text-sm text-gray-600">
                                    Score
                              </p>
                            </div>
                              )}
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={
                                  attempt.status === 'completed' ? 'default' :
                                  attempt.status === 'graded' ? 'secondary' :
                                  'outline'
                                }>
                                  {attempt.status}
                                </Badge>
                                {attempt.status === 'completed' && (
                                  <Badge variant="destructive" className="text-xs">
                                    Needs Grading
                                  </Badge>
                                )}
                            </div>
                            {attempt.status === 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenManualGrading(attempt)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Grade
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Total Attempts</p>
                        <p className="text-2xl font-bold">{selectedQuizAttempts.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-gray-600">Needs Grading</p>
                        <p className="text-2xl font-bold text-red-600">
                          {selectedQuizAttempts.filter(a => a.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-2xl font-bold">
                          {selectedQuizAttempts.filter(a => a.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600">Avg Score</p>
                        <p className="text-2xl font-bold">
                          {(() => {
                            const completedAttempts = selectedQuizAttempts.filter(a => a.status === 'completed' || a.status === 'graded')
                            const scoredAttempts = selectedQuizAttempts.filter(a => a.score !== null)
                            
                            if (scoredAttempts.length > 0) {
                              return Math.round(scoredAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / scoredAttempts.length) + '%'
                            } else if (completedAttempts.length > 0) {
                              return 'Pending Grading'
                            } else {
                              return 'N/A'
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-gray-600">Total Questions</p>
                        <p className="text-2xl font-bold">{selectedQuizQuestions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span>
                          {selectedQuizAttempts.length > 0 
                            ? Math.round((selectedQuizAttempts.filter(a => a.status === 'completed').length / selectedQuizAttempts.length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${selectedQuizAttempts.length > 0 
                              ? (selectedQuizAttempts.filter(a => a.status === 'completed').length / selectedQuizAttempts.length) * 100
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        const scoredAttempts = selectedQuizAttempts.filter(a => a.score !== null)
                        const highScores = scoredAttempts.filter(a => (a.score || 0) >= 80).length
                        const mediumScores = scoredAttempts.filter(a => (a.score || 0) >= 60 && (a.score || 0) < 80).length
                        const lowScores = scoredAttempts.filter(a => (a.score || 0) < 60).length
                        
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600">High (80%+)</span>
                              <span>{highScores}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-yellow-600">Medium (60-79%)</span>
                              <span>{mediumScores}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600">Low (&lt;60%)</span>
                              <span>{lowScores}</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Question Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedQuizQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No questions available to analyze.</p>
                      </div>
                    ) : (
                      selectedQuizQuestions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                              Q{index + 1}: {question.question.length > 50 ? question.question.substring(0, 50) + '...' : question.question}
                          </p>
                          <p className="text-sm text-gray-600">{question.points} points</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-blue-600">
                              {question.type.charAt(0).toUpperCase() + question.type.slice(1).replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-600">type</p>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          cancelDeleteQuiz()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete the quiz <strong>"{deleteConfirmDialog.quizTitle}"</strong>?
            </p>
            <p className="text-xs text-red-600">
              This action cannot be undone. All quiz data, questions, and student attempts will be permanently deleted.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={cancelDeleteQuiz}>
              No, Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteQuiz}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation Dialog */}
      <Dialog open={deleteQuestionDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          cancelDeleteQuestion()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this question?
            </p>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">
                {deleteQuestionDialog.questionText.length > 100 
                  ? deleteQuestionDialog.questionText.substring(0, 100) + '...'
                  : deleteQuestionDialog.questionText
                }
              </p>
            </div>
            <p className="text-xs text-red-600">
              This action cannot be undone. The question and all associated data will be permanently deleted.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={cancelDeleteQuestion}>
              No, Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteQuestion}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={editQuestionDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          cancelEditQuestion()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question-type">Question Type</Label>
              <Select 
                value={editQuestionForm.type} 
                onValueChange={(value) => setEditQuestionForm({ ...editQuestionForm, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-question-text">Question</Label>
              <Textarea
                id="edit-question-text"
                value={editQuestionForm.question}
                onChange={(e) => setEditQuestionForm({ ...editQuestionForm, question: e.target.value })}
                placeholder="Enter your question here..."
                rows={3}
              />
            </div>

            {editQuestionForm.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>Options</Label>
                {(editQuestionForm.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editQuestionForm.options || [])]
                        newOptions[index] = e.target.value
                        setEditQuestionForm({ ...editQuestionForm, options: newOptions })
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <RadioGroup
                      value={editQuestionForm.correct_answer}
                      onValueChange={(value) => setEditQuestionForm({ ...editQuestionForm, correct_answer: value })}
                    >
                      <RadioGroupItem value={option} id={`edit-option-${index}`} />
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}

            {editQuestionForm.type === "true_false" && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <RadioGroup
                  value={editQuestionForm.correct_answer}
                  onValueChange={(value) => setEditQuestionForm({ ...editQuestionForm, correct_answer: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="edit-true" />
                    <Label htmlFor="edit-true">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="edit-false" />
                    <Label htmlFor="edit-false">False</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-question-points">Points</Label>
              <Input
                id="edit-question-points"
                type="number"
                value={editQuestionForm.points}
                onChange={(e) => setEditQuestionForm({ ...editQuestionForm, points: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={cancelEditQuestion}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQuestion}>
                Update Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Grading Dialog */}
      {manualGradingDialog.attempt && (
        <ManualGrading
          attempt={manualGradingDialog.attempt}
          isOpen={manualGradingDialog.isOpen}
          onClose={handleCloseManualGrading}
          onGradingComplete={handleGradingComplete}
        />
      )}
    </div>
  )
}
