# Comfort Stays PG Website

A modern, responsive website for Comfort Stays PG accommodation in Ahmedabad. Built with React, TypeScript, and Vite.

## Features

- 🏠 Beautiful, modern design with gradient hero section
- 📱 Fully responsive for mobile, tablet, and desktop
- ⚙️ Easy configuration system for future updates
- 🎨 Modern UI with smooth animations and hover effects
- 📞 Contact information with clickable phone and email links
- 💰 Dynamic pricing display
- 🏢 Amenities showcase with icons

## Quick Updates

### Changing Target Audience (Girls → Boys → All)

To change the target audience, simply edit `src/config.ts`:

```typescript
// Change this line in src/config.ts
targetAudience: "girls", // Change to "boys" or "all"
```

### Updating Contact Information

Edit the contact section in `src/config.ts`:

```typescript
contact: {
  phone: "+91 7802004735",
  email: "harshkanjariya.official@gmail.com",
  // ... rest of the address
}
```

### Updating Pricing

Modify the pricing in `src/config.ts`:

```typescript
pricing: {
  startingPrice: 6500,
  currency: "₹",
  period: "per month"
}
```

### Adding/Removing Amenities

Update the amenities array in `src/config.ts`:

```typescript
amenities: [
  {
    icon: "🏠",
    title: "Room Options",
    description: "AC and Non-AC rooms available..."
  },
  // Add or remove amenities here
]
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Current Configuration

- **Target Audience**: Girls' accommodation
- **Location**: Maharaja Palace, University Road, Ahmedabad
- **Starting Price**: ₹6,500 per month
- **Features**: AC/Non-AC rooms, meals, WiFi, water heater, security cameras

## Future Expansion

The website is designed to easily expand for boys' accommodation or co-ed facilities. Simply update the `targetAudience` field in the config file and the website will automatically update all relevant text.

## Deployment

### GitHub Pages (Recommended - Free!)

This website is configured for automatic deployment to GitHub Pages:

1. **Create GitHub repository** named `comfort-stays-pg`
2. **Push your code** to GitHub
3. **Enable GitHub Pages** in repository settings
4. **Your website goes live** at `https://YOUR_USERNAME.github.io/comfort-stays-pg/`

See [deploy.md](./deploy.md) for detailed step-by-step instructions.

### Manual Deployment

For other hosting services:

1. Run `npm run build` to create optimized build files
2. Upload the `dist` folder to your web hosting service
3. Configure your domain to point to the hosting service

The website is completely static and can be hosted on any web server or CDN.

### Automatic Updates

Once deployed to GitHub Pages, every push to the `main` branch automatically:
- ✅ Builds the website
- ✅ Deploys to GitHub Pages  
- ✅ Updates the live website within 2-3 minutes