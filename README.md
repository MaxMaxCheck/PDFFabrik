# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Docker (API + Redis + Worker + Web)

Von der **Repo-Root**:

```bash
docker compose up -d --build
```

(`--build` ist eine **Option**, kein Service — nicht `docker compose up -d build`.)

- Web: **http://127.0.0.1:3000** (Browser nutzt die API unter **http://127.0.0.1:3001** über `NEXT_PUBLIC_API_URL`; REST-Pfade der FastAPI: **`/v1/...`**, z. B. **`/v1/health`**)
- Beenden: `docker compose down`

Kurz: `bun run docker:up` / `bun run docker:down`

Der **Worker** ist absichtlich ein einzelner RQ-Prozess (nicht `run_workers.py` mit mehreren Kindprozessen): mehrere SpaCy-Instanzen in einem Container fressen RAM und können unter Docker zum „endlosen“ Polling führen. Mehr Parallelität: `docker compose up -d --scale worker=2` (zwei Worker-Container).

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
