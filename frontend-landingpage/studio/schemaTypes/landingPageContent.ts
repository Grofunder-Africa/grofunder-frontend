import {defineField, defineType} from 'sanity'

export const landingPageContent = defineType({
  name: 'landingPageContent',
  title: 'Landing Page Content',
  type: 'document',
  fields: [
    defineField({
      name: 'sectionName',
      title: 'Section Name',
      type: 'string',
      options: {
        list: [
          {title: 'How Grofunder Works', value: 'how-it-works'},
          {title: 'Our Impact', value: 'impact'},
          {title: 'Real Farmers Stories', value: 'testimonials'},
          {title: 'Navigation', value: 'navigation'},
          {title: 'Footer', value: 'footer'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background Color (Hex)',
      type: 'string',
      description: 'e.g., #09AF0F (green), #F5A623 (orange), #ffffff (white)',
    }),
    defineField({
      name: 'textColor',
      title: 'Text Color (Hex)',
      type: 'string',
      description: 'e.g., #ffffff (white), #000000 (black)',
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent Color (Hex)',
      type: 'string',
      description: 'Color for buttons, icons, highlights',
    }),
    defineField({
      name: 'items',
      title: 'Section Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              title: 'Item Title',
              type: 'string',
            },
            {
              name: 'description',
              title: 'Item Description',
              type: 'text',
              rows: 2,
            },
            {
              name: 'icon',
              title: 'Icon (Emoji or Name)',
              type: 'string',
              description: 'e.g., 🌱 or "leaf" or "phone"',
            },
            {
              name: 'image',
              title: 'Item Image',
              type: 'image',
              options: {hotspot: true},
            },
            {
              name: 'link',
              title: 'Link',
              type: 'string',
            },
          ],
        },
      ],
    }),
  ],
})
