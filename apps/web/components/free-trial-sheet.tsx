"use client"

import { LoginForm } from "@/app/(auth)/login/ui"
import { RegisterForm } from "@/app/(auth)/register/ui"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CrownIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

const BENEFITS = [
  "Vollzugriff auf die Anonymisierungs-App",
  "Metadaten-Tools in einem Workflow",
  "Priorisierter Support (je nach Plan)",
  "Dokumentation & API-Referenz",
] as const

type AuthMode = "register" | "login"

export function FreeTrialSheet() {
  const pathname = usePathname() ?? "/"
  const { data, isPending } = authClient.useSession()
  const user = data?.user
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>("register")
  const isLogin = mode === "login"

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setMode("register")
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 rounded-full pr-1.5 pl-1"
        >
          <HugeiconsIcon
            icon={CrownIcon}
            className="size-5.5 rounded-full border border-border bg-muted p-0.5 text-amber-600 dark:text-amber-400"
            strokeWidth={1.8}
          />
          <span>Kostenlos testen</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full w-[min(96vw,78rem)] !max-w-[min(96vw,78rem)] flex-col gap-0 overflow-hidden rounded-l-4xl border-border bg-background/80 p-0 text-foreground backdrop-blur-xl sm:max-w-none",
          "data-[side=right]:!w-[min(96vw,78rem)]",
        )}
      >
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background/50 px-6 py-6 backdrop-blur-md sm:px-8 sm:py-8">
            <Link
              href="/"
              className="w-fit text-sm font-semibold tracking-tight text-foreground hover:underline"
              onClick={() => setOpen(false)}
            >
              PDFFabrik.de
            </Link>

            {isPending ? (
              <p className="mt-8 text-sm text-muted-foreground" aria-hidden>
                …
              </p>
            ) : user ? (
              <>
                <SheetHeader className="mt-6 p-0 text-left sm:mt-8">
                  <SheetTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    Dein Zugang
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground">
                    Angemeldet als{" "}
                    <span className="font-medium text-foreground">
                      {user.name?.trim() || user.email}
                    </span>
                    {user.name?.trim() && user.email ? (
                      <span className="mt-1 block text-xs">{user.email}</span>
                    ) : null}
                  </SheetDescription>
                </SheetHeader>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Du hast vollen Zugriff auf Schwärzen, Metadaten-Werkzeuge und
                  Konto-Features — direkt im Browser.
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <Button className="h-11 w-full rounded-md" asChild>
                    <Link href="/pdf-redact" onClick={() => setOpen(false)} prefetch>
                      Jetzt PDF schwärzen
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-md"
                    asChild
                  >
                    <Link href="/dashboard" onClick={() => setOpen(false)} prefetch>
                      Konto öffnen
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <SheetHeader className="mt-6 p-0 text-left sm:mt-8">
                  <SheetTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    {isLogin ? "Anmelden" : "Registrieren"}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground">
                    {isLogin ? (
                      <>
                        Noch kein Konto?{" "}
                        <button
                          type="button"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          onClick={() => setMode("register")}
                        >
                          Registrieren
                        </button>
                      </>
                    ) : (
                      <>
                        Schon ein Konto?{" "}
                        <button
                          type="button"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          onClick={() => setMode("login")}
                        >
                          Anmelden
                        </button>
                      </>
                    )}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6">
                  {isLogin ? (
                    <LoginForm
                      nextPath={pathname}
                      fieldIdPrefix="trial-sheet-login"
                      onSuccess={() => setOpen(false)}
                    />
                  ) : (
                    <RegisterForm
                      nextPath={pathname}
                      fieldIdPrefix="trial-sheet-register"
                      onSuccess={() => setOpen(false)}
                    />
                  )}
                </div>

                {!isLogin ? (
                  <p className="mt-8 text-center text-xs text-muted-foreground">
                    Mit dem Fortfahren stimmst du unseren{" "}
                    <Link
                      href="/docs"
                      className="text-foreground underline-offset-4 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Richtlinien
                    </Link>{" "}
                    zu. Es gibt derzeit kein kostenpflichtiges Abo; Registrierung
                    für Konto-Features.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div
            className={cn(
              "relative flex w-full min-w-0 flex-col border-t border-border bg-muted/50 px-5 py-6 text-foreground backdrop-blur-md",
              "sm:w-[min(100%,20rem)] sm:border-t-0 sm:border-l",
            )}
          >
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground sm:top-4 sm:right-4"
                aria-label="Schließen"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  className="size-5"
                  strokeWidth={2}
                />
              </Button>
            </SheetClose>

            <div className="mt-6 pr-8 sm:mt-0">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground">
                Pro
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                PDFFabrik nutzen
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {BENEFITS.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden
                    >
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        className="size-4"
                        strokeWidth={2.2}
                      />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-auto border-t border-border pt-4 text-center text-[10px] text-muted-foreground">
              Vertrauliche Verarbeitung — Hosting in eurer Kontrolle möglich
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
