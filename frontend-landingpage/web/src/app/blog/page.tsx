import { getBlogPosts } from '@/lib/sanity.client'
import Link from 'next/link'
import Image from 'next/image'

export default async function BlogPage() {
  const posts = await getBlogPosts()

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      <div className="grid gap-8">
        {posts.map((post: any) => (
          <Link key={post._id} href={`/blog/${post.slug.current}`}>
            <div className="border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer">
              {post.image && (
                <div className="relative h-64 w-full">
                  <Image
                    src={post.image.asset.url}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <p className="text-sm text-gray-500">
                  {post.author} — {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
