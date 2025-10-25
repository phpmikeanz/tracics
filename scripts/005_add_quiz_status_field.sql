-- Add status field to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed'));

-- Update existing quizzes to have 'published' status (since they were created without status)
UPDATE public.quizzes SET status = 'published' WHERE status IS NULL;

-- Make status field NOT NULL after setting default values
ALTER TABLE public.quizzes ALTER COLUMN status SET NOT NULL;
