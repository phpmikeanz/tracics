import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { 
  getUserNotifications,
  getUnreadNotificationsCount
} from "@/lib/notifications"

export function useSimpleNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadNotifications = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Get all notifications without filtering
      const allNotifications = await getUserNotifications(user.id)
      setNotifications(allNotifications || [])
      
      // Get unread count
      const unreadCount = await getUnreadNotificationsCount(user.id)
      setUnreadCount(unreadCount || 0)
      
      console.log(`📊 Loaded ${allNotifications?.length || 0} notifications (${unreadCount || 0} unread)`)
    } catch (error) {
      console.error("Error in loadNotifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadNotifications()
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [user?.id, user?.role])

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications
  }
}
