"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, 
  FileText, 
  Video, 
  Link, 
  FileCheck, 
  Search, 
  Download, 
  Calendar,
  User,
  Filter,
  ExternalLink,
  File
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { SectionLoader } from "@/components/ui/section-loader"
import { getCourseMaterialsByEnrolledCourses, formatFileSize, getFileIcon } from "@/lib/course-materials"
import type { CourseMaterialWithDetails } from "@/lib/course-materials"

type CourseMaterial = CourseMaterialWithDetails & {
  courses?: {
    title: string
    course_code: string
  }
}

export function StudentCourseMaterials() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")

  // Load course materials for enrolled courses
  useEffect(() => {
    async function loadCourseMaterials() {
      if (!user?.id) return

      try {
        setLoading(true)
        setError("")

        console.log("[StudentCourseMaterials] Loading materials for student:", user.id)
        
        const courseMaterials = await getCourseMaterialsByEnrolledCourses(user.id)
        console.log("[StudentCourseMaterials] Loaded materials:", courseMaterials)
        
        setMaterials(courseMaterials)
      } catch (error) {
        console.error("[StudentCourseMaterials] Error loading materials:", error)
        setError("Failed to load course materials. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }

    loadCourseMaterials()
  }, [user?.id])

  // Get unique courses from materials
  const availableCourses = Array.from(
    new Set(materials.map(m => m.course_id))
  ).map(courseId => {
    const material = materials.find(m => m.course_id === courseId)
    return {
      id: courseId,
      title: material?.courses?.title || "Unknown Course",
      code: material?.courses?.course_code || "N/A"
    }
  })

  // Filter materials based on search and filters
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.courses?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.courses?.course_code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCourse = selectedCourse === "all" || material.course_id === selectedCourse
    const matchesType = selectedType === "all" || material.material_type === selectedType

    return matchesSearch && matchesCourse && matchesType
  })

  // Group materials by course
  const materialsByCourse = filteredMaterials.reduce((acc, material) => {
    const courseId = material.course_id
    const courseTitle = material.courses?.title || "Unknown Course"
    const courseCode = material.courses?.course_code || "N/A"
    
    if (!acc[courseId]) {
      acc[courseId] = {
        courseTitle,
        courseCode,
        materials: []
      }
    }
    
    acc[courseId].materials.push(material)
    return acc
  }, {} as Record<string, { courseTitle: string; courseCode: string; materials: CourseMaterial[] }>)

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "link":
        return <Link className="h-4 w-4" />
      case "assignment":
        return <FileCheck className="h-4 w-4" />
      case "quiz":
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getMaterialTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-100 text-red-800 border-red-200"
      case "link":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "assignment":
        return "bg-green-100 text-green-800 border-green-200"
      case "quiz":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleDownload = (material: CourseMaterial) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank')
    }
  }

  const handleView = (material: CourseMaterial) => {
    if (material.material_type === "link" && material.file_url) {
      window.open(material.file_url, '_blank')
    } else if (material.file_url) {
      window.open(material.file_url, '_blank')
    }
  }

  if (loading) {
    return (
      <SectionLoader 
        message="Loading course materials..." 
        submessage="Fetching materials from your enrolled courses"
      />
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Course Materials</h2>
        <p className="text-muted-foreground">
          Access materials from your enrolled courses
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Courses</option>
            {availableCourses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Types</option>
            <option value="document">Documents</option>
            <option value="video">Videos</option>
            <option value="link">Links</option>
            <option value="assignment">Assignments</option>
            <option value="quiz">Quizzes</option>
          </select>
        </div>
      </div>

      {/* Materials by Course */}
      {Object.keys(materialsByCourse).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {materials.length === 0 ? "No Course Materials Available" : "No Materials Match Your Search"}
            </h3>
            <p className="text-muted-foreground text-center">
              {materials.length === 0 
                ? "Course materials will appear here once your instructors upload them."
                : "Try adjusting your search terms or filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(materialsByCourse).map(([courseId, courseData]) => (
            <Card key={courseId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {courseData.courseCode} - {courseData.courseTitle}
                  <Badge variant="outline" className="ml-auto">
                    {courseData.materials.length} material{courseData.materials.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {courseData.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-all duration-200"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {material.file_url ? (
                          <span className="text-2xl">{getFileIcon(material.file_type || '')}</span>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            {getMaterialTypeIcon(material.material_type)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-foreground mb-1 truncate">
                              {material.title}
                            </h3>
                            
                            {material.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {material.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <Badge 
                                variant="outline" 
                                className={`${getMaterialTypeColor(material.material_type)} border`}
                              >
                                {getMaterialTypeIcon(material.material_type)}
                                <span className="ml-1 capitalize">{material.material_type}</span>
                              </Badge>
                              
                              {material.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              
                              {material.file_size && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {formatFileSize(material.file_size)}
                                </span>
                              )}
                              
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(material.created_at).toLocaleDateString()}
                              </span>
                              
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {material.profiles?.full_name || "Unknown"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {material.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(material)}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            )}
                            
                            {(material.file_url || material.material_type === "link") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(material)}
                                className="flex items-center gap-1"
                              >
                                {material.material_type === "link" ? (
                                  <ExternalLink className="h-3 w-3" />
                                ) : (
                                  <File className="h-3 w-3" />
                                )}
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
