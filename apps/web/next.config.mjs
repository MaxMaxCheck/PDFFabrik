import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Monorepo: `next dev` / `next build` nutzen `apps/web` als cwd — `DATABASE_URL` etc.
 * liegen oft im Repo-Root. Ohne das schlägt Prisma (Better Auth) mit 500 fehl.
 */
const repoRoot = path.join(__dirname, "../..")
const envFileKeys = (raw) => {
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    const k = t.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue
    let v = t.slice(eq + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) {
      process.env[k] = v
    }
  }
}
for (const name of [".env", ".env.local"]) {
  const p = path.join(repoRoot, name)
  if (existsSync(p)) {
    try {
      envFileKeys(readFileSync(p, "utf8"))
    } catch {
      /* ignore */
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/pdf-meta-daten-loeschen",
        destination: "/meta-daten-loeschen",
        permanent: true,
      },
      {
        source: "/app/simple",
        destination: "/pdf-redact-json",
        permanent: true,
      },
      {
        source: "/app",
        destination: "/pdf-redact",
        permanent: true,
      },
    ]
  },
  transpilePackages: [
    "@workspace/ui",
    "@workspace/auth",
    "@workspace/prisma",
    "pdfjs-dist",
    "pdf-lib",
  ],
  output: "standalone",
  // Monorepo: Workspace-Pakete korrekt ins Standalone-Bundle einbeziehen
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Prisma-Engine + generierter Client im Standalone-Image (App Router)
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.prisma/**",
      "../../node_modules/@prisma/**",
      "../../packages/prisma/node_modules/.prisma/**",
      "../../packages/prisma/node_modules/@prisma/**",
    ],
  },
}

export default nextConfig
