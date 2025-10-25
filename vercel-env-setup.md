# Vercel Environment Variables Setup

## Quick Fix for Missing Supabase Environment Variables

### Option 1: Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your project: `traclmsics`
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL
Value: https://hdogujyfbjvvewwotman.supabase.co
Environment: Production, Preview, Development

NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo
Environment: Production, Preview, Development
```

5. Click **Save**
6. Go to **Deployments** tab
7. Click **Redeploy** on the latest deployment

### Option 2: Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter: https://hdogujyfbjvvewwotman.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo

# Deploy
vercel --prod
```

### Option 3: Add to vercel.json (Not recommended for secrets)
```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://hdogujyfbjvvewwotman.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb2d1anlmYmp2dmV3d290bWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYyNTksImV4cCI6MjA3Mjg4MjI1OX0.dJBQAU0eHSr1hThSC1eZPpIJwzlqRm7LUfB-p4qepAo"
  }
}
```

## After Adding Environment Variables:
1. **Redeploy** your application
2. **Check the console** - errors should be gone
3. **Test functionality** - notifications, avatars, etc. should work

## Why This Happened:
- Your local `.env.local` file works fine
- Vercel doesn't automatically sync local environment files
- Environment variables must be manually added to Vercel dashboard
- `NEXT_PUBLIC_` variables are safe to expose (they're meant for browser use)
