import './App.css'
import { config, getAudienceText, getFullAddress } from './config'

function App() {
  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>{config.pgName}</h2>
          </div>
          <div className="nav-menu">
            <a href="#home">Home</a>
            <a href="#amenities">Amenities</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <h1>{config.hero.title}</h1>
          <p className="hero-subtitle">Premium {getAudienceText()} Accommodation in Ahmedabad</p>
          <p className="hero-description">
            {config.hero.description}
          </p>
          <div className="hero-buttons">
            <a href="#contact" className="btn btn-primary">Book Now</a>
            <a href="#amenities" className="btn btn-secondary">View Amenities</a>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section id="amenities" className="amenities">
        <div className="container">
          <h2>Our Amenities</h2>
          <div className="amenities-grid">
            {config.amenities.map((amenity, index) => (
              <div key={index} className="amenity-card">
                <div className="amenity-icon">{amenity.icon}</div>
                <h3>{amenity.title}</h3>
                <p>{amenity.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2>Affordable Pricing</h2>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starting From</h3>
              <div className="price">{config.pricing.currency}{config.pricing.startingPrice.toLocaleString()}</div>
              <p className="price-period">{config.pricing.period}</p>
              <ul className="price-features">
                {config.pricingFeatures.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="pricing-note">
            * Prices vary based on room type (AC/Non-AC) and specific requirements. 
            Contact us for detailed pricing information.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <h2>Get In Touch</h2>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">📍</div>
                <div>
                  <h4>Address</h4>
                  <p>{getFullAddress()}</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">📞</div>
                <div>
                  <h4>Phone</h4>
                  <p><a href={`tel:${config.contact.phone}`}>{config.contact.phone}</a></p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">✉️</div>
                <div>
                  <h4>Email</h4>
                  <p><a href={`mailto:${config.contact.email}`}>{config.contact.email}</a></p>
                </div>
              </div>
            </div>
            <div className="contact-map">
              <iframe
                src={`https://www.google.com/maps?q=${config.contact.coordinates.lat},${config.contact.coordinates.lng}&hl=en&z=15&output=embed`}
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: '15px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Comfort Stays PG Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>{config.pgName}</h3>
              <p>{config.footer.tagline}</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#amenities">Amenities</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact Info</h4>
              <p>📞 {config.contact.phone}</p>
              <p>✉️ {config.contact.email}</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 {config.pgName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
