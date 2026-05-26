"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"

type Ctx = {
  /** Wird von `/pdf-redact` und `/pdf-redact-json` mit `handleReset` verbunden. */
  registerNewSession: (fn: (() => void) | null) => void
  runNewSession: () => void
  /** Sichtbarkeit des „Neu starten“-Buttons in [`SiteChromeHeader`](/). */
  setNewSessionActionVisible: (visible: boolean) => void
  isNewSessionActionVisible: boolean
  /** Aktuell geöffneter Dateiname (z. B. in der Site-Chrome neben dem Titel). */
  workspaceDocumentName: string | null
  setWorkspaceDocumentName: (name: string | null) => void
}

const noop: Ctx = {
  registerNewSession: () => {},
  runNewSession: () => {},
  setNewSessionActionVisible: () => {},
  isNewSessionActionVisible: false,
  workspaceDocumentName: null,
  setWorkspaceDocumentName: () => {},
}

const AppWorkspaceActionsContext = createContext<Ctx | null>(null)

export function AppWorkspaceActionsProvider({ children }: { children: ReactNode }) {
  const resetRef = useRef<(() => void) | null>(null)
  const [isNewSessionActionVisible, setNewSessionActionVisible] = useState(false)
  const [workspaceDocumentName, setWorkspaceDocumentName] = useState<string | null>(null)

  const registerNewSession = useCallback((fn: (() => void) | null) => {
    resetRef.current = fn
  }, [])

  const runNewSession = useCallback(() => {
    resetRef.current?.()
  }, [])

  return (
    <AppWorkspaceActionsContext.Provider
      value={{
        registerNewSession,
        runNewSession,
        setNewSessionActionVisible,
        isNewSessionActionVisible,
        workspaceDocumentName,
        setWorkspaceDocumentName,
      }}
    >
      {children}
    </AppWorkspaceActionsContext.Provider>
  )
}

export function useAppWorkspaceActions() {
  return useContext(AppWorkspaceActionsContext) ?? noop
}
