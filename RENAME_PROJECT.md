# Renaming Project to "who are you"

## Option 1: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Find **Project Name** field
5. Ensure it's set to: `who are you` (or `who-are-you` for URL-friendly version)
6. Click **Save**

**Note:** The project URL will be `https://who-are-you-xxxxx.vercel.app` (Vercel automatically converts spaces to hyphens)

## Option 2: Via Vercel CLI (if you have API access)

You can also rename using the Vercel API, but the dashboard method is simpler.

## What This Changes:

- ✅ Project display name in Vercel dashboard
- ✅ Project URL (becomes `who-are-you-xxxxx.vercel.app`)
- ✅ All deployments will use the new name

## What This Doesn't Change:

- ❌ Your custom domain (`whoareyou.tech`) - this stays the same
- ❌ Local folder name (now `who are you`)
- ❌ Git repository (if you have one)

## After Renaming:

Your custom domain `whoareyou.tech` will still work - it's independent of the project name!
