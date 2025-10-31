import { createClient } from "@/lib/supabase/client"

/**
 * Check and display actual notifications from Supabase database
 */
export async function checkDatabaseNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Checking database notifications for user:", userId)
    
    // Get all notifications for the user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return {
        success: false,
        error: error.message,
        notifications: [],
        count: 0
      }
    }
    
    console.log("✅ Database notifications found:", notifications?.length || 0)
    console.log("📋 All notifications:", notifications)
    
    // Get unread count
    const unreadCount = notifications?.filter(n => !n.read).length || 0
    console.log("🔔 Unread notifications:", unreadCount)
    
    return {
      success: true,
      notifications: notifications || [],
      count: notifications?.length || 0,
      unreadCount: unreadCount
    }
  } catch (error) {
    console.error("❌ Unexpected error checking notifications:", error)
    return {
      success: false,
      error: "Unexpected error",
      notifications: [],
      count: 0
    }
  }
}

/**
 * Create a real notification in the database for testing
 */
export async function createRealNotification(userId: string, title: string, message: string, type: string = "assignment") {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating real notification for user:", userId)
    
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: title,
        message: message,
        type: type,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("❌ Error creating notification:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Real notification created:", data)
    return { success: true, notification: data }
  } catch (error) {
    console.error("❌ Unexpected error creating notification:", error)
    return { success: false, error: "Unexpected error" }
  }
}

/**
 * Get notification statistics from database
 */
export async function getNotificationStats(userId: string) {
  try {
    const supabase = createClient()
    
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
    
    if (totalError) {
      console.error("Error getting total count:", totalError)
      return null
    }
    
    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
    
    if (unreadError) {
      console.error("Error getting unread count:", unreadError)
      return null
    }
    
    // Get notifications by type
    const { data: typeStats, error: typeError } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
    
    if (typeError) {
      console.error("Error getting type stats:", typeError)
      return null
    }
    
    const typeCounts = typeStats?.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    console.log("📊 Notification stats:", {
      total: totalCount,
      unread: unreadCount,
      byType: typeCounts
    })
    
    return {
      total: totalCount || 0,
      unread: unreadCount || 0,
      byType: typeCounts
    }
  } catch (error) {
    console.error("Error getting notification stats:", error)
    return null
  }
}

/**
 * Test the complete notification flow
 */
export async function testNotificationFlow(userId: string) {
  console.log("🧪 Testing complete notification flow for user:", userId)
  
  // 1. Check current notifications
  const currentNotifications = await checkDatabaseNotifications(userId)
  console.log("1. Current notifications:", currentNotifications)
  
  // 2. Create a test notification
  const testNotification = await createRealNotification(
    userId,
    "🧪 Test Notification",
    "This is a test notification created to verify the system is working properly.",
    "assignment"
  )
  console.log("2. Test notification created:", testNotification)
  
  // 3. Check notifications again
  const updatedNotifications = await checkDatabaseNotifications(userId)
  console.log("3. Updated notifications:", updatedNotifications)
  
  // 4. Get statistics
  const stats = await getNotificationStats(userId)
  console.log("4. Notification statistics:", stats)
  
  return {
    currentNotifications,
    testNotification,
    updatedNotifications,
    stats
  }
}




















