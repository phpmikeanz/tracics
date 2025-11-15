import { createClient } from "@/lib/supabase/client"

/**
 * Comprehensive cleanup tool to delete ALL dummy data and keep only real notifications
 */
export async function deleteAllDummyData(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Starting comprehensive dummy data cleanup...")
    
    // Get all notifications for the user
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    console.log("📊 Total notifications found:", allNotifications?.length || 0)
    
    // Comprehensive dummy data patterns
    const dummyPatterns = [
      // Common dummy names
      "mike johnson", "lisa brown", "sarah smith", "john doe", "jane doe", 
      "bob smith", "alice johnson", "david brown", "emma wilson", "michael jones",
      "jennifer davis", "robert taylor", "linda anderson", "william thomas",
      "patricia harris", "james martin", "elizabeth garcia", "charles lewis",
      "mary lee", "thomas walker", "nancy hall", "daniel allen", "susan young",
      "mark king", "karen wright", "paul lopez", "helen hill", "steven scott",
      "donna green", "kenneth adams", "carol baker", "george gonzalez", "ruth nelson",
      "kevin carter", "sharon mitchell", "brian perez", "cynthia roberts",
      "ronald turner", "deborah phillips", "anthony campbell", "donna parker",
      "frank evans", "karen edwards", "gregory collins", "betty stewart",
      "raymond sanchez", "diane morris", "arthur rogers", "kathryn reed",
      
      // Test/dummy keywords
      "test", "dummy", "sample", "example", "demo", "mock", "fake", "placeholder",
      "temporary", "temp", "debug", "debugging", "trial", "preview", "staging",
      "mockup", "lorem", "ipsum", "content", "sample", "trial", "preview",
      "staging", "development", "testing", "experiment", "prototype",
      
      // Common dummy titles
      "test notification", "dummy notification", "sample notification",
      "example notification", "demo notification", "mock notification",
      "fake notification", "placeholder notification", "temporary notification",
      "debug notification", "trial notification", "preview notification",
      "staging notification", "mockup notification", "lorem notification",
      "ipsum notification", "content notification", "sample notification",
      
      // Common dummy messages
      "this is a test", "this is dummy", "this is sample", "this is example",
      "this is demo", "this is mock", "this is fake", "this is placeholder",
      "this is temporary", "this is debug", "this is trial", "this is preview",
      "this is staging", "this is mockup", "lorem ipsum", "sample content",
      "test content", "dummy content", "example content", "demo content",
      
      // System-generated dummy patterns
      "system test", "auto generated", "automated test", "batch test",
      "bulk test", "mass test", "load test", "stress test", "performance test",
      "integration test", "unit test", "regression test", "smoke test",
      "acceptance test", "user test", "beta test", "alpha test", "gamma test",
      
      // Notification type patterns
      "test assignment", "dummy assignment", "sample assignment",
      "test quiz", "dummy quiz", "sample quiz", "test enrollment",
      "dummy enrollment", "sample enrollment", "test activity",
      "dummy activity", "sample activity", "test grade", "dummy grade",
      "sample grade", "test submission", "dummy submission", "sample submission"
    ]
    
    // Find dummy notifications
    const dummyNotifications = allNotifications?.filter(notification => {
      const title = notification.title?.toLowerCase() || ""
      const message = notification.message?.toLowerCase() || ""
      const type = notification.type?.toLowerCase() || ""
      
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || 
        message.includes(pattern) || 
        type.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Find duplicate notifications
    const seen = new Set()
    const duplicates = []
    const unique = []
    
    allNotifications?.forEach(notification => {
      const key = `${notification.title}-${notification.message}-${notification.type}`
      if (seen.has(key)) {
        duplicates.push(notification)
      } else {
        seen.add(key)
        unique.push(notification)
      }
    })
    
    console.log("🔄 Duplicate notifications found:", duplicates.length)
    
    // Find old test notifications (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const oldTestNotifications = allNotifications?.filter(notification => {
      const notificationDate = new Date(notification.created_at)
      const title = notification.title?.toLowerCase() || ""
      const message = notification.message?.toLowerCase() || ""
      
      return notificationDate < sevenDaysAgo && (
        title.includes("test") || 
        title.includes("dummy") || 
        title.includes("sample") ||
        message.includes("test") || 
        message.includes("dummy") || 
        message.includes("sample")
      )
    }) || []
    
    console.log("⏰ Old test notifications found:", oldTestNotifications.length)
    
    // Combine all notifications to delete
    const notificationsToDelete = [
      ...dummyNotifications,
      ...duplicates,
      ...oldTestNotifications
    ]
    
    // Remove duplicates from the delete list
    const uniqueToDelete = notificationsToDelete.filter((notification, index, self) => 
      index === self.findIndex(n => n.id === notification.id)
    )
    
    console.log("🗑️ Total notifications to delete:", uniqueToDelete.length)
    
    // Delete all dummy notifications
    let deletedCount = 0
    for (const notification of uniqueToDelete) {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notification.id)
      
      if (!deleteError) {
        deletedCount++
        console.log(`✅ Deleted: ${notification.title}`)
      } else {
        console.error(`❌ Error deleting ${notification.title}:`, deleteError)
      }
    }
    
    // Get remaining real notifications
    const { data: remainingNotifications, error: remainingError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (remainingError) {
      console.error("❌ Error fetching remaining notifications:", remainingError)
      return { success: false, error: remainingError.message }
    }
    
    const realUnreadCount = remainingNotifications?.filter(n => !n.read).length || 0
    
    console.log("✅ Cleanup complete!")
    console.log(`🗑️ Deleted ${deletedCount} dummy notifications`)
    console.log(`📊 Remaining real notifications: ${remainingNotifications?.length || 0}`)
    console.log(`🔔 Real unread count: ${realUnreadCount}`)
    
    return {
      success: true,
      deletedCount,
      remainingCount: remainingNotifications?.length || 0,
      realUnreadCount,
      dummyRemoved: dummyNotifications.length,
      duplicatesRemoved: duplicates.length,
      oldTestRemoved: oldTestNotifications.length,
      remainingNotifications: remainingNotifications || []
    }
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify only real data remains
 */
export async function verifyOnlyRealDataRemains(userId: string) {
  try {
    const supabase = createClient()
    
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (error) {
      console.error("❌ Error fetching notifications:", error)
      return { success: false, error: error.message }
    }
    
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", "fake", "placeholder",
      "temporary", "temp", "debug", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "mike johnson", "lisa brown", "sarah smith", "john doe"
    ]
    
    const remainingDummy = notifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    const isClean = remainingDummy.length === 0
    
    console.log("🔍 Verification complete:")
    console.log(`📊 Total notifications: ${notifications?.length || 0}`)
    console.log(`🎭 Remaining dummy: ${remainingDummy.length}`)
    console.log(`✅ Database is clean: ${isClean}`)
    
    return {
      success: true,
      isClean,
      totalNotifications: notifications?.length || 0,
      remainingDummy: remainingDummy.length,
      unreadCount: notifications?.filter(n => !n.read).length || 0
    }
    
  } catch (error) {
    console.error("❌ Error during verification:", error)
    return { success: false, error: error.message }
  }
}























