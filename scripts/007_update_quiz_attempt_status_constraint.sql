-- Update quiz_attempts table to include 'graded' status
-- This script updates the existing CHECK constraint to include 'graded' status

-- First, drop the existing constraint
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_status_check;

-- Add the new constraint with 'graded' status included
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_status_check 
CHECK (status IN ('in_progress', 'completed', 'submitted', 'graded'));

-- Update any existing 'submitted' status to 'completed' for consistency
UPDATE public.quiz_attempts SET status = 'completed' WHERE status = 'submitted';
