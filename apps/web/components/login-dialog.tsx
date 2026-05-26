"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { LoginForm } from "@/app/(auth)/login/ui"
import { RegisterForm } from "@/app/(auth)/register/ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type AuthDialogMode = "login" | "register"

type LoginDialogContextValue = {
  openLogin: () => void
  openRegister: () => void
  closeLogin: () => void
  isOpen: boolean
}

const noop: LoginDialogContextValue = {
  openLogin: () => {},
  openRegister: () => {},
  closeLogin: () => {},
  isOpen: false,
}

const LoginDialogContext = createContext<LoginDialogContextValue | null>(null)

export function LoginDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthDialogMode>("login")
  const pathname = usePathname() ?? "/"

  const openLogin = useCallback(() => {
    setMode("login")
    setOpen(true)
  }, [])
  const openRegister = useCallback(() => {
    setMode("register")
    setOpen(true)
  }, [])
  const closeLogin = useCallback(() => {
    setOpen(false)
    setMode("login")
  }, [])

  const isLogin = mode === "login"

  const value = useMemo(
    () => ({
      openLogin,
      openRegister,
      closeLogin,
      isOpen: open,
    }),
    [open, openLogin, openRegister, closeLogin],
  )

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setMode("login")
        }}
      >
        <DialogContent
          className="max-w-md gap-4 p-5 sm:max-w-md"
          showCloseButton
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg">
              {isLogin ? "Anmelden" : "Registrieren"}
            </DialogTitle>
            <DialogDescription asChild>
              <p>
                {isLogin ? (
                  <>
                    Noch kein Konto?{" "}
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => setMode("register")}
                    >
                      Registrieren
                    </button>
                  </>
                ) : (
                  <>
                    Schon ein Konto?{" "}
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                      onClick={() => setMode("login")}
                    >
                      Anmelden
                    </button>
                  </>
                )}
              </p>
            </DialogDescription>
          </DialogHeader>
          {isLogin ? (
            <LoginForm
              nextPath={pathname}
              fieldIdPrefix="login-dialog"
              onSuccess={closeLogin}
            />
          ) : (
            <RegisterForm
              nextPath={pathname}
              fieldIdPrefix="register-dialog"
              onSuccess={closeLogin}
            />
          )}
        </DialogContent>
      </Dialog>
    </LoginDialogContext.Provider>
  )
}

export function useLoginDialog() {
  return useContext(LoginDialogContext) ?? noop
}

/**
 * Wie „Aktiv“-Stil in der Leiste, wenn /login ODER Anmelde-Dialog offen.
 */
export function useGuestAuthNavActive(pathname: string) {
  const { isOpen } = useLoginDialog()
  return isOpen || pathname === "/login" || pathname === "/register"
}
