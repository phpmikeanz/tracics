"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { downloadAssignmentFile, getFileNameFromUrl } from "@/lib/file-upload"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function ViewFilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const fileKey = searchParams.get("key")
  const fileUrlParam = searchParams.get("url") // Fallback for direct URLs
  const fileName = searchParams.get("name") || "File"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Get file URL from localStorage if key is provided, otherwise use direct URL
    let url: string | null = null
    
    if (fileKey) {
      // Check expiration
      const expires = localStorage.getItem(`${fileKey}_expires`)
      if (expires && parseInt(expires) < Date.now()) {
        // Expired, clean up
        localStorage.removeItem(fileKey)
        localStorage.removeItem(`${fileKey}_expires`)
        setError("File session expired. Please try viewing again.")
        setLoading(false)
        return
      }
      
      url = localStorage.getItem(fileKey)
      if (url) {
        // Clean up the localStorage after retrieving (optional - can keep for back button)
        // localStorage.removeItem(fileKey)
        // localStorage.removeItem(`${fileKey}_expires`)
      } else {
        setError("File not found. Please try viewing again.")
        setLoading(false)
        return
      }
    } else if (fileUrlParam) {
      url = fileUrlParam
    }

    if (!url) {
      setError("No file URL provided")
      setLoading(false)
      return
    }

    setFileUrl(url)

    // Cleanup previous blob URL if it exists
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    // Handle base64 data URLs directly
    if (url.startsWith('data:')) {
      setViewUrl(url)
      setLoading(false)
      return
    }

    // For Supabase storage URLs, fetch the file with authentication
    const fetchFile = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Extract bucket and path from Supabase storage URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
        
        if (urlMatch) {
          const bucket = urlMatch[1]
          const path = decodeURIComponent(urlMatch[2])
          
          // Download the file with authentication
          const { data, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(path)
          
          if (downloadError) {
            console.error('Download error:', downloadError)
            // Fallback to direct URL if download fails
            setViewUrl(url)
            setLoading(false)
            return
          }
          
          // Create blob URL from the downloaded file
          const blobUrl = URL.createObjectURL(data)
          blobUrlRef.current = blobUrl
          setViewUrl(blobUrl)
          setLoading(false)
        } else {
          // Not a Supabase storage URL, use directly
          setViewUrl(url)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching file:', err)
        // Fallback to direct URL
        setViewUrl(url)
        setLoading(false)
      }
    }

    fetchFile()

    // Cleanup blob URL on unmount or when fileUrl changes
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [fileKey, fileUrlParam])

  const handleDownload = async () => {
    if (!fileUrl) return
    
    try {
      await downloadAssignmentFile(fileUrl, fileName)
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    router.back()
  }

  if (!fileUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No file URL provided</p>
          <Button onClick={handleClose}>Go Back</Button>
        </div>
      </div>
    )
  }

  // Determine file type for appropriate viewing
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || ""
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(fileExtension)
  const isPdf = fileExtension === "pdf"
  const isWord = ["doc", "docx"].includes(fileExtension)
  const isExcel = ["xls", "xlsx"].includes(fileExtension)
  const isPowerPoint = ["ppt", "pptx"].includes(fileExtension)
  const isText = ["txt", "md", "json", "xml", "csv", "log"].includes(fileExtension)
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(fileExtension)
  const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(fileExtension)

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-semibold truncate">{fileName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="Download file"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Loading file...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleClose}>Go Back</Button>
            </div>
          </div>
        ) : !viewUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Preparing file...</p>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            {isImage ? (
              <div className="flex items-center justify-center h-full w-full p-4 bg-gray-100 overflow-auto">
                <img
                  src={viewUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setError("Failed to load image")
                    setLoading(false)
                  }}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={`${viewUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`}
                className="w-full h-full border-0"
                title={fileName}
                style={{ minHeight: '100%' }}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError("Failed to load PDF")
                  setLoading(false)
                }}
              />
            ) : isWord || isExcel || isPowerPoint ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6 mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Office documents are best viewed by downloading. You can also use online viewers:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Use Google Docs Viewer
                        const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`
                        window.open(googleViewerUrl, '_blank')
                      }}
                    >
                      Open in Google Docs Viewer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`}
                  className="w-full flex-1 border-0 rounded-lg shadow-lg"
                  title={fileName}
                  style={{ minHeight: '600px' }}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setError("Office document viewer failed to load. Please download the file to view it.")
                    setLoading(false)
                  }}
                />
              </div>
            ) : isVideo ? (
              <div className="flex items-center justify-center h-full w-full p-4 bg-black">
                <video
                  src={viewUrl}
                  controls
                  className="max-w-full max-h-full w-full h-full object-contain"
                  onLoadedData={() => setLoading(false)}
                  onError={() => {
                    setError("Failed to load video")
                    setLoading(false)
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : isAudio ? (
              <div className="flex items-center justify-center h-full w-full p-4 bg-gray-100">
                <div className="w-full max-w-2xl">
                  <audio
                    src={viewUrl}
                    controls
                    className="w-full"
                    onLoadedData={() => setLoading(false)}
                    onError={() => {
                      setError("Failed to load audio")
                      setLoading(false)
                    }}
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              </div>
            ) : isText ? (
              <iframe
                src={viewUrl}
                className="w-full h-full border-0"
                title={fileName}
                style={{ minHeight: '100%' }}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError("Failed to load text file")
                  setLoading(false)
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center p-4">
                <iframe
                  src={viewUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={fileName}
                  style={{ minHeight: '100%' }}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setError("This file type cannot be displayed in the browser. Please download it to view.")
                    setLoading(false)
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

