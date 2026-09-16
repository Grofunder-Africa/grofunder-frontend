const { createClient } = require('@sanity/client')

const client = createClient({
  projectId: '1ldmvw16',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function populateSanity() {
  try {
    console.log('Starting Sanity population...')

    // Create Hero Section
    const heroSection = await client.create({
      _type: 'heroSection',
      heading: 'Growing farmers. Growing wealth.',
      subheading: 'Helping smallholder farmers in rural Kenya access the support they need to turn their hard work into better livelihoods for themselves and their families.',
      ctaText: 'Get Started',
      ctaLink: '/farmer-app',
      overlayColor: '#000000',
      overlayOpacity: 0.3,
    })
    console.log('✓ Hero section created:', heroSection._id)

    // Create How It Works Section
    const howItWorks = await client.create({
      _type: 'landingPageContent',
      sectionName: 'how-it-works',
      backgroundColor: '#F5A623',
      textColor: '#ffffff',
      accentColor: '#09AF0F',
      items: [
        {
          _key: 'access-item',
          title: 'Access',
          description: 'Simple access to working capital and farming inputs',
          icon: '📱',
        },
        {
          _key: 'grow-item',
          title: 'Grow',
          description: 'Grow your yields with better inputs and support',
          icon: '🌾',
        },
        {
          _key: 'thrive-item',
          title: 'Thrive',
          description: 'Build a thriving farm business and secure income',
          icon: '🌱',
        },
      ],
    })
    console.log('✓ How It Works section created:', howItWorks._id)

    // Create Sample Blog Post
    const blogPost = await client.create({
      _type: 'blogPost',
      title: 'The Smallholder Finance Paradox',
      slug: {
        _type: 'slug',
        current: 'smallholder-finance-paradox',
      },
      excerpt: 'Understanding why smallholder farmers struggle to access finance despite being low-risk borrowers.',
      author: 'Melanie Grofunder',
      publishedAt: new Date().toISOString(),
      content: [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Smallholder farmers represent one of the most paradoxical segments in global finance. Despite being among the lowest-risk borrowers with consistent repayment rates, they remain systematically excluded from formal credit markets.',
              marks: [],
            },
          ],
        },
      ],
    })
    console.log('✓ Blog post created:', blogPost._id)

    console.log('\n✓ Sanity populated successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error populating Sanity:', error)
    process.exit(1)
  }
}

populateSanity()