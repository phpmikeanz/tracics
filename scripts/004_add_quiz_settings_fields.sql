-- Add show_results and shuffle_questions fields to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;

-- Update the updated_at timestamp trigger for quizzes table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for quizzes table if it doesn't exist
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
