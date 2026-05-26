import { SiteChrome } from "@/components/site-chrome"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
