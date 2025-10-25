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

interface Question {
  id: string
  type: "multiple_choice" | "true_false" | "short_answer" | "essay"
  question: string
  options?: string[]
  points: number
}

interface Quiz {
  id: string
  title: string
  description: string
  course: string
  questions: Question[]
  timeLimit: number
  totalPoints: number
  showResults: boolean
}

interface QuizAttempt {
  answers: Record<string, string>
  timeRemaining: number
  currentQuestion: number
  isSubmitted: boolean
}

export function QuizTaking() {
  // Mock quiz data
  const [quiz] = useState<Quiz>({
    id: "1",
    title: "Programming Fundamentals Quiz",
    description: "Test your understanding of basic programming concepts",
    course: "Computer Science 101",
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "What is the time complexity of binary search in a sorted array?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
        points: 5,
      },
      {
        id: "q2",
        type: "true_false",
        question: "Python is a compiled language.",
        points: 3,
      },
      {
        id: "q3",
        type: "multiple_choice",
        question: "Which data structure follows the Last In First Out (LIFO) principle?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        points: 4,
      },
      {
        id: "q4",
        type: "short_answer",
        question: "What does 'API' stand for?",
        points: 2,
      },
      {
        id: "q5",
        type: "essay",
        question:
          "Explain the difference between procedural and object-oriented programming paradigms. Provide examples.",
        points: 10,
      },
    ],
    timeLimit: 30,
    totalPoints: 24,
    showResults: true,
  })

  const [attempt, setAttempt] = useState<QuizAttempt>({
    answers: {},
    timeRemaining: quiz.timeLimit * 60, // Convert to seconds
    currentQuestion: 0,
    isSubmitted: false,
  })

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())

  // Timer effect
  useEffect(() => {
    if (attempt.timeRemaining > 0 && !attempt.isSubmitted) {
      const timer = setTimeout(() => {
        setAttempt((prev) => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (attempt.timeRemaining === 0 && !attempt.isSubmitted) {
      handleSubmitQuiz()
    }
  }, [attempt.timeRemaining, attempt.isSubmitted])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAttempt((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }))
  }

  const handleNextQuestion = () => {
    if (attempt.currentQuestion < quiz.questions.length - 1) {
      setAttempt((prev) => ({ ...prev, currentQuestion: prev.currentQuestion + 1 }))
    }
  }

  const handlePreviousQuestion = () => {
    if (attempt.currentQuestion > 0) {
      setAttempt((prev) => ({ ...prev, currentQuestion: prev.currentQuestion - 1 }))
    }
  }

  const handleQuestionNavigation = (questionIndex: number) => {
    setAttempt((prev) => ({ ...prev, currentQuestion: questionIndex }))
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

  const handleSubmitQuiz = () => {
    setAttempt((prev) => ({ ...prev, isSubmitted: true }))
    setShowSubmitDialog(false)
    if (quiz.showResults) {
      setShowResults(true)
    }
  }

  const getAnsweredCount = () => {
    return Object.keys(attempt.answers).length
  }

  const currentQuestion = quiz.questions[attempt.currentQuestion]
  const progress = ((attempt.currentQuestion + 1) / quiz.questions.length) * 100

  if (attempt.isSubmitted && showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <p className="text-gray-600">Your responses have been submitted successfully.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">18/24</p>
                <p className="text-sm text-gray-600">Points Earned</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">75%</p>
                <p className="text-sm text-gray-600">Score</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">22m</p>
                <p className="text-sm text-gray-600">Time Spent</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Review</h3>
              {quiz.questions.map((question, index) => (
                <Card key={question.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">
                        Q{index + 1}: {question.question}
                      </h4>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>

                    {question.type === "multiple_choice" && question.options && (
                      <div className="space-y-2 mt-3">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              attempt.answers[question.id] === option
                                ? optIndex === 1 // Mock correct answer
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                : optIndex === 1
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-50"
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                            {attempt.answers[question.id] === option && " (Your answer)"}
                            {optIndex === 1 && " ✓ (Correct)"}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "true_false" && (
                      <div className="mt-3 text-sm">
                        <p>
                          Your answer:{" "}
                          <span className="font-medium">{attempt.answers[question.id] || "Not answered"}</span>
                        </p>
                        <p>
                          Correct answer: <span className="font-medium text-green-600">False</span>
                        </p>
                      </div>
                    )}

                    {(question.type === "short_answer" || question.type === "essay") && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <p className="font-medium mb-1">Your answer:</p>
                        <p>{attempt.answers[question.id] || "Not answered"}</p>
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

  if (attempt.isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Submitted!</CardTitle>
            <p className="text-gray-600">Your responses have been recorded. Results will be available soon.</p>
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
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.course}</p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                attempt.timeRemaining < 300 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">{formatTime(attempt.timeRemaining)}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(true)}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Submit Quiz
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              Progress: {attempt.currentQuestion + 1} of {quiz.questions.length}
            </span>
            <span>{getAnsweredCount()} answered</span>
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                {quiz.questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={attempt.currentQuestion === index ? "default" : "outline"}
                    size="sm"
                    className={`relative ${
                      attempt.answers[quiz.questions[index].id] ? "border-green-500 bg-green-50 text-green-700" : ""
                    }`}
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
                    Question {attempt.currentQuestion + 1} of {quiz.questions.length}
                  </CardTitle>
                  <Badge variant="outline">{currentQuestion.points} points</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(attempt.currentQuestion)}
                  className={flaggedQuestions.has(attempt.currentQuestion) ? "text-orange-500" : ""}
                >
                  <Flag className="h-4 w-4" />
                  {flaggedQuestions.has(attempt.currentQuestion) ? "Unflag" : "Flag"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>

                {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                  <RadioGroup
                    value={attempt.answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
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
                    value={attempt.answers[currentQuestion.id] || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
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
                    value={attempt.answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    rows={currentQuestion.type === "essay" ? 8 : 3}
                    className="w-full"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={handlePreviousQuestion} disabled={attempt.currentQuestion === 0}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="text-sm text-gray-600">
                  {attempt.answers[currentQuestion.id] ? (
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

                {attempt.currentQuestion === quiz.questions.length - 1 ? (
                  <Button onClick={() => setShowSubmitDialog(true)}>Submit Quiz</Button>
                ) : (
                  <Button onClick={handleNextQuestion}>
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

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Questions answered:</span>
                <span className="font-medium">
                  {getAnsweredCount()} of {quiz.questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time remaining:</span>
                <span className="font-medium">{formatTime(attempt.timeRemaining)}</span>
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
