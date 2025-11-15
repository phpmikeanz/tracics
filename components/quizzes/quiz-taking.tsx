"use client"

import { useState, useEffect, useRef } from "react"
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
import { createClient } from "@/lib/supabase/client"
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
  submissionAttempted?: boolean
}

export function QuizTaking({ quiz, attempt, onComplete }: QuizTakingProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  
  // Set quiz ID and attempt ID in window for debugging
  if (typeof window !== 'undefined') {
    (window as any).currentQuizId = quiz.id
    ;(window as any).currentAttemptId = attempt.id
    ;(window as any).debugQuizAnswers = async () => {
      console.log('🔍 DEBUGGING QUIZ ANSWERS')
      console.log('Attempt ID:', attempt.id)
      console.log('Quiz ID:', quiz.id)
      console.log('Current State Answers:', quizState.answers)
      console.log('Ref Answers:', answersRef.current)
      
      // Read from database
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('quiz_attempts')
          .select('answers, score, status')
          .eq('id', attempt.id)
          .single()
        
        console.log('Database Answers:', dbData?.answers)
        console.log('Database Score:', dbData?.score)
        console.log('Database Status:', dbData?.status)
        console.log('Database Error:', dbError)
        
        // Check DOM
        const allRadios = document.querySelectorAll('input[type="radio"]:checked')
        console.log('Checked Radio Buttons in DOM:', allRadios.length)
        allRadios.forEach((radio: any, index) => {
          console.log(`Radio ${index}:`, {
            questionId: radio.getAttribute('data-question-id') || radio.name,
            value: radio.value,
            checked: radio.checked
          })
        })
        
        // Check questions
        if (quizState.questions) {
          console.log('Questions:', quizState.questions.length)
          quizState.questions.forEach((q) => {
            const stateAnswer = quizState.answers[q.id]
            const refAnswer = answersRef.current[q.id]
            const dbAnswer = dbData?.answers?.[q.id]
            console.log(`Question ${q.id} (${q.type}):`, {
              state: stateAnswer || 'NO ANSWER',
              ref: refAnswer || 'NO ANSWER',
              db: dbAnswer || 'NO ANSWER'
            })
          })
        }
      } catch (error) {
        console.error('Debug error:', error)
      }
    }
  }

  // Safe shuffle function with seed for consistent randomization per student
  const safeShuffleArray = (array: any[], seed?: string): any[] => {
    if (!array || array.length === 0) return array
    
    // Create a deep copy to avoid modifying original
    const shuffled = JSON.parse(JSON.stringify(array))
    
    // Use seed for consistent randomization (same student = same order)
    let random = seed ? seededRandom(seed) : Math.random
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      // Safe swap using temporary variable
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
    
    return shuffled
  }

  // Seeded random number generator for consistent shuffling
  const seededRandom = (seed: string) => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    let current = Math.abs(hash)
    return () => {
      current = (current * 9301 + 49297) % 233280
      return current / 233280
    }
  }

  
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
  
  // Ref to store latest answers for timer access without causing re-renders
  const answersRef = useRef<Record<string, string>>(quizState.answers)
  
  // Update ref whenever answers change
  useEffect(() => {
    answersRef.current = quizState.answers
  }, [quizState.answers])



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
        console.log('🚀 ULTRA SIMPLE FIX - LOADING QUESTIONS DIRECTLY')
        console.log('🚀 VERSION: 2.0 - NO SHUFFLE CODE!')
        console.log('🚀 TIMESTAMP:', new Date().toISOString())
        console.log('🚀 QUIZ ID:', quiz.id)
        console.log('🚀 THIS IS THE NEW VERSION - NO SHUFFLE CODE!')
        console.log('🚀 CACHE BUSTER:', Math.random().toString(36).substring(7))
        
        const questions = await getQuizQuestions(quiz.id)
        console.log('🚀 ULTRA DEBUG - QUESTIONS FROM DATABASE:', questions)
        console.log('🚀 ULTRA DEBUG - QUESTIONS COUNT:', questions.length)
        console.log('🚀 ULTRA DEBUG - QUESTIONS TYPE:', typeof questions)
        console.log('🚀 ULTRA DEBUG - IS ARRAY:', Array.isArray(questions))
        console.log('🚀 ULTRA DEBUG - QUESTION IDS:', questions?.map(q => q.id) || [])
        
        // Check if there's any shuffle code still running
        console.log('🚀 ULTRA DEBUG - NO SHUFFLE CODE SHOULD BE RUNNING!')
        
        if (!questions || questions.length === 0) {
          console.error('❌ NO QUESTIONS RECEIVED FROM DATABASE!')
          toast({
            title: "No Questions",
            description: "No questions found for this quiz.",
            variant: "destructive",
          })
          return
        }
        
        // Shuffle questions and options to prevent copying
        console.log('🔄 SHUFFLING QUESTIONS TO PREVENT COPYING...')
        console.log('Original questions count:', questions.length)
        
        // Create unique seed for this student and quiz
        const shuffleSeed = `${user?.id}-${quiz.id}-${attempt.id}`
        console.log('🎲 Shuffle seed:', shuffleSeed)
        
        // Shuffle question order using student-specific seed
        const shuffledQuestions = safeShuffleArray(questions, shuffleSeed)
        console.log('Shuffled questions count:', shuffledQuestions.length)
        
        // Shuffle options for each question using question-specific seed
        const finalQuestions = shuffledQuestions.map((question, index) => {
          if (question.type === 'multiple_choice' || question.type === 'true_false') {
            const optionSeed = `${shuffleSeed}-${question.id}-${index}`
            return {
              ...question,
              options: safeShuffleArray(question.options || [], optionSeed)
            }
          }
          return question
        })
        
        console.log('✅ FINAL QUESTIONS WITH SHUFFLING:', finalQuestions.length)
        console.log('Setting shuffled questions in state:', finalQuestions)
        
        // Set shuffled questions
        setQuizState(prev => {
          console.log('Previous state questions count:', prev.questions?.length || 0)
          console.log('Setting new shuffled questions count:', finalQuestions.length)
          return {
            ...prev,
            questions: finalQuestions
          }
        })
        
        console.log('🎉 QUESTIONS SET - COUNT:', questions.length)
        
        // Verify the state was set
        setTimeout(() => {
          console.log('🔍 VERIFICATION - Current state questions count:', quizState.questions?.length || 0)
        }, 100)
        
      } catch (error) {
        console.error('❌ ERROR LOADING QUESTIONS:', error)
        toast({
          title: "Error",
          description: "Failed to load quiz questions. Please try again.",
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
    // Don't run timer if submitted, auto-submitting, or submission was already attempted
    if (!quizState.isSubmitted && !quizState.isAutoSubmitting && !quizState.submissionAttempted) {
      let finalSaveDone = false // Flag to prevent multiple final saves
      
      const timer = setInterval(() => {
        const remaining = calculateTimeRemaining()
        setQuizState((prev) => ({ ...prev, timeRemaining: remaining }))
        
        // Final save when timer is about to expire (5 seconds before) - only once
        if (remaining === 5 && !finalSaveDone && !quizState.isSubmitted && !quizState.isAutoSubmitting) {
          finalSaveDone = true
          console.log('⏰ 5 seconds remaining - performing final save of all answers')
          
          // Capture all answers from DOM and save them
          const domAnswers: Record<string, string> = {}
          
          // Capture all inputs
          document.querySelectorAll('input[type="radio"]').forEach((input: any) => {
            if (input.checked) {
              const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
              if (questionId && input.value) {
                domAnswers[questionId] = input.value
              }
            }
          })
          
          document.querySelectorAll('input[type="text"]').forEach((input: any) => {
            const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
            if (questionId && input.value) {
              domAnswers[questionId] = input.value
            }
          })
          
          document.querySelectorAll('textarea').forEach((textarea: any) => {
            const questionId = textarea.getAttribute('data-question-id') || textarea.name?.replace('question-', '')
            if (questionId && textarea.value) {
              domAnswers[questionId] = textarea.value
            }
          })
          
          // Get current state answers from ref (latest without re-render)
          const stateAnswers = answersRef.current
          const finalAnswers = { ...stateAnswers, ...domAnswers }
          
          // Save immediately
          saveQuizAnswers(attempt.id, finalAnswers).then(() => {
            console.log('✅ Final save completed with', Object.keys(finalAnswers).length, 'answers')
          }).catch((error) => {
            console.error('❌ Final save failed:', error)
          })
        }
        
        // Auto-submit when time runs out
        if (remaining === 0 && !quizState.isSubmitted && !quizState.isAutoSubmitting && !quizState.submissionAttempted) {
          console.log('⏰ Time expired, triggering auto-submit')
          handleAutoSubmitQuiz()
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [quizState.isSubmitted, quizState.isAutoSubmitting, quizState.submissionAttempted, attempt.id])

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
    console.log('🎯 handleAnswerChange called:', { questionId, answer, attemptId: attempt.id })
    
    // Validate inputs
    if (!questionId || !answer) {
      console.error('❌ Invalid handleAnswerChange call:', { questionId, answer })
      return
    }
    
    if (!attempt?.id) {
      console.error('❌ No attempt ID available!')
      return
    }
    
    // Use functional update to ensure we get the latest state
    let newAnswers: Record<string, string> = {}
    setQuizState((prev) => {
      newAnswers = { ...prev.answers, [questionId]: answer }
      console.log('📝 Updating state with new answers:', newAnswers, 'Count:', Object.keys(newAnswers).length)
      
      // CRITICAL: Update ref immediately and synchronously
      answersRef.current = newAnswers
      console.log('✅ Ref updated immediately with:', answersRef.current, 'Count:', Object.keys(answersRef.current).length)
      
      return {
        ...prev,
        answers: newAnswers,
        isAutoSaving: true
      }
    })

    // Use the newAnswers directly (from state update)
    console.log('💾 Saving answers to database:', newAnswers, 'Count:', Object.keys(newAnswers).length)

    // Auto-save the answer immediately with retry logic
    let saveSuccess = false
    let retryCount = 0
    const maxRetries = 5 // Increased retries
    
    while (!saveSuccess && retryCount < maxRetries) {
      try {
        console.log(`💾 Attempting to save (attempt ${retryCount + 1}/${maxRetries})...`)
        const saveResult = await saveQuizAnswers(attempt.id, newAnswers)
        if (saveResult) {
          saveSuccess = true
          console.log('✅ Answer auto-saved for question:', questionId, 'on attempt:', retryCount + 1, 'Total answers saved:', Object.keys(newAnswers).length)
          
          // Verify the save by reading back
          try {
            const { data: verifyData, error: verifyError } = await supabase
              .from('quiz_attempts')
              .select('answers')
              .eq('id', attempt.id)
              .single()
            
            if (!verifyError && verifyData?.answers) {
              const savedCount = Object.keys(verifyData.answers).length
              const hasThisAnswer = verifyData.answers[questionId] === answer
              console.log('✅ Save verified: Database has', savedCount, 'answers. This answer saved:', hasThisAnswer)
              
              if (!hasThisAnswer) {
                console.warn('⚠️ Answer not found in database after save! Retrying...')
                saveSuccess = false
                retryCount++
                await new Promise(resolve => setTimeout(resolve, 500))
                continue
              }
            } else {
              console.warn('⚠️ Could not verify save:', verifyError)
            }
          } catch (verifyError) {
            console.warn('⚠️ Verification error (non-critical):', verifyError)
          }
        } else {
          throw new Error('Save returned false')
        }
      } catch (error) {
        retryCount++
        console.error(`❌ Failed to auto-save answer for question ${questionId} on attempt ${retryCount}:`, error)
        if (retryCount < maxRetries) {
          // Wait progressively longer before retrying
          await new Promise(resolve => setTimeout(resolve, 300 * retryCount))
        }
      }
    }
    
    if (!saveSuccess) {
      console.error('❌ CRITICAL: Failed to auto-save answer after all retries for question:', questionId)
      console.error('This answer may be lost! Answer was:', answer)
      // Show error to user since this is critical
      toast({
        title: "⚠️ Save Failed",
        description: `Failed to save answer for question. Please try clicking again or contact your instructor.`,
        variant: "destructive",
      })
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
      // Wait a brief moment to ensure any pending state updates are complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // Get the most current answers from state
      let currentAnswers = { ...quizState.answers }
      console.log('📊 Initial answers from state (manual submit):', currentAnswers, 'Count:', Object.keys(currentAnswers).length)
      
      // COMPREHENSIVE DOM CAPTURE - Capture ALL user input from ALL questions
      try {
        const domAnswers: Record<string, string> = {}
        
        // Method 1: Capture radio buttons by name attribute (most reliable for RadioGroup)
        if (quizState.questions && quizState.questions.length > 0) {
          quizState.questions.forEach((question) => {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
              // Try to find checked radio button by name attribute
              const radioName = `question-${question.id}`
              const checkedRadio = document.querySelector(`input[type="radio"][name="${radioName}"]:checked`) as HTMLInputElement
              
              if (checkedRadio && checkedRadio.value) {
                domAnswers[question.id] = checkedRadio.value
                console.log(`📻 Radio answer captured for question ${question.id} (manual submit, by name):`, checkedRadio.value)
              } else {
                // Fallback: try data-question-id
                const checkedByDataId = document.querySelector(`input[type="radio"][data-question-id="${question.id}"]:checked`) as HTMLInputElement
                if (checkedByDataId && checkedByDataId.value) {
                  domAnswers[question.id] = checkedByDataId.value
                  console.log(`📻 Radio answer captured for question ${question.id} (manual submit, by data-id):`, checkedByDataId.value)
                }
              }
            }
          })
        }
        
        // Method 2: Also capture ALL radio buttons as fallback
        const allRadioInputs = document.querySelectorAll('input[type="radio"]')
        allRadioInputs.forEach((input: any) => {
          if (input.checked) {
            const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
            if (questionId && input.value && !domAnswers[questionId]) {
              domAnswers[questionId] = input.value
              console.log(`📻 Radio answer captured for question ${questionId} (manual submit, fallback):`, input.value)
            }
          }
        })
        
        // Capture ALL text inputs (even partial input)
        const allTextInputs = document.querySelectorAll('input[type="text"]')
        allTextInputs.forEach((input: any) => {
          const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
          if (questionId && input.value) {
            domAnswers[questionId] = input.value
          }
        })
        
        // Capture ALL textareas (even partial input)
        const allTextareas = document.querySelectorAll('textarea')
        allTextareas.forEach((textarea: any) => {
          const questionId = textarea.getAttribute('data-question-id') || textarea.name?.replace('question-', '')
          if (questionId && textarea.value) {
            domAnswers[questionId] = textarea.value
          }
        })
        
        // Iterate through ALL questions to ensure we don't miss any
        if (quizState.questions && quizState.questions.length > 0) {
          quizState.questions.forEach((question) => {
            if (!domAnswers[question.id] && !currentAnswers[question.id]) {
              const questionRadio = document.querySelector(`input[type="radio"][data-question-id="${question.id}"]:checked`)
              if (questionRadio) {
                domAnswers[question.id] = (questionRadio as HTMLInputElement).value
              }
              
              const questionTextarea = document.querySelector(`textarea[data-question-id="${question.id}"]`)
              if (questionTextarea && (questionTextarea as HTMLTextAreaElement).value) {
                domAnswers[question.id] = (questionTextarea as HTMLTextAreaElement).value
              }
              
              const questionTextInput = document.querySelector(`input[type="text"][data-question-id="${question.id}"]`)
              if (questionTextInput && (questionTextInput as HTMLInputElement).value) {
                domAnswers[question.id] = (questionTextInput as HTMLInputElement).value
              }
            }
          })
        }
        
        // Merge DOM answers with state answers (DOM takes precedence)
        currentAnswers = { ...currentAnswers, ...domAnswers }
        console.log('✅ Answers after DOM capture (manual submit):', currentAnswers, 'Count:', Object.keys(currentAnswers).length)
      } catch (domError) {
        console.warn('⚠️ Error capturing answers from DOM (manual submit):', domError)
        // Continue with state answers only
      }
      
      // Final save of all answers before submission
      console.log('Final save before manual submission:', currentAnswers)
      await saveQuizAnswers(attempt.id, currentAnswers)
      
      // Submit the quiz - this will trigger database notifications automatically
      await submitQuizAttempt(attempt.id, currentAnswers)
      
      // Additional activity tracking (database triggers handle the main notifications)
      if (user?.id && quiz.course_id) {
        try {
          // Track student activity for comprehensive monitoring
          await trackStudentActivity(
            user.id,
            quiz.course_id,
            'quiz_completed',
            {
              quizTitle: quiz.title,
              completedAt: new Date().toISOString()
            }
          )
          
          console.log("Student activity tracked for quiz completion:", quiz.title)
        } catch (activityError) {
          console.log("Activity tracking failed, but quiz was submitted:", activityError)
        }
      }
      
      setQuizState((prev) => ({ ...prev, isSubmitted: true }))
      setShowSubmitDialog(false)
      
      const answeredCount = Object.keys(currentAnswers).length
      toast({
        title: "Success",
        description: `Quiz submitted successfully! ${answeredCount} answers have been saved.`,
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error)
      
      // Check if it's an RLS error - if so, mark as submitted to prevent loop
      const isRLSError = error?.code === '42501' || error?.message?.includes('row-level security')
      
      if (isRLSError) {
        // RLS error means the submission might have actually succeeded
        // Mark as submitted to prevent issues
        console.warn('RLS error detected - marking quiz as submitted')
        setQuizState((prev) => ({ ...prev, isSubmitted: true, submissionAttempted: true }))
        setShowSubmitDialog(false)
        toast({
          title: "Quiz Submitted",
          description: "Your quiz has been submitted. If you don't see a notification, contact your instructor.",
          variant: "default",
        })
        if (onComplete) {
          onComplete()
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to submit quiz. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleAutoSubmitQuiz = async () => {
    // Prevent multiple auto-submissions
    if (quizState.isAutoSubmitting || quizState.isSubmitted) {
      console.log('Auto-submit already in progress or quiz already submitted, skipping')
      return
    }
    
    try {
      // Set auto-submitting state to prevent multiple submissions
      setQuizState((prev) => ({ ...prev, isAutoSubmitting: true }))
      
      // Show immediate notification
      toast({
        title: "⏰ Time's Up!",
        description: "Quiz automatically submitted due to time limit.",
        variant: "destructive",
      })

      // EXACTLY LIKE MANUAL SUBMIT: Wait a brief moment to ensure any pending state updates are complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // EXACTLY LIKE MANUAL SUBMIT: Get the most current answers from state
      let currentAnswers = { ...quizState.answers }
      console.log('📊 Initial answers from state (auto submit):', currentAnswers, 'Count:', Object.keys(currentAnswers).length)
      
      // EXACTLY LIKE MANUAL SUBMIT: COMPREHENSIVE DOM CAPTURE - Capture ALL user input from ALL questions
      try {
        const domAnswers: Record<string, string> = {}
        
        // Method 1: Capture radio buttons by name attribute (most reliable for RadioGroup)
        if (quizState.questions && quizState.questions.length > 0) {
          quizState.questions.forEach((question) => {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
              // Try to find checked radio button by name attribute
              const radioName = `question-${question.id}`
              const checkedRadio = document.querySelector(`input[type="radio"][name="${radioName}"]:checked`) as HTMLInputElement
              
              if (checkedRadio && checkedRadio.value) {
                domAnswers[question.id] = checkedRadio.value
                console.log(`📻 Radio answer captured for question ${question.id} (auto submit, by name):`, checkedRadio.value)
              } else {
                // Fallback: try data-question-id
                const checkedByDataId = document.querySelector(`input[type="radio"][data-question-id="${question.id}"]:checked`) as HTMLInputElement
                if (checkedByDataId && checkedByDataId.value) {
                  domAnswers[question.id] = checkedByDataId.value
                  console.log(`📻 Radio answer captured for question ${question.id} (auto submit, by data-id):`, checkedByDataId.value)
                }
              }
            }
          })
        }
        
        // Method 2: Also capture ALL radio buttons as fallback
        const allRadioInputs = document.querySelectorAll('input[type="radio"]')
        allRadioInputs.forEach((input: any) => {
          if (input.checked) {
            const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
            if (questionId && input.value && !domAnswers[questionId]) {
              domAnswers[questionId] = input.value
              console.log(`📻 Radio answer captured for question ${questionId} (auto submit, fallback):`, input.value)
            }
          }
        })
        
        // Capture ALL text inputs (even partial input)
        const allTextInputs = document.querySelectorAll('input[type="text"]')
        allTextInputs.forEach((input: any) => {
          const questionId = input.getAttribute('data-question-id') || input.name?.replace('question-', '')
          if (questionId && input.value) {
            domAnswers[questionId] = input.value
          }
        })
        
        // Capture ALL textareas (even partial input)
        const allTextareas = document.querySelectorAll('textarea')
        allTextareas.forEach((textarea: any) => {
          const questionId = textarea.getAttribute('data-question-id') || textarea.name?.replace('question-', '')
          if (questionId && textarea.value) {
            domAnswers[questionId] = textarea.value
          }
        })
        
        // Iterate through ALL questions to ensure we don't miss any
        if (quizState.questions && quizState.questions.length > 0) {
          quizState.questions.forEach((question) => {
            if (!domAnswers[question.id] && !currentAnswers[question.id]) {
              const questionRadio = document.querySelector(`input[type="radio"][data-question-id="${question.id}"]:checked`)
              if (questionRadio) {
                domAnswers[question.id] = (questionRadio as HTMLInputElement).value
              }
              
              const questionTextarea = document.querySelector(`textarea[data-question-id="${question.id}"]`)
              if (questionTextarea && (questionTextarea as HTMLTextAreaElement).value) {
                domAnswers[question.id] = (questionTextarea as HTMLTextAreaElement).value
              }
              
              const questionTextInput = document.querySelector(`input[type="text"][data-question-id="${question.id}"]`)
              if (questionTextInput && (questionTextInput as HTMLInputElement).value) {
                domAnswers[question.id] = (questionTextInput as HTMLInputElement).value
              }
            }
          })
        }
        
        // EXACTLY LIKE MANUAL SUBMIT: Merge DOM answers with state answers (DOM takes precedence)
        currentAnswers = { ...currentAnswers, ...domAnswers }
        console.log('✅ Answers after DOM capture (auto submit):', currentAnswers, 'Count:', Object.keys(currentAnswers).length)
      } catch (domError) {
        console.warn('⚠️ Error capturing answers from DOM (auto submit):', domError)
        // Continue with state answers only
      }
      
      // EXACTLY LIKE MANUAL SUBMIT: Final save of all answers before submission
      console.log('Final save before auto submission:', currentAnswers)
      await saveQuizAnswers(attempt.id, currentAnswers)
      
      // EXACTLY LIKE MANUAL SUBMIT: Submit the quiz - this will trigger database notifications automatically
      await submitQuizAttempt(attempt.id, currentAnswers)
      
      // EXACTLY LIKE MANUAL SUBMIT: Additional activity tracking
      if (user?.id && quiz.course_id) {
        try {
          await trackStudentActivity(
            user.id,
            quiz.course_id,
            'quiz_completed',
            {
              quizTitle: quiz.title,
              completedAt: new Date().toISOString()
            }
          )
          
          console.log("Student activity tracked for quiz completion:", quiz.title)
        } catch (activityError) {
          console.log("Activity tracking failed, but quiz was submitted:", activityError)
        }
      }
      
      // EXACTLY LIKE MANUAL SUBMIT: Update state
      setQuizState((prev) => ({ ...prev, isSubmitted: true, isAutoSubmitting: false }))
      
      // EXACTLY LIKE MANUAL SUBMIT: Show success notification
      const answeredCount = Object.keys(currentAnswers).length
      toast({
        title: "Quiz Auto-Submitted",
        description: `Quiz automatically submitted. ${answeredCount} answers have been saved.`,
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      console.error('Error auto-submitting quiz:', error)
      
      // Check if it's an RLS error - if so, mark as submitted to prevent loop
      const isRLSError = error?.code === '42501' || error?.message?.includes('row-level security')
      
      if (isRLSError) {
        // RLS error means the submission might have actually succeeded
        // Mark as submitted to prevent infinite retry loop
        console.warn('RLS error detected - marking quiz as submitted to prevent loop')
        setQuizState((prev) => ({ ...prev, isSubmitted: true, isAutoSubmitting: false }))
        toast({
          title: "Quiz Submitted",
          description: "Your quiz has been submitted. If you don't see a notification, contact your instructor.",
          variant: "default",
        })
        if (onComplete) {
          onComplete()
        }
      } else {
        // For other errors, prevent retries by marking as attempted
        setQuizState((prev) => ({ ...prev, isAutoSubmitting: false, submissionAttempted: true }))
        toast({
          title: "Auto-Submit Error",
          description: "Failed to auto-submit quiz. Please contact your instructor.",
          variant: "destructive",
        })
      }
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

  // Helper function to get grade color based on percentage
  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) {
      return {
        bg: 'bg-green-50',
        text: 'text-green-600',
        icon: 'text-green-500'
      }
    } else if (percentage >= 60) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        icon: 'text-orange-500'
      }
    } else {
      return {
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: 'text-red-500'
      }
    }
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
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-lg font-medium text-gray-900">Loading Quiz Questions...</div>
          <div className="text-sm text-gray-600">Please wait while we prepare your quiz</div>
        </div>
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
  console.log('🔍 QUIZ TAKING DEBUG:', {
    questionsLength: quizState.questions?.length,
    currentQuestionIndex: quizState.currentQuestion,
    currentQuestion: currentQuestion,
    questions: quizState.questions,
    allQuestionIds: quizState.questions?.map(q => q.id) || []
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
    const percentage = getTotalPoints() > 0 ? Math.round((getTotalPointsEarned() / getTotalPoints()) * 100) : 0
    const gradeColors = getGradeColor(percentage)
    
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className={`h-16 w-16 ${gradeColors.icon}`} />
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
              <div className={`text-center p-4 ${gradeColors.bg} rounded-lg`}>
                <p className={`text-2xl font-bold ${gradeColors.text}`}>
                  {percentage}%
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
                          <RadioGroupItem 
                            value={option} 
                            id={`option-${index}`}
                            data-question-id={currentQuestion.id}
                            name={`question-${currentQuestion.id}`}
                          />
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
                        <RadioGroupItem 
                          value="true" 
                          id="true"
                          data-question-id={currentQuestion.id}
                          name={`question-${currentQuestion.id}`}
                        />
                        <Label htmlFor="true" className="flex-1 cursor-pointer">
                          True
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem 
                          value="false" 
                          id="false"
                          data-question-id={currentQuestion.id}
                          name={`question-${currentQuestion.id}`}
                        />
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
                    data-question-id={currentQuestion.id}
                    name={`question-${currentQuestion.id}`}
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
