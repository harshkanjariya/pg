# 🔐 Google Sign-in Setup Guide for Comfort Stays PG

## 🎯 Overview
Your website now has Google Sign-in functionality that will:
- ✅ Show a "Manage PG" button only when you sign in with your official email
- ✅ Display welcome messages for both owner and guests
- ✅ Provide a foundation for future admin features

## 🚀 Setup Steps

### **Step 1: Create Google Cloud Project**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Sign in** with your Google account (harshkanjariya.official@gmail.com)
3. **Create a new project**:
   - Click "Select a project" → "New Project"
   - Project name: "Comfort Stays PG"
   - Click "Create"

### **Step 2: Enable Google Sign-in API**

1. **Navigate to APIs & Services**:
   - In the left sidebar, click "APIs & Services" → "Library"
   - Search for "Google Identity"
   - Click on "Google Identity" → "Enable"

2. **Configure OAuth consent screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" → "Create"
   - Fill in the details:
     - **App name**: Comfort Stays PG
     - **User support email**: harshkanjariya.official@gmail.com
     - **Developer contact**: harshkanjariya.official@gmail.com
   - Click "Save and Continue"
   - Skip "Scopes" for now → "Save and Continue"
   - Add test users (yourself) → "Save and Continue"

### **Step 3: Create OAuth 2.0 Credentials**

1. **Go to Credentials**:
   - "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Configure OAuth client**:
   - **Application type**: Web application
   - **Name**: Comfort Stays PG Web Client
   - **Authorized JavaScript origins**:
     - `https://comfort-stays-pg.in`
     - `http://localhost:8000` (for testing)
   - **Authorized redirect URIs**:
     - `https://comfort-stays-pg.in`
     - `http://localhost:8000`
   - Click "Create"

3. **Copy the Client ID**:
   - You'll get a popup with your Client ID
   - Copy this ID (it looks like: `123456789-abcdefg.apps.googleusercontent.com`)

### **Step 4: Update Your Website**

1. **Replace the placeholder** in your `index.html`:
   ```javascript
   // Find this line in your index.html:
   client_id: 'YOUR_GOOGLE_CLIENT_ID',
   
   // Replace with your actual Client ID:
   client_id: '123456789-abcdefg.apps.googleusercontent.com',
   ```

2. **Test locally first**:
   ```bash
   python3 -m http.server 8000
   ```
   - Visit `http://localhost:8000`
   - Try signing in with your email

3. **Deploy to GitHub Pages**:
   - Push your changes to GitHub
   - The changes will auto-deploy to https://comfort-stays-pg.in

## 🎯 How It Works

### **For You (Owner - harshkanjariya.official@gmail.com):**
1. **Sign in** with your Google account
2. **See "🔧 Manage PG" button** in top-right corner
3. **Get welcome message**: "Welcome, Harsh! Owner Dashboard Active"
4. **Click Manage button** → Shows coming soon features

### **For Visitors (Other emails):**
1. **Sign in** with any Google account
2. **See welcome message**: "Welcome, [Name]! Thanks for visiting Comfort Stays PG"
3. **No manage button** appears

### **Features Included:**
- ✅ **Email verification** (only your email gets admin access)
- ✅ **Visual feedback** (different messages for owner vs guests)
- ✅ **Manage button** (floating, styled with your brand colors)
- ✅ **Auto-hide messages** (welcome messages disappear after 5 seconds)
- ✅ **Responsive design** (works on mobile and desktop)

## 🔧 Future Enhancements

### **Phase 1: Basic Admin Panel**
- View contact form submissions
- Update pricing information
- Manage amenities list
- View website analytics

### **Phase 2: Advanced Features**
- Booking management system
- Customer database
- Payment tracking
- Room availability calendar

### **Phase 3: Full CMS**
- Content management
- Image gallery updates
- Blog posts
- SEO optimization tools

## 🛠️ Troubleshooting

### **Common Issues:**

1. **"Invalid Client ID" Error**:
   - Double-check the Client ID in your code
   - Ensure the domain is added to authorized origins

2. **Sign-in Button Not Appearing**:
   - Check browser console for errors
   - Verify Google Sign-in script is loading

3. **Manage Button Not Showing**:
   - Ensure you're signed in with harshkanjariya.official@gmail.com
   - Check browser console for authentication errors

### **Testing Checklist:**
- ✅ Sign-in button appears in navigation
- ✅ Can sign in with Google account
- ✅ Owner email shows manage button
- ✅ Other emails show guest message
- ✅ Manage button has hover effects
- ✅ Works on mobile devices

## 📱 Mobile Optimization

The Google Sign-in is fully responsive:
- **Desktop**: Button in navigation bar
- **Mobile**: Button centered below navigation
- **Touch-friendly**: Large button size for easy tapping

## 🔒 Security Features

- ✅ **Email verification**: Only your official email gets admin access
- ✅ **JWT token validation**: Secure authentication
- ✅ **HTTPS required**: Works only on secure domains
- ✅ **Domain restrictions**: Only works on your authorized domains

## 🎉 Next Steps

1. **Complete Google Cloud setup** (30 minutes)
2. **Test locally** (5 minutes)
3. **Deploy to production** (automatic)
4. **Start planning admin features** (ongoing)

---

**Your website now has professional authentication! Once you complete the Google Cloud setup, you'll have a secure admin system that only you can access.** 🚀
