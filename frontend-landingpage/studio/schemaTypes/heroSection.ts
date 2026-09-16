import {defineField, defineType} from 'sanity'

export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Main hero heading text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'text',
      rows: 2,
      description: 'Supporting text under heading',
    }),
    defineField({
      name: 'ctaText',
      title: 'CTA Button Text',
      type: 'string',
      description: 'Text for the "Get Started" button',
    }),
    defineField({
      name: 'ctaLink',
      title: 'CTA Link',
      type: 'string',
      description: 'Where the CTA button links to',
    }),
    defineField({
      name: 'images',
      title: 'Carousel Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
        },
      ],
      description: 'Images that rotate in hero carousel',
    }),
    defineField({
      name: 'overlayColor',
      title: 'Overlay Color (Hex)',
      type: 'string',
      description: 'Color overlay for readability (e.g., #09AF0F)',
    }),
    defineField({
      name: 'overlayOpacity',
      title: 'Overlay Opacity (0-1)',
      type: 'number',
      description: 'How transparent the overlay is (0 = fully transparent, 1 = fully opaque)',
      validation: (Rule) => Rule.min(0).max(1),
    }),
  ],
})
