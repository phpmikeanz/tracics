"use client"

import { ProfessionalLoader } from "./professional-loader"

interface FullScreenLoaderProps {
  message?: string
  submessage?: string
}

export function FullScreenLoader({ 
  message = "Loading TTRAC Portal...", 
  submessage = "Please wait while we prepare your dashboard"
}: FullScreenLoaderProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10">
        <ProfessionalLoader 
          message={message}
          submessage={submessage}
          size="lg"
          showLogo={true}
        />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-ping [animation-delay:-2s]"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary/30 rounded-full animate-ping [animation-delay:-1s]"></div>
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-primary/25 rounded-full animate-ping [animation-delay:-3s]"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-primary/20 rounded-full animate-ping [animation-delay:-4s]"></div>
      </div>
    </div>
  )
}






