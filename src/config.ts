// Configuration file for Comfort Stays PG
// This makes it easy to update the website for future expansion

export const config = {
  // Basic Information
  pgName: "Comfort Stays PG",
  
  // Target Audience (easily changeable for future expansion)
  targetAudience: "girls", // Change to "boys" or "all" when expanding
  
  // Contact Information
  contact: {
    phone: "+91 7802004735",
    email: "harshkanjariya.official@gmail.com",
    coordinates: {
      lat: 23.040827975990204,
      lng: 72.54907747029554
    },
    address: {
      building: "Maharaja Palace",
      road: "University Road, 120 Feet Ring Rd",
      landmark: "AEC Char Rasta, University Area",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380009"
    }
  },
  
  // Pricing
  pricing: {
    startingPrice: 6500,
    currency: "₹",
    period: "per month"
  },
  
  // Amenities
  amenities: [
    {
      icon: "🏠",
      title: "Room Options",
      description: "AC and Non-AC rooms available to suit your preference and budget"
    },
    {
      icon: "🍽️",
      title: "Meals Included",
      description: "Delicious and nutritious meals provided for a comfortable stay"
    },
    {
      icon: "📶",
      title: "Free WiFi",
      description: "High-speed internet connectivity for work and entertainment"
    },
    {
      icon: "🚿",
      title: "Water Heater",
      description: "24/7 hot water facility for your comfort"
    },
    {
      icon: "📹",
      title: "Security Cameras",
      description: "Advanced security system with door cameras for your safety"
    },
    {
      icon: "📍",
      title: "Prime Location",
      description: "Strategically located near university areas and major landmarks"
    }
  ],
  
  // Hero Section Content
  hero: {
    title: "Welcome to Comfort Stays PG",
    subtitle: "Premium Girls' Accommodation in Ahmedabad",
    description: "Experience comfort, safety, and convenience in the heart of Ahmedabad. Located near university areas with all modern amenities for a perfect stay."
  },
  
  // Features for pricing
  pricingFeatures: [
    "All amenities included",
    "Meals provided",
    "Free WiFi",
    "24/7 security",
    "Hot water facility"
  ],
  
  // Footer content
  footer: {
    tagline: "Your home away from home in Ahmedabad"
  }
}

// Helper functions for dynamic content
export const getAudienceText = () => {
  switch (config.targetAudience) {
    case "girls":
      return "Girls'";
    case "boys":
      return "Boys'";
    case "all":
      return "Student";
    default:
      return "Girls'";
  }
}

export const getFullAddress = () => {
  return `${config.contact.address.building}, ${config.contact.address.road}, ${config.contact.address.landmark}, ${config.contact.address.city}, ${config.contact.address.state} ${config.contact.address.pincode}`;
}
