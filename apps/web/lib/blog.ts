import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

export type BlogAuthor = {
  name: string
  avatar?: string
  role?: string
}

export type BlogPostMeta = {
  title: string
  date: string
  description?: string
  slug: string
  category?: string
  readTimeMinutes?: number
  image?: string
  featured?: boolean
  author: BlogAuthor
}

export type BlogPost = BlogPostMeta & { content: string }

const DEFAULT_AUTHOR: BlogAuthor = { name: "PDFFabrik Team" }

export function estimateReadTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function formatBlogDate(date: string, locale = "de-DE"): string {
  if (!date) return ""
  return new Date(date + "T12:00:00").toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function parseAuthor(data: Record<string, unknown>): BlogAuthor {
  const raw = data.author
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const a = raw as Record<string, unknown>
    return {
      name: String(a.name ?? DEFAULT_AUTHOR.name),
      avatar: a.avatar != null ? String(a.avatar) : undefined,
      role: a.role != null ? String(a.role) : undefined,
    }
  }
  if (typeof raw === "string" && raw.trim()) {
    return { name: raw.trim() }
  }
  return DEFAULT_AUTHOR
}

function parseFile(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw)
  const readTimeRaw = data.readTime ?? data.readTimeMinutes
  return {
    slug,
    title: String(data.title ?? slug),
    date: data.date != null ? String(data.date) : "",
    description: data.description != null ? String(data.description) : undefined,
    category: data.category != null ? String(data.category) : undefined,
    readTimeMinutes:
      readTimeRaw != null
        ? Number(readTimeRaw)
        : estimateReadTimeMinutes(content),
    image: data.image != null ? String(data.image) : undefined,
    featured: Boolean(data.featured),
    author: parseAuthor(data as Record<string, unknown>),
    content,
  }
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
}

export function getAllPosts(): BlogPostMeta[] {
  return getAllSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8")
      const post = parseFile(slug, raw)
      const { content: _, ...meta } = post
      return meta
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  return parseFile(slug, raw)
}
