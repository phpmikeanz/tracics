"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Clock, Search, UserMinus, Users, Loader2, Eye } from "lucide-react"
import { getCoursesByInstructor } from "@/lib/courses"
import { getEnrollmentsByCourse, updateEnrollmentStatus, getEnrollmentsForInstructor } from "@/lib/enrollments"
import type { Database } from "@/lib/types"

type EnrollmentWithDetails = Database["public"]["Tables"]["enrollments"]["Row"] & {
  profiles: { full_name: string; email: string; avatar_url: string | null } | null
  courses: { title: string; course_code: string } | null
}

export function EnrollmentManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([])

  // Load enrollment requests for instructor's courses
  useEffect(() => {
    if (user?.id) {
      loadEnrollments()
    }
  }, [user?.id])

  const loadEnrollments = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      // Get all enrollments for instructor's courses using optimized function
      const allEnrollments = await getEnrollmentsForInstructor(user.id)
      setEnrollments(allEnrollments)
    } catch (error) {
      console.error('Error loading enrollments:', error)
      toast({
        title: "Error",
        description: "Failed to load enrollment requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter enrollments based on search term
  const filteredEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.courses?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.courses?.course_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const pendingRequests = filteredEnrollments.filter((r) => r.status === "pending")
  const approvedRequests = filteredEnrollments.filter((r) => r.status === "approved")
  const declinedRequests = filteredEnrollments.filter((r) => r.status === "declined")

  const handleApprove = async (enrollmentId: string, studentName: string, courseName: string) => {
    try {
      setProcessing(enrollmentId)
      await updateEnrollmentStatus(enrollmentId, "approved")
      
      // Update local state
      setEnrollments(prev => 
        prev.map(enrollment => 
          enrollment.id === enrollmentId 
            ? { ...enrollment, status: "approved" } 
            : enrollment
        )
      )
      
      toast({
        title: "Approved",
        description: `Approved enrollment for ${studentName} in ${courseName}`,
      })
    } catch (error) {
      console.error('Error approving enrollment:', error)
      toast({
        title: "Error",
        description: "Failed to approve enrollment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleDecline = async (enrollmentId: string, studentName: string, courseName: string) => {
    try {
      setProcessing(enrollmentId)
      await updateEnrollmentStatus(enrollmentId, "declined")
      
      // Update local state
      setEnrollments(prev => 
        prev.map(enrollment => 
          enrollment.id === enrollmentId 
            ? { ...enrollment, status: "declined" } 
            : enrollment
        )
      )
      
      toast({
        title: "Declined",
        description: `Declined enrollment for ${studentName} in ${courseName}`,
      })
    } catch (error) {
      console.error('Error declining enrollment:', error)
      toast({
        title: "Error",
        description: "Failed to decline enrollment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleRemoveStudent = async (enrollmentId: string, studentName: string, courseName: string) => {
    if (confirm(`Are you sure you want to remove ${studentName} from ${courseName}?`)) {
      try {
        setProcessing(enrollmentId)
        await updateEnrollmentStatus(enrollmentId, "declined")
        
        // Remove from local state
        setEnrollments(prev => prev.filter(enrollment => enrollment.id !== enrollmentId))
        
        toast({
          title: "Student Removed",
          description: `Removed ${studentName} from ${courseName}`,
        })
      } catch (error) {
        console.error('Error removing student:', error)
        toast({
          title: "Error",
          description: "Failed to remove student. Please try again.",
          variant: "destructive",
        })
      } finally {
        setProcessing(null)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to manage enrollments.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading enrollment requests...</span>
      </div>
    )
  }

  const RequestCard = ({ enrollment, showActions = false }: { enrollment: EnrollmentWithDetails; showActions?: boolean }) => (
    <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={enrollment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(enrollment.profiles?.full_name || 'Student')}&background=random&color=fff&size=128`} 
                alt={enrollment.profiles?.full_name || "Student"}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {enrollment.profiles?.full_name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{enrollment.profiles?.full_name || "Unknown Student"}</h3>
                <Badge
                  variant={
                    enrollment.status === "approved"
                      ? "default"
                      : enrollment.status === "declined"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {enrollment.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Student ID: {enrollment.student_id}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{enrollment.courses?.title || "Unknown Course"}</span>
                <span>({enrollment.courses?.course_code || "N/A"})</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>Requested: {formatDate(enrollment.created_at)}</span>
                {enrollment.updated_at !== enrollment.created_at && <span>Updated: {formatDate(enrollment.updated_at)}</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Navigate to student profile or details
                console.log('View student details:', enrollment.profiles?.full_name)
                // You can add navigation logic here
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {showActions && enrollment.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(enrollment.id, enrollment.profiles?.full_name || "Student", enrollment.courses?.title || "Course")}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={processing === enrollment.id}
                >
                  {processing === enrollment.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDecline(enrollment.id, enrollment.profiles?.full_name || "Student", enrollment.courses?.title || "Course")}
                  disabled={processing === enrollment.id}
                >
                  {processing === enrollment.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Decline
                </Button>
              </>
            )}
          </div>

          {enrollment.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleRemoveStudent(enrollment.id, enrollment.profiles?.full_name || "Student", enrollment.courses?.title || "Course")
              }
              className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={processing === enrollment.id}
            >
              {processing === enrollment.id ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-1" />
              )}
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Enrollment Management</h2>
          <p className="text-muted-foreground">Review and manage student enrollment requests</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{pendingRequests.length}</span>
              <span className="text-muted-foreground">pending</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="font-medium">{approvedRequests.length}</span>
              <span className="text-muted-foreground">enrolled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students, courses, or emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Enrolled ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Declined ({declinedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground text-center">All enrollment requests have been processed.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((enrollment) => (
                <RequestCard key={enrollment.id} enrollment={enrollment} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Enrolled Students</h3>
                <p className="text-muted-foreground text-center">No students have been approved for enrollment yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedRequests.map((enrollment) => (
                <RequestCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-4">
          {declinedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Declined Requests</h3>
                <p className="text-muted-foreground text-center">No enrollment requests have been declined.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {declinedRequests.map((enrollment) => (
                <RequestCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
