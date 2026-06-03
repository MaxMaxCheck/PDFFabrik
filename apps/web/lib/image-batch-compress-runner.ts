/** Bilder pro Stapel — danach kurz dem Hauptthread Luft geben. */
export const IMAGE_BATCH_CHUNK_SIZE = 25

/** Gleichzeitige Encodes innerhalb eines Stapels (WASM ist CPU-lastig). */
export const IMAGE_BATCH_CONCURRENCY = 3

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Begrenzte Parallelität — vermeidet zu viele gleichzeitige WASM-Encodes.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const workers = Math.min(Math.max(1, concurrency), items.length)
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    for (;;) {
      const i = nextIndex
      nextIndex += 1
      if (i >= items.length) return
      results[i] = await fn(items[i]!, i)
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export function chunkCount(total: number, chunkSize: number): number {
  return Math.max(1, Math.ceil(total / chunkSize))
}
