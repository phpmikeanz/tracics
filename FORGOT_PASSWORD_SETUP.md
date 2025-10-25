# Forgot Password Setup Guide

This guide explains how the forgot password feature works and how to configure it in your Supabase project.

## Features Implemented

### 1. **Forgot Password Link on Login Page**
- Added "Forgot password?" link below the password field
- Clicking it shows a password reset form

### 2. **Password Reset Request**
- Users can enter their email address
- System sends a password reset email via Supabase
- Email contains a secure reset link

### 3. **Password Reset Page**
- Created `/auth/reset-password` page
- Users can set a new password after clicking the reset link
- Validates password requirements (minimum 6 characters)
- Confirms password match before updating

## Configuration Steps

### 1. Configure Supabase Email Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Edit the **Reset Password** template:

**Subject:**
```
Reset your password for TTRAC
```

**Body (HTML):**
```html
<h2>Reset Your Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 1 hour.</p>
```

**Body (Plain Text):**
```
Reset Your Password

Follow this link to reset your password:
{{ .ConfirmationURL }}

If you didn't request this, you can safely ignore this email.
This link will expire in 1 hour.
```

### 2. Configure Email Settings

1. In Supabase Dashboard, go to **Settings** > **Auth**
2. Under **Email Auth**, ensure:
   - "Enable email confirmations" is enabled
   - "Enable email change confirmations" is enabled
   - Site URL is set to your application URL (e.g., `http://localhost:3000` or your production URL)

### 3. Redirect URL Configuration

The reset password link redirects to: `${window.location.origin}/auth/reset-password`

Make sure your Supabase **Redirect URLs** include:
- Development: `http://localhost:3000/auth/reset-password`
- Production: `https://yourdomain.com/auth/reset-password`

To add redirect URLs:
1. Go to **Authentication** > **URL Configuration**
2. Add your redirect URLs in the "Redirect URLs" section

### 4. Email Service Setup (Optional)

If you want custom email sending:
1. Go to **Settings** > **Auth** > **SMTP Settings**
2. Configure your SMTP provider (SendGrid, Mailgun, etc.)
3. Or use Supabase's built-in email service

## How It Works

### Flow:

1. **User clicks "Forgot password?"**
   - Login form shows password reset form

2. **User enters email and submits**
   - System calls `supabase.auth.resetPasswordForEmail()`
   - Supabase sends password reset email

3. **User clicks link in email**
   - Link redirects to `/auth/reset-password`
   - Page validates the reset token from URL

4. **User enters new password**
   - System validates password requirements
   - Confirms password match
   - Updates password via `supabase.auth.updateUser()`

5. **Success**
   - User is redirected to login page
   - Can now login with new password

## Security Features

- ✅ Secure reset links with expiration
- ✅ Token validation before allowing password change
- ✅ Password confirmation required
- ✅ Minimum password length enforcement
- ✅ Session validation on reset page

## Testing

### Test the Flow:

1. Go to login page
2. Click "Forgot password?"
3. Enter a valid email address
4. Check email for reset link
5. Click the link in email
6. Enter new password (twice to confirm)
7. Submit the form
8. You should be redirected to login
9. Try logging in with your new password

### Common Issues:

**Email not received:**
- Check spam/junk folder
- Verify email address is registered
- Check Supabase email logs

**Invalid reset link:**
- Links expire after 1 hour
- Link can only be used once
- Request a new reset link

**"Invalid or expired reset link" error:**
- Token may have expired
- Link may have already been used
- Request a new password reset

## Code Files Modified

- `components/auth/login-form.tsx` - Added forgot password UI
- `app/auth/reset-password/page.tsx` - New reset password page
- `contexts/auth-context.tsx` - Fixed logout functionality

## Additional Notes

- Reset links expire in 1 hour by default
- Each reset link can only be used once
- Email sending rate is limited to prevent abuse
- Users must have a confirmed email address
