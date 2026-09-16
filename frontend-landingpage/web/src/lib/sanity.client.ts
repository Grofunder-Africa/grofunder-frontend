import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function getBlogPosts() {
  return client.fetch(`*[_type == "blogPost"] | order(publishedAt desc)`)
}

export async function getBlogPostBySlug(slug: string) {
  return client.fetch(`*[_type == "blogPost" && slug.current == $slug][0]`, { slug })
}

export async function getHeroSection() {
  return client.fetch(`*[_type == "heroSection"][0]`)
}

export async function getLandingContent(section: string) {
  return client.fetch(`*[_type == "landingPageContent" && sectionName == $section][0]`, { section })
}
