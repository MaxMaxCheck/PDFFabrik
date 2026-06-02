import { BlogCardCover } from "@/components/blog/blog-card-cover"
import { cn } from "@workspace/ui/lib/utils"

type BlogPostHeroProps = {
  slug: string
  title: string
  image?: string
  className?: string
}

export function BlogPostHero({ slug, title, image, className }: BlogPostHeroProps) {
  return (
    <figure className={cn("flex w-full flex-col gap-3.5 py-6 lg:py-10", className)}>
      <BlogCardCover slug={slug} title={title} image={image} />
    </figure>
  )
}
