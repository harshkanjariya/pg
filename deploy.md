# GitHub Pages Deployment Guide

This guide will help you deploy your Comfort Stays PG website to GitHub Pages for free hosting.

## 🚀 Quick Setup Steps

### 1. Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New repository" (green button)
3. Name it `comfort-stays-pg`
4. Make it **Public** (required for free GitHub Pages)
5. Don't initialize with README (we already have files)
6. Click "Create repository"

### 2. Push Your Code to GitHub
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Comfort Stays PG website"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/comfort-stays-pg.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select "GitHub Actions"
5. The deployment will start automatically!

### 4. Access Your Website
After deployment completes (usually 2-3 minutes):
- Your website will be available at: `https://YOUR_USERNAME.github.io/comfort-stays-pg/`
- You can also find the URL in Settings → Pages

## 🔄 Automatic Deployment

Every time you push changes to the `main` branch:
1. GitHub Actions automatically builds your website
2. Deploys it to GitHub Pages
3. Your website updates within 2-3 minutes

## 📝 Making Updates

To update your website:
```bash
# Make your changes to the code
# Then commit and push
git add .
git commit -m "Update website content"
git push origin main
```

## ⚙️ Configuration

The deployment is configured with:
- **Build command**: `npm run build`
- **Output directory**: `dist/`
- **Base URL**: `/comfort-stays-pg/` (matches your repo name)

## 🎯 Benefits of GitHub Pages

- ✅ **Free hosting** forever
- ✅ **Custom domain** support (you can add your own domain later)
- ✅ **HTTPS** automatically enabled
- ✅ **Fast global CDN**
- ✅ **Automatic deployments** on every push
- ✅ **No server maintenance** required

## 🔧 Troubleshooting

### If deployment fails:
1. Check the **Actions** tab in your GitHub repository
2. Look for error messages in the workflow logs
3. Common issues:
   - Missing dependencies
   - Build errors
   - Permission issues

### If website doesn't load:
1. Wait 5-10 minutes after first deployment
2. Check the URL format: `https://YOUR_USERNAME.github.io/comfort-stays-pg/`
3. Ensure repository is **public**

## 🌐 Custom Domain (Optional)

Later, you can add a custom domain:
1. Buy a domain (like `comfortstayspg.com`)
2. In GitHub Settings → Pages, add your custom domain
3. Update DNS records as instructed
4. Your website will be available at your custom domain!

---

**Your PG website will be live and accessible worldwide once deployed! 🎉**
