"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"
import { createClient } from "@/lib/supabase/client"

interface FacultyNotification {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  read: boolean
  student_name?: string
  course_title?: string
  activity_type?: string
}

export function useFacultyNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<FacultyNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id && user.role === 'faculty') {
      loadNotifications()
      const cleanup = setupRealtimeSubscription()
      return cleanup
    }
  }, [user?.id, user?.role])

  const loadNotifications = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (error) {
      console.error("Error loading faculty notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to new notifications
    const notificationSubscription = supabase
      .channel("faculty-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New faculty notification:", payload.new)
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Notification updated:", payload.new)
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          )
          setUnreadCount(prev => 
            prev - (payload.old.read ? 0 : 1) + (payload.new.read ? 0 : 1)
          )
        }
      )
      .subscribe()

    return () => {
      notificationSubscription.unsubscribe()
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user?.id)
        .eq("read", false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) throw error

      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getNotificationsByType = (type: string) => {
    return notifications.filter(n => n.type === type)
  }

  const getRecentActivities = (limit: number = 10) => {
    return notifications
      .filter(n => n.type === 'assignment' || n.type === 'quiz' || n.type === 'activity')
      .slice(0, limit)
  }

  const getStudentActivitySummary = () => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const todayActivities = notifications.filter(n => {
      const notificationDate = new Date(n.created_at)
      return notificationDate >= todayStart && notificationDate < todayEnd
    })

    return {
      total: notifications.length,
      unread: unreadCount,
      today: todayActivities.length,
      assignments: getNotificationsByType('assignment').length,
      quizzes: getNotificationsByType('quiz').length,
      enrollments: getNotificationsByType('enrollment').length,
      activities: getNotificationsByType('activity').length
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    getRecentActivities,
    getStudentActivitySummary
  }
}

/**
 * Hook for tracking specific student activities
 */
export function useStudentActivityTracking() {
  const { user } = useAuth()
  const [studentActivities, setStudentActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id && user.role === 'faculty') {
      loadStudentActivities()
    }
  }, [user?.id, user?.role])

  const loadStudentActivities = async () => {
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
        setStudentActivities([])
        return
      }

      const courseIds = courses.map(c => c.id)

      // Get recent student activities across all courses
      const { data: activities, error } = await supabase
        .from("student_activities")
        .select(`
          *,
          profiles!inner(full_name),
          courses!inner(title)
        `)
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      setStudentActivities(activities || [])
    } catch (error) {
      console.error("Error loading student activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const trackActivity = async (
    studentId: string,
    courseId: string,
    activityType: string,
    details?: any
  ) => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("student_activities")
        .insert({
          student_id: studentId,
          course_id: courseId,
          activity_type: activityType,
          details: details,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error tracking student activity:", error)
      return null
    }
  }

  return {
    studentActivities,
    loading,
    loadStudentActivities,
    trackActivity
  }
}
