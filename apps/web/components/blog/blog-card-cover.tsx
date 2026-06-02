import Image from "next/image"
import { cn } from "@workspace/ui/lib/utils"

const SLUG_GRADIENTS: Record<string, string> = {
  "willkommen-beim-pdf-anonymisierer":
    "bg-linear-to-br from-sky-600/90 via-primary/80 to-indigo-900/90",
  "sicherheitsaspekte-pdf-anonymisierung":
    "bg-linear-to-br from-emerald-700/90 via-teal-800/85 to-slate-900/90",
}

function gradientForSlug(slug: string): string {
  return (
    SLUG_GRADIENTS[slug] ??
    "bg-linear-to-br from-muted via-primary/30 to-muted-foreground/25"
  )
}

type BlogCardCoverProps = {
  slug: string
  title: string
  image?: string
  className?: string
  imageClassName?: string
  overlay?: boolean
  /** Volle Containerhöhe (Featured-Karte) statt 16:9 */
  fill?: boolean
}

export function BlogCardCover({
  slug,
  title,
  image,
  className,
  imageClassName,
  overlay = false,
  fill = false,
}: BlogCardCoverProps) {
  const rootClass = cn(
    "relative overflow-hidden bg-muted",
    fill ? "size-full rounded-none" : "aspect-video w-full rounded-xl",
    className
  )

  if (image) {
    return (
      <div className={rootClass}>
        <Image
          src={image}
          alt={title}
          fill
          className={cn("object-cover transition duration-300 ease-out", imageClassName)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {overlay ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(rootClass, gradientForSlug(slug))}>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]"
      />
      {overlay ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"
        />
      ) : null}
    </div>
  )
}
