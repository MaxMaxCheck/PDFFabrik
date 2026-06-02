/** Slug für Anker und Inhaltsverzeichnis — muss mit BlogContent-Überschriften übereinstimmen. */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export type BlogHeading = {
  id: string
  text: string
  level: 2 | 3
}

export function extractMarkdownHeadings(content: string): BlogHeading[] {
  const headings: BlogHeading[] = []
  for (const line of content.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim())
    if (!match?.[1] || !match[2]) continue
    const level = match[1].length as 2 | 3
    if (level !== 2 && level !== 3) continue
    const text = match[2].replace(/\s+#+\s*$/, "").trim()
    headings.push({ id: slugifyHeading(text), text, level })
  }
  return headings
}
