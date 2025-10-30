import { createClient } from "@/lib/supabase/client"

/**
 * Fix notification count by ensuring it shows real data from database
 */
export async function fixNotificationCount(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔧 Fixing notification count for user:", userId)
    
    // Get all notifications for the user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, error: error.message }
    }
    
    console.log("📊 Total notifications found:", notifications?.length || 0)
    
    // Count unread notifications
    const unreadCount = notifications?.filter(n => !n.read).length || 0
    console.log("🔔 Unread notifications:", unreadCount)
    
    // Check for dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock"
    ]
    
    const dummyNotifications = notifications?.filter(n => 
      dummyPatterns.some(pattern => 
        n.title.toLowerCase().includes(pattern) || 
        n.message.toLowerCase().includes(pattern)
      )
    ) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Clean up dummy notifications
    if (dummyNotifications.length > 0) {
      console.log("🧹 Cleaning up dummy notifications...")
      
      for (const dummy of dummyNotifications) {
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", dummy.id)
        
        if (deleteError) {
          console.error("❌ Error deleting dummy notification:", deleteError)
        }
      }
      
      console.log("✅ Cleaned up dummy notifications")
    }
    
    // Get updated count
    const { data: updatedNotifications, error: updatedError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (updatedError) {
      console.error("❌ Error fetching updated notifications:", updatedError)
      return { success: false, error: updatedError.message }
    }
    
    const updatedUnreadCount = updatedNotifications?.filter(n => !n.read).length || 0
    
    console.log("✅ Updated notification count:", updatedUnreadCount)
    
    return {
      success: true,
      totalNotifications: updatedNotifications?.length || 0,
      unreadCount: updatedUnreadCount,
      dummyCleaned: dummyNotifications.length
    }
    
  } catch (error) {
    console.error("❌ Error fixing notification count:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a real notification to test the system
 */
export async function createRealNotificationForTesting(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating real notification for testing...")
    
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: "🔔 Real Database Notification",
        message: "This is a real notification created directly in your Supabase database to test the notification system.",
        type: "assignment",
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
 * Get real notification count from database
 */
export async function getRealNotificationCount(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Getting real notification count for user:", userId)
    
    // Get total notifications
    const { count: totalCount, error: totalError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
    
    if (totalError) {
      console.error("❌ Error getting total count:", totalError)
      return { success: false, error: totalError.message }
    }
    
    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
    
    if (unreadError) {
      console.error("❌ Error getting unread count:", unreadError)
      return { success: false, error: unreadError.message }
    }
    
    console.log("📊 Real notification counts:", {
      total: totalCount || 0,
      unread: unreadCount || 0
    })
    
    return {
      success: true,
      total: totalCount || 0,
      unread: unreadCount || 0
    }
    
  } catch (error) {
    console.error("❌ Error getting real notification count:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Reset notification count to zero
 */
export async function resetNotificationCount(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔄 Resetting notification count for user:", userId)
    
    // Mark all notifications as read
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
    
    if (error) {
      console.error("❌ Error resetting notifications:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ All notifications marked as read")
    
    return { success: true }
    
  } catch (error) {
    console.error("❌ Error resetting notification count:", error)
    return { success: false, error: error.message }
  }
}



















