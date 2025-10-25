# Client-Side Exception Debug Guide

## 🚨 **Common Causes of "Application error: a client-side exception has occurred"**

### **1. Missing Environment Variables (Most Likely)**
**Error:** `Missing Supabase environment variables`
**Solution:** Add environment variables to Vercel dashboard

### **2. Auth Context Issues**
**Error:** `useAuth must be used within AuthProvider`
**Solution:** Ensure all components using `useAuth` are wrapped in `AuthProvider`

### **3. Hydration Mismatch**
**Error:** `Text content does not match server-rendered HTML`
**Solution:** Use `useEffect` to prevent SSR/client mismatch

### **4. Missing Dependencies**
**Error:** `Cannot read property of undefined`
**Solution:** Add proper null checks and loading states

## 🔧 **Quick Fixes to Try**

### **Fix 1: Add Error Boundary**
Create an error boundary to catch and display errors gracefully.

### **Fix 2: Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for specific error messages
4. Check Network tab for failed requests

### **Fix 3: Verify Environment Variables**
Ensure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Fix 4: Check Component Imports**
Verify all imported components exist and are properly exported.

## 🛠 **Immediate Actions**

1. **Check Console Errors** - Look for specific error messages
2. **Verify Environment Variables** - Ensure they're set in Vercel
3. **Test with Minimal Setup** - Try accessing a simple page first
4. **Check Network Requests** - Look for failed API calls

## 📋 **Debugging Checklist**

- [ ] **Environment Variables**: Are they set in Vercel?
- [ ] **Console Errors**: What specific errors are showing?
- [ ] **Network Requests**: Are API calls failing?
- [ ] **Component Imports**: Are all imports working?
- [ ] **Auth State**: Is the user properly authenticated?
