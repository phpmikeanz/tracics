"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ProfessionalLoaderProps {
  message?: string
  submessage?: string
  className?: string
  size?: "sm" | "md" | "lg"
  showLogo?: boolean
}

export function ProfessionalLoader({ 
  message = "Loading...", 
  submessage,
  className,
  size = "md",
  showLogo = true
}: ProfessionalLoaderProps) {
  const sizeClasses = {
    sm: {
      container: "py-8",
      logo: "h-12 w-12",
      spinner: "h-6 w-6",
      message: "text-lg",
      submessage: "text-sm"
    },
    md: {
      container: "py-12",
      logo: "h-16 w-16",
      spinner: "h-8 w-8", 
      message: "text-xl",
      submessage: "text-base"
    },
    lg: {
      container: "py-16",
      logo: "h-20 w-20",
      spinner: "h-10 w-10",
      message: "text-2xl",
      submessage: "text-lg"
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[200px]",
      currentSize.container,
      className
    )}>
      {/* Logo with Animation */}
      {showLogo && (
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
          <div className={cn(
            "relative bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-lg flex items-center justify-center",
            currentSize.logo
          )}>
            <img 
              src="/ttrac-logo.png" 
              alt="TTRAC Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error("Logo failed to load:", e);
                // Hide image and show text fallback
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center text-white font-bold text-lg">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-lg mr-2 flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary rounded-full"></div>
                </div>
                <span>TTRAC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spinner */}
      <div className="relative mb-4">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/10"></div>
        <Loader2 className={cn("animate-spin text-primary", currentSize.spinner)} />
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <h3 className={cn(
          "font-semibold text-foreground animate-pulse",
          currentSize.message
        )}>
          {message}
        </h3>
        
        {submessage && (
          <p className={cn(
            "text-muted-foreground max-w-md",
            currentSize.submessage
          )}>
            {submessage}
          </p>
        )}
      </div>

      {/* Animated Dots */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>
    </div>
  )
}




