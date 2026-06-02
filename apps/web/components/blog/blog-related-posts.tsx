import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { BlogListingCard } from "@/components/blog/blog-listing-card"
import type { BlogPostMeta } from "@/lib/blog"
import { Button } from "@workspace/ui/components/button"

type BlogRelatedPostsProps = {
  posts: BlogPostMeta[]
  currentSlug: string
}

export function BlogRelatedPosts({ posts, currentSlug }: BlogRelatedPostsProps) {
  const related = posts.filter((p) => p.slug !== currentSlug).slice(0, 3)
  if (related.length === 0) return null

  return (
    <section className="py-10 lg:py-14" aria-label="Weitere Blogbeiträge">
      <div className="flex flex-col gap-9 lg:gap-16">
        <div className="flex max-w-3xl flex-1 flex-col items-start text-left">
          <Button variant="link" className="h-8 gap-1.5 px-0" asChild>
            <Link href="/blog" prefetch>
              <ArrowLeft className="size-4" aria-hidden />
              Alle Beiträge
            </Link>
          </Button>
          <h2
            id="weiterlesen"
            className="mt-2 font-[family-name:var(--font-sans)] text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            Weiterlesen
          </h2>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Passende Artikel zum Weitersurfen.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-9 lg:gap-y-12">
          {related.map((post) => (
            <BlogListingCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
