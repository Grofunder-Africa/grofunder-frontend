'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function TestimonialCarousel({ testimonials }: { testimonials: any }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (testimonials?.items?.length || 1))
    }, 5000) // Change testimonial every 5 seconds

    return () => clearInterval(interval)
  }, [testimonials])

  if (!testimonials?.items || testimonials.items.length === 0) {
    return <div>No testimonials available</div>
  }

  const current = testimonials.items[currentIndex]

  return (
    <section
      className="py-16 px-4"
      style={{ backgroundColor: testimonials.backgroundColor }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-4xl font-bold text-center mb-12"
          style={{ color: testimonials.textColor }}
        >
          Real Farmers. Real Stories.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          {current.image && (
            <div className="relative h-96 w-full rounded-lg overflow-hidden">
              <Image
                src={current.image.asset.url}
                alt={current.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Testimonial Text */}
          <div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: testimonials.textColor }}
            >
              {current.title}
            </h3>
            <div className="mb-4">
              <span style={{ color: testimonials.accentColor }}>{'★'.repeat(5)}</span>
            </div>
            <blockquote
              className="text-lg italic mb-6"
              style={{ color: testimonials.textColor }}
            >
              "{current.description}"
            </blockquote>
            <p
              className="font-semibold text-sm"
              style={{ color: testimonials.textColor }}
            >
              {current.icon}
            </p>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="flex justify-center gap-4 mt-12">
          {testimonials.items.map((_, idx: number) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: idx === currentIndex ? testimonials.accentColor : '#ccc',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}