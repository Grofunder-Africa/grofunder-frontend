import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

const BlogPage = ({ onBack }) => {
  const [selectedPost, setSelectedPost] = useState(null);

  const blogPosts = [
    {
      id: 1,
      title: 'Smallholder Finance Paradox: Why Traditional Banks Fail Farmers',
      date: 'September 10, 2026',
      category: 'Thought Leadership',
      excerpt: 'Traditional financial institutions struggle to serve smallholder farmers. Grofunder is changing that.',
      content: 'Smallholder farmers in rural Kenya represent one of the largest untapped agricultural markets in the world. Yet traditional banks consistently fail to serve them. Through our work at Grofunder, we\'ve identified the core paradox: farmers need credit most urgently when collateral is lowest. This is the Smallholder Finance Paradox. Our solution reimagines lending through Growth Circles—guarantor clusters built on community trust and social capital rather than physical collateral.',
      author: 'Melanie Kariuki',
      image: 'bg-blue-100'
    },
    {
      id: 2,
      title: 'How Growth Circles Unlock Lending for Derisked Small Commercial Farmers',
      date: 'August 28, 2026',
      category: 'Product Updates',
      excerpt: 'Growth Circles transform how cooperatives deliver microfinance by leveraging peer accountability.',
      content: 'Growth Circles are guarantor clusters formed within cooperatives. Each circle typically includes 5-10 farmers who vouch for each other. This structure creates peer accountability and reduces default risk for lenders. Our data shows that Growth Circle borrowers default at rates 40% lower than solo borrowers, making derisked small commercial farmers an attractive investment for our lending partners.',
      author: 'Melanie Kariuki',
      image: 'bg-green-100'
    },
    {
      id: 3,
      title: 'Digital Agronomy: Empowering Farmers with Real-Time Crop Guidance',
      date: 'August 15, 2026',
      category: 'Product Updates',
      excerpt: 'How Grofunder\'s agronomy support helps farmers make better crop decisions in real-time.',
      content: 'Beyond financing, farmers need access to knowledge. Grofunder integrates digital agronomy support—real-time guidance on planting windows, pest management, harvest timing, and market prices. This support is delivered via the Gro app and tailored to each farmer\'s crop, local climate, and season. Early results show farmers using digital agronomy increase yields by 25-35% on average.',
      author: 'Melanie Kariuki',
      image: 'bg-yellow-100'
    },
    {
      id: 4,
      title: 'Building Resilient Livelihoods: Grofunder\'s Impact in Homa Bay County',
      date: 'July 20, 2026',
      category: 'Impact Stories',
      excerpt: 'A field report from our pilot in Homa Bay County, where 200+ farmers are transforming their livelihoods.',
      content: 'Our pilot with Orinde Farmers Cooperative Society in Homa Bay has reached 200+ farmers. Early impact includes: higher input adoption (78% planted on time vs 35% historically), average harvest yield increase of 28%, and improved household income stability. Farmers report increased confidence in their farming decisions and stronger community cohesion through Growth Circles.',
      author: 'Melanie Kariuki',
      image: 'bg-red-100'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-4 md:py-6" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-xl font-bold" style={{ color: '#09AF0F' }}>grofunder</div>
        
        <div className="hidden md:flex gap-8 items-center">
          <a href="/blog" className="text-sm font-medium" style={{ color: '#000000' }}>Blog</a>
          <a href="#" className="text-sm font-medium" style={{ color: '#000000' }}>About</a>
          <button onClick={onBack} className="text-white px-5 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: '#09AF0F' }}>Back to Home</button>
        </div>
      </nav>

      {/* Back Button (Mobile) */}
      {selectedPost ? (
        <div className="px-6 sm:px-12 py-4 md:py-6">
          <button 
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: '#09AF0F' }}
          >
            <ChevronLeft size={18} /> Back to Blog
          </button>
        </div>
      ) : (
        <div className="px-6 sm:px-12 py-4 md:py-6 md:hidden">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: '#09AF0F' }}
          >
            <ChevronLeft size={18} /> Back to Home
          </button>
        </div>
      )}

      {/* Selected Post View */}
      {selectedPost ? (
        <article className="px-6 sm:px-12 py-12 max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="inline-block px-3 py-1 rounded text-xs font-semibold mb-4" style={{ backgroundColor: '#F5A623', color: '#000000' }}>
              {selectedPost.category}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#000000' }}>
              {selectedPost.title}
            </h1>
            <div className="flex items-center gap-4 text-sm" style={{ color: '#666666' }}>
              <span>{selectedPost.author}</span>
              <span>{selectedPost.date}</span>
            </div>
          </div>
          <div className="prose prose-lg max-w-none mb-12" style={{ color: '#333333' }}>
            <p className="text-lg leading-relaxed mb-6">{selectedPost.content}</p>
            <p className="text-lg leading-relaxed mb-6">
              Our mission at Grofunder is to expand access to agricultural finance while improving farmer productivity and building more resilient rural livelihoods. Every farmer we serve, every Growth Circle we support, and every yield increase we enable moves us closer to that goal.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #E5E5E5' }} className="pt-8">
            <button 
              onClick={() => setSelectedPost(null)}
              className="text-sm font-semibold"
              style={{ color: '#09AF0F' }}
            >
              View All Articles
            </button>
          </div>
        </article>
      ) : (
        /* Blog List View */
        <>
          {/* Hero */}
          <section className="px-6 sm:px-12 py-16 md:py-24" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: '#000000' }}>
                Grofunder Insights
              </h1>
              <p className="text-lg" style={{ color: '#333333' }}>
                Thought leadership, product updates, and impact stories from the Grofunder team on smallholder finance, agri-tech, and rural livelihoods in Kenya.
              </p>
            </div>
          </section>

          {/* Blog Posts */}
          <section className="px-6 sm:px-12 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {blogPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="pb-8"
                    style={{ borderBottom: '1px solid #E5E5E5' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Image */}
                      <div className={`h-48 rounded-lg ${post.image}`}></div>
                      
                      {/* Content */}
                      <div className="md:col-span-2">
                        <div className="inline-block px-3 py-1 rounded text-xs font-semibold mb-3" style={{ backgroundColor: '#F5F5F5', color: '#666666' }}>
                          {post.category}
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>
                          {post.title}
                        </h2>
                        <p className="text-sm mb-3" style={{ color: '#999999' }}>
                          {post.author} • {post.date}
                        </p>
                        <p className="text-base mb-4 leading-relaxed" style={{ color: '#333333' }}>
                          {post.excerpt}
                        </p>
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="text-sm font-semibold"
                          style={{ color: '#09AF0F' }}
                        >
                          Read Article →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-white py-16" style={{ backgroundColor: '#1A1A2E' }}>
            <div className="max-w-6xl mx-auto px-6 sm:px-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div>
                  <div className="text-xl font-bold mb-3" style={{ color: '#09AF0F' }}>grofunder</div>
                  <p className="text-sm mb-1 font-medium" style={{ color: '#999999' }}>Growing farmers. Growing wealth.</p>
                  <p className="text-sm" style={{ color: '#999999' }}>Helping smallholder farmers access the resources they need to grow.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-4">Explore</h4>
                  <ul className="space-y-2 text-sm">
                    <li><a href="#" onClick={onBack} style={{ color: '#999999' }} className="hover:text-white transition">Home</a></li>
                    <li><a href="/blog" style={{ color: '#999999' }} className="hover:text-white transition">Blog</a></li>
                    <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">About Grofunder</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-4">Account</h4>
                  <ul className="space-y-2 text-sm">
                    <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Go to My Grofunder</a></li>
                    <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Sign Up</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-4">Connect</h4>
                  <ul className="space-y-2 text-sm">
                    <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">LinkedIn</a></li>
                    <li><a href="#" style={{ color: '#999999' }} className="hover:text-white transition">Twitter</a></li>
                  </ul>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #333333' }} className="pt-8">
                <p className="text-sm text-center" style={{ color: '#666666' }}>© 2026 Grofunder Africa Limited. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default BlogPage;
