import { createClient } from "@/lib/supabase/client"

/**
 * Comprehensive cleanup of all sample/dummy notification data
 * This ensures only real data from Supabase shows in the notification bell
 */
export async function cleanupAllSampleData(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Starting comprehensive cleanup of all sample data...")
    
    // Get all notifications for the user
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    const notifications = allNotifications || []
    console.log("📊 Total notifications found:", notifications.length)
    
    // Specific patterns for sample/dummy data (not real activity words)
    const samplePatterns = [
      // Explicit test patterns
      "test notification", "sample notification", "dummy notification",
      "example notification", "demo notification", "mock notification",
      "test assignment", "sample assignment", "dummy assignment",
      "test quiz", "sample quiz", "dummy quiz",
      
      // Fake names commonly used in samples
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "jane doe", "bob smith", "alice johnson", "david brown",
      "emma wilson", "mike chen", "lisa rodriguez", "david kim",
      
      // Sample course names
      "computer science 101", "mathematics 201", "physics 301",
      "chemistry 201", "english 101", "programming assignment 1",
      
      // Generic test content
      "lorem ipsum", "placeholder content", "temporary data"
    ]
    
    // Find sample notifications
    const sampleNotifications = notifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return samplePatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    console.log("🎭 Sample notifications found:", sampleNotifications.length)
    
    // Delete sample notifications
    let deletedCount = 0
    if (sampleNotifications.length > 0) {
      console.log("🗑️ Deleting sample notifications...")
      
      for (const sample of sampleNotifications) {
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", sample.id)
        
        if (deleteError) {
          console.error("❌ Error deleting sample notification:", deleteError)
        } else {
          console.log("✅ Deleted sample notification:", sample.title)
          deletedCount++
        }
      }
    }
    
    // Get updated count
    const { data: updatedNotifications, error: updatedError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (updatedError) {
      console.error("❌ Error fetching updated notifications:", updatedError)
      return { success: false, error: updatedError.message }
    }
    
    const remainingNotifications = updatedNotifications || []
    console.log("📊 Remaining notifications after cleanup:", remainingNotifications.length)
    
    // Log remaining notifications for verification
    if (remainingNotifications.length > 0) {
      console.log("📋 Remaining notifications:")
      remainingNotifications.forEach(n => {
        console.log(`  - ${n.title}: ${n.message}`)
      })
    }
    
    return {
      success: true,
      totalFound: notifications.length,
      sampleFound: sampleNotifications.length,
      deleted: deletedCount,
      remaining: remainingNotifications.length,
      remainingNotifications: remainingNotifications
    }
    
  } catch (error) {
    console.error("❌ Error in comprehensive cleanup:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify that only real data exists in notifications
 */
export async function verifyOnlyRealDataExists(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Verifying only real data exists...")
    
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
    console.log("📊 Total notifications:", allNotifications.length)
    
    // Check for any remaining sample patterns
    const samplePatterns = [
      "test notification", "sample notification", "dummy notification",
      "example notification", "demo notification", "mock notification",
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "computer science 101", "mathematics 201", "physics 301",
      "test assignment", "sample assignment", "dummy assignment",
      "test quiz", "sample quiz", "dummy quiz"
    ]
    
    const sampleFound = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return samplePatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    if (sampleFound.length > 0) {
      console.log("⚠️ Sample data still found:", sampleFound.length)
      sampleFound.forEach(n => {
        console.log(`  - ${n.title}: ${n.message}`)
      })
      return { success: false, sampleFound: sampleFound.length }
    }
    
    console.log("✅ Only real data found in notifications")
    return { 
      success: true, 
      totalNotifications: allNotifications.length,
      sampleFound: 0
    }
    
  } catch (error) {
    console.error("❌ Error verifying real data:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get only real notifications (filter out any remaining samples)
 */
export async function getOnlyRealNotifications(userId: string) {
  try {
    const supabase = createClient()
    
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
    
    // Filter out only obvious sample patterns (not real activity words)
    const samplePatterns = [
      "test notification", "sample notification", "dummy notification",
      "example notification", "demo notification", "mock notification",
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "computer science 101", "mathematics 201", "physics 301",
      "test assignment", "sample assignment", "dummy assignment",
      "test quiz", "sample quiz", "dummy quiz"
    ]
    
    const realNotifications = allNotifications.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return !samplePatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    })
    
    console.log("📊 Real notifications found:", realNotifications.length)
    
    return {
      success: true,
      notifications: realNotifications,
      total: realNotifications.length
    }
    
  } catch (error) {
    console.error("❌ Error getting real notifications:", error)
    return { success: false, error: error.message }
  }
}
