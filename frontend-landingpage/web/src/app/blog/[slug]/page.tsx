import { getBlogPostBySlug } from '@/lib/sanity.client'
import Image from 'next/image'
import { PortableText } from 'next-sanity'

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug)

  if (!post) return <div className="text-center py-12">Post not found</div>

  return (
    <article className="max-w-2xl mx-auto py-12 px-4">
      {post.image && (
        <div className="relative h-96 w-full mb-8 rounded-lg overflow-hidden">
          <Image
            src={post.image.asset.url}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-600 mb-8">
        {post.author} — {new Date(post.publishedAt).toLocaleDateString()}
      </p>

      <div className="prose prose-lg max-w-none">
        <PortableText value={post.content} />
      </div>
    </article>
  )
}
