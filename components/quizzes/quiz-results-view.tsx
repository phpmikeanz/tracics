"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, User, MessageSquare, Award, Eye } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"
import { getQuizQuestions, getQuestionGrades } from "@/lib/quizzes"
import type { Database } from "@/lib/types"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  courses?: { title: string; course_code: string } | null
}

type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"]

type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"]

type QuizQuestionGrade = Database["public"]["Tables"]["quiz_question_grades"]["Row"]

interface QuizResultsViewProps {
  quiz: Quiz
  attempt: QuizAttempt
  onClose: () => void
}

export function QuizResultsView({ quiz, attempt, onClose }: QuizResultsViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [manualGrades, setManualGrades] = useState<QuizQuestionGrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuizData()
  }, [quiz.id, attempt.id])

  const loadQuizData = async () => {
    try {
      setLoading(true)
      
      // Load questions and grades in parallel
      const [questionsData, gradesData] = await Promise.all([
        getQuizQuestions(quiz.id),
        getQuestionGrades(attempt.id)
      ])
      
      setQuestions(questionsData)
      setManualGrades(gradesData)
    } catch (error) {
      console.error('Error loading quiz data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStudentAnswer = (questionId: string) => {
    return attempt.answers[questionId] || null
  }

  const getQuestionGrade = (questionId: string) => {
    return manualGrades.find(grade => grade.question_id === questionId)
  }

  const getPointsEarned = (question: QuizQuestion) => {
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      // Auto-graded
      const studentAnswer = getStudentAnswer(question.id)
      return studentAnswer === question.correct_answer ? question.points : 0
    } else {
      // Manually graded
      const grade = getQuestionGrade(question.id)
      return grade?.points_awarded || 0
    }
  }

  const getTotalPointsEarned = () => {
    return questions.reduce((total, question) => total + getPointsEarned(question), 0)
  }

  const getTotalPoints = () => {
    return questions.reduce((total, question) => total + question.points, 0)
  }

  const getAnsweredCount = () => {
    return questions.filter(question => getStudentAnswer(question.id)).length
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="h-8 w-8 animate-spin mr-2" />
        <span>Loading quiz results...</span>
      </div>
    )
  }

  const percentage = getTotalPoints() > 0 ? Math.round((getTotalPointsEarned() / getTotalPoints()) * 100) : 0
  const gradeColors = getGradeColor(percentage)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className={`h-16 w-16 ${gradeColors.icon}`} />
          </div>
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
          <p className="text-gray-600">Here are your detailed results and feedback:</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{quiz.title}</h3>
            <p className="text-gray-600 mb-2">{quiz.courses?.title} ({quiz.courses?.course_code})</p>
            {quiz.description && (
              <p className="text-sm text-gray-500">{quiz.description}</p>
            )}
            {attempt.completed_at && (
              <p className="text-sm text-gray-500 mt-2">
                Completed: {safeFormatDate(attempt.completed_at, "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>

          {/* Score Summary */}
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

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Question Review
            </h3>
            {questions.map((question, index) => {
              const studentAnswer = getStudentAnswer(question.id)
              const grade = getQuestionGrade(question.id)
              const pointsEarned = getPointsEarned(question)
              const isCorrect = pointsEarned === question.points

              return (
                <Card key={question.id} className={`border-l-4 ${
                  isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-lg">
                        Question {index + 1}: {question.question}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={isCorrect ? "default" : "secondary"}>
                          {pointsEarned}/{question.points} pts
                        </Badge>
                        {question.type === 'short_answer' || question.type === 'essay' ? (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                    </div>

                    {/* Multiple Choice Questions */}
                    {question.type === "multiple_choice" && question.options && (
                      <div className="space-y-2 mt-3">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded text-sm ${
                              studentAnswer === option
                                ? option === question.correct_answer
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                                : option === question.correct_answer
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                              <span>{option}</span>
                              {studentAnswer === option && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  Your answer
                                </Badge>
                              )}
                              {option === question.correct_answer && (
                                <Badge variant="default" className="text-xs ml-2">
                                  ✓ Correct
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False Questions */}
                    {question.type === "true_false" && (
                      <div className="mt-3 space-y-2">
                        <div className="p-3 bg-gray-50 rounded text-sm">
                          <p className="font-medium mb-1">Your answer:</p>
                          <p className={`font-semibold ${
                            studentAnswer === question.correct_answer ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {studentAnswer || "Not answered"}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded text-sm">
                          <p className="font-medium mb-1">Correct answer:</p>
                          <p className="font-semibold text-green-700">{question.correct_answer}</p>
                        </div>
                      </div>
                    )}

                    {/* Short Answer and Essay Questions */}
                    {(question.type === "short_answer" || question.type === "essay") && (
                      <div className="mt-3 space-y-3">
                        {/* Student's Answer */}
                        <div className="p-3 bg-gray-50 rounded text-sm">
                          <p className="font-medium mb-1 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Your answer:
                          </p>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {studentAnswer || "Not answered"}
                          </p>
                        </div>
                        
                        {/* Faculty Feedback */}
                        {grade && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-blue-800 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Instructor Feedback:
                              </p>
                              <Badge variant="outline" className="text-blue-600">
                                {grade.points_awarded}/{question.points} points
                              </Badge>
                            </div>
                            {grade.feedback && (
                              <div className="mt-2 p-3 bg-white rounded border">
                                <p className="text-blue-700 whitespace-pre-wrap">{grade.feedback}</p>
                              </div>
                            )}
                            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Graded on {safeFormatDate(grade.graded_at, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        )}

                        {/* No feedback yet */}
                        {!grade && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <p className="text-yellow-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              This question is pending manual grading by your instructor.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="text-center pt-4">
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              Close Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

