# Access & Subscription Model

## Entscheidungen

### Dimensionen auf `User`

| Feld        | Typ (Enum)                   | Bedeutung                          |
|-------------|------------------------------|------------------------------------|
| `role`      | `user` \| `admin`            | Dashboard-Zugang (bleibt wie es ist) |
| `plan`      | `free` \| `pro`              | Feature-Zugang & Limits            |
| `kind`      | `default` \| `partner`       | Abrechnungskonditionen             |

### Plan-Limits

| Plan   | UI-Nutzung       | API-Keys | Abrechnung          |
|--------|------------------|----------|---------------------|
| `free` | 1x pro Tag       | Nein     | kostenlos           |
| `pro`  | unbegrenzt       | Ja       | Subscription (TBD)  |

- Das Tageslimit bei `free` ist reiner Abuse-Schutz, kein Feature-Gate.
- `pro` hat kein hartes UI-Limit. Optional: Soft-Limit ~200/Tag intern (nie kommunizieren).

### Partner

- `kind = partner` bedeutet andere Konditionen bei der Abrechnung, **nicht** andere Features.
- Partner bekommen `plan = pro` gesetzt und werden über `kind` bei der Abrechnung differenziert.
- API-Nutzung für Partner wird später per-Request abgerechnet (Stripe Meters o.ä.) — **noch nicht implementiert**.

### API-Keys

- Nur `pro`-User dürfen API-Keys erstellen.
- `/konto/api-keys` muss Plan-Check haben (aktuell fehlt das).
- API extern bepreisen: guter langfristiger Gedanke, aber erst wenn konkrete Nachfrage besteht.

### Warum kein `premium` / `premium_plus` / `enterprise`?

- `enterprise` ist "Partner mit viel Volumen" → bereits durch `kind = partner` abgedeckt.
- Mehrere Paid-Tiers erst einführen wenn es einen konkreten Grund gibt.
- Enum-Erweiterung (`pro` → `pro_plus`) ist später eine Ein-Zeilen-Änderung.

---

## Offene Tasks

- [ ] `UserPlan` enum (`free | pro`) zum Schema hinzufügen
- [ ] `UserKind` enum (`default | partner`) zum Schema hinzufügen
- [ ] `UserDailyUsage`-Modell erstellen: `(userId, tool, date)` unique → für Free-Tier-Limit
- [ ] Migration generieren & anwenden
- [ ] `/konto/api-keys`: Plan-Check einbauen (nur `pro` darf Keys erstellen)
- [ ] Tool-Nutzung: Gate hinter Login (Login-Dialog wenn nicht eingeloggt)
- [ ] Free-Tier-Limit (1x/Tag) in den Tool-Endpunkten durchsetzen
- [ ] Dashboard `user/[id]`: Plan & Kind editierbar machen (aktuell nur `role`)
- [ ] Später: API per-Request-Billing für Partner (Stripe Meters)

---

## Schema-Änderungen (Zielzustand)

```prisma
enum UserPlan {
  free
  pro
}

enum UserKind {
  default
  partner
}

model User {
  // ...bestehende Felder...
  plan UserPlan @default(free)
  kind UserKind @default(default)
}

model UserDailyUsage {
  id     String      @id @default(cuid())
  userId String
  user   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  tool   PdfToolKind
  date   DateTime    @db.Date
  count  Int         @default(0)

  @@unique([userId, tool, date])
  @@index([userId])
  @@map("user_daily_usage")
}
```
