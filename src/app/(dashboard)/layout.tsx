import { HeaderAuth } from "@/components/auth/header-auth";
import { SiteNav } from "@/components/ui/site-nav";

/**
 * Dashboard shell. Display only: it does not check the session.
 * Each page calls `requireUser()` itself (Doc/auth.md §4).
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteNav actions={<HeaderAuth />} />
      <div className="flex flex-1 flex-col bg-surface-app">{children}</div>
    </>
  );
}
