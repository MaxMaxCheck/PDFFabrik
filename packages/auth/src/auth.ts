import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@workspace/prisma"

const baseURL = (
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  "http://localhost:3000"
).replace(/\/$/, "")

/** Lokal/CI, wenn `BETTER_AUTH_SECRET` fehlt — nicht in Produktion dauerhaft so lassen. */
const AUTH_SECRET_DEV_FALLBACK =
  "7f2c9a1b4d8e3c6f0a2b4d6e8f0a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"

const authSecret =
  process.env.BETTER_AUTH_SECRET?.trim() || AUTH_SECRET_DEV_FALLBACK

if (!process.env.BETTER_AUTH_SECRET?.trim() && process.env.NODE_ENV === "production") {
  console.warn(
    "[@workspace/auth] BETTER_AUTH_SECRET fehlt — Fallback aktiv; in Produktion setzen.",
  )
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
      kind: {
        type: "string",
        required: false,
        defaultValue: "default",
        input: false,
      },
    },
  },
  trustedOrigins: [
    ...new Set([
      baseURL,
      // Wenn im Browser 127.0.0.1, in .env localhost (oder umgekehrt) — sonst 403/CSRF-Probleme
      baseURL.replace(/^http:\/\/localhost(:\d+)?$/, "http://127.0.0.1$1"),
      baseURL.replace(/^http:\/\/127\.0\.0\.1(:\d+)?$/, "http://localhost$1"),
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) =>
        s.trim(),
      ) ?? []),
    ]),
  ].filter((s): s is string => Boolean(s)),
})
