import { cn } from "@workspace/ui/lib/utils"

const DEFAULT_PILLS = [
  "Browser-basiert",
  "Kein Upload auf Server",
  "JPG · PNG · WebP · BMP",
  "Sofort-Download",
] as const

const DEFAULT_HEADING = "Bilder komprimieren"
const DEFAULT_SUBLINE =
  "Reduziere JPG-, PNG-, WebP- und BMP-Dateigrößen direkt im Browser. Kein Signup, kein Server-Upload, sofortiger Download – Qualität einstellen und Ergebnis vergleichen."

export function ImageCompressHero({
  heading = DEFAULT_HEADING,
  subline = DEFAULT_SUBLINE,
  pills = DEFAULT_PILLS,
  className,
}: {
  heading?: string
  subline?: string
  pills?: readonly string[]
  className?: string
} = {}) {
  return (
    <header className={cn("space-y-4 text-left", className)}>
      <div className="space-y-3">
        <h1
          id="image-compress-hero-heading"
          className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl"
        >
          {heading}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
          {subline}
        </p>
      </div>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400"
        aria-label="Features"
      >
        {pills.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </header>
  )
}

