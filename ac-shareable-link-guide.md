# AC Shareable Link Feature

## Overview
The AC Shareable Link feature allows you to generate secure, shareable links that display AC bill details for specific rooms and months. These links can be shared with occupants so they can view their AC charges without needing access to the management system.

## How It Works

### 1. **Generate a Shareable Link**
- Go to the **AC Management** page (`ac-management.html`)
- Scroll to the AC Room Status section
- Find the room you want to share (Room 1 or Room 3)
- Click the **"🔗 Generate Shareable Link"** button below the room card
- A modal will appear with the generated link

### 2. **Link Format**
The generated link looks like this:
```
https://yourdomain.com/ac-preview.html?key=comfort-stays-2024&room=room1&month=9&year=2024
```

**Parameters:**
- `key`: Access key for security (default: `comfort-stays-2024`)
- `room`: Room ID (`room1` or `room3`)
- `month`: Month number (0-11, where 0=January, 11=December)
- `year`: Year (e.g., 2024)

### 3. **Share the Link**
- **Copy**: Click "📋 Copy Link" to copy to clipboard
- **Open**: Click "🔗 Open Link" to preview the page
- Share the link via WhatsApp, Email, or any messaging platform

### 4. **What Recipients See**
When someone opens the link, they will see:
- Room name and AC status
- List of occupants
- Previous and current meter readings
- Total units consumed
- Total AC bill
- Fair calculation breakdown showing:
  - Days each person stayed
  - Individual fair share amount
  - Daily rate
  - Occupancy period

## Security

### Access Key
The link requires a valid access key to view. The default key is `comfort-stays-2024`.

**⚠️ Important Security Notes:**
- Change the default key in both files:
  - `ac-management-script.js` (line 456)
  - `ac-preview-script.js` (line 17)
- Keep the key secure and share only with authorized persons
- Consider changing the key periodically

### How to Change the Access Key

1. **In `ac-management-script.js`:**
```javascript
function generateShareableLink(roomId, month, year) {
    const accessKey = 'your-new-secure-key-here'; // Change this
    // ... rest of the code
}
```

2. **In `ac-preview-script.js`:**
```javascript
const VALID_ACCESS_KEY = 'your-new-secure-key-here'; // Change this to match
```

**Make sure both keys match exactly!**

## Use Cases

### 1. **Monthly Bill Sharing**
Share the link with occupants at the end of each month so they can view their AC charges.

### 2. **Transparency**
Show occupants the fair calculation breakdown, explaining why their bill is what it is based on days stayed.

### 3. **Record Keeping**
Save links for historical reference (e.g., in a spreadsheet or notes).

### 4. **Dispute Resolution**
If an occupant questions their AC bill, share the link to show the detailed breakdown.

## Customization

### Styling
You can customize the appearance by editing `ac-preview-styles.css`:
- Change colors
- Adjust fonts
- Modify layout
- Add your logo/branding

### Content
You can modify what information is displayed by editing `ac-preview-script.js`:
- Add/remove data fields
- Change calculation formulas
- Add custom messages

## Troubleshooting

### "Access Denied" Error
- Check that the access key in the URL matches the key in `ac-preview-script.js`
- Ensure the key parameter is included in the URL

### "No AC reading found" Error
- Verify that AC readings have been entered for that room and month
- Check that the month/year parameters are correct

### "Invalid parameters" Error
- Ensure all required parameters are present: `key`, `room`, `month`, `year`
- Check that room is either `room1` or `room3`
- Verify month is between 0-11 and year is valid

## Example Links

**Room 1 - October 2024:**
```
https://yourdomain.com/ac-preview.html?key=comfort-stays-2024&room=room1&month=9&year=2024
```

**Room 3 - September 2024:**
```
https://yourdomain.com/ac-preview.html?key=comfort-stays-2024&room=room3&month=8&year=2024
```

## Mobile Responsiveness
The preview page is fully responsive and works great on:
- Desktop computers
- Tablets
- Mobile phones

## Print Support
The page is print-friendly. Occupants can:
- Print the bill for their records
- Save as PDF
- Take screenshots

## Future Enhancements
Potential improvements you could add:
- QR code generation for easy sharing
- Email/WhatsApp share buttons
- Multiple months comparison
- Download as PDF
- Password protection instead of key in URL
- Expiring links (time-limited access)
- Analytics to track who viewed what

## Support
For any issues or questions about this feature, please contact the system administrator.

