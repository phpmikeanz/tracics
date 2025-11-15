import { createClient } from "@/lib/supabase/client"

/**
 * Diagnose why there are 28 unread notifications in faculty portal
 */
export async function diagnoseNotificationCount(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🔍 Diagnosing notification count for user:", userId)
    
    // Get all notifications for the user
    const { data: allNotifications, error: allError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (allError) {
      console.error("❌ Error fetching all notifications:", allError)
      return { success: false, error: allError.message }
    }
    
    console.log("📊 Total notifications in database:", allNotifications?.length || 0)
    
    // Count unread notifications
    const unreadNotifications = allNotifications?.filter(n => !n.read) || []
    console.log("🔔 Unread notifications:", unreadNotifications.length)
    
    // Check for dummy data
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample",
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "jane doe", "bob smith", "alice johnson", "david brown"
    ]
    
    const dummyNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    console.log("🎭 Dummy notifications found:", dummyNotifications.length)
    
    // Check for duplicate notifications
    const seen = new Set()
    const duplicates = []
    const unique = []
    
    allNotifications?.forEach(notification => {
      const key = `${notification.title}-${notification.message}`
      if (seen.has(key)) {
        duplicates.push(notification)
      } else {
        seen.add(key)
        unique.push(notification)
      }
    })
    
    console.log("🔄 Duplicate notifications found:", duplicates.length)
    
    // Analyze notification types
    const typeCounts = allNotifications?.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    console.log("📋 Notification types:", typeCounts)
    
    // Check recent notifications
    const recentNotifications = allNotifications?.filter(n => {
      const notificationDate = new Date(n.created_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return notificationDate > oneDayAgo
    }) || []
    
    console.log("⏰ Recent notifications (last 24h):", recentNotifications.length)
    
    // Show sample notifications
    console.log("📝 Sample notifications:")
    allNotifications?.slice(0, 10).forEach((n, index) => {
      console.log(`${index + 1}. ${n.title} - ${n.type} - ${n.read ? 'Read' : 'Unread'} - ${n.created_at}`)
    })
    
    // Check for potential issues
    const issues = []
    
    if (dummyNotifications.length > 0) {
      issues.push(`Found ${dummyNotifications.length} dummy notifications`)
    }
    
    if (duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} duplicate notifications`)
    }
    
    if (unreadNotifications.length > 20) {
      issues.push(`High unread count: ${unreadNotifications.length} (might be excessive)`)
    }
    
    const realNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      return !dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    const realUnreadCount = realNotifications.filter(n => !n.read).length
    
    console.log("✅ Real notifications (filtered):", realNotifications.length)
    console.log("✅ Real unread count (filtered):", realUnreadCount)
    
    return {
      success: true,
      totalNotifications: allNotifications?.length || 0,
      unreadCount: unreadNotifications.length,
      dummyCount: dummyNotifications.length,
      duplicateCount: duplicates.length,
      realCount: realNotifications.length,
      realUnreadCount: realUnreadCount,
      typeCounts,
      recentCount: recentNotifications.length,
      issues,
      sampleNotifications: allNotifications?.slice(0, 5) || []
    }
    
  } catch (error) {
    console.error("❌ Error diagnosing notification count:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Clean up problematic notifications
 */
export async function cleanupProblematicNotifications(userId: string) {
  try {
    const supabase = createClient()
    
    console.log("🧹 Cleaning up problematic notifications...")
    
    // Get all notifications
    const { data: allNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
    
    if (fetchError) {
      console.error("❌ Error fetching notifications:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    const dummyPatterns = [
      "test", "dummy", "sample", "example", "demo", "mock", 
      "fake", "placeholder", "temporary", "temp", "debug",
      "debugging", "trial", "preview", "staging", "mockup",
      "lorem", "ipsum", "placeholder", "content", "sample",
      "mike johnson", "lisa brown", "sarah smith", "john doe",
      "jane doe", "bob smith", "alice johnson", "david brown"
    ]
    
    // Find dummy notifications
    const dummyNotifications = allNotifications?.filter(n => {
      const title = n.title?.toLowerCase() || ""
      const message = n.message?.toLowerCase() || ""
      return dummyPatterns.some(pattern => 
        title.includes(pattern) || message.includes(pattern)
      )
    }) || []
    
    // Find duplicate notifications
    const seen = new Set()
    const duplicates = []
    
    allNotifications?.forEach(notification => {
      const key = `${notification.title}-${notification.message}`
      if (seen.has(key)) {
        duplicates.push(notification)
      } else {
        seen.add(key)
      }
    })
    
    let removedCount = 0
    
    // Remove dummy notifications
    for (const dummy of dummyNotifications) {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", dummy.id)
      
      if (!deleteError) {
        removedCount++
        console.log(`✅ Removed dummy notification: ${dummy.title}`)
      }
    }
    
    // Remove duplicate notifications
    for (const duplicate of duplicates) {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", duplicate.id)
      
      if (!deleteError) {
        removedCount++
        console.log(`✅ Removed duplicate notification: ${duplicate.title}`)
      }
    }
    
    console.log(`✅ Cleanup complete! Removed ${removedCount} problematic notifications`)
    
    return {
      success: true,
      removedCount,
      dummyRemoved: dummyNotifications.length,
      duplicatesRemoved: duplicates.length
    }
    
  } catch (error) {
    console.error("❌ Error cleaning up notifications:", error)
    return { success: false, error: error.message }
  }
}























