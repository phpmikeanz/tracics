import { createClient } from "@/lib/supabase/client"

/**
 * Force load only real notifications from Supabase database
 */
export async function forceRealDatabaseNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Force loading real notifications for user:", userId)
    
    // Clear any localStorage dummy data
    if (typeof window !== "undefined") {
      localStorage.removeItem("trac-demo-notifications")
      localStorage.removeItem("trac-notifications")
      localStorage.removeItem("notifications")
      localStorage.removeItem("demo-notifications")
      localStorage.removeItem("test-notifications")
      console.log("✅ Cleared localStorage dummy data")
    }
    
    // Get all notifications from database
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, error: error.message }
    }
    
    console.log("📊 Total notifications in database:", notifications?.length || 0)
    
    // Filter out any dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample"
    ]
    
    const realNotifications = notifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return !dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("✅ Real notifications (filtered):", realNotifications.length)
    
    // Calculate unread count
    const unreadCount = realNotifications.filter(n => !n.read).length
    console.log("🔔 Unread notifications:", unreadCount)
    
    // Log notification details
    console.log("📋 Notification details:")
    realNotifications.forEach((n, index) => {
      console.log(`${index + 1}. ${n.title} - ${n.type} - ${n.read ? 'Read' : 'Unread'}`)
    })
    
    return {
      success: true,
      notifications: realNotifications,
      unreadCount: unreadCount,
      totalCount: realNotifications.length,
      dummyFiltered: (notifications?.length || 0) - realNotifications.length
    }
    
  } catch (error) {
    console.error("❌ Error force loading real notifications:", error)
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
 * Check if database has real notifications
 */
export async function checkDatabaseHasRealNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Checking database for real notifications...")
    
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
    console.log("📊 Total notifications in database:", allNotifications.length)
    
    // Check for dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample"
    ]
    
    const dummyNotifications = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    const realNotifications = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return !dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    console.log("📋 Analysis results:")
    console.log("- Total notifications:", allNotifications.length)
    console.log("- Real notifications:", realNotifications.length)
    console.log("- Dummy notifications:", dummyNotifications.length)
    console.log("- Unread real notifications:", realNotifications.filter(n => !n.read).length)
    
    return {
      success: true,
      totalNotifications: allNotifications.length,
      realNotifications: realNotifications.length,
      dummyNotifications: dummyNotifications.length,
      unreadCount: realNotifications.filter(n => !n.read).length,
      hasRealData: realNotifications.length > 0,
      hasDummyData: dummyNotifications.length > 0
    }
    
  } catch (error) {
    console.error("❌ Error checking database notifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Clean up all dummy notifications from database
 */
export async function cleanupAllDummyNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Cleaning up all dummy notifications...")
    
    // Get all notifications
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    const allNotifications = notifications || []
    console.log("📊 Total notifications found:", allNotifications.length)
    
    // Find dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample"
    ]
    
    const dummyNotifications = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
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
    console.error("❌ Error cleaning up dummy notifications:", error)
    return { success: false, error: error.message }
  }
}
























