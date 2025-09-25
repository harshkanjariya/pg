# 🏠 PG Management System - Complete Setup Guide

## 🎉 **What's Been Created:**

### ✅ **2D Apartment Layout**
- **Square apartment design** with left and right halves
- **Left half**: 3 rooms (Room 1: 4 beds, Room 2: 3 beds, Room 3: 4 beds)
- **Right half**: Balcony, Kitchen, Hall with 6 beds (3 kitchen side, 3 left side)
- **Main door** positioned at right bottom of hall
- **Interactive beds** with click functionality

### ✅ **Firestore Database Integration**
- **Real-time data storage** for all bed information
- **Occupant details** (name, phone, email, rent, dates, notes)
- **Bed status tracking** (occupied/available)
- **Automatic data synchronization**

### ✅ **Management Features**
- **Bed assignment** for new occupants
- **Occupant information editing**
- **Bed vacation** functionality
- **Real-time status updates**
- **Responsive design** for mobile and desktop

## 🚀 **How to Access:**

### **Step 1: Sign In**
1. **Visit**: https://comfort-stays-pg.in/
2. **Click**: "Sign in with Google"
3. **Sign in** with your email (harshkanjariya.official@gmail.com)
4. **Click**: "🔧 Manage PG" button

### **Step 2: Access Management Dashboard**
- **Automatic redirect** to manage.html
- **Authentication check** - only your email can access
- **2D apartment layout** loads with current bed status

## 🏠 **Apartment Layout Details:**

### **Left Half - Private Rooms:**
```
┌─────────────────┐
│   Room 1 (4)    │ ← Top room with 4 beds
├─────────────────┤
│   Room 2 (3)    │ ← Middle room with 3 beds  
├─────────────────┤
│   Room 3 (4)    │ ← Bottom room with 4 beds
└─────────────────┘
```

### **Right Half - Common Areas:**
```
┌─────────────────┐
│    Balcony      │ ← Open space
├─────────────────┤
│    Kitchen      │ ← Cooking area
├─────────────────┤
│ Hall (6 beds)   │ ← Common area with 6 beds
│ [1][2][3]       │ ← Kitchen side beds
│ [4][5][6]       │ ← Left side beds
│         [Door]   │ ← Main entrance
└─────────────────┘
```

## 🎯 **Bed Management Features:**

### **Available Beds (Green):**
- **Click** → Opens assignment form
- **Fill details** → Name, phone, email, rent, dates
- **Submit** → Bed becomes occupied

### **Occupied Beds (Red):**
- **Click** → Shows occupant details
- **Edit** → Update occupant information
- **Vacate** → Free up the bed

## 📊 **Data Storage (Firestore):**

### **Database Structure:**
```javascript
// Collection: "beds"
// Document ID: "room1_bed1", "room2_bed2", etc.

{
  room: "room1",           // room1, room2, room3, hall
  bedNumber: 1,            // 1, 2, 3, 4, 5, 6
  isOccupied: true,        // true/false
  occupantName: "John Doe",
  occupantPhone: "+91 9876543210",
  occupantEmail: "john@example.com",
  price: 6500,             // Monthly rent
  checkInDate: "2024-01-15",
  checkOutDate: "2024-12-15",
  notes: "Prefers AC room"
}
```

### **Total Beds:**
- **Room 1**: 4 beds (room1_bed1 to room1_bed4)
- **Room 2**: 3 beds (room2_bed1 to room2_bed3)
- **Room 3**: 4 beds (room3_bed1 to room3_bed4)
- **Hall**: 6 beds (hall_bed1 to hall_bed6)
- **Total**: 17 beds

## 🔧 **Management Workflow:**

### **Assigning a New Occupant:**
1. **Click** on available bed (green)
2. **Fill form** with occupant details
3. **Set rent** amount
4. **Choose dates** for check-in/out
5. **Add notes** if needed
6. **Submit** → Bed becomes occupied

### **Managing Existing Occupant:**
1. **Click** on occupied bed (red)
2. **View details** of current occupant
3. **Edit** to update information
4. **Vacate** to free up bed

### **Real-time Updates:**
- **Immediate visual feedback** when beds change status
- **Data syncs** with Firestore automatically
- **No page refresh** needed

## 📱 **Mobile Responsive:**

### **Desktop Features:**
- **Full 2D layout** with side-by-side rooms
- **Hover effects** on beds
- **Large modal** for forms

### **Mobile Features:**
- **Stacked layout** for better mobile viewing
- **Touch-friendly** bed interactions
- **Responsive modals** that fit screen
- **Optimized button sizes**

## 🔒 **Security Features:**

### **Authentication:**
- **Owner-only access** - only your email can access
- **Automatic redirect** if unauthorized
- **Session persistence** across browser tabs

### **Data Security:**
- **Firestore rules** protect your data
- **Real-time updates** only for authenticated users
- **Automatic backup** with Firebase

## 📈 **Analytics Integration:**

### **Tracked Events:**
- **Bed assignments** - when new occupants are added
- **Bed vacations** - when occupants leave
- **Management access** - when you access the dashboard
- **Form submissions** - successful data updates

## 🎨 **Visual Design:**

### **Color Coding:**
- **Green beds** - Available for assignment
- **Red beds** - Currently occupied
- **Blue theme** - Matches your brand colors
- **Hover effects** - Interactive feedback

### **Professional UI:**
- **Clean layout** with clear room labels
- **Intuitive navigation** with back button
- **Modal forms** for data entry
- **Success/error messages** for user feedback

## 🚀 **Next Steps - Advanced Features:**

### **Phase 1: Enhanced Management**
- **Bulk operations** - assign multiple beds at once
- **Payment tracking** - monthly rent collection
- **Occupant history** - track past residents
- **Room preferences** - AC/non-AC room management

### **Phase 2: Automation**
- **Email notifications** - automated check-in/out reminders
- **Payment reminders** - monthly rent notifications
- **Occupancy reports** - monthly analytics
- **Maintenance requests** - bed/room issue tracking

### **Phase 3: Integration**
- **WhatsApp integration** - send notifications via WhatsApp
- **Calendar sync** - check-in/out calendar
- **Financial reports** - revenue tracking
- **Customer portal** - residents can view their details

## 🛠️ **Technical Details:**

### **Files Created:**
- **manage.html** - Main management page
- **manage-styles.css** - Styling for 2D layout
- **manage-script.js** - JavaScript functionality
- **Firestore integration** - Real-time database

### **Firebase Services Used:**
- **Authentication** - User verification
- **Firestore** - Data storage
- **Analytics** - Usage tracking

## 🎯 **Testing Your System:**

### **Test Checklist:**
1. **Sign in** with your Google account
2. **Click** "Manage PG" button
3. **Verify** 2D layout loads correctly
4. **Click** on available bed → Form opens
5. **Fill form** and submit → Bed becomes occupied
6. **Click** on occupied bed → Details show
7. **Edit** occupant details → Updates save
8. **Vacate** bed → Bed becomes available
9. **Test** on mobile device
10. **Check** Firestore console for data

## 📊 **Firestore Console Access:**

### **View Your Data:**
1. **Go to**: https://console.firebase.google.com/
2. **Select**: "comfort-stays" project
3. **Click**: "Firestore Database"
4. **See**: All bed data in real-time
5. **Monitor**: Occupancy changes

---

## 🎉 **You're All Set!**

Your PG management system is now complete with:
- ✅ **Professional 2D layout** of your apartment
- ✅ **Real-time bed management** with Firestore
- ✅ **Mobile-responsive design**
- ✅ **Secure authentication** (owner-only access)
- ✅ **Comprehensive occupant tracking**

**Start managing your PG efficiently with this powerful dashboard!** 🚀

**Visit your Firebase Console to see the real-time data flowing in!** 📊
