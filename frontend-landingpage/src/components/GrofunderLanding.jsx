import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const GrofunderLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Add more hero images here
  const heroImages = [
    '/hero-farmer.jpg',
    // Add more image paths here when ready
  ];

  // Rotate images every 2 seconds
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const portals = {
    farmer: '/farmer-app',
    cooperative: '/cooperative-portal',
    admin: '/admin-console',
    investor: '/investor-platform',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-4 md:py-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-xl font-bold" style={{ color: '#09AF0F' }}>grofunder</div>
        
        <div className="hidden md:flex gap-8 items-center">
          <a href={portals.farmer} className="text-sm font-medium" style={{ color: '#000000' }}>Farmer</a>
          <a href={portals.cooperative} className="text-sm font-medium" style={{ color: '#000000' }}>Cooperative</a>
          <a href={portals.cooperative} className="text-sm font-medium" style={{ color: '#000000' }}>Agritech</a>
          <a href="/blog" className="text-sm font-medium" style={{ color: '#000000' }}>Blog</a>
          <a href={portals.farmer} className="text-sm font-medium" style={{ color: '#000000' }}>Sign In</a>
          <a href={portals.investor} className="text-white px-5 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#09AF0F' }}>Sign Up</a>
        </div>

        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 py-4" style={{ borderTop: '1px solid #E5E5E5' }}>
          <a href={portals.farmer} className="block py-2 text-sm" style={{ color: '#000000' }}>Farmer</a>
          <a href={portals.cooperative} className="block py-2 text-sm" style={{ color: '#000000' }}>Cooperative</a>
          <a href={portals.cooperative} className="block py-2 text-sm" style={{ color: '#000000' }}>Agritech</a>
          <a href="/blog" className="block py-2 text-sm" style={{ color: '#000000' }}>Blog</a>
          <a href={portals.farmer} className="block py-2 text-sm" style={{ color: '#000000' }}>Sign In</a>
          <a href={portals.investor} className="block text-white px-5 py-2 rounded-full text-sm font-semibold mt-2 text-center" style={{ backgroundColor: '#09AF0F' }}>Sign Up</a>
        </div>
      )}

      {/* Hero Section - Full Background Image */}
      <section className="relative w-full py-24 md:py-32" style={{ backgroundColor: '#FFFFFF', minHeight: '600px' }}>
        {/* Background Carousel Images */}
        <div className="absolute inset-0 overflow-hidden">
          {heroImages.map((image, index) => (
            <img 
              key={index}
              src={image} 
              alt="Farmer" 
              className="w-full h-full object-cover transition-opacity duration-1000"
              style={{
                opacity: index === currentImageIndex ? 1 : 0,
              }}
            />
          ))}
          {/* Dark overlay for text readability */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}></div>
        </div>

        {/* Content Overlay */}
        <div className="max-w-6xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="max-w-xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: '#FFFFFF' }}>
              Growing farmers.<br />Growing wealth.
            </h1>
            <p className="text-base md:text-lg mb-8 leading-relaxed" style={{ color: '#FFFFFF' }}>
              Helping smallholder farmers in rural Kenya access the support they need to turn their hard work into better livelihoods for themselves and their families.
            </p>
            <a href={portals.farmer} className="inline-block text-white px-8 py-3 rounded-full font-semibold transition" style={{ backgroundColor: '#09AF0F' }}>
              Get Started
            </a>
          </div>
        </div>

        {/* Curved Divider */}
        <svg className="w-full -mb-1 mt-12 md:mt-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M 0 40 Q 300 80 600 40 T 1200 40 L 1200 120 L 0 120 Z" fill="#F5A623" />
        </svg>
      </section>

      {/* How Grofunder Works Section */}
      <section className="py-20 md:py-32 relative overflow-hidden" style={{ backgroundColor: '#F5A623' }}>
        {/* Left Leaf decoration */}
        <div className="absolute left-0 top-0 opacity-10 w-80 h-80">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M 100 10 Q 150 50 150 150 Q 100 100 50 150 Q 50 50 100 10" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Right Leaf decoration */}
        <div className="absolute right-0 bottom-0 opacity-10 w-96 h-96">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M 100 10 Q 150 50 150 150 Q 100 100 50 150 Q 50 50 100 10" fill="#FFFFFF" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold" style={{ color: '#000000' }}>
              How <span style={{ color: '#FFFFFF' }}>grofunder</span> works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Access */}
            <div className="text-center">
              <div className="h-48 rounded-lg mb-6 overflow-hidden">
                <img 
                  src="/pillar-access.jpg" 
                  alt="Mobile phone for financing access" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>Access</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#333333' }}>
                Financing for quality farm inputs when needed, helping farmers plant on time and grow better.
              </p>
            </div>

            {/* Grow */}
            <div className="text-center">
              <div className="h-48 rounded-lg mb-6 overflow-hidden">
                <img 
                  src="/pillar-grow.jpg" 
                  alt="Growing crops with agronomy support" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>Grow</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#333333' }}>
                Digital agronomy support to help farmers make better decisions and manage their crops.
              </p>
            </div>

            {/* Thrive */}
            <div className="text-center">
              <div className="h-48 rounded-lg mb-6 overflow-hidden">
                <img 
                  src="/pillar-thrive.png" 
                  alt="Thriving farmer with successful harvest" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>Thrive</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#333333' }}>
                Higher yields, better incomes and stronger livelihoods for farmers and their families.
              </p>
            </div>
          </div>
        </div>

        {/* Curved Divider */}
        <svg className="w-full -mb-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M 0 80 Q 300 40 600 80 T 1200 80 L 1200 120 L 0 120 Z" fill="#FFFFFF" />
        </svg>
      </section>

      {/* Our Impact Section */}
      <section className="py-20 md:py-32" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#09AF0F' }}>Our impact</h2>
            <p className="text-base md:text-lg max-w-3xl mx-auto" style={{ color: '#333333' }}>
              Grofunder contributes to the UN Sustainable Development Goals by expanding access to agricultural finance, improving farmer productivity and building more resilient rural livelihoods.
            </p>
          </div>

          {/* SDG Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="rounded-lg p-8 h-48 flex items-center justify-center text-white" style={{ backgroundColor: '#E74C3C' }}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">1</div>
                <p className="text-sm font-semibold">No Poverty</p>
              </div>
            </div>
            <div className="rounded-lg p-8 h-48 flex items-center justify-center text-white" style={{ backgroundColor: '#F5A623' }}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">2</div>
                <p className="text-sm font-semibold">Zero Hunger</p>
              </div>
            </div>
            <div className="rounded-lg p-8 h-48 flex items-center justify-center text-white" style={{ backgroundColor: '#27AE60' }}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">13</div>
                <p className="text-sm font-semibold">Climate Action</p>
              </div>
            </div>
            <div className="rounded-lg p-8 h-48 flex items-center justify-center text-white" style={{ backgroundColor: '#C0392B' }}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">8</div>
                <p className="text-sm font-semibold">Decent Work</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32 relative overflow-hidden" style={{ backgroundColor: '#09AF0F' }}>
        {/* Left Leaf decoration */}
        <div className="absolute left-0 top-0 opacity-10 w-80 h-80">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M 100 10 Q 150 50 150 150 Q 100 100 50 150 Q 50 50 100 10" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Right Leaf decoration */}
        <div className="absolute right-0 bottom-0 opacity-10 w-96 h-96">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M 100 10 Q 150 50 150 150 Q 100 100 50 150 Q 50 50 100 10" fill="#FFFFFF" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: '#FFFFFF' }}>Real farmers. Real stories.</h2>
            <p className="text-xs tracking-widest font-medium" style={{ color: '#FFFFFF' }}>WHAT OUR FARMERS SAY ABOUT THEIR EXPERIENCE</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
            {/* Farmer Image */}
            <div>
              <div className="rounded-lg h-96 w-full overflow-hidden">
                <img 
                  src="/testimonial-farmer.png" 
                  alt="Mr. Wesonga, smallholder farmer" 
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>

            {/* Testimonial Content */}
            <div style={{ color: '#FFFFFF' }}>
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-2xl">★</span>
                ))}
              </div>
              <blockquote className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                "I could plant on time."
              </blockquote>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#FFFFFF', opacity: 0.9 }}>
                Access to financing meant I could get the inputs I needed when I needed them and focus on growing my crop.
              </p>
              <div>
                <p className="font-bold text-lg">Mr. Wesonga</p>
                <p className="text-sm font-medium" style={{ color: '#FFFFFF', opacity: 0.7 }}>SMALLHOLDER FARMER, HOMA BAY COUNTY</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-16" style={{ backgroundColor: '#1A1A2E' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="text-xl font-bold mb-3" style={{ color: '#09AF0F' }}>grofunder</div>
              <p className="text-sm mb-1 font-medium" style={{ color: '#999999' }}>Growing farmers. Growing wealth.</p>
              <p className="text-sm" style={{ color: '#999999' }}>Helping smallholder farmers access the resources they need to grow.</p>
            </div>

            {/* Explore */}
            <div>
              <h4 className="text-white font-bold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Home</a></li>
                <li><a href="/blog" style={{ color: '#999999' }} className="hover:text-white transition">Blog</a></li>
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">About Grofunder</a></li>
                <li><a href={portals.farmer} style={{ color: '#999999' }} className="hover:text-white transition">I'm a Farmer</a></li>
                <li><a href={portals.cooperative} style={{ color: '#999999' }} className="hover:text-white transition">I'm an Agritech</a></li>
                <li><a href={portals.cooperative} style={{ color: '#999999' }} className="hover:text-white transition">I'm a Cooperative</a></li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-white font-bold mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><a href={portals.farmer} style={{ color: '#999999' }} className="hover:text-white transition">Go to My Grofunder</a></li>
                <li><a href={portals.investor} style={{ color: '#999999' }} className="hover:text-white transition">Sign Up</a></li>
                <li><a href={portals.admin} style={{ color: '#999999' }} className="hover:text-white transition">Admin</a></li>
                <li><a href={portals.investor} style={{ color: '#999999' }} className="hover:text-white transition">Invest</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-white font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">LinkedIn</a></li>
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">WhatsApp</a></li>
                <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #333333' }} className="pt-8">
            <p className="text-sm text-center" style={{ color: '#666666' }}>© 2026 Grofunder Africa Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GrofunderLanding;
