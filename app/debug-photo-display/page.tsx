"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { SimpleClickableAvatar } from "@/components/profile/simple-clickable-avatar"
import { CheckCircle, XCircle, AlertCircle, User, Database, Image } from "lucide-react"

export default function DebugPhotoDisplayPage() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Check user authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      // Check profile data
      let profileData = null
      let profileError = null
      if (authUser?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        profileData = data
        profileError = error
      }

      // Check storage bucket
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      const avatarsBucket = buckets?.find(b => b.id === 'avatars')

      // Check if user has avatar_url
      const hasAvatarUrl = profileData?.avatar_url ? true : false
      const avatarUrl = profileData?.avatar_url

      setDebugInfo({
        user: {
          authenticated: !!authUser,
          id: authUser?.id,
          email: authUser?.email,
          name: user?.name,
          full_name: user?.full_name
        },
        profile: {
          exists: !!profileData,
          data: profileData,
          error: profileError?.message,
          hasAvatarUrl,
          avatarUrl
        },
        storage: {
          bucketExists: !!avatarsBucket,
          bucketData: avatarsBucket,
          error: bucketsError?.message
        }
      })
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDebug()
  }, [user])

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (status: boolean) => {
    return status ? 
      "bg-green-50 text-green-700 border-green-200" : 
      "bg-red-50 text-red-700 border-red-200"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-6 w-6" />
              Profile Photo Display Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={runDebug} disabled={loading} className="w-full">
              {loading ? "Running Debug..." : "Refresh Debug Info"}
            </Button>

            {Object.keys(debugInfo).length > 0 && (
              <div className="space-y-4">
                {/* User Authentication */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Authentication
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Authenticated:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.user?.authenticated)}
                        <Badge className={getStatusColor(debugInfo.user?.authenticated)}>
                          {debugInfo.user?.authenticated ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>ID: {debugInfo.user?.id || "N/A"}</p>
                      <p>Email: {debugInfo.user?.email || "N/A"}</p>
                      <p>Name: {debugInfo.user?.name || "N/A"}</p>
                      <p>Full Name: {debugInfo.user?.full_name || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Data */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Profile Data
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Profile Exists:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.profile?.exists)}
                        <Badge className={getStatusColor(debugInfo.profile?.exists)}>
                          {debugInfo.profile?.exists ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Has Avatar URL:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.profile?.hasAvatarUrl)}
                        <Badge className={getStatusColor(debugInfo.profile?.hasAvatarUrl)}>
                          {debugInfo.profile?.hasAvatarUrl ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    {debugInfo.profile?.avatarUrl && (
                      <div className="text-sm text-gray-600">
                        <p>Avatar URL: {debugInfo.profile.avatarUrl}</p>
                      </div>
                    )}
                    {debugInfo.profile?.error && (
                      <div className="text-sm text-red-600">
                        <p>Error: {debugInfo.profile.error}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Storage */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Storage
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Avatars Bucket:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(debugInfo.storage?.bucketExists)}
                        <Badge className={getStatusColor(debugInfo.storage?.bucketExists)}>
                          {debugInfo.storage?.bucketExists ? "Exists" : "Missing"}
                        </Badge>
                      </div>
                    </div>
                    {debugInfo.storage?.error && (
                      <div className="text-sm text-red-600">
                        <p>Error: {debugInfo.storage.error}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Avatar Components */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Avatar Component Tests</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">SimpleClickableAvatar</h4>
                      <SimpleClickableAvatar size="md" showName={true} />
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Basic Avatar</h4>
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={debugInfo.profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(debugInfo.user?.name || 'User')}&background=random&color=fff&size=128`} 
                          alt="Profile" 
                        />
                        <AvatarFallback>
                          {debugInfo.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Recommendations:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    {!debugInfo.user?.authenticated && (
                      <li>❌ <strong>Not authenticated:</strong> You need to log in first</li>
                    )}
                    {!debugInfo.profile?.exists && debugInfo.user?.authenticated && (
                      <li>❌ <strong>Profile missing:</strong> User profile doesn't exist in database</li>
                    )}
                    {debugInfo.profile?.exists && !debugInfo.profile?.hasAvatarUrl && (
                      <li>ℹ️ <strong>No avatar:</strong> User doesn't have a profile photo yet - try uploading one</li>
                    )}
                    {!debugInfo.storage?.bucketExists && (
                      <li>❌ <strong>Storage bucket missing:</strong> Run the database setup script</li>
                    )}
                    {debugInfo.user?.authenticated && debugInfo.profile?.exists && debugInfo.storage?.bucketExists && (
                      <li>✅ <strong>Everything looks good:</strong> Try uploading a profile photo</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
