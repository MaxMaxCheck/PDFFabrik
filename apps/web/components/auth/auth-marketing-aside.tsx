"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"

function AsideHeroVideo() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black" aria-hidden>
      <video
        className="h-full w-full scale-[1.03] object-cover opacity-38 grayscale"
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        poster="/assets/backgrounds/auth-bg-poster.jpg"
      >
        <source src="/assets/backgrounds/auth-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/62" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.08),transparent_36%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/76 to-transparent" />
    </div>
  )
}

export function AuthMarketingAside({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative isolate hidden h-full min-h-0 w-full flex-none flex-col items-center justify-center overflow-hidden border-l border-white/10 bg-black p-6 text-white lg:flex lg:w-1/2",
        className,
      )}
    >
      <AsideHeroVideo />
      <div className="relative z-20 flex w-full max-w-2xl flex-col items-center gap-10 overflow-hidden px-2 py-12 md:gap-12 md:px-6 md:py-16">
        <div className="relative z-10">
          <blockquote className="mx-auto max-w-[34rem] text-center text-xl leading-snug font-normal tracking-tight text-pretty text-white md:max-w-[40rem] md:text-2xl md:leading-snug">
            <span className="text-white">
              „PDFFabrik hilft, sensible Inhalte zu erkennen und dauerhaft zu schwärzen.“
            </span>{" "}
            <span className="text-white/72">
              Konsequent und nachvollziehbar — für vertrauliche Dokumente.
            </span>
          </blockquote>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center pl-1">
              <Avatar className="relative z-10 size-12 rounded-full border-2 border-white bg-muted shadow-sm ring-2 ring-white/25 md:size-14">
                <AvatarImage
                  src="/media/schindlertom-avatar.jpg"
                  alt="Tom Schindler"
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
                  TS
                </AvatarFallback>
              </Avatar>
              <Avatar className="relative z-0 -ml-3 size-12 rounded-full border-2 border-white bg-muted shadow-sm ring-2 ring-white/25 md:size-14">
                <AvatarImage
                  src="/media/maxmessmann-avatar.png"
                  alt="Max Messmann"
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/12 text-xs font-medium text-white/90">
                  MM
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-base font-semibold tracking-tight text-white md:text-lg">
              Tom Schindler &amp; Max Messmann
            </p>
            <a
              href="https://schindlertom.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/72 transition-colors hover:text-white"
            >
              Gründer
            </a>
          </div>
        </div>
      </div>
    </aside>
  )
}
