import { BlogContent } from "@/components/blog-content"
import { BlogInlineToc } from "@/components/blog/blog-inline-toc"
import { BlogPostFooter } from "@/components/blog/blog-post-footer"
import { BlogPostHeader } from "@/components/blog/blog-post-header"
import { BlogPostHero } from "@/components/blog/blog-post-hero"
import { BlogRelatedPosts } from "@/components/blog/blog-related-posts"
import { extractMarkdownHeadings } from "@/lib/blog-headings"
import { getAllPosts, getAllSlugs, getPostBySlug } from "@/lib/blog"
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

  const headings = extractMarkdownHeadings(post.content)
  const allPosts = getAllPosts()

  return (
    <div className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 md:px-8">
        <article className="flex flex-col gap-10 py-10 lg:gap-16 lg:pt-14 lg:pb-8">
          <div className="flex flex-col gap-9 lg:gap-16">
            <BlogPostHeader post={post} />
            <BlogPostHero slug={post.slug} title={post.title} image={post.image} />
          </div>

          <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-9 lg:gap-16">
            <BlogInlineToc headings={headings} />
            <BlogContent markdown={post.content} />
            <BlogPostFooter post={post} />
          </div>
        </article>

        <BlogRelatedPosts posts={allPosts} currentSlug={slug} />
      </main>
    </div>
  )
}
