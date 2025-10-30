"use client"

import { useState } from "react"
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
import { HelpCircle, Plus, Edit, CalendarIcon, Clock, Users, BarChart3, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Question {
  id: string
  type: "multiple_choice" | "true_false" | "short_answer" | "essay"
  question: string
  options?: string[]
  correctAnswer?: string | string[]
  points: number
  explanation?: string
}

interface Quiz {
  id: string
  title: string
  description: string
  course: string
  courseId: string
  questions: Question[]
  timeLimit: number // in minutes
  attempts: number
  dueDate: Date
  status: "draft" | "published" | "closed"
  showResults: boolean
  shuffleQuestions: boolean
  totalPoints: number
  submissions: number
  totalStudents: number
}

interface QuizResult {
  id: string
  studentId: string
  studentName: string
  score: number
  totalPoints: number
  timeSpent: number
  submittedAt: Date
  answers: Record<string, any>
}

export function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      id: "1",
      title: "Programming Fundamentals Quiz",
      description: "Test your understanding of basic programming concepts",
      course: "Computer Science 101",
      courseId: "cs101",
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          question: "What is the time complexity of binary search?",
          options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
          correctAnswer: "O(log n)",
          points: 5,
          explanation: "Binary search divides the search space in half with each comparison.",
        },
        {
          id: "q2",
          type: "true_false",
          question: "Python is a compiled language.",
          correctAnswer: "false",
          points: 3,
          explanation: "Python is an interpreted language, not compiled.",
        },
      ],
      timeLimit: 30,
      attempts: 2,
      dueDate: new Date("2024-01-20"),
      status: "published",
      showResults: true,
      shuffleQuestions: false,
      totalPoints: 8,
      submissions: 38,
      totalStudents: 45,
    },
    {
      id: "2",
      title: "Data Structures Midterm",
      description: "Comprehensive quiz covering arrays, linked lists, and trees",
      course: "Data Structures",
      courseId: "cs250",
      questions: [],
      timeLimit: 60,
      attempts: 1,
      dueDate: new Date("2024-01-25"),
      status: "draft",
      showResults: false,
      shuffleQuestions: true,
      totalPoints: 0,
      submissions: 0,
      totalStudents: 38,
    },
  ])

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: "",
    type: "multiple_choice",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 1,
  })

  // Mock quiz results
  const quizResults: QuizResult[] = [
    {
      id: "1",
      studentId: "s1",
      studentName: "John Doe",
      score: 7,
      totalPoints: 8,
      timeSpent: 25,
      submittedAt: new Date("2024-01-19T14:30:00"),
      answers: { q1: "O(log n)", q2: "false" },
    },
    {
      id: "2",
      studentId: "s2",
      studentName: "Jane Smith",
      score: 8,
      totalPoints: 8,
      timeSpent: 18,
      submittedAt: new Date("2024-01-19T16:45:00"),
      answers: { q1: "O(log n)", q2: "false" },
    },
  ]

  const handleCreateQuiz = (formData: FormData) => {
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      course: formData.get("course") as string,
      courseId: formData.get("course") as string,
      questions: [],
      timeLimit: Number.parseInt(formData.get("timeLimit") as string),
      attempts: Number.parseInt(formData.get("attempts") as string),
      dueDate: selectedDate || new Date(),
      status: "draft",
      showResults: false,
      shuffleQuestions: false,
      totalPoints: 0,
      submissions: 0,
      totalStudents: 45,
    }
    setQuizzes([...quizzes, newQuiz])
    setIsCreateDialogOpen(false)
    setSelectedDate(undefined)
  }

  const handleAddQuestion = (quizId: string, question: Question) => {
    setQuizzes(
      quizzes.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              questions: [...quiz.questions, { ...question, id: Date.now().toString() }],
              totalPoints: quiz.totalPoints + question.points,
            }
          : quiz,
      ),
    )
  }

  const handlePublishQuiz = (quizId: string) => {
    setQuizzes(quizzes.map((q) => (q.id === quizId ? { ...q, status: "published" as const } : q)))
  }

  const getStatusColor = (status: Quiz["status"]) => {
    switch (status) {
      case "published":
        return "bg-green-500"
      case "draft":
        return "bg-yellow-500"
      case "closed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
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
            <form action={handleCreateQuiz} className="space-y-4">
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
                      <SelectItem value="cs101">Computer Science 101</SelectItem>
                      <SelectItem value="cs201">Advanced Programming</SelectItem>
                      <SelectItem value="cs250">Data Structures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={4}>
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
                    </PopoverContent>
                  </Popover>
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Quiz</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <p className="text-sm text-gray-600">{quiz.course}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(quiz.status)}`} />
                  <Badge variant={quiz.status === "published" ? "default" : "secondary"}>{quiz.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{quiz.timeLimit} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  <span>{quiz.questions.length} questions</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Due: {format(quiz.dueDate, "MMM d")}</span>
                </div>
                <span className="font-medium">{quiz.totalPoints} pts</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {quiz.submissions}/{quiz.totalStudents} completed
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${(quiz.submissions / quiz.totalStudents) * 100}%` }}
                />
              </div>

              <div className="flex gap-2">
                {quiz.status === "draft" && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePublishQuiz(quiz.id)}
                    disabled={quiz.questions.length === 0}
                  >
                    Publish
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setSelectedQuiz(quiz)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Manage {/* Updated to Manage */}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quiz Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[100vw] max-w-[100vw] sm:max-w-6xl p-2 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Quiz: {selectedQuiz?.title}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sticky top-0 bg-background z-10">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quiz Questions</h3>
                <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[100vw] max-w-[100vw] sm:max-w-3xl p-3 sm:p-6 max-h-[85vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-none sm:rounded-lg">
                    <DialogHeader>
                      <DialogTitle>Add New Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="question-type">Question Type</Label>
                        <Select
                          value={currentQuestion.type}
                          onValueChange={(value: Question["type"]) =>
                            setCurrentQuestion({ ...currentQuestion, type: value })
                          }
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
                                value={currentQuestion.correctAnswer as string}
                                onValueChange={(value) =>
                                  setCurrentQuestion({ ...currentQuestion, correctAnswer: value })
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
                            value={currentQuestion.correctAnswer as string}
                            onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
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

                      <div className="space-y-2">
                        <Label htmlFor="explanation">Explanation (Optional)</Label>
                        <Textarea
                          id="explanation"
                          value={currentQuestion.explanation || ""}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                          placeholder="Provide an explanation for the correct answer..."
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsAddQuestionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedQuiz) {
                              handleAddQuestion(selectedQuiz.id, currentQuestion)
                              setCurrentQuestion({
                                id: "",
                                type: "multiple_choice",
                                question: "",
                                options: ["", "", "", ""],
                                correctAnswer: "",
                                points: 1,
                              })
                              setIsAddQuestionDialogOpen(false)
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
                {selectedQuiz?.questions.map((question, index) => (
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
                                  className={`p-2 rounded ${option === question.correctAnswer ? "bg-green-50 text-green-800" : "bg-gray-50"}`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {option === question.correctAnswer && " ✓"}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "true_false" && (
                            <div className="text-sm">
                              <span className="font-medium">Correct Answer: </span>
                              <span className="capitalize">{question.correctAnswer}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {selectedQuiz?.questions.length === 0 && (
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
                      <Input id="edit-title" defaultValue={selectedQuiz?.title} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-time-limit">Time Limit (minutes)</Label>
                      <Input id="edit-time-limit" type="number" defaultValue={selectedQuiz?.timeLimit} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" defaultValue={selectedQuiz?.description} rows={3} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-attempts">Max Attempts</Label>
                      <Input id="edit-attempts" type="number" defaultValue={selectedQuiz?.attempts} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quiz Status</Label>
                      <Select defaultValue={selectedQuiz?.status}>
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

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-results">Show Results to Students</Label>
                        <p className="text-sm text-gray-600">Allow students to see their scores and correct answers</p>
                      </div>
                      <Switch id="show-results" defaultChecked={selectedQuiz?.showResults} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="shuffle-questions">Shuffle Questions</Label>
                        <p className="text-sm text-gray-600">Randomize question order for each student</p>
                      </div>
                      <Switch id="shuffle-questions" defaultChecked={selectedQuiz?.shuffleQuestions} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Quiz Results</h3>
                <Button variant="outline" size="sm">
                  Export Results
                </Button>
              </div>

              <div className="space-y-3">
                {quizResults.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{result.studentName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{result.studentName}</p>
                            <p className="text-sm text-gray-600">
                              Submitted: {format(result.submittedAt, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-lg font-semibold">
                                {result.score}/{result.totalPoints}
                              </p>
                              <p className="text-sm text-gray-600">
                                {Math.round((result.score / result.totalPoints) * 100)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Time: {result.timeSpent}m</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold">
                          {selectedQuiz && Math.round((selectedQuiz.submissions / selectedQuiz.totalStudents) * 100)}%
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
                        <p className="text-sm text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold">87%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600">Avg Time</p>
                        <p className="text-2xl font-bold">22m</p>
                      </div>
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
                    {selectedQuiz?.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            Q{index + 1}: {question.question.substring(0, 50)}...
                          </p>
                          <p className="text-sm text-gray-600">{question.points} points</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600">92%</p>
                          <p className="text-sm text-gray-600">correct</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
