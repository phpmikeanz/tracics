"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, Clock, FileText, MessageSquare, Star, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { 
  getQuestionsNeedingGrading, 
  getQuestionGrades, 
  gradeQuestion, 
  calculateTotalScore, 
  updateQuizAttemptScore,
  getScoreBreakdown
} from "@/lib/quizzes"
import type { Database } from "@/lib/types"

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]
type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"] & {
  profiles?: { full_name: string } | null
  quizzes?: { title: string } | null
}
type QuestionGrade = Database["public"]["Tables"]["quiz_question_grades"]["Row"]

interface ManualGradingProps {
  attempt: QuizAttempt
  isOpen: boolean
  onClose: () => void
  onGradingComplete: () => void
}

export function ManualGrading({ attempt, isOpen, onClose, onGradingComplete }: ManualGradingProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [grades, setGrades] = useState<QuestionGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [pointsAwarded, setPointsAwarded] = useState<Record<string, number | undefined>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)

  useEffect(() => {
    if (isOpen && attempt) {
      loadGradingData()
    }
  }, [isOpen, attempt])

  // Validation function
  const validatePoints = (questionId: string, points: number | undefined, maxPoints: number) => {
    if (points === undefined) {
      return { isValid: false, error: 'Please enter points' }
    }
    if (points < 0) {
      return { isValid: false, error: 'Points cannot be negative' }
    }
    if (points > maxPoints) {
      return { isValid: false, error: `Points cannot exceed ${maxPoints}` }
    }
    return { isValid: true, error: '' }
  }

  // Force validation on every render
  useEffect(() => {
    // Only run if we have questions and a valid current question index
    if (questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex]
      const points = pointsAwarded[currentQuestion.id]
      
      console.log('🔍 Force validation check:', {
        questionId: currentQuestion.id,
        points,
        maxPoints: currentQuestion.points
      })
      
      // Direct validation
      let errorMessage = ''
      if (points !== undefined) {
        if (points < 0) {
          errorMessage = 'Points cannot be negative'
        } else if (points > currentQuestion.points) {
          errorMessage = `Points cannot exceed ${currentQuestion.points}`
        }
      } else {
        errorMessage = 'Please enter points'
      }
      
      console.log('🔍 Force validation result:', errorMessage)
      
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: errorMessage
      }))
    }
  }, [pointsAwarded, questions, currentQuestionIndex])

  const loadGradingData = async () => {
    try {
      setLoading(true)
      console.log('Loading grading data for attempt:', attempt.id)
      
      const [questionsData, gradesData] = await Promise.all([
        getQuestionsNeedingGrading(attempt.id),
        getQuestionGrades(attempt.id)
      ])
      
      console.log('Questions needing grading:', questionsData)
      console.log('Existing grades:', gradesData)
      
      setQuestions(questionsData)
      setGrades(gradesData)
      
      // Initialize points and feedback from existing grades
      const initialPoints: Record<string, number | undefined> = {}
      const initialFeedback: Record<string, string> = {}
      
      gradesData.forEach(grade => {
        initialPoints[grade.question_id] = grade.points_awarded
        initialFeedback[grade.question_id] = grade.feedback || ''
      })
      
      setPointsAwarded(initialPoints)
      setFeedback(initialFeedback)
      
      // Load score breakdown to show auto vs manual points
      const breakdown = await getScoreBreakdown(attempt.id)
      console.log('Score breakdown loaded:', breakdown)
      setScoreBreakdown(breakdown)
    } catch (error) {
      console.error('Error loading grading data:', error)
      toast({
        title: "Error",
        description: "Failed to load grading data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGradeQuestion = async (questionId: string) => {
    try {
      setGrading(true)
      const points = pointsAwarded[questionId]
      const questionFeedback = feedback[questionId] || ''
      
      console.log('🎯 Grading question:', questionId, 'with points:', points, 'feedback:', questionFeedback)
      console.log('📋 Attempt ID:', attempt.id)
      
      // Validate input
      if (points === undefined) {
        toast({
          title: "Invalid Points",
          description: "Please enter points for this question.",
          variant: "destructive",
        })
        return
      }
      
      if (points < 0) {
        toast({
          title: "Invalid Points",
          description: "Points awarded cannot be negative.",
          variant: "destructive",
        })
        return
      }
      
      // Get the current question to check max points
      const currentQuestion = questions.find(q => q.id === questionId)
      if (currentQuestion && points > currentQuestion.points) {
        toast({
          title: "Invalid Points",
          description: `Points awarded (${points}) cannot exceed the question's maximum points (${currentQuestion.points}).`,
          variant: "destructive",
        })
        return
      }
      
      const result = await gradeQuestion(attempt.id, questionId, points, questionFeedback)
      console.log('✅ Grade question result:', result)
      
      // Reload grades to update the UI
      const updatedGrades = await getQuestionGrades(attempt.id)
      console.log('📊 Updated grades after grading:', updatedGrades)
      setGrades(updatedGrades)
      
      // Update score breakdown to show current auto + manual totals
      const updatedBreakdown = await getScoreBreakdown(attempt.id)
      console.log('📈 Updated score breakdown:', updatedBreakdown)
      setScoreBreakdown(updatedBreakdown)
      
      // Check if all essay/short answer questions have been graded
      const allQuestionsGraded = questions.every(q => 
        updatedGrades.some(g => g.question_id === q.id)
      )
      
      if (allQuestionsGraded) {
        toast({
          title: "🎉 All Questions Graded!",
          description: "Quiz has been automatically finalized. Students can now see their results.",
        })
        
        // All manual questions are graded, close the dialog
        onGradingComplete()
        onClose()
      } else {
        toast({
          title: "✅ Question Graded", 
          description: `Question graded successfully! ${updatedGrades.length}/${questions.length} questions completed.`,
        })
        
        // Move to next ungraded question automatically
        const nextUngraded = questions.findIndex(q => 
          !updatedGrades.some(g => g.question_id === q.id)
        )
        if (nextUngraded !== -1) {
          setCurrentQuestionIndex(nextUngraded)
        }
        
        // Notify parent component that grading status may have changed
        onGradingComplete()
      }
    } catch (error) {
      console.error('❌ Error grading question:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      toast({
        title: "Grading Failed",
        description: `Failed to grade question: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setGrading(false)
    }
  }

  const handleFinalizeGrading = async () => {
    try {
      setGrading(true)
      
      console.log('Finalizing grading for attempt:', attempt.id)
      console.log('Current grades:', grades)
      console.log('Total graded questions:', getTotalGradedQuestions())
      console.log('Total questions:', questions.length)
      
      // Calculate total score
      console.log('Calculating total score for attempt:', attempt.id)
      const totalScore = await calculateTotalScore(attempt.id)
      console.log('Calculated total score:', totalScore)
      
      // Update attempt with final score
      console.log('Updating quiz attempt with score:', totalScore)
      const updateResult = await updateQuizAttemptScore(attempt.id, totalScore)
      console.log('Update result:', updateResult)
      
      // Verify the update was successful
      const { data: verifyUpdate } = await supabase
        .from('quiz_attempts')
        .select('status, score')
        .eq('id', attempt.id)
        .single()
      
      console.log('Verification - Updated attempt:', verifyUpdate)
      
      if (verifyUpdate?.status === 'graded' && verifyUpdate?.score === totalScore) {
        toast({
          title: "Success",
          description: `Quiz graded successfully! Total score: ${totalScore} points`,
        })
        
        onGradingComplete()
        onClose()
      } else {
        throw new Error(`Update verification failed. Status: ${verifyUpdate?.status}, Score: ${verifyUpdate?.score}`)
      }
    } catch (error) {
      console.error('Error finalizing grading:', error)
      toast({
        title: "Error",
        description: "Failed to finalize grading. Please try again or contact support.",
        variant: "destructive",
      })
    } finally {
      setGrading(false)
    }
  }

  const handleUpdateQuizAttemptScore = async () => {
    try {
      setGrading(true)
      
      console.log('🔄 Starting database update process...')
      console.log('📊 Score breakdown:', scoreBreakdown)
      
      // Get the calculated total from score breakdown
      const calculatedTotal = scoreBreakdown?.scoreBreakdown?.calculatedTotal || 0
      
      if (calculatedTotal <= 0) {
        toast({
          title: "Error",
          description: "No calculated total score available to update.",
          variant: "destructive",
        })
        return
      }
      
      console.log('🎯 Updating quiz attempt with calculated total:', calculatedTotal)
      console.log('📋 Attempt ID:', attempt.id)
      
      // Method 1: Try the updateQuizAttemptScore function
      try {
        const updateResult = await updateQuizAttemptScore(attempt.id, calculatedTotal)
        console.log('✅ Update result:', updateResult)
      } catch (updateError) {
        console.error('❌ updateQuizAttemptScore failed:', updateError)
        
        // Check if it's an RLS policy error
        if (updateError instanceof Error && (
          updateError.message.includes('policy') || 
          updateError.message.includes('42501') ||
          updateError.message.includes('permission')
        )) {
          console.error('🚨 RLS Policy Error: Faculty may not have permission to update quiz attempts')
          console.error('🔧 This requires updating the RLS policy for quiz_attempts table')
          
          toast({
            title: "Permission Error",
            description: "Faculty permission issue detected. Please contact system administrator to update database policies.",
            variant: "destructive",
          })
          return
        }
        
        // Method 2: Direct database update as fallback
        console.log('🔄 Trying direct database update...')
        const { data: directUpdate, error: directError } = await supabase
          .from('quiz_attempts')
          .update({ 
            score: calculatedTotal,
            status: 'graded'
          })
          .eq('id', attempt.id)
          .select('id, score, status')
        
        if (directError) {
          console.error('❌ Direct update failed:', directError)
          
          // Check if it's an RLS policy error
          if (directError.code === '42501' || directError.message.includes('policy')) {
            console.error('🚨 RLS Policy Error: Faculty cannot update quiz attempts')
            
            toast({
              title: "Permission Denied",
              description: "Faculty cannot update quiz attempts due to database policy restrictions. Please run the RLS policy fix script.",
              variant: "destructive",
            })
            return
          }
          
          throw new Error(`Direct update failed: ${directError.message}`)
        }
        
        console.log('✅ Direct update successful:', directUpdate)
      }
      
      // Verify the update was successful
      console.log('🔍 Verifying update...')
      const { data: verifyUpdate, error: verifyError } = await supabase
        .from('quiz_attempts')
        .select('status, score')
        .eq('id', attempt.id)
        .single()
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError)
        throw new Error(`Verification failed: ${verifyError.message}`)
      }
      
      console.log('✅ Verification - Updated attempt:', verifyUpdate)
      
      if (verifyUpdate?.status === 'graded' && verifyUpdate?.score === calculatedTotal) {
        toast({
          title: "🎉 Success!",
          description: `Quiz attempt updated successfully! Score: ${calculatedTotal} points, Status: Graded`,
        })
        
        // Reload score breakdown to reflect the update
        console.log('🔄 Reloading score breakdown...')
        const updatedBreakdown = await getScoreBreakdown(attempt.id)
        setScoreBreakdown(updatedBreakdown)
        
        // Notify parent that grading is complete
        onGradingComplete()
      } else {
        console.error('❌ Update verification failed:', {
          expectedStatus: 'graded',
          actualStatus: verifyUpdate?.status,
          expectedScore: calculatedTotal,
          actualScore: verifyUpdate?.score
        })
        throw new Error(`Update verification failed. Expected: status='graded', score=${calculatedTotal}. Got: status='${verifyUpdate?.status}', score=${verifyUpdate?.score}`)
      }
    } catch (error) {
      console.error('❌ Error updating quiz attempt score:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      toast({
        title: "Update Failed",
        description: `Failed to update quiz attempt: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setGrading(false)
    }
  }

  const getQuestionStatus = (questionId: string) => {
    const grade = grades.find(g => g.question_id === questionId)
    return grade ? 'graded' : 'ungraded'
  }

  const getTotalGradedQuestions = () => {
    return grades.length
  }

  const getTotalPossiblePoints = () => {
    if (!questions || questions.length === 0) return 0
    return questions.reduce((total, q) => {
      const points = q.points || 0
      return total + points
    }, 0)
  }

  const getCurrentGradedPoints = () => {
    if (!grades || grades.length === 0) return 0
    return grades.reduce((total, g) => {
      const points = g.points_awarded || 0
      return total + points
    }, 0)
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading grading data...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manual Grading - {attempt.profiles?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Breakdown */}
          {scoreBreakdown && !scoreBreakdown.error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Score Breakdown</CardTitle>
                <p className="text-sm text-gray-600">Shows how auto-graded and manual grades combine</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{scoreBreakdown.scoreBreakdown?.autoGradedPoints || 0}</p>
                    <p className="text-sm text-gray-600">Auto-Graded</p>
                    <p className="text-xs text-gray-500">MC/True-False</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{scoreBreakdown.scoreBreakdown?.manualGradedPoints || 0}</p>
                    <p className="text-sm text-gray-600">Manual Grades</p>
                    <p className="text-xs text-gray-500">Essay/Short Answer</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{scoreBreakdown.scoreBreakdown?.calculatedTotal || 0}</p>
                    <p className="text-sm text-gray-600">Total Score</p>
                    <p className="text-xs text-gray-500">Auto + Manual</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{getTotalPossiblePoints()}</p>
                    <p className="text-sm text-gray-600">Max Possible</p>
                    <p className="text-xs text-gray-500">All Questions</p>
                  </div>
                </div>
                
                {scoreBreakdown.scoreBreakdown?.calculatedTotal > 0 && (
                  <div className="mt-4">
                    {attempt.status === 'graded' && attempt.score === scoreBreakdown.scoreBreakdown?.calculatedTotal ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-green-700 font-medium">
                              ✅ Database Updated: Score = {scoreBreakdown.scoreBreakdown?.calculatedTotal} points, Status = "graded"
                            </p>
                            <p className="text-xs text-green-600">
                              Students can now see their quiz results
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-yellow-700 font-medium">
                              ⚠️ Database Needs Update: Total Score = {scoreBreakdown.scoreBreakdown?.calculatedTotal} points
                            </p>
                            <p className="text-xs text-yellow-600">
                              Current database: score = {attempt.score || 0}, status = "{attempt.status}"
                            </p>
                          </div>
                          <Button
                            onClick={handleUpdateQuizAttemptScore}
                            disabled={grading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            {grading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                Update Database
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grading Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{getTotalGradedQuestions()}</p>
                  <p className="text-sm text-gray-600">Graded</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{questions.length - getTotalGradedQuestions()}</p>
                  <p className="text-sm text-gray-600">Remaining</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{getCurrentGradedPoints()}</p>
                  <p className="text-sm text-gray-600">Manual Points</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{getTotalPossiblePoints()}</p>
                  <p className="text-sm text-gray-600">Total Possible</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Navigation */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Questions ({currentQuestionIndex + 1} of {questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {questions.map((question, index) => {
                    const status = getQuestionStatus(question.id)
                    return (
                      <Button
                        key={question.id}
                        variant={index === currentQuestionIndex ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`relative ${
                          status === 'graded' ? 'bg-green-100 text-green-700 border-green-300' : ''
                        }`}
                      >
                        Q{index + 1}
                        {status === 'graded' && (
                          <CheckCircle className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Question Grading */}
          {currentQuestion && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1}: {currentQuestion.type === 'short_answer' ? 'Short Answer' : 'Essay'}
                  </CardTitle>
                  <Badge variant={getQuestionStatus(currentQuestion.id) === 'graded' ? 'default' : 'secondary'}>
                    {getQuestionStatus(currentQuestion.id) === 'graded' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Graded
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Question</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{currentQuestion.question}</p>
                </div>

                {/* Student Answer */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Student Answer</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="whitespace-pre-wrap">{attempt.answers[currentQuestion.id] || 'No answer provided'}</p>
                  </div>
                </div>

                {/* Grading Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`points-${currentQuestion.id}`}>
                      Points Awarded (Max: {currentQuestion.points})
                    </Label>
                    <Input
                      key={`points-${currentQuestion.id}-${currentQuestion.points}`}
                      id={`points-${currentQuestion.id}`}
                      type="number"
                      min="0"
                      max={currentQuestion.points}
                      value={pointsAwarded[currentQuestion.id] || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        const numValue = value === '' ? undefined : Number(value)
                        
                        console.log('🔍 Points input changed:', {
                          value,
                          numValue,
                          maxPoints: currentQuestion.points
                        })
                        
                        // Update points state first
                        setPointsAwarded(prev => ({
                          ...prev,
                          [currentQuestion.id]: numValue
                        }))
                        
                        // Immediate validation with direct comparison
                        let errorMessage = ''
                        
                        if (numValue === undefined) {
                          errorMessage = 'Please enter points'
                        } else if (numValue < 0) {
                          errorMessage = 'Points cannot be negative'
                        } else if (numValue > currentQuestion.points) {
                          errorMessage = `Points cannot exceed ${currentQuestion.points}`
                        }
                        
                        console.log('🔍 Validation result:', {
                          numValue,
                          maxPoints: currentQuestion.points,
                          exceedsMax: numValue > currentQuestion.points,
                          errorMessage
                        })
                        
                        // Force update validation errors
                        setValidationErrors(prev => {
                          const newErrors = {
                            ...prev,
                            [currentQuestion.id]: errorMessage
                          }
                          console.log('🔍 Updated validation errors:', newErrors)
                          return newErrors
                        })
                      }}
                      className={
                        validationErrors[currentQuestion.id] 
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }
                    />
                    {validationErrors[currentQuestion.id] && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ {validationErrors[currentQuestion.id]}
                      </p>
                    )}
                    {!validationErrors[currentQuestion.id] && pointsAwarded[currentQuestion.id] === undefined && (
                      <p className="text-sm text-gray-500 mt-1">
                        Enter points to enable save button
                      </p>
                    )}
                    {/* Debug info */}
                    <div className="text-xs text-gray-400 mt-1 p-2 bg-gray-100 rounded border-2 border-blue-300">
                      <div><strong>🔍 LIVE DEBUG INFO:</strong></div>
                      <div>Points: {pointsAwarded[currentQuestion.id]}</div>
                      <div>Max Points: {currentQuestion.points}</div>
                      <div>Validation Error: "{validationErrors[currentQuestion.id] || 'None'}"</div>
                      <div>Has Error: {validationErrors[currentQuestion.id] !== '' ? 'YES' : 'NO'}</div>
                      <div>Button Disabled: {grading || !pointsAwarded[currentQuestion.id] || validationErrors[currentQuestion.id] !== '' ? 'YES' : 'NO'}</div>
                      <div>Should Show Red Border: {validationErrors[currentQuestion.id] ? 'YES' : 'NO'}</div>
                      <button 
                        onClick={() => {
                          const points = pointsAwarded[currentQuestion.id]
                          console.log('🧪 Manual validation test:', { points, max: currentQuestion.points })
                          
                          let errorMessage = ''
                          if (points !== undefined) {
                            if (points < 0) {
                              errorMessage = 'Points cannot be negative'
                            } else if (points > currentQuestion.points) {
                              errorMessage = `Points cannot exceed ${currentQuestion.points}`
                            }
                          } else {
                            errorMessage = 'Please enter points'
                          }
                          
                          console.log('🧪 Setting error message:', errorMessage)
                          setValidationErrors(prev => ({ ...prev, [currentQuestion.id]: errorMessage }))
                        }}
                        className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                      >
                        Force Validation
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Question Points</Label>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-center">
                      <span className="font-medium">{currentQuestion.points} points</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`feedback-${currentQuestion.id}`}>Feedback (Optional)</Label>
                  <Textarea
                    id={`feedback-${currentQuestion.id}`}
                    placeholder="Provide feedback for the student..."
                    value={feedback[currentQuestion.id] || ''}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value
                    }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGradeQuestion(currentQuestion.id)}
                    disabled={(() => {
                      const points = pointsAwarded[currentQuestion.id]
                      const error = validationErrors[currentQuestion.id]
                      const isDisabled = grading || !points || error !== ''
                      
                      console.log('🔍 Button disabled check:', {
                        points,
                        error,
                        grading,
                        isDisabled,
                        reasons: {
                          grading,
                          noPoints: !points,
                          hasError: error !== ''
                        }
                      })
                      
                      return isDisabled
                    })()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {grading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Grading...
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Save Grade
                      </>
                    )}
                  </Button>
                  
                  {getQuestionStatus(currentQuestion.id) === 'graded' && (
                    <Button variant="outline" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Graded
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Automatic Finalization Info */}
          {questions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Grading Progress</h3>
                    <p className="text-sm text-gray-600">
                      {getTotalGradedQuestions()} of {questions.length} questions graded
                    </p>
                    {getTotalGradedQuestions() === questions.length ? (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ All questions graded! Quiz is automatically finalized and students can see their results.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-blue-600 mt-1">
                          ⏳ Grade remaining questions to automatically finalize this quiz.
                        </p>
                        <p className="text-sm text-amber-600 mt-1">
                          ⚠️ Ungraded questions will receive 0 points.
                        </p>
                      </>
                    )}
                  </div>
                  {getTotalGradedQuestions() < questions.length && (
                    <Button
                      onClick={handleFinalizeGrading}
                      disabled={grading || questions.length === 0}
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      {grading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Finalize Early (Optional)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {questions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions to Grade</h3>
                <p className="text-gray-600">
                  This quiz attempt doesn't have any short answer or essay questions that need manual grading.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
