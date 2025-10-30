"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  title: string
  message: string
  type: "assignment" | "grade" | "announcement" | "quiz" | "general" | "enrollment" | "activity"
  read: boolean
  createdAt: Date
  courseId?: string
  courseName?: string
  userId?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Real database notifications - no mock data

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Clear any localStorage dummy data
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ttrac-demo-notifications")
      localStorage.removeItem("ttrac-notifications")
      localStorage.removeItem("notifications")
    }
  }, [])

  // Load real notifications from database when user logs in
  useEffect(() => {
    if (user?.id) {
      loadRealNotifications()
    } else if (!user) {
      setNotifications([])
    }
  }, [user?.id])

  const loadRealNotifications = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Error loading real notifications:", error)
        return
      }

      // Convert database notifications to the expected format
      const realNotifications: Notification[] = (data || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type as "assignment" | "grade" | "announcement" | "quiz" | "enrollment" | "activity",
        read: notification.read,
        createdAt: new Date(notification.created_at),
        courseId: "", // Will be populated from course data if needed
        courseName: "" // Will be populated from course data if needed
      }))

      setNotifications(realNotifications)
    } catch (error) {
      console.error("Error loading real notifications:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date(),
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export const useNotification = useNotifications
