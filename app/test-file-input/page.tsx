"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileInput, Upload } from "lucide-react"

export default function TestFileInputPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = () => {
    console.log("File button clicked")
    if (fileInputRef.current) {
      console.log("Triggering file input")
      fileInputRef.current.click()
    } else {
      console.error("File input ref is null")
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("File selected:", file.name, file.size, file.type)
      alert(`File selected: ${file.name} (${file.size} bytes)`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-6 w-6" />
              File Input Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-file">Test File Input</Label>
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleFileClick} className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Click "Choose File" to test if the file dialog opens
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Test Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click the "Choose File" button above</li>
                  <li>Check if the file dialog opens</li>
                  <li>Open browser console (F12) to see debug messages</li>
                  <li>Select an image file to test</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Expected Behavior:</h4>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>✅ File dialog should open when clicking "Choose File"</li>
                  <li>✅ Console should show "File button clicked" and "Triggering file input"</li>
                  <li>✅ After selecting a file, should show file details</li>
                  <li>✅ No JavaScript errors in console</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">If File Dialog Doesn't Open:</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>❌ Check browser console for errors</li>
                  <li>❌ Try a different browser (Chrome, Firefox, Edge)</li>
                  <li>❌ Check if popup blockers are enabled</li>
                  <li>❌ Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
