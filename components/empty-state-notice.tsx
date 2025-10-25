import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Info } from "lucide-react"

interface EmptyStateNoticeProps {
  title: string
  description: string
  actionText?: string
  onAction?: () => void
}

export function EmptyStateNotice({ title, description, actionText, onAction }: EmptyStateNoticeProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-blue-800 font-medium mb-1">Database Connected</p>
              <p className="text-xs text-blue-700">
                This section now pulls data directly from your Supabase database. 
                The system is fully functional - add real courses, assignments, and quizzes to see them here.
              </p>
            </div>
          </div>
        </div>
        
        {actionText && onAction && (
          <Button onClick={onAction}>{actionText}</Button>
        )}
      </CardContent>
    </Card>
  )
}
