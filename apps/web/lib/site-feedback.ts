const MESSAGE_MIN = 10
const MESSAGE_MAX = 4000
const EMAIL_MAX = 320

export function parseFeedbackBody(body: unknown):
  | { ok: true; message: string; email: string | null; rating: number | null }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Ungültiger JSON-Body." }
  }

  const { message, email, rating } = body as {
    message?: unknown
    email?: unknown
    rating?: unknown
  }

  if (typeof message !== "string") {
    return { ok: false, error: "Nachricht fehlt." }
  }

  const trimmed = message.trim()
  if (trimmed.length < MESSAGE_MIN) {
    return {
      ok: false,
      error: `Nachricht mindestens ${MESSAGE_MIN} Zeichen.`,
    }
  }
  if (trimmed.length > MESSAGE_MAX) {
    return { ok: false, error: `Nachricht maximal ${MESSAGE_MAX} Zeichen.` }
  }

  let emailNorm: string | null = null
  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string") {
      return { ok: false, error: "E-Mail ungültig." }
    }
    const e = email.trim()
    if (e.length > EMAIL_MAX) {
      return { ok: false, error: "E-Mail zu lang." }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { ok: false, error: "E-Mail-Format ungültig." }
    }
    emailNorm = e
  }

  let ratingNorm: number | null = null
  if (rating !== undefined && rating !== null && rating !== "") {
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: "Bewertung muss zwischen 1 und 5 liegen." }
    }
    ratingNorm = rating
  }

  return { ok: true, message: trimmed, email: emailNorm, rating: ratingNorm }
}
