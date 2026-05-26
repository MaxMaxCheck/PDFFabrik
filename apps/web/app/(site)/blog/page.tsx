import { getAllPosts } from "@/lib/blog"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

export const metadata = {
  title: "Blog",
  description: "Artikel zu Anonymisierung, Datenschutz und sicherer PDF-Verarbeitung.",
}

const blogCardClass = cn(
  "group flex h-full min-h-0 flex-col rounded-xl border border-border/80 bg-card p-5 text-left shadow-sm",
  "transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
)

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <div className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="mt-2 text-muted-foreground">
            Kurzartikel in deutscher Sprache — Ergänzung zu den Docs und zur App.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-border/80 bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
            Noch keine Beiträge.
          </p>
        ) : (
          <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {posts.map((post) => (
              <li key={post.slug} className="min-w-0">
                <Link href={`/blog/${post.slug}`} className={blogCardClass} prefetch>
                  <time
                    dateTime={post.date}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {post.date
                      ? new Date(post.date + "T12:00:00").toLocaleDateString("de-DE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </time>
                  <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.description ? (
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>
                  ) : null}
                  <span className="mt-4 text-sm font-medium text-primary">Weiterlesen →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
