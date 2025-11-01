-- ==============================================
-- EMERGENCY FIX: Disable trigger to stop quiz submission loop
-- ==============================================
-- This IMMEDIATELY fixes the loop by disabling the problematic trigger
-- Run this FIRST to stop the endless loop, then apply QUIZ_NOTIFICATION_RLS_FIX.sql

-- Step 1: Drop the trigger completely
DROP TRIGGER IF EXISTS trigger_notify_quiz_attempt ON quiz_attempts;

-- Step 2: Verify it's gone
SELECT 
  'Trigger Status' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Trigger removed - quiz submissions will work'
    ELSE '⚠️ Trigger still exists'
  END as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_quiz_attempt';

-- Step 3: Optionally create a stub trigger that does nothing
-- (This ensures no errors if code expects a trigger to exist)
CREATE OR REPLACE FUNCTION notify_quiz_attempt_stub()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
    -- Intentionally do nothing - just return NEW to allow the update to succeed
    -- This prevents any RLS errors while we fix the notification policies
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Even if something goes wrong, allow the quiz submission to succeed
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a harmless trigger with the stub function
-- This way, if any code expects the trigger to exist, it won't break
CREATE TRIGGER trigger_notify_quiz_attempt
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_quiz_attempt_stub();

-- ==============================================
-- VERIFICATION
-- ==============================================
-- Verify the trigger exists but does nothing harmful
SELECT 
  'Verification' as info,
  trigger_name,
  action_timing,
  event_manipulation,
  '✅ Trigger is now harmless - quiz submissions will work' as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_quiz_attempt';

-- ==============================================
-- NEXT STEPS
-- ==============================================
-- After running this:
-- 1. ✅ Quiz submissions should work immediately (no more loop)
-- 2. ⚠️ Notifications won't be created automatically (that's okay for now)
-- 3. 📝 Then apply QUIZ_NOTIFICATION_RLS_FIX.sql to re-enable notifications properly

