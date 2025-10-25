# Reset Password URL Fix Guide

## 🚨 **Problem: Reset Password Emails Point to localhost**

Your reset password emails are showing `http://localhost:3000/` instead of your Vercel domain.

## 🔧 **Solution: Add SITE_URL Environment Variable**

### **Step 1: Add Environment Variable to Vercel**

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `traclmsics`
3. Go to **Settings** → **Environment Variables**
4. Add this new variable:

```
NEXT_PUBLIC_SITE_URL = https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app
```

**Important:** Replace `traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app` with your actual Vercel domain.

### **Step 2: Update Supabase Configuration**

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel domain to **Redirect URLs**:
   ```
   https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app/auth/reset-password
   ```
4. Update **Site URL** to your Vercel domain:
   ```
   https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app
   ```

### **Step 3: Redeploy Your Application**

After adding the environment variable:
1. Go to **Deployments** tab in Vercel
2. Click **"Redeploy"** on your latest deployment
3. Wait for deployment to complete

## ✅ **What I've Fixed in the Code**

### **Updated Reset Password Logic**
- Changed from: `window.location.origin` (always localhost in dev)
- Changed to: `process.env.NEXT_PUBLIC_SITE_URL || window.location.origin`
- This ensures production uses your Vercel domain

### **Code Changes Made:**
```typescript
// Before (problematic)
redirectTo: `${window.location.origin}/auth/reset-password`

// After (fixed)
redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/reset-password`
```

## 🧪 **Testing the Fix**

### **Test Steps:**
1. **Add the environment variable** to Vercel (Step 1 above)
2. **Update Supabase URLs** (Step 2 above)
3. **Redeploy** your application (Step 3 above)
4. **Test reset password:**
   - Go to your Vercel app
   - Click "Forgot password?"
   - Enter your email
   - Check the email - it should now show your Vercel domain

### **Expected Result:**
- ✅ Reset password emails will show: `https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app/auth/reset-password`
- ✅ Clicking the link will work properly
- ✅ Users can reset their passwords successfully

## 🔍 **Verification Checklist**

- [ ] **Environment Variable Added**: `NEXT_PUBLIC_SITE_URL` set in Vercel
- [ ] **Supabase URLs Updated**: Redirect URLs include your Vercel domain
- [ ] **Application Redeployed**: Latest deployment includes the fix
- [ ] **Email Test**: Reset password email shows correct domain
- [ ] **Link Test**: Clicking reset link works properly

## 🚨 **Common Issues**

### **Issue 1: Still Shows localhost**
**Solution:** Make sure you redeployed after adding the environment variable

### **Issue 2: Link Doesn't Work**
**Solution:** Check that Supabase redirect URLs include your Vercel domain

### **Issue 3: Environment Variable Not Working**
**Solution:** Verify the variable name is exactly `NEXT_PUBLIC_SITE_URL`

## 📋 **Quick Reference**

**Your Vercel Domain:** `https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app`

**Environment Variable to Add:**
```
NEXT_PUBLIC_SITE_URL = https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app
```

**Supabase Redirect URL to Add:**
```
https://traclmsics-bj1dzyxpc-phpmikeanzs-projects.vercel.app/auth/reset-password
```

After completing these steps, your reset password functionality should work correctly with your Vercel domain! 🎉
