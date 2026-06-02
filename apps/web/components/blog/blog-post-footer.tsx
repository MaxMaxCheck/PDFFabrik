import { BlogAuthorRow } from "@/components/blog/blog-author-row"
import { BlogShareActions } from "@/components/blog/blog-share-actions"
import { Separator } from "@workspace/ui/components/separator"
import type { BlogPostMeta } from "@/lib/blog"

type BlogPostFooterProps = {
  post: Pick<BlogPostMeta, "title" | "author">
}

export function BlogPostFooter({ post }: BlogPostFooterProps) {
  const footerSubtitle = post.author.role ?? "PDFFabrik.de"

  return (
    <>
      <div className="relative" aria-hidden>
        <div className="absolute inset-0 -top-px mx-auto size-[5px] rotate-45 bg-muted-foreground ring-2 ring-background" />
        <Separator />
      </div>
      <footer className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <BlogAuthorRow
          author={post.author}
          dateLabel=""
          subtitle={footerSubtitle}
        />
        <BlogShareActions />
      </footer>
    </>
  )
}
