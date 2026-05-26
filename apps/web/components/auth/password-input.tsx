"use client"

import { useState, type ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("rounded-lg pr-10", className)}
        {...props}
      />
      <button
        type="button"
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        aria-pressed={visible}
      >
        <HugeiconsIcon
          icon={visible ? ViewOffIcon : ViewIcon}
          className="size-4"
          strokeWidth={1.8}
        />
      </button>
    </div>
  )
}
