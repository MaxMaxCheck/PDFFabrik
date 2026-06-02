import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"
import type { BlogAuthor } from "@/lib/blog"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

type BlogAuthorRowProps = {
  author: BlogAuthor
  dateLabel: string
  dateTime?: string
  /** Unter dem Namen statt Datum (z. B. Rolle im Artikel-Footer) */
  subtitle?: string
  variant?: "default" | "onImage" | "centered"
  className?: string
}

export function BlogAuthorRow({
  author,
  dateLabel,
  dateTime,
  subtitle,
  variant = "default",
  className,
}: BlogAuthorRowProps) {
  const onImage = variant === "onImage"
  const centered = variant === "centered"
  const secondary = subtitle ?? dateLabel

  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        centered && "flex-col text-center",
        className
      )}
    >
      <Avatar className="size-8 rounded-full">
        {author.avatar ? (
          <AvatarImage src={author.avatar} alt={author.name} className="object-cover" />
        ) : null}
        <AvatarFallback
          className={cn(
            "rounded-full text-[10px] font-semibold",
            onImage ? "bg-white/15 text-white" : "bg-muted text-muted-foreground"
          )}
        >
          {initials(author.name)}
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0", centered && "flex flex-col items-center")}>
        <p
          className={cn(
            "truncate text-sm font-medium leading-tight",
            onImage ? "text-white" : "text-foreground"
          )}
        >
          {author.name}
        </p>
        {secondary ? (
          subtitle ? (
            <p
              className={cn(
                "text-xs leading-tight",
                onImage ? "text-white/70" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          ) : (
            <time
              dateTime={dateTime}
              className={cn(
                "block text-xs leading-tight",
                onImage ? "text-white/70" : "text-muted-foreground"
              )}
            >
              {dateLabel}
            </time>
          )
        ) : null}
      </div>
    </div>
  )
}
