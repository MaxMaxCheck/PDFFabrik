import Link from "next/link"
import { BlogAuthorRow } from "@/components/blog/blog-author-row"
import { BlogCardCover } from "@/components/blog/blog-card-cover"
import { formatBlogDate, type BlogPostMeta } from "@/lib/blog"
import { cn } from "@workspace/ui/lib/utils"

type BlogListingCardProps = {
  post: BlogPostMeta
  className?: string
}

export function BlogListingCard({ post, className }: BlogListingCardProps) {
  const dateLabel = formatBlogDate(post.date)
  const readLabel =
    post.readTimeMinutes != null
      ? `${post.readTimeMinutes} Min. Lesezeit`
      : null

  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      className={cn("group/blog-listing-card block h-full", className)}
    >
      <article className="relative flex h-full flex-col">
        <div className="relative">
          <BlogCardCover
            slug={post.slug}
            title={post.title}
            image={post.image}
            imageClassName="group-hover/blog-listing-card:opacity-90"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-1 ring-foreground/15 ring-inset transition-opacity group-hover/blog-listing-card:opacity-100"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 py-3.5">
          <div className="flex items-center justify-between gap-3">
            {post.category ? (
              <span className="text-sm font-medium text-primary">{post.category}</span>
            ) : (
              <span />
            )}
            {readLabel ? (
              <span className="shrink-0 text-sm text-muted-foreground">{readLabel}</span>
            ) : null}
          </div>

          <div className="grid max-w-3xl gap-1">
            <h2 className="text-lg font-medium tracking-tight text-balance text-foreground">
              {post.title}
            </h2>
            {post.description ? (
              <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">
                {post.description}
              </p>
            ) : null}
          </div>

          <div className="mt-auto w-full">
            <BlogAuthorRow
              author={post.author}
              dateLabel={dateLabel}
              dateTime={post.date}
            />
          </div>
        </div>
      </article>
    </Link>
  )
}
