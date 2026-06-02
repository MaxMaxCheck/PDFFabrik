import { handlePdfProxyRequest } from "@/lib/pdf-proxy-request"

type RouteContext = { params: Promise<{ path?: string[] }> }

async function proxy(req: Request, context: RouteContext) {
  const { path } = await context.params
  return handlePdfProxyRequest(req, path)
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
