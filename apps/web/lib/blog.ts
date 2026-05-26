import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

export type BlogPostMeta = {
  title: string
  date: string
  description?: string
  slug: string
}

export type BlogPost = BlogPostMeta & { content: string }

function parseFile(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw)
  return {
    slug,
    title: String(data.title ?? slug),
    date: data.date != null ? String(data.date) : "",
    description: data.description != null ? String(data.description) : undefined,
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
      return parseFile(slug, raw)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  return parseFile(slug, raw)
}
