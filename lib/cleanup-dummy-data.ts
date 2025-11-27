import { createClient } from "@/lib/supabase/client"

/**
 * Clean up all dummy data from the database
 */
export async function cleanupAllDummyData(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Cleaning up all dummy data for user:", userId)
    
    // Clear localStorage dummy data
    if (typeof window !== "undefined") {
      localStorage.removeItem("trac-demo-notifications")
      localStorage.removeItem("trac-notifications")
      localStorage.removeItem("notifications")
      localStorage.removeItem("demo-notifications")
      localStorage.removeItem("test-notifications")
      console.log("✅ Cleared localStorage dummy data")
    }
    
    // Get all notifications for the user
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    console.log("📊 Total notifications found:", notifications?.length || 0)
    
    // Define dummy patterns
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging"
    ]
    
    // Find dummy notifications
    const dummyNotifications = notifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Delete dummy notifications
    if (dummyNotifications.length > 0) {
      console.log("🗑️ Deleting dummy notifications...")
      
      for (const dummy of dummyNotifications) {
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", dummy.id)
        
        if (deleteError) {
          console.error("❌ Error deleting dummy notification:", deleteError)
        } else {
          console.log("✅ Deleted dummy notification:", dummy.title)
        }
      }
    }
    
    // Get updated notification count
    const { data: updatedNotifications, error: updatedError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (updatedError) {
      console.error("❌ Error fetching updated notifications:", updatedError)
      return { success: false, error: updatedError.message }
    }
    
    const realNotifications = updatedNotifications || []
    const unreadCount = realNotifications.filter(n => !n.read).length
    
    console.log("✅ Cleanup complete!")
    console.log("📊 Real notifications remaining:", realNotifications.length)
    console.log("🔔 Unread notifications:", unreadCount)
    
    return {
      success: true,
      totalNotifications: realNotifications.length,
      unreadCount: unreadCount,
      dummyRemoved: dummyNotifications.length,
      realNotifications: realNotifications
    }
    
  } catch (error) {
    console.error("❌ Error cleaning up dummy data:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify that only real data exists
 */
export async function verifyRealDataOnly(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Verifying real data only for user:", userId)
    
    // Get all notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, error: error.message }
    }
    
    const allNotifications = notifications || []
    const unreadNotifications = allNotifications.filter(n => !n.read)
    
    // Check for any remaining dummy patterns
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging"
    ]
    
    const remainingDummy = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    console.log("📊 Verification results:")
    console.log("- Total notifications:", allNotifications.length)
    console.log("- Unread notifications:", unreadNotifications.length)
    console.log("- Remaining dummy notifications:", remainingDummy.length)
    
    if (remainingDummy.length > 0) {
      console.log("⚠️ Dummy notifications still found:")
      remainingDummy.forEach(n => {
        console.log(`  - ${n.title}: ${n.message}`)
      })
    }
    
    return {
      success: true,
      totalNotifications: allNotifications.length,
      unreadCount: unreadNotifications.length,
      dummyRemaining: remainingDummy.length,
      isClean: remainingDummy.length === 0,
      notifications: allNotifications
    }
    
  } catch (error) {
    console.error("❌ Error verifying real data:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a real notification to test the system
 */
export async function createRealTestNotification(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("📝 Creating real test notification...")
    
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: "🔔 Real Database Notification",
        message: "This is a real notification created directly in your Supabase database. No dummy data!",
        type: "assignment",
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("❌ Error creating real notification:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Real notification created:", data)
    return { success: true, notification: data }
    
  } catch (error) {
    console.error("❌ Error creating real notification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Reset all notifications to read status
 */
export async function resetAllNotificationsToRead(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔄 Resetting all notifications to read...")
    
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
    console.error("❌ Error resetting notifications:", error)
    return { success: false, error: error.message }
  }
}

























