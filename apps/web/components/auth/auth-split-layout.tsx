import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"
import type { ReactNode } from "react"
import { AuthMarketingAside } from "./auth-marketing-aside"

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-background lg:flex-row lg:items-stretch">
      <section className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background px-6 pt-8 pb-6 sm:px-10 sm:pt-10 sm:pb-8 lg:h-full lg:w-1/2 lg:flex-none">
        <header className="flex shrink-0 justify-center md:justify-start">
          <Link
            href="/"
            prefetch
            className="flex items-center gap-2 font-medium text-foreground"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={1.8} />
            </div>
            PDFFabrik.de
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <div className="mx-auto my-auto flex w-full max-w-xs flex-col py-4 sm:py-6">
            {children}
          </div>
        </main>
      </section>

      <AuthMarketingAside />
    </div>
  )
}
