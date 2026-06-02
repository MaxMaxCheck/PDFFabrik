"use client"

import { authClient } from "@/lib/auth-client"
import { useLoginDialog } from "@/components/login-dialog"
import { useCallback, useEffect, useState } from "react"
import type { PdfToolKind } from "@/lib/pdf-tool-usage"

type PdfToolAccessResponse = {
  authenticated: boolean
  canUse: boolean
  reason: "login_required" | "daily_limit_reached" | "pro_required" | null
  plan: "free" | "pro" | null
  dailyLimit: number | null
  dailyCount: number
  remainingToday: number | null
  isUnlimited: boolean
}

type GuardResult = {
  ok: boolean
  message: string | null
}

function loginRequiredState(): PdfToolAccessResponse {
  return {
    authenticated: false,
    canUse: false,
    reason: "login_required",
    plan: null,
    dailyLimit: 1,
    dailyCount: 0,
    remainingToday: 0,
    isUnlimited: false,
  }
}

function accessMessage(access: PdfToolAccessResponse | null): string | null {
  if (!access) return "Zugriff wird geprueft ..."
  if (access.reason === "login_required") return null
  if (access.reason === "pro_required") {
    return "PDF Schwärzen ist nur im Pro-Plan verfügbar."
  }
  if (access.reason === "daily_limit_reached") {
    return "Im Free-Plan kannst du dieses Tool einmal pro Tag nutzen."
  }
  if (!access.canUse) {
    return "Du hast keinen Zugriff auf dieses Tool."
  }
  return null
}

export function usePdfToolAccess(tool: PdfToolKind) {
  const { data, isPending } = authClient.useSession()
  const { openRegister } = useLoginDialog()
  const [access, setAccess] = useState<PdfToolAccessResponse | null>(null)
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const refreshAccess = useCallback(async () => {
    if (!data?.user) {
      setAccess(loginRequiredState())
      setAccessError(null)
      setAccessLoading(false)
      return
    }

    setAccessLoading(true)
    setAccessError(null)
    try {
      const res = await fetch(
        `/api/v1/account/pdf-tool-access?tool=${encodeURIComponent(tool)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      )

      const payload = (await res.json().catch(() => null)) as PdfToolAccessResponse | null
      if (!res.ok || !payload) {
        throw new Error("Zugriff konnte nicht geprueft werden.")
      }

      setAccess(payload)
    } catch (error) {
      setAccess(null)
      setAccessError(
        error instanceof Error
          ? error.message
          : "Zugriff konnte nicht geprueft werden."
      )
    } finally {
      setAccessLoading(false)
    }
  }, [data?.user, tool])

  useEffect(() => {
    if (isPending) return
    void refreshAccess()
  }, [isPending, refreshAccess])

  const ensureCanStart = useCallback((): GuardResult => {
    if (isPending) {
      return { ok: false, message: "Anmeldung wird geprueft ..." }
    }

    if (!data?.user) {
      openRegister()
      return { ok: false, message: null }
    }

    if (accessLoading) {
      return { ok: false, message: "Zugriff wird geprueft ..." }
    }

    if (accessError) {
      return { ok: false, message: accessError }
    }

    const message = accessMessage(access)
    if (message) {
      return { ok: false, message }
    }

    return { ok: true, message: null }
  }, [access, accessError, accessLoading, data?.user, isPending, openRegister])

  return {
    access,
    accessLoading,
    accessError,
    ensureCanStart,
    refreshAccess,
  }
}
