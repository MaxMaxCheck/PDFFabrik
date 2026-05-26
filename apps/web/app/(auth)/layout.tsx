import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark fixed inset-0 z-50 overflow-hidden overscroll-none bg-background text-foreground scheme-dark">
      <AuthSplitLayout>{children}</AuthSplitLayout>
    </div>
  )
}
