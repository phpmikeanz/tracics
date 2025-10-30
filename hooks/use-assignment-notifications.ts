"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./use-auth"
import { 
  getAssignmentNotifications, 
  markAssignmentNotificationsAsRead,
  subscribeToAssignmentNotifications,
  type AssignmentNotificationData,
  type SubmissionNotificationData,
  type GradeNotificationData
} from "@/lib/assignment-notifications"

export interface AssignmentNotification {
  id: string
  title: string
  message: string
  type: "assignment" | "grade" | "announcement"
  read: boolean
  created_at: string
}

export function useAssignmentNotifications(assignmentId?: string) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)
    
    try {
      const data = await getAssignmentNotifications(user.id, assignmentId)
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications")
      console.error("Error loading assignment notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, assignmentId])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationId?: string) => {
    if (!user?.id) return

    try {
      if (notificationId) {
        // Mark specific notification as read
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        // Mark all assignment notifications as read
        await markAssignmentNotificationsAsRead(user.id, assignmentId)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Error marking notifications as read:", err)
    }
  }, [user?.id, assignmentId])

  // Handle new notification
  const handleNewNotification = useCallback((notification: AssignmentNotification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.read) {
      setUnreadCount(prev => prev + 1)
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return

    loadNotifications()

    // Set up real-time subscription
    const subscription = subscribeToAssignmentNotifications(user.id, handleNewNotification)

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, loadNotifications, handleNewNotification])

  // Poll for updates every 30 seconds as fallback
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [user?.id, loadNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    refresh: loadNotifications
  }
}

/**
 * Hook for assignment-specific notifications
 */
export function useAssignmentNotificationSync(assignmentId: string) {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)

  // Subscribe to assignment-specific notifications
  useEffect(() => {
    if (!user?.id || !assignmentId) return

    const supabase = require("@/lib/supabase/client").createClient()
    
    const subscription = supabase
      .channel(`assignment-${assignmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 
              ["assignment", "grade", "announcement"].includes(payload.new.type) &&
              (payload.new.title.includes(assignmentId) || payload.new.message.includes(assignmentId))
             ) {
            setLastActivity(new Date())
            console.log("Assignment notification received:", payload.new)
          }
        }
      )
      .subscribe()

    setIsSubscribed(true)

    return () => {
      subscription.unsubscribe()
      setIsSubscribed(false)
    }
  }, [user?.id, assignmentId])

  return {
    isSubscribed,
    lastActivity,
    isActive: isSubscribed && lastActivity && (Date.now() - lastActivity.getTime()) < 60000
  }
}

/**
 * Hook for faculty assignment management notifications
 */
export function useFacultyAssignmentNotifications() {
  const { user } = useAuth()
  const [submissionNotifications, setSubmissionNotifications] = useState<any[]>([])
  const [gradeNotifications, setGradeNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id || user.role !== "faculty") return

    const supabase = require("@/lib/supabase/client").createClient()
    
    // Subscribe to submission notifications
    const submissionSubscription = supabase
      .channel("faculty-submissions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assignment_submissions",
        },
        (payload) => {
          console.log("New submission detected:", payload.new)
          setSubmissionNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    // Subscribe to grade notifications
    const gradeSubscription = supabase
      .channel("faculty-grades")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assignment_submissions",
          filter: "grade=not.is.null",
        },
        (payload) => {
          console.log("Grade update detected:", payload.new)
          setGradeNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      submissionSubscription.unsubscribe()
      gradeSubscription.unsubscribe()
    }
  }, [user?.id, user?.role])

  return {
    submissionNotifications,
    gradeNotifications,
    hasNewSubmissions: submissionNotifications.length > 0,
    hasNewGrades: gradeNotifications.length > 0
  }
}

/**
 * Hook for student assignment notifications
 */
export function useStudentAssignmentNotifications() {
  const { user } = useAuth()
  const [assignmentNotifications, setAssignmentNotifications] = useState<any[]>([])
  const [gradeNotifications, setGradeNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id || user.role !== "student") return

    const supabase = require("@/lib/supabase/client").createClient()
    
    // Subscribe to new assignment notifications
    const assignmentSubscription = supabase
      .channel("student-assignments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assignments",
        },
        (payload) => {
          console.log("New assignment detected:", payload.new)
          setAssignmentNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    // Subscribe to grade notifications
    const gradeSubscription = supabase
      .channel("student-grades")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assignment_submissions",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.grade !== payload.old.grade) {
            console.log("Grade update detected:", payload.new)
            setGradeNotifications(prev => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      assignmentSubscription.unsubscribe()
      gradeSubscription.unsubscribe()
    }
  }, [user?.id, user?.role])

  return {
    assignmentNotifications,
    gradeNotifications,
    hasNewAssignments: assignmentNotifications.length > 0,
    hasNewGrades: gradeNotifications.length > 0
  }
}



















