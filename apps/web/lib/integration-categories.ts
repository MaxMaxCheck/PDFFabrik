/** Gültige Anonymisierungs-Kategorien (FastAPI PLACEHOLDERS). */
export const INTEGRATION_CATEGORIES = [
  "name",
  "address",
  "email",
  "phone",
  "iban",
  "date",
  "license_plate",
  "vin",
  "insurance_number",
  "claim_number",
] as const

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number]

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  name: "Namen",
  address: "Adressen",
  email: "E-Mail",
  phone: "Telefon",
  iban: "IBAN",
  date: "Datum",
  license_plate: "Kennzeichen",
  vin: "Fahrgestellnummer",
  insurance_number: "Vers.-Nr.",
  claim_number: "Schaden-Nr.",
}

export const INTEGRATION_CATEGORY_SET = new Set<string>(INTEGRATION_CATEGORIES)

export const INTEGRATION_PRESETS: Record<
  string,
  { label: string; categories: IntegrationCategory[] }
> = {
  all: {
    label: "Alles",
    categories: [...INTEGRATION_CATEGORIES],
  },
  gutachten: {
    label: "Gutachten",
    categories: [
      "name",
      "address",
      "email",
      "phone",
      "iban",
      "date",
      "license_plate",
      "vin",
      "insurance_number",
      "claim_number",
    ],
  },
  minimal: {
    label: "Minimal",
    categories: ["name", "email", "phone"],
  },
}

export function resolveKeyCategories(
  stored: string[] | null | undefined,
): IntegrationCategory[] {
  if (!stored?.length) {
    return [...INTEGRATION_CATEGORIES]
  }
  const filtered = stored.filter((c): c is IntegrationCategory =>
    INTEGRATION_CATEGORY_SET.has(c),
  )
  return filtered.length > 0 ? filtered : [...INTEGRATION_CATEGORIES]
}

export function parseCategoriesInput(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new Error("defaultCategories muss ein Array sein")
  }
  const filtered = value.filter(
    (c): c is IntegrationCategory =>
      typeof c === "string" && INTEGRATION_CATEGORY_SET.has(c),
  )
  if (value.length > 0 && filtered.length === 0) {
    throw new Error("Keine gültigen Kategorien")
  }
  return filtered
}

export function resolveKeyMode(mode: string | null | undefined): "replace" | "redact" {
  return mode === "redact" ? "redact" : "replace"
}
