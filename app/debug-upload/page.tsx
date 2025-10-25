"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { CheckCircle, XCircle, AlertCircle, Upload, Database, User, Shield } from "lucide-react"

export default function DebugUploadPage() {
  const { user } = useAuth()
  const [diagnostics, setDiagnostics] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    setDiagnostics([])
    
    const results: any[] = []
    const supabase = createClient()

    try {
      // Test 1: Check authentication
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      results.push({
        test: "Authentication",
        status: authUser ? "success" : "error",
        message: authUser ? `User authenticated: ${authUser.email}` : "User not authenticated",
        details: authError?.message || "OK"
      })

      // Test 2: Check storage buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      const avatarsBucket = buckets?.find(b => b.id === 'avatars')
      results.push({
        test: "Storage Bucket",
        status: avatarsBucket ? "success" : "error",
        message: avatarsBucket ? "Avatars bucket exists" : "Avatars bucket not found",
        details: bucketsError?.message || "OK"
      })

      // Test 3: Check storage policies
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', 'objects')
        .like('policyname', '%avatar%')
      
      results.push({
        test: "Storage Policies",
        status: policies && policies.length >= 4 ? "success" : "warning",
        message: policies && policies.length >= 4 ? `${policies.length} avatar policies found` : "Avatar policies may be missing",
        details: policiesError?.message || "OK"
      })

      // Test 4: Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('id', user?.id)
        .single()
      
      results.push({
        test: "Profile Table",
        status: profile ? "success" : "error",
        message: profile ? "Profile found" : "Profile not found",
        details: profileError?.message || "OK"
      })

      // Test 5: Test file upload (small test)
      if (user?.id) {
        try {
          // Create a small test file
          const testContent = "test"
          const testFile = new File([testContent], "test.txt", { type: "text/plain" })
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`test-${Date.now()}.txt`, testFile)
          
          results.push({
            test: "Upload Test",
            status: uploadError ? "error" : "success",
            message: uploadError ? "Upload failed" : "Upload test successful",
            details: uploadError?.message || "OK"
          })

          // Clean up test file
          if (uploadData?.path) {
            await supabase.storage.from('avatars').remove([uploadData.path])
          }
        } catch (uploadTestError) {
          results.push({
            test: "Upload Test",
            status: "error",
            message: "Upload test failed",
            details: uploadTestError instanceof Error ? uploadTestError.message : "Unknown error"
          })
        }
      }

    } catch (error) {
      results.push({
        test: "General Error",
        status: "error",
        message: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }

    setDiagnostics(results)
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 text-green-700 border-green-200"
      case "error":
        return "bg-red-50 text-red-700 border-red-200"
      case "warning":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Profile Photo Upload Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="text-sm">User: {user?.name || "Not logged in"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm">ID: {user?.id || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <span className="text-sm">Role: {user?.role || "N/A"}</span>
              </div>
            </div>

            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Running Diagnostics..." : "Run Upload Diagnostics"}
            </Button>

            {diagnostics.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Diagnostic Results:</h3>
                {diagnostics.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.test}</span>
                      </div>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{result.message}</p>
                    <p className="text-xs text-gray-500">{result.details}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>If any tests show "error", check the Supabase dashboard</li>
                <li>Make sure the database setup script has been run</li>
                <li>Check that you're logged in as a valid user</li>
                <li>Try uploading a small image file (&lt; 1MB)</li>
                <li>Check browser console for additional errors</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Quick Fixes:</h4>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li><strong>Bucket missing:</strong> Run the setup script in Supabase SQL editor</li>
                <li><strong>Policies missing:</strong> Check RLS policies in Supabase dashboard</li>
                <li><strong>User not authenticated:</strong> Make sure you're logged in</li>
                <li><strong>Upload fails:</strong> Try a smaller image file</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
