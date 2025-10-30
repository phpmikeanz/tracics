"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Award, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Bell,
  Activity,
  Eye
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { syncRealDatabaseNotifications } from "@/lib/sync-real-database-notifications"
import { getUnreadNotificationsCount, getUserNotifications } from "@/lib/notifications"
import { deleteAllDummyData, verifyOnlyRealDataRemains } from "@/lib/cleanup-all-dummy-data"
import { useFacultyNotifications } from "@/hooks/use-faculty-notifications"

interface FacultyActivity {
  id: string
  student_name: string
  student_avatar_url?: string
  activity_type: string
  course_title: string
  assignment_title?: string
  quiz_title?: string
  timestamp: string
  is_late?: boolean
  score?: number
  max_score?: number
  status: 'new' | 'in_progress' | 'completed' | 'late'
}

export function FacultyActivityDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const facultyNotifications = useFacultyNotifications()
  const [activities, setActivities] = useState<FacultyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'assignments' | 'quizzes' | 'enrollments' | 'activities'>('all')
  const [stats, setStats] = useState({
    total: 0,
    assignments: 0,
    quizzes: 0,
    enrollments: 0,
    today: 0,
    late: 0
  })
  const [synchronizedCount, setSynchronizedCount] = useState(0)

  // Load synchronized count to match bell notifications EXACTLY
  const loadSynchronizedCount = async () => {
    if (!user?.id) return
    
    try {
      // Use the EXACT same method as the bell notifications
      const unreadCount = await getUnreadNotificationsCount(user.id)
      setSynchronizedCount(unreadCount)
      console.log("🔔 Faculty Activity Dashboard - Synchronized count (should match bell):", unreadCount)
      
      // Log comparison with faculty hook for debugging
      console.log("🔔 Faculty Activity Dashboard - Faculty hook count:", facultyNotifications.unreadCount)
      console.log("🔔 Faculty Activity Dashboard - Count difference:", unreadCount - (facultyNotifications.unreadCount || 0))
    } catch (error) {
      console.error("Error loading synchronized count:", error)
    }
  }

  useEffect(() => {
    if (user?.id && user.role === 'faculty') {
      loadFacultyActivities()
      loadSynchronizedCount()
      
      // Poll for count updates every 5 seconds to ensure accuracy
      const interval = setInterval(() => {
        loadSynchronizedCount()
      }, 5000)
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [user?.id, user?.role])

  const loadFacultyActivities = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Get all courses taught by this faculty
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("instructor_id", user.id)

      if (coursesError) throw coursesError
      if (!courses || courses.length === 0) {
        setActivities([])
        return
      }

      const courseIds = courses.map(c => c.id)
      const allActivities: FacultyActivity[] = []

      // Get assignment submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("assignment_submissions")
        .select(`
          id,
          submitted_at,
          assignment_id,
          student_id,
          assignments!inner(
            title,
            due_date,
            courses!inner(title)
          ),
          profiles!inner(full_name, avatar_url)
        `)
        .in("assignment_id", 
          await supabase
            .from("assignments")
            .select("id")
            .in("course_id", courseIds)
            .then(({ data }) => data?.map(a => a.id) || [])
        )
        .order("submitted_at", { ascending: false })
        .limit(50)

      if (!submissionsError && submissions) {
        submissions.forEach((submission: any) => {
          const assignment = submission.assignments
          const course = assignment?.courses
          const student = submission.profiles
          
          if (assignment && course && student) {
            const isLate = assignment.due_date && new Date(submission.submitted_at) > new Date(assignment.due_date)
            
            allActivities.push({
              id: `submission-${submission.id}`,
              student_name: student.full_name || "Student",
              student_avatar_url: student.avatar_url,
              activity_type: isLate ? "Late Assignment Submission" : "Assignment Submitted",
              course_title: course.title,
              assignment_title: assignment.title,
              timestamp: submission.submitted_at,
              is_late: isLate,
              status: isLate ? 'late' : 'completed'
            })
          }
        })
      }

      // Get quiz attempts
      const { data: quizAttempts, error: quizAttemptsError } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          started_at,
          completed_at,
          score,
          quizzes!inner(
            title,
            max_score,
            courses!inner(title)
          ),
          profiles!inner(full_name, avatar_url)
        `)
        .in("quiz_id", 
          await supabase
            .from("quizzes")
            .select("id")
            .in("course_id", courseIds)
            .then(({ data }) => data?.map(q => q.id) || [])
        )
        .order("completed_at", { ascending: false })
        .limit(50)

      if (!quizAttemptsError && quizAttempts) {
        quizAttempts.forEach((attempt: any) => {
          const quiz = attempt.quizzes
          const course = quiz?.courses
          const student = attempt.profiles
          
          if (quiz && course && student) {
            allActivities.push({
              id: `quiz-${attempt.id}`,
              student_name: student.full_name || "Student",
              student_avatar_url: student.avatar_url,
              activity_type: "Quiz Completed",
              course_title: course.title,
              quiz_title: quiz.title,
              timestamp: attempt.completed_at || attempt.started_at,
              score: attempt.score,
              max_score: quiz.max_score,
              status: 'completed'
            })
          }
        })
      }

      // Get enrollment activities
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          id,
          created_at,
          updated_at,
          status,
          courses!inner(title),
          profiles!inner(full_name, avatar_url)
        `)
        .in("course_id", courseIds)
        .order("updated_at", { ascending: false })
        .limit(100)

      if (!enrollmentsError && enrollments) {
        enrollments.forEach((enrollment: any) => {
          const course = enrollment.courses
          const student = enrollment.profiles
          
          if (course && student) {
            allActivities.push({
              id: `enrollment-${enrollment.id}`,
              student_name: student.full_name || "Student",
              student_avatar_url: student.avatar_url,
              activity_type: `Enrollment ${enrollment.status === 'approved' ? 'Approved' : 'Requested'}`,
              course_title: course.title,
              timestamp: enrollment.updated_at || enrollment.created_at,
              status: enrollment.status === 'approved' ? 'completed' : 'new'
            })
          }
        })
      }

      // Always merge in bell notifications to ensure parity with the bell
      const notifications = await getUserNotifications(user.id)
      const enrichedFromNotifications: FacultyActivity[] = []
      for (const n of notifications as any[]) {
        const createdAt = n.created_at || n.createdAt
        if (n.type === 'quiz' && n.attempt_id) {
          // Enrich from real quiz attempt to get real student/quiz/course data
          const { data: attempt } = await supabase
            .from('quiz_attempts')
            .select(`
              id,
              completed_at,
              started_at,
              score,
              quizzes!inner(title, max_score, courses!inner(title)),
              profiles!inner(full_name, avatar_url)
            `)
            .eq('id', n.attempt_id)
            .single()

          if (attempt) {
            const a: any = attempt
            enrichedFromNotifications.push({
              id: `notif-${n.id}`,
              student_name: a.profiles?.full_name || 'Student',
              student_avatar_url: a.profiles?.avatar_url,
              activity_type: 'Quiz Completed',
              course_title: a.quizzes?.courses?.title || 'Course',
              quiz_title: a.quizzes?.title,
              timestamp: a.completed_at || a.started_at || createdAt,
              score: a.score,
              max_score: a.quizzes?.max_score,
              status: 'completed'
            })
            continue
          }
        }

        const enrollmentType = (n.type === 'enrollment')
          ? (typeof n.message === 'string' && n.message.toLowerCase().includes('approved')
              ? 'Enrollment Approved'
              : (typeof n.message === 'string' && (n.message.toLowerCase().includes('request') || n.message.toLowerCase().includes('requested'))
                  ? 'Enrollment Requested'
                  : 'Enrollment'))
          : undefined

        enrichedFromNotifications.push({
          id: `notif-${n.id}`,
          student_name: n.title || 'Notification',
          activity_type: (n.type === 'quiz') ? 'Quiz Completed' :
                         (n.type === 'assignment') ? 'Assignment Submitted' :
                         (n.type === 'enrollment') ? (enrollmentType as string) : 'Activity',
          course_title: n.course_title || n.courseName || 'Course',
          timestamp: createdAt,
          status: 'completed'
        } as FacultyActivity)
      }
      allActivities.push(...enrichedFromNotifications)

      // De-duplicate by id to avoid double counting
      const uniqueById = new Map<string, FacultyActivity>()
      for (const act of allActivities) {
        uniqueById.set(act.id, act)
      }
      const mergedActivities = Array.from(uniqueById.values())

      // Sort activities by timestamp (most recent first)
      mergedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      // Calculate statistics
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      
      const todayActivities = mergedActivities.filter(a => {
        const activityDate = new Date(a.timestamp)
        return activityDate >= todayStart && activityDate < todayEnd
      })
      
      const stats = {
        total: mergedActivities.length,
        assignments: mergedActivities.filter(a => a.activity_type.includes("Assignment")).length,
        quizzes: mergedActivities.filter(a => a.activity_type.includes("Quiz")).length,
        enrollments: mergedActivities.filter(a => a.activity_type.includes("Enrollment")).length,
        today: todayActivities.length,
        late: mergedActivities.filter(a => a.is_late).length
      }
      
      setStats(stats)
      setActivities(mergedActivities.slice(0, 100)) // Limit to 100 most recent activities
    } catch (error) {
      console.error("Error loading faculty activities:", error)
      toast({
        title: "Error",
        description: "Failed to load student activities. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (activityType: string) => {
    if (activityType.includes("Assignment")) return <BookOpen className="h-4 w-4" />
    if (activityType.includes("Quiz")) return <Calendar className="h-4 w-4" />
    if (activityType.includes("Enrollment")) return <Users className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const getActivityColor = (activityType: string, status: string) => {
    if (status === 'late') return "destructive"
    if (activityType.includes("Assignment")) return "default"
    if (activityType.includes("Quiz")) return "secondary"
    if (activityType.includes("Enrollment")) return "outline"
    return "default"
  }

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    if (filter === 'assignments') return activity.activity_type.includes("Assignment")
    if (filter === 'quizzes') return activity.activity_type.includes("Quiz")
    if (filter === 'enrollments') return activity.activity_type.includes("Enrollment")
    if (filter === 'activities') return !activity.activity_type.includes("Assignment") && 
                                      !activity.activity_type.includes("Quiz") && 
                                      !activity.activity_type.includes("Enrollment")
    return true
  })

  if (!user || user.role !== 'faculty') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">This dashboard is only available for faculty members.</p>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-5 w-5" />
              <span className="truncate">Student Activity Notifications</span>
            </CardTitle>
            {synchronizedCount > 0 && (
              <Badge 
                variant="destructive" 
                className="bg-red-500 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold animate-pulse"
              >
                {synchronizedCount} New
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              await loadFacultyActivities()
              await loadSynchronizedCount()
              console.log("🔄 Force refreshed all data")
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} sm:mr-2`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-600">Total Activities</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-600">Assignment Submissions</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.assignments}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">📚</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-600">Quiz Completions</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.quizzes}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-600">Enrollment Requests</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-700">{stats.enrollments}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-semibold text-sm">👥</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Notifications</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-700">{synchronizedCount}</p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-600">Late Submissions</p>
                <p className="text-xl sm:text-2xl font-bold text-red-700">{stats.late || 0}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold text-sm">⚠️</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-600">Today's Activities</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.today}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-600">Unread</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">{synchronizedCount}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">🔔</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            <TabsTrigger value="all" className="text-xs sm:text-sm py-2">All</TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs sm:text-sm py-2">Assignments</TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs sm:text-sm py-2">Quizzes</TabsTrigger>
            <TabsTrigger value="enrollments" className="text-xs sm:text-sm py-2">Enrollments</TabsTrigger>
            <TabsTrigger value="activities" className="text-xs sm:text-sm py-2">Activities</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-4">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading activities...
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No student activities found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={activity.student_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.student_name)}&background=random&color=fff&size=128`} 
                            alt={activity.student_name}
                          />
                          <AvatarFallback className="text-xs">
                            {activity.student_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Title row: mimic notification bell style */}
                        {activity.activity_type.includes('Quiz') ? (
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Quiz Completed</span>
                            <Badge variant="secondary" className="text-[10px] uppercase">quiz</Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm truncate max-w-[60vw] sm:max-w-none">{activity.student_name}</span>
                            <Badge variant={getActivityColor(activity.activity_type, activity.status)}>
                              {activity.activity_type}
                            </Badge>
                            {activity.is_late && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Late
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Details line */}
                        {activity.activity_type.includes('Quiz') ? (
                          <p className="text-sm text-muted-foreground mb-1 truncate">
                            {activity.student_name} • {activity.quiz_title || 'Quiz'}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mb-1 truncate">
                            {activity.assignment_title && `Assignment: ${activity.assignment_title}`}
                            {activity.quiz_title && `Quiz: ${activity.quiz_title}`}
                          </p>
                        )}

                        {/* Date/time */}
                        <p className="text-xs text-muted-foreground">
                          {activity.course_title} • {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        {activity.score !== undefined && activity.max_score !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Score: {activity.score}/{activity.max_score} ({Math.round((activity.score / activity.max_score) * 100)}%)
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-colors w-full sm:w-auto"
                          onClick={() => {
                            // Navigate based on activity type
                            if (activity.activity_type.includes('Assignment')) {
                              // You can add navigation logic here
                              console.log('Navigate to assignment:', activity.assignment_title)
                            } else if (activity.activity_type.includes('Quiz')) {
                              // You can add navigation logic here
                              console.log('Navigate to quiz:', activity.quiz_title)
                            } else if (activity.activity_type.includes('Enrollment')) {
                              // You can add navigation logic here
                              console.log('Navigate to enrollment management')
                            } else {
                              // You can add navigation logic here
                              console.log('Navigate to activities')
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
