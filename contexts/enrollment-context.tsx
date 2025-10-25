"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface EnrollmentRequest {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseName: string
  courseCode: string
  instructorId: string
  status: "pending" | "approved" | "declined"
  requestDate: string
  processedDate?: string
  processedBy?: string
}

interface EnrollmentContextType {
  enrollmentRequests: EnrollmentRequest[]
  addEnrollmentRequest: (request: Omit<EnrollmentRequest, "id" | "requestDate">) => void
  updateEnrollmentStatus: (requestId: string, status: "approved" | "declined", processedBy: string) => void
  getRequestsForInstructor: (instructorId: string) => EnrollmentRequest[]
  getRequestsForStudent: (studentId: string) => EnrollmentRequest[]
  removeStudent: (studentId: string, courseId: string) => void
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined)

export function EnrollmentProvider({ children }: { children: ReactNode }) {
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ttrac-enrollment-requests")
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: "1",
              studentId: "student1",
              studentName: "Maria Santos",
              studentEmail: "maria.santos@ttrac.edu.ph",
              courseId: "1",
              courseName: "Programming Fundamentals",
              courseCode: "CS101",
              instructorId: "faculty1",
              status: "pending",
              requestDate: "2024-01-10T10:00:00Z",
            },
            {
              id: "2",
              studentId: "student2",
              studentName: "Ahmed Hassan",
              studentEmail: "ahmed.hassan@ttrac.edu.ph",
              courseId: "2",
              courseName: "Data Structures & Algorithms",
              courseCode: "CS201",
              instructorId: "faculty1",
              status: "approved",
              requestDate: "2024-01-08T14:30:00Z",
              processedDate: "2024-01-09T09:15:00Z",
              processedBy: "Dr. Garcia",
            },
            {
              id: "3",
              studentId: "student3",
              studentName: "Rosa Delgado",
              studentEmail: "rosa.delgado@ttrac.edu.ph",
              courseId: "1",
              courseName: "Programming Fundamentals",
              courseCode: "CS101",
              instructorId: "faculty1",
              status: "declined",
              requestDate: "2024-01-05T16:20:00Z",
              processedDate: "2024-01-06T11:45:00Z",
              processedBy: "Dr. Garcia",
            },
          ]
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem("ttrac-enrollment-requests", JSON.stringify(enrollmentRequests))
  }, [enrollmentRequests])

  const addEnrollmentRequest = (request: Omit<EnrollmentRequest, "id" | "requestDate">) => {
    const newRequest: EnrollmentRequest = {
      ...request,
      id: Date.now().toString(),
      requestDate: new Date().toISOString(),
    }
    setEnrollmentRequests((prev) => [...prev, newRequest])
  }

  const updateEnrollmentStatus = (requestId: string, status: "approved" | "declined", processedBy: string) => {
    setEnrollmentRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              processedDate: new Date().toISOString(),
              processedBy,
            }
          : request,
      ),
    )
  }

  const getRequestsForInstructor = (instructorId: string) => {
    return enrollmentRequests.filter((request) => request.instructorId === instructorId)
  }

  const getRequestsForStudent = (studentId: string) => {
    return enrollmentRequests.filter((request) => request.studentId === studentId)
  }

  const removeStudent = (studentId: string, courseId: string) => {
    setEnrollmentRequests((prev) =>
      prev.filter(
        (request) =>
          !(request.studentId === studentId && request.courseId === courseId && request.status === "approved"),
      ),
    )
  }

  return (
    <EnrollmentContext.Provider
      value={{
        enrollmentRequests,
        addEnrollmentRequest,
        updateEnrollmentStatus,
        getRequestsForInstructor,
        getRequestsForStudent,
        removeStudent,
      }}
    >
      {children}
    </EnrollmentContext.Provider>
  )
}

export function useEnrollment() {
  const context = useContext(EnrollmentContext)
  if (context === undefined) {
    throw new Error("useEnrollment must be used within an EnrollmentProvider")
  }
  return context
}

export { EnrollmentContext }
