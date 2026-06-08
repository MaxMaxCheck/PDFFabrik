/** Anzeige-Label ohne Klartext-Token (nur letzte Zeichen der internen ID). */
export function maskApiKeySuffix(id: string): string {
  const tail = id.length >= 4 ? id.slice(-4) : id
  return `···${tail}`
}

export function formatApiKeyLabel(
  id: string,
  name: string | null | undefined,
): string {
  const suffix = maskApiKeySuffix(id)
  if (name?.trim()) return `${name.trim()} (${suffix})`
  return `Schlüssel ${suffix}`
}
