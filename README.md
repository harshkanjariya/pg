# Comfort Stays PG Website

A modern, responsive static website for Comfort Stays PG accommodation in Ahmedabad. Built with pure HTML, CSS, and JavaScript for maximum SEO performance.

## Features

- 🏠 Beautiful, modern design with gradient hero section
- 📱 Fully responsive for mobile, tablet, and desktop
- 🚀 **Maximum SEO performance** - pure HTML/CSS
- ⚡ **Instant loading** - no JavaScript frameworks
- 🎨 Modern UI with smooth animations and hover effects
- 📞 Contact information with clickable phone and email links
- 💰 Clear pricing display
- 🏢 Amenities showcase with icons
- 🗺️ Interactive Google Maps integration

## Quick Updates

### Changing Target Audience (Girls → Boys → All)

To change the target audience, edit the text in `index.html`:

```html
<!-- Change this line in index.html -->
<p class="hero-subtitle">Premium Girls' Accommodation in Ahmedabad</p>
<!-- Change "Girls'" to "Boys'" or "Student" -->
```

### Updating Contact Information

Edit the contact section in `index.html`:

```html
<!-- Phone number -->
<p><a href="tel:+917802004735">+91 7802004735</a></p>

<!-- Email -->
<p><a href="mailto:harshkanjariya.official@gmail.com">harshkanjariya.official@gmail.com</a></p>

<!-- Address -->
<p>Maharaja Palace, University Road, 120 Feet Ring Rd,<br>
AEC Char Rasta, University Area,<br>
Ahmedabad, Gujarat 380009</p>
```

### Updating Pricing

Modify the pricing in `index.html`:

```html
<div class="price">₹6,500</div>
<p class="price-period">per month</p>
```

### Adding/Removing Amenities

Update the amenities section in `index.html`:

```html
<div class="amenity-card">
  <div class="amenity-icon">🏠</div>
  <h3>Room Options</h3>
  <p>AC and Non-AC rooms available...</p>
</div>
<!-- Copy this block and modify for new amenities -->
```

## Development

Since this is a static website, you can:

1. **Edit files directly** - `index.html` and `styles.css`
2. **Preview locally** - Open `index.html` in any web browser
3. **No build process** - Changes are instant!

### Local Development

```bash
# Simply open index.html in your browser
open index.html
# or
python -m http.server 8000
# Then visit http://localhost:8000
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

This static website is configured for automatic deployment to GitHub Pages:

1. **Create GitHub repository** named `comfort-stays-pg`
2. **Push your code** to GitHub
3. **Enable GitHub Pages** in repository settings
4. **Your website goes live** at `https://YOUR_USERNAME.github.io/comfort-stays-pg/`

See [deploy.md](./deploy.md) for detailed step-by-step instructions.

### Manual Deployment

For other hosting services:

1. **Upload files directly** - `index.html`, `styles.css`, and `public/` folder
2. **No build process needed** - just upload the files
3. Configure your domain to point to the hosting service

The website is completely static and can be hosted on any web server or CDN.

### Automatic Updates

Once deployed to GitHub Pages, every push to the `main` branch automatically:
- ✅ Deploys the static files directly
- ✅ Updates the live website within 1-2 minutes
- ✅ No build time required - instant deployment!