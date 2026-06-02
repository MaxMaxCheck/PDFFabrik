import Link from "next/link"
import { BlogAuthorRow } from "@/components/blog/blog-author-row"
import { BlogCardCover } from "@/components/blog/blog-card-cover"
import { formatBlogDate, type BlogPostMeta } from "@/lib/blog"
import { cn } from "@workspace/ui/lib/utils"

type BlogFeaturedCardProps = {
  post: BlogPostMeta
  className?: string
}

export function BlogFeaturedCard({ post, className }: BlogFeaturedCardProps) {
  const dateLabel = formatBlogDate(post.date)
  const readLabel =
    post.readTimeMinutes != null
      ? `${post.readTimeMinutes} Min. Lesezeit`
      : null

  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      className={cn(
        "group/blog-listing-card order-first col-span-full block",
        className
      )}
    >
      <article className="relative isolate h-[min(620px,72vh)] w-full overflow-hidden rounded-xl bg-card content-end">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 ring-1 ring-foreground/10 ring-inset transition-opacity group-hover/blog-listing-card:opacity-100"
        />

        <BlogCardCover
          slug={post.slug}
          title={post.title}
          image={post.image}
          fill
          className="absolute inset-0"
          imageClassName="object-cover transition duration-300 ease-out group-hover/blog-listing-card:brightness-90"
          overlay
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 w-full bg-linear-to-t from-black/55 via-black/25 to-transparent"
        />

        <div className="relative isolate flex w-full flex-col gap-3 p-6 lg:p-12 lg:pt-6">
          {post.category ? (
            <span className="text-sm font-medium text-white">{post.category}</span>
          ) : null}

          <div className="grid max-w-3xl flex-1 gap-1.5">
            <h2 className="text-2xl font-medium tracking-tight text-balance text-white md:text-3xl">
              {post.title}
            </h2>
            {post.description ? (
              <p className="line-clamp-3 text-base text-pretty text-white/70">
                {post.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <BlogAuthorRow
              author={post.author}
              dateLabel={dateLabel}
              dateTime={post.date}
              variant="onImage"
            />
            {readLabel ? (
              <span className="text-sm text-white/70 lg:self-end">{readLabel}</span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
