import { SiteChrome } from "@/components/site-chrome"
import { getAppSession } from "@/lib/get-session"
import { redirect } from "next/navigation"

export default async function PdfRedactAreaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAppSession()
  if (!session) {
    redirect("/login")
  }

  return <SiteChrome>{children}</SiteChrome>
}
