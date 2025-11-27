import { createClient } from "@/lib/supabase/client"

/**
 * Execute comprehensive dummy data cleanup
 */
export async function executeDummyDataCleanup(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 EXECUTING COMPREHENSIVE DUMMY DATA CLEANUP for user:", userId)
    
    // Step 1: Clear all localStorage dummy data
    if (typeof window !== "undefined") {
      const localStorageKeys = [
        "trac-demo-notifications",
        "trac-notifications", 
        "notifications",
        "demo-notifications",
        "test-notifications",
        "mock-notifications",
        "dummy-notifications"
      ]
      
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key)
        console.log(`✅ Cleared localStorage: ${key}`)
      })
    }
    
    // Step 2: Get all notifications from database
    console.log("📊 Fetching all notifications from database...")
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    console.log("📊 Total notifications in database:", allNotifications?.length || 0)
    
    // Step 3: Identify dummy notifications
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample",
      "debug", "testing", "trial", "preview", "staging"
    ]
    
    const dummyNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications identified:", dummyNotifications.length)
    
    // Step 4: Delete all dummy notifications
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
          console.log(`✅ Deleted dummy notification: ${dummy.title}`)
        }
      }
    }
    
    // Step 5: Get updated notifications (real data only)
    console.log("📊 Fetching updated notifications (real data only)...")
    const { data: realNotifications, error: realError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (realError) {
      console.error("❌ Error fetching real notifications:", realError)
      return { success: false, error: realError.message }
    }
    
    const realData = realNotifications || []
    const unreadCount = realData.filter(n => !n.read).length
    
    console.log("✅ CLEANUP COMPLETE!")
    console.log("📊 Results:")
    console.log("- Dummy notifications removed:", dummyNotifications.length)
    console.log("- Real notifications remaining:", realData.length)
    console.log("- Unread notifications:", unreadCount)
    
    // Step 6: Log real notifications
    if (realData.length > 0) {
      console.log("📋 Real notifications in database:")
      realData.forEach((n, index) => {
        console.log(`${index + 1}. ${n.title} - ${n.type} - ${n.read ? 'Read' : 'Unread'}`)
      })
    } else {
      console.log("📋 No real notifications found in database")
    }
    
    return {
      success: true,
      dummyRemoved: dummyNotifications.length,
      realNotifications: realData.length,
      unreadCount: unreadCount,
      realData: realData
    }
    
  } catch (error) {
    console.error("❌ Error executing dummy data cleanup:", error)
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
 * Verify only real data exists
 */
export async function verifyOnlyRealDataExists(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Verifying only real data exists...")
    
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
    
    // Check for any remaining dummy data
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample"
    ]
    
    const remainingDummy = allNotifications.filter(n => {
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
    
    console.log("📋 Verification results:")
    console.log("- Total notifications:", allNotifications.length)
    console.log("- Real notifications:", realNotifications.length)
    console.log("- Dummy notifications remaining:", remainingDummy.length)
    console.log("- Unread real notifications:", realNotifications.filter(n => !n.read).length)
    
    if (remainingDummy.length > 0) {
      console.log("⚠️ Dummy notifications still found:")
      remainingDummy.forEach(n => {
        console.log(`  - ${n.title}: ${n.message}`)
      })
    }
    
    return {
      success: true,
      totalNotifications: allNotifications.length,
      realNotifications: realNotifications.length,
      dummyRemaining: remainingDummy.length,
      unreadCount: realNotifications.filter(n => !n.read).length,
      isClean: remainingDummy.length === 0,
      realData: realNotifications
    }
    
  } catch (error) {
    console.error("❌ Error verifying real data:", error)
    return { success: false, error: error.message }
  }
}
























