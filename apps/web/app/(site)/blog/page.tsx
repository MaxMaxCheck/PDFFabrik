import { BlogFeaturedCard } from "@/components/blog/blog-featured-card"
import { BlogListingCard } from "@/components/blog/blog-listing-card"
import { BlogPageHeading } from "@/components/blog/blog-page-heading"
import { getAllPosts } from "@/lib/blog"

export const metadata = {
  title: "Blog",
  description:
    "News, Artikel und Updates zu PDF-Schwärzung, Metadaten und sicherer Verarbeitung.",
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const featured = posts.find((p) => p.featured)
  const gridPosts = featured ? posts.filter((p) => p.slug !== featured.slug) : posts

  return (
    <div className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-y-10 px-4 py-10 sm:px-6 md:px-8 lg:gap-y-12 lg:pt-14 lg:pb-16">
        <BlogPageHeading
          tagline="Blog"
          title="News, Artikel & Updates"
          description="Einblicke, Tipps und Produkt-Updates zu PDF-Schwärzung, Metadaten und datenschutzbewusster Verarbeitung."
        />

        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
            Noch keine Beiträge.
          </p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-9 lg:gap-y-12">
            {featured ? <BlogFeaturedCard post={featured} /> : null}
            {gridPosts.map((post) => (
              <BlogListingCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
