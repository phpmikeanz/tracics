-- Notification RLS Policies
-- Run this in your Supabase SQL Editor

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow system to create notifications for any user
-- This allows the application to create notifications for users
CREATE POLICY "Allow creating notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- Create an index for better performance on notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read 
ON public.notifications (user_id, read);

-- Optional: Create a function to automatically clean up old notifications
-- This function can be called periodically to remove notifications older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;



































