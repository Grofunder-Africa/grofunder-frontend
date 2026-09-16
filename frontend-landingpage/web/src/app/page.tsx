import { getHeroSection, getLandingContent } from '@/lib/sanity.client'
import Image from 'next/image'

export default async function Home() {
  const hero = await getHeroSection()
  const howItWorks = await getLandingContent('how-it-works')

  return (
    <main>
      {/* Hero Section */}
      {hero && (
        <section
          className="relative min-h-screen flex items-center justify-center text-white"
          style={{ backgroundColor: hero.backgroundColor }}
        >
          {hero.images && hero.images[0] && (
            <div className="absolute inset-0">
              <Image
                src={hero.images[0].asset.url}
                alt="Hero"
                fill
                className="object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: hero.overlayColor,
                  opacity: hero.overlayOpacity,
                }}
              />
            </div>
          )}

          <div className="relative z-10 max-w-2xl text-center px-4">
            <h1 className="text-5xl font-bold mb-6">{hero.heading}</h1>
            <p className="text-xl mb-8">{hero.subheading}</p>
            <a
              href={hero.ctaLink}
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-700"
            >
              {hero.ctaText}
            </a>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      {howItWorks && (
        <section
          className="py-16 px-4"
          style={{ backgroundColor: howItWorks.backgroundColor }}
        >
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-4xl font-bold text-center mb-12"
              style={{ color: howItWorks.textColor }}
            >
              How Grofunder Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.items?.map((item: any, idx: number) => (
                <div key={idx} className="text-center">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3
                    className="text-2xl font-semibold mb-3"
                    style={{ color: howItWorks.textColor }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: howItWorks.textColor }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
