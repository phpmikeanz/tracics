import { createClient } from "@/lib/supabase/client"

/**
 * Debug the notification bell to see what data is actually being loaded
 */
export async function debugNotificationBell(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Debugging notification bell for user:", userId)
    
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .single()
    
    if (userError) {
      console.error("❌ User not found:", userError)
      return { success: false, error: "User not found" }
    }
    
    console.log("✅ User found:", userData)
    
    // Check notifications table
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (notificationsError) {
      console.error("❌ Error fetching notifications:", notificationsError)
      return { success: false, error: notificationsError.message }
    }
    
    console.log("📊 Notifications found:", notifications?.length || 0)
    console.log("📋 All notifications:", notifications)
    
    // Check unread count
    const unreadCount = notifications?.filter(n => !n.read).length || 0
    console.log("🔔 Unread notifications:", unreadCount)
    
    // Check if notifications are recent
    const recentNotifications = notifications?.filter(n => {
      const createdAt = new Date(n.created_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return createdAt > oneDayAgo
    }) || []
    
    console.log("⏰ Recent notifications (last 24h):", recentNotifications.length)
    
    // Check notification types
    const typeCounts = notifications?.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    console.log("📈 Notification types:", typeCounts)
    
    return {
      success: true,
      user: userData,
      notifications: notifications || [],
      unreadCount,
      recentCount: recentNotifications.length,
      typeCounts
    }
    
  } catch (error) {
    console.error("❌ Error debugging notification bell:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a real notification to test the system
 */
export async function createRealNotificationForTesting(userId: string, title: string, message: string, type: string = "assignment") {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating real notification for testing...")
    
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
    console.error("❌ Error creating notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if there are any dummy notifications in the database
 */
export async function checkForDummyNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Checking for dummy notifications...")
    
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("❌ Error checking notifications:", error)
      return { success: false, error: error.message }
    }
    
    // Check for common dummy patterns
    const dummyPatterns = [
      "test",
      "dummy",
      "sample",
      "example",
      "demo",
      "mock"
    ]
    
    const dummyNotifications = notifications?.filter(n => 
      dummyPatterns.some(pattern => 
        n.title.toLowerCase().includes(pattern) || 
        n.message.toLowerCase().includes(pattern)
      )
    ) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    console.log("📋 Dummy notifications:", dummyNotifications)
    
    // Check for very old notifications (might be test data)
    const oldNotifications = notifications?.filter(n => {
      const createdAt = new Date(n.created_at)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return createdAt < oneWeekAgo
    }) || []
    
    console.log("📅 Old notifications (older than 1 week):", oldNotifications.length)
    
    return {
      success: true,
      totalNotifications: notifications?.length || 0,
      dummyNotifications: dummyNotifications.length,
      oldNotifications: oldNotifications.length,
      dummyList: dummyNotifications,
      oldList: oldNotifications
    }
    
  } catch (error) {
    console.error("❌ Error checking for dummy notifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Clean up dummy notifications
 */
export async function cleanupDummyNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Cleaning up dummy notifications...")
    
    // Delete notifications with dummy patterns
    const dummyPatterns = [
      "test",
      "dummy", 
      "sample",
      "example",
      "demo",
      "mock"
    ]
    
    let deletedCount = 0
    
    for (const pattern of dummyPatterns) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .or(`title.ilike.%${pattern}%,message.ilike.%${pattern}%`)
      
      if (error) {
        console.error(`❌ Error deleting notifications with pattern ${pattern}:`, error)
      } else {
        deletedCount++
      }
    }
    
    console.log("✅ Cleanup completed, patterns checked:", deletedCount)
    
    return { success: true, deletedPatterns: deletedCount }
    
  } catch (error) {
    console.error("❌ Error cleaning up dummy notifications:", error)
    return { success: false, error: error.message }
  }
}














