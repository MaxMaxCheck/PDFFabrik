import { BlogContent } from "@/components/blog-content"
import { getAllSlugs, getPostBySlug } from "@/lib/blog"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Beitrag" }
  return {
    title: post.title,
    description: post.description,
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const displayDate =
    post.date &&
    new Date(post.date + "T12:00:00").toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  return (
    <div className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/blog" className="font-medium text-primary hover:underline">
            ← Alle Beiträge
          </Link>
        </p>
        {displayDate && (
          <time dateTime={post.date} className="mt-4 block text-sm text-muted-foreground">
            {displayDate}
          </time>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.description && (
          <p className="mt-2 text-lg text-muted-foreground">{post.description}</p>
        )}

        <article className="mt-8">
          <BlogContent markdown={post.content} />
        </article>
      </main>
    </div>
  )
}
