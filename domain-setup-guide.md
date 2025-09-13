# Domain Setup Guide: comfort-stays-pg.in

This guide will help you connect your GoDaddy domain `comfort-stays-pg.in` to GitHub Pages.

## 🚀 Step-by-Step Setup

### Step 1: Deploy to GitHub Pages First

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Update for custom domain comfort-stays-pg.in"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your GitHub repository
   - Click **Settings** → **Pages**
   - Under **Source**, select "GitHub Actions"
   - Wait for deployment to complete

3. **Test GitHub Pages URL**:
   - Your site will be available at: `https://YOUR_USERNAME.github.io/comfort-stays-pg/`
   - Make sure it works before proceeding

### Step 2: Configure Custom Domain in GitHub

1. **Add Custom Domain**:
   - In GitHub Pages settings, scroll down to **Custom domain**
   - Enter: `comfort-stays-pg.in`
   - Click **Save**

2. **Enable HTTPS**:
   - Check **Enforce HTTPS** (this may take a few minutes to activate)
   - This ensures your site is secure

### Step 3: Configure DNS in GoDaddy

1. **Login to GoDaddy**:
   - Go to [GoDaddy.com](https://godaddy.com)
   - Login to your account
   - Go to **My Products** → **All Products and Services**

2. **Access DNS Management**:
   - Find your domain `comfort-stays-pg.in`
   - Click **DNS** or **Manage DNS**

3. **Update DNS Records**:
   
   **Delete existing A records** (if any):
   - Remove any existing A records pointing to different IPs
   
   **Add these DNS records**:
   
   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | @ | 185.199.108.153 | 600 |
   | A | @ | 185.199.109.153 | 600 |
   | A | @ | 185.199.110.153 | 600 |
   | A | @ | 185.199.111.153 | 600 |
   | CNAME | www | YOUR_USERNAME.github.io | 600 |

   **Replace `YOUR_USERNAME`** with your actual GitHub username.

### Step 4: Verify Domain Connection

1. **Check DNS Propagation**:
   - Visit [whatsmydns.net](https://www.whatsmydns.net/)
   - Enter `comfort-stays-pg.in`
   - Check if A records are propagated globally

2. **Test Your Domain**:
   - Visit `https://comfort-stays-pg.in`
   - Should redirect to your GitHub Pages site
   - Should show green lock icon (HTTPS enabled)

### Step 5: Create CNAME File (Important!)

1. **Create CNAME file** in your repository root:
   ```bash
   echo "comfort-stays-pg.in" > CNAME
   git add CNAME
   git commit -m "Add CNAME file for custom domain"
   git push origin main
   ```

## 🔧 Troubleshooting

### If Domain Doesn't Work:

1. **Check DNS Propagation**:
   - DNS changes can take 24-48 hours
   - Use [whatsmydns.net](https://www.whatsmydns.net/) to check

2. **Verify GitHub Pages Settings**:
   - Custom domain should show green checkmark
   - HTTPS should be enforced

3. **Check CNAME File**:
   - Make sure `CNAME` file exists in repository root
   - Should contain only: `comfort-stays-pg.in`

### Common Issues:

- **Domain shows GitHub 404**: DNS not propagated yet, wait 24-48 hours
- **HTTPS not working**: Enable "Enforce HTTPS" in GitHub Pages settings
- **www not redirecting**: Make sure CNAME record for www is set correctly

## 📱 Final Result

Once setup is complete:
- ✅ `comfort-stays-pg.in` → Your website
- ✅ `www.comfort-stays-pg.in` → Your website  
- ✅ HTTPS enabled (green lock icon)
- ✅ Professional custom domain

## 🎯 SEO Benefits

Your custom domain provides:
- ✅ **Professional branding**: Custom .in domain for India
- ✅ **Better SEO**: Custom domain ranks better than GitHub subdomain
- ✅ **Trust factor**: Professional domain increases credibility
- ✅ **Easy to remember**: `comfort-stays-pg.in` is memorable

## 📞 Support

If you encounter issues:
1. Check GoDaddy DNS documentation
2. Check GitHub Pages documentation
3. DNS propagation can take up to 48 hours

---

**Your website will be live at `https://comfort-stays-pg.in` once DNS propagates!** 🎉
