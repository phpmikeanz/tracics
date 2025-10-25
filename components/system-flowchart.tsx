"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SystemFlowchart() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">TTRAC LMS System Architecture & User Flow</CardTitle>
          <CardDescription className="text-center">
            Complete system flowchart showing user journeys and component interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 1200 800" className="w-full h-auto border rounded-lg bg-gray-50">
              {/* Authentication Layer */}
              <rect x="50" y="50" width="200" height="80" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" rx="8" />
              <text x="150" y="85" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Login System
              </text>
              <text x="150" y="105" textAnchor="middle" fill="white" className="text-xs">
                Email/Password Auth
              </text>

              {/* Role Decision */}
              <polygon points="150,170 200,200 150,230 100,200" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
              <text x="150" y="205" textAnchor="middle" fill="white" className="text-xs font-semibold">
                Role?
              </text>

              {/* Student Flow */}
              <rect x="50" y="280" width="180" height="60" fill="#10b981" stroke="#059669" strokeWidth="2" rx="6" />
              <text x="140" y="305" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Student Dashboard
              </text>
              <text x="140" y="320" textAnchor="middle" fill="white" className="text-xs">
                Overview & Navigation
              </text>

              <rect x="50" y="380" width="120" height="50" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" rx="4" />
              <text x="110" y="400" textAnchor="middle" fill="white" className="text-xs">
                Course Catalog
              </text>
              <text x="110" y="415" textAnchor="middle" fill="white" className="text-xs">
                Browse & Enroll
              </text>

              <rect x="190" y="380" width="120" height="50" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" rx="4" />
              <text x="250" y="400" textAnchor="middle" fill="white" className="text-xs">
                My Assignments
              </text>
              <text x="250" y="415" textAnchor="middle" fill="white" className="text-xs">
                Submit & Track
              </text>

              <rect x="330" y="380" width="120" height="50" fill="#ec4899" stroke="#db2777" strokeWidth="2" rx="4" />
              <text x="390" y="400" textAnchor="middle" fill="white" className="text-xs">
                Quiz Center
              </text>
              <text x="390" y="415" textAnchor="middle" fill="white" className="text-xs">
                Take Quizzes
              </text>

              {/* Faculty Flow */}
              <rect x="650" y="280" width="180" height="60" fill="#f97316" stroke="#ea580c" strokeWidth="2" rx="6" />
              <text x="740" y="305" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Faculty Dashboard
              </text>
              <text x="740" y="320" textAnchor="middle" fill="white" className="text-xs">
                Teaching Overview
              </text>

              <rect x="550" y="380" width="120" height="50" fill="#84cc16" stroke="#65a30d" strokeWidth="2" rx="4" />
              <text x="610" y="400" textAnchor="middle" fill="white" className="text-xs">
                Course Mgmt
              </text>
              <text x="610" y="415" textAnchor="middle" fill="white" className="text-xs">
                Create & Edit
              </text>

              <rect x="690" y="380" width="120" height="50" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" rx="4" />
              <text x="750" y="400" textAnchor="middle" fill="white" className="text-xs">
                Assignment Mgmt
              </text>
              <text x="750" y="415" textAnchor="middle" fill="white" className="text-xs">
                Create & Grade
              </text>

              <rect x="830" y="380" width="120" height="50" fill="#dc2626" stroke="#b91c1c" strokeWidth="2" rx="4" />
              <text x="890" y="400" textAnchor="middle" fill="white" className="text-xs">
                Quiz Mgmt
              </text>
              <text x="890" y="415" textAnchor="middle" fill="white" className="text-xs">
                Create & Analyze
              </text>

              {/* Notification System */}
              <rect x="450" y="50" width="200" height="80" fill="#7c3aed" stroke="#6d28d9" strokeWidth="2" rx="8" />
              <text x="550" y="85" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Notification System
              </text>
              <text x="550" y="105" textAnchor="middle" fill="white" className="text-xs">
                Real-time Updates
              </text>

              {/* Data Layer */}
              <rect x="400" y="500" width="300" height="80" fill="#374151" stroke="#1f2937" strokeWidth="2" rx="8" />
              <text x="550" y="535" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Data Management Layer
              </text>
              <text x="550" y="555" textAnchor="middle" fill="white" className="text-xs">
                Courses, Users, Assignments, Quizzes, Notifications
              </text>

              {/* Context Providers */}
              <rect x="750" y="50" width="180" height="60" fill="#059669" stroke="#047857" strokeWidth="2" rx="6" />
              <text x="840" y="75" textAnchor="middle" fill="white" className="text-sm font-semibold">
                Context Providers
              </text>
              <text x="840" y="90" textAnchor="middle" fill="white" className="text-xs">
                Auth & Notifications
              </text>

              {/* Arrows - Authentication Flow */}
              <path d="M 150 130 L 150 170" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Student Flow Arrows */}
              <path d="M 120 230 L 120 280" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 140 340 L 110 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 140 340 L 250 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 140 340 L 390 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Faculty Flow Arrows */}
              <path d="M 180 230 L 740 280" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 740 340 L 610 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 740 340 L 750 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 740 340 L 890 380" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Notification Arrows */}
              <path d="M 550 130 L 550 280" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,5" />
              <path d="M 550 130 L 740 280" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,5" />

              {/* Data Layer Arrows */}
              <path d="M 250 430 L 450 500" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 390 430 L 500 500" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 610 430 L 500 500" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 750 430 L 600 500" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 890 430 L 650 500" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Context Provider Arrows */}
              <path d="M 750 80 L 650 80" stroke="#059669" strokeWidth="2" strokeDasharray="3,3" />
              <path d="M 750 90 L 250 90" stroke="#059669" strokeWidth="2" strokeDasharray="3,3" />

              {/* Arrow marker definition */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                </marker>
              </defs>

              {/* Legend */}
              <rect x="50" y="650" width="500" height="120" fill="white" stroke="#d1d5db" strokeWidth="1" rx="4" />
              <text x="70" y="670" className="text-sm font-semibold">
                Legend:
              </text>

              <rect x="70" y="680" width="15" height="15" fill="#3b82f6" />
              <text x="95" y="692" className="text-xs">
                Authentication
              </text>

              <rect x="200" y="680" width="15" height="15" fill="#10b981" />
              <text x="225" y="692" className="text-xs">
                Student Features
              </text>

              <rect x="350" y="680" width="15" height="15" fill="#f97316" />
              <text x="375" y="692" className="text-xs">
                Faculty Features
              </text>

              <rect x="70" y="705" width="15" height="15" fill="#7c3aed" />
              <text x="95" y="717" className="text-xs">
                Notifications
              </text>

              <rect x="200" y="705" width="15" height="15" fill="#374151" />
              <text x="225" y="717" className="text-xs">
                Data Layer
              </text>

              <line x1="350" y1="712" x2="365" y2="712" stroke="#059669" strokeWidth="2" strokeDasharray="3,3" />
              <text x="375" y="717" className="text-xs">
                Context Providers
              </text>

              <text x="70" y="740" className="text-xs">
                Solid arrows: Direct user flow
              </text>
              <text x="70" y="755" className="text-xs">
                Dashed arrows: System-wide services
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* System Components Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm">Login with TTRAC credentials</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Access student dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <span className="text-sm">Browse and enroll in courses</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm">Submit assignments</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              <span className="text-sm">Take quizzes</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              <span className="text-sm">Receive notifications</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faculty Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm">Login with faculty credentials</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm">Access faculty dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-lime-500 rounded-full"></div>
              <span className="text-sm">Create and manage courses</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span className="text-sm">Create assignments and grade</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <span className="text-sm">Create quizzes and analyze</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
              <span className="text-sm">Send notifications</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
