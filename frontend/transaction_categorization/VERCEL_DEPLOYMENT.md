# Vercel Deployment Guide

This guide will help you deploy the TransactAI frontend to Vercel.

## Prerequisites

1. A GitHub account with your code pushed to a repository
2. A Vercel account (sign up at https://vercel.com)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import Your Repository**
   - Select your GitHub repository
   - Choose the branch (usually `main`)

3. **Configure Project Settings**
   - **Root Directory**: Set to `frontend` (since your Next.js app is in the frontend folder)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** (Optional)
   - Since the app uses localStorage only, no environment variables are required
   - If you plan to connect to a backend later, you can add:
     - `NEXT_PUBLIC_API_URL` (your backend API URL)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```

5. **Follow the prompts**
   - Link to existing project or create new
   - Confirm settings
   - Deploy

## Important Configuration

### Root Directory Setup

If your repository root contains both `frontend` and other folders:

1. In Vercel Dashboard → Project Settings → General
2. Set **Root Directory** to `frontend`
3. This tells Vercel to build from the `frontend` folder

### Build Settings

The `vercel.json` file in the frontend folder ensures correct build configuration:
- Build command: `npm run build`
- Output directory: `.next`
- Framework: Next.js

## Troubleshooting

### Build Fails with TypeScript Errors

- Make sure all TypeScript errors are resolved locally
- Run `npm run build` locally to test before deploying

### Build Fails with Module Not Found

- Ensure all dependencies are in `package.json`
- Check that `node_modules` is in `.gitignore` (it should be)

### Images Not Loading

- Make sure image paths are correct (use `/image.png` for public folder)
- Check that images are in the `public` folder

### localStorage Not Working

- localStorage works in the browser, so it should work on Vercel
- Make sure you're testing in a browser, not during build time

## Post-Deployment

1. **Test Your Deployment**
   - Visit your Vercel URL
   - Test all features
   - Check browser console for errors

2. **Custom Domain** (Optional)
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Environment Variables** (If needed later)
   - Go to Project Settings → Environment Variables
   - Add any required variables
   - Redeploy after adding variables

## Notes

- The app uses **localStorage only** - no backend required
- Each user's data is stored in their browser
- Data is isolated per phone number/user
- No database or API calls needed for basic functionality

## Support

If you encounter issues:
1. Check Vercel build logs for specific errors
2. Test build locally: `cd frontend && npm run build`
3. Check Next.js documentation: https://nextjs.org/docs

