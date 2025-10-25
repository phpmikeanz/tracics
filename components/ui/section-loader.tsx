"use client"

import { ProfessionalLoader } from "./professional-loader"

interface SectionLoaderProps {
  message?: string
  submessage?: string
  className?: string
}

export function SectionLoader({ 
  message = "Loading...", 
  submessage,
  className
}: SectionLoaderProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className || ''}`}>
      <div className="relative">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl blur-xl"></div>
        
        {/* Content */}
        <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
          <ProfessionalLoader 
            message={message}
            submessage={submessage}
            size="md"
            showLogo={false}
          />
        </div>
      </div>
    </div>
  )
}






