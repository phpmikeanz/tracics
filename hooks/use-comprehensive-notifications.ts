import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { 
  getUserNotifications,
  getUnreadNotificationsCount
} from "@/lib/notifications"
import { cleanupAllSampleData, getOnlyRealNotifications } from "@/lib/cleanup-all-sample-data"

export function useComprehensiveNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadNotifications = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // First clean up any sample data
      await cleanupAllSampleData(user.id)
      
      // Then get only real notifications
      const result = await getOnlyRealNotifications(user.id)
      
      if (result.success) {
        setNotifications(result.notifications || [])
        
        // Get accurate unread count
        const unreadCount = await getUnreadNotificationsCount(user.id)
        setUnreadCount(unreadCount || 0)
        
        console.log(`📊 Loaded ${result.notifications?.length || 0} real notifications (${unreadCount || 0} unread)`)
      } else {
        console.error("Error loading real notifications:", result.error)
      }
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
