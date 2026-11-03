/**
 * Dashboard shell: the ink background behind the app canvas (Dashboard.dc.html). Display
 * only: it does not check the session. Each page calls `requireOnboardedUser()` itself
 * (Doc/auth.md §4). The page renders the banner, header and user menu.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <div className="flex flex-1 flex-col bg-surface-inverse">{children}</div>;
}
