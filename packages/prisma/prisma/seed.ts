import { generateId } from "@better-auth/core/utils/id"
import { hashPassword } from "better-auth/crypto"
import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

const defaultPassword = process.env.SEED_USER_PASSWORD ??
  process.env.SEED_ADMIN_PASSWORD ??
  "pdffabrikdev"

type UpsertOpts = {
  email: string
  password: string
  name: string
  role: UserRole
  label: string
}

/**
 * Idempotent: legt/aktualisiert einen Credential-User (E-Mail/Passwort).
 */
async function upsertCredentialUser(opts: UpsertOpts) {
  const { email, password, name, role, label } = opts
  const passwordHash = await hashPassword(password)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role, name, emailVerified: true },
    })
    const acc = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    })
    if (acc) {
      await prisma.account.update({
        where: { id: acc.id },
        data: { password: passwordHash },
      })
    } else {
      await prisma.account.create({
        data: {
          id: generateId(),
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: passwordHash,
        },
      })
    }
    console.log(`[seed] ${label} existiert: ${email} (Passwort aktualisiert)`)
  } else {
    const userId = generateId()
    await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: true,
        role,
        accounts: {
          create: {
            id: generateId(),
            accountId: userId,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    })
    console.log(`[seed] ${label} erstellt: ${email}`)
  }
}

/**
 * Standard-Nutzer: user@pdffabrik.de (Rolle `user`)
 * Standard-Admins:
 * - info@schindlertom.com
 * - max@maxcheck.de
 * Passwörter: SEED_USER_PASSWORD / SEED_ADMIN_PASSWORD
 */
async function main() {
  const userEmail = (process.env.SEED_USER_EMAIL ?? "user@pdffabrik.de").toLowerCase()
  const userPassword = process.env.SEED_USER_PASSWORD ?? defaultPassword
  const userName = process.env.SEED_USER_NAME ?? "User"
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "EsWirdEndlichZeitFürEinenGemeinsamenTornado2026!"

  const admins = [
    {
      email: (process.env.SEED_ADMIN_EMAIL ?? "info@schindlertom.com").toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? "Tom Schindler",
      label: "Admin 1",
    },
    {
      email: (process.env.SEED_ADMIN_EMAIL_2 ?? "max@maxcheck.de").toLowerCase(),
      name: process.env.SEED_ADMIN_NAME_2 ?? "Max",
      label: "Admin 2",
    },
  ]

  await upsertCredentialUser({
    email: userEmail,
    password: userPassword,
    name: userName,
    role: UserRole.user,
    label: "User",
  })

  for (const admin of admins) {
    await upsertCredentialUser({
      email: admin.email,
      password: adminPassword,
      name: admin.name,
      role: UserRole.admin,
      label: admin.label,
    })
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    void prisma.$disconnect()
    process.exit(1)
  })
