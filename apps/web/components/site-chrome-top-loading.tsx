"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@workspace/ui/lib/utils"

export type SiteChromeTopLoadingState = {
  active: boolean
}

type SiteChromeTopLoadingContextValue = {
  state: SiteChromeTopLoadingState
  setLoadingBar: (
    next:
      | SiteChromeTopLoadingState
      | ((prev: SiteChromeTopLoadingState) => SiteChromeTopLoadingState)
  ) => void
}

const defaultState: SiteChromeTopLoadingState = { active: false }

const noopSetLoadingBar: SiteChromeTopLoadingContextValue["setLoadingBar"] = () => {}

const SiteChromeTopLoadingContext =
  createContext<SiteChromeTopLoadingContextValue | null>(null)

export function SiteChromeTopLoadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteChromeTopLoadingState>(defaultState)
  const setLoadingBar = useCallback(
    (
      next:
        | SiteChromeTopLoadingState
        | ((prev: SiteChromeTopLoadingState) => SiteChromeTopLoadingState)
    ) => {
      setState(next)
    },
    []
  )
  const value = useMemo(
    () => ({ state, setLoadingBar }),
    [state, setLoadingBar]
  )
  return (
    <SiteChromeTopLoadingContext.Provider value={value}>
      {children}
    </SiteChromeTopLoadingContext.Provider>
  )
}

/**
 * Liefert no-op, wenn `SiteChrome` noch ohne Leiste (kein erster Upload) – gleiche Seite
 * funktioniert also vorher und nachher.
 */
export function useSiteChromeTopLoading() {
  const ctx = useContext(SiteChromeTopLoadingContext)
  if (!ctx) {
    return {
      state: defaultState,
      setLoadingBar: noopSetLoadingBar,
    } satisfies SiteChromeTopLoadingContextValue
  }
  return ctx
}

/** Dünne gestreifte Indeterminate-Zeile — kein zweiter LTR-Balken (Fortschritt steht im Inhalt). */
export function SiteChromeTopLoadingBar() {
  const { state } = useSiteChromeTopLoading()
  if (!state.active) return null

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden",
        "h-1 border-b border-border/50"
      )}
    >
      <div
        className="site-chrome-top-loading-indeterminate h-full w-full"
        role="progressbar"
        aria-valuetext="Wird verarbeitet"
        aria-busy="true"
      />
    </div>
  )
}
