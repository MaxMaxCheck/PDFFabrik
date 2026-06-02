import { Timer } from "lucide-react"
import { BlogAuthorRow } from "@/components/blog/blog-author-row"
import { BlogPageHeading } from "@/components/blog/blog-page-heading"
import { formatBlogDate, type BlogPostMeta } from "@/lib/blog"
import { cn } from "@workspace/ui/lib/utils"

type BlogPostHeaderProps = {
  post: Pick<
    BlogPostMeta,
    "title" | "description" | "category" | "date" | "author" | "readTimeMinutes"
  >
  className?: string
}

export function BlogPostHeader({ post, className }: BlogPostHeaderProps) {
  const dateLabel = formatBlogDate(post.date)
  const readLabel =
    post.readTimeMinutes != null
      ? `${post.readTimeMinutes} Min. Lesezeit`
      : null

  return (
    <header className={cn("flex flex-col items-center", className)}>
      <BlogPageHeading
        badge={post.category}
        title={post.title}
        description={post.description}
      />
      <div className="flex justify-center pt-9">
        <BlogAuthorRow
          author={post.author}
          dateLabel={dateLabel}
          dateTime={post.date}
        />
      </div>
      {readLabel ? (
        <span className="flex items-center gap-1.5 pt-6 text-sm text-muted-foreground">
          <Timer className="size-3.5" aria-hidden />
          {readLabel}
        </span>
      ) : null}
    </header>
  )
}
