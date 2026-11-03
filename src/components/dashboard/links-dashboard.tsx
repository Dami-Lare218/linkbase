"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  Archive,
  ExternalLink,
  Layers,
  Paintbrush,
  Pencil,
  Plus,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquareUserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { setFooterAction, setLinkActiveAction } from "@/app/(dashboard)/dashboard/actions";
import { UserMenu } from "@/components/auth/user-menu";
import { AnnouncementBar } from "@/components/ui/announcement-bar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SideNavItem } from "@/components/ui/side-nav-item";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import type { ToastTone } from "@/components/ui/toast";
import { UrlPill } from "@/components/ui/url-pill";
import { Wordmark } from "@/components/ui/wordmark";
import { applyLinkOverrides, NO_LINK_OVERRIDES } from "@/lib/links/display";
import type { DashboardLink, LinkOverrides } from "@/lib/links/display";

import { AddLinkDialog } from "./add-link-dialog";
import { DeleteLinkDialog } from "./delete-link-dialog";
import { LinkCard } from "./link-card";
import { PreviewSettingsDialog } from "./preview-settings-dialog";
import { ProfilePreviewPhone } from "./profile-preview-phone";
import type { PreviewTheme } from "./profile-preview-phone";

type Section = "content" | "header" | "design" | "settings";

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "content", label: "Content", icon: Layers },
  { id: "header", label: "Header", icon: SquareUserRound },
  { id: "design", label: "Design", icon: Paintbrush },
  { id: "settings", label: "Settings", icon: Settings },
];

const TOAST_MS = 2600;
const SAVE_FAILED = "Couldn’t save. Try again.";

type LinksDashboardProps = {
  name: string;
  email: string;
  handle: string;
  links: DashboardLink[];
  showFooter: boolean;
};

type ToastState = { id: number; message: string; tone: ToastTone };

/**
 * The links editor from Dashboard.dc.html. Server data arrives as props and is refreshed
 * by the Server Actions (`refresh()`); switches update instantly through useOptimistic.
 * Banner, theme, mobile view and section are UI state only (not saved).
 */
export function LinksDashboard({ name, email, handle, links, showFooter }: LinksDashboardProps) {
  const [bannerOn, setBannerOn] = useState(true);
  const [theme, setTheme] = useState<PreviewTheme>("mist");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [section, setSection] = useState<Section>("content");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardLink | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  // Confirmed changes the refreshed server data may not show yet (see applyLinkOverrides).
  const [overrides, setOverrides] = useState<LinkOverrides>(NO_LINK_OVERRIDES);
  const [savedFooter, setSavedFooter] = useState<boolean | null>(null);

  const [, startTransition] = useTransition();
  const [optimisticLinks, setLinkActiveOptimistic] = useOptimistic(
    applyLinkOverrides(links, overrides),
    (state: DashboardLink[], change: { id: string; isActive: boolean }) =>
      state.map((link) => (link.id === change.id ? { ...link, isActive: change.isActive } : link)),
  );
  const [optimisticFooter, setFooterOptimistic] = useOptimistic(savedFooter ?? showFooter);

  // Auto-dismiss, as in the design.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function confirmLinkChange(id: string, change: LinkOverrides["changes"][string]) {
    setOverrides((current) => ({
      ...current,
      changes: { ...current.changes, [id]: { ...current.changes[id], ...change } },
    }));
  }

  function confirmLinkRemoved(id: string) {
    setOverrides((current) => ({ ...current, removed: new Set(current.removed).add(id) }));
  }

  function confirmLinkAdded(link: DashboardLink) {
    setOverrides((current) => ({ ...current, added: [link, ...current.added] }));
  }

  function showToast(message: string, tone: ToastTone = "success") {
    // A new id per toast restarts its timer and animation, even for the same message.
    setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message, tone }));
  }

  function toggleLink(id: string, isActive: boolean) {
    startTransition(async () => {
      setLinkActiveOptimistic({ id, isActive });
      try {
        const result = await setLinkActiveAction(id, isActive);
        if (result.ok) confirmLinkChange(id, { isActive });
        else showToast(result.message ?? SAVE_FAILED, "error");
      } catch {
        showToast(SAVE_FAILED, "error");
      }
    });
  }

  function toggleFooter(show: boolean) {
    startTransition(async () => {
      setFooterOptimistic(show);
      try {
        const result = await setFooterAction(show);
        if (result.ok) setSavedFooter(show);
        else showToast(result.message ?? SAVE_FAILED, "error");
      } catch {
        showToast(SAVE_FAILED, "error");
      }
    });
  }

  async function copyProfileUrl() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/user/${handle}`);
      showToast(`Copied linkba.se/${handle}`);
    } catch {
      showToast("Couldn’t copy the link.", "error");
    }
  }

  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label ?? "";
  const displayName = name || handle;

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-surface-inverse font-sans text-fg-primary">
      {bannerOn ? (
        <AnnouncementBar
          message="Elevate your profile with custom themes and fonts."
          actionLabel="Upgrade"
          onDismiss={() => setBannerOn(false)}
        />
      ) : null}

      <div
        className={`box-border flex-1 bg-surface-app px-4 pt-4 pb-28 max-[359px]:px-3 min-[768px]:px-6 min-[768px]:pt-5 min-[768px]:pb-10 min-[1100px]:px-8 ${
          bannerOn ? "rounded-t-3xl" : ""
        }`}
      >
        <header className="mb-4 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 min-[768px]:mb-6 min-[768px]:grid-cols-[1fr_auto_1fr] min-[768px]:gap-3">
          <div className="flex items-center">
            <IconButton icon={ArrowLeft} label="Back to home" variant="ghost" href="/" />
          </div>
          <div className="flex min-w-0 justify-center">
            <UrlPill url={`linkba.se/${handle}`} onCopy={copyProfileUrl} />
          </div>
          <div className="flex items-center gap-2 justify-self-end">
            {/* Enhance isn't part of this lesson: shown as in the design, unavailable. Hidden
                below 768px, where the account menu needs the room and the profile URL would
                otherwise be cut to "linkba…". */}
            <span className="hidden min-[768px]:inline-flex">
              <Button variant="secondary" disabled>
                <Sparkles size={18} aria-hidden />
                Enhance
              </Button>
            </span>
            <UserMenu name={name} email={email} />
          </div>
        </header>

        {/* Mobile: switch between the editor and the preview. */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-surface-fill p-1 min-[768px]:hidden">
          {(
            [
              ["edit", Pencil, "Edit"],
              ["preview", Smartphone, "Preview"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none font-sans text-[15px] font-semibold text-fg-primary transition-[background-color] duration-200 ${
                view === id ? "bg-white shadow-[var(--shadow-sm)]" : "bg-transparent"
              }`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-start justify-center gap-3 min-[900px]:gap-4 min-[1100px]:gap-10">
          <nav
            aria-label="Dashboard sections"
            className="sticky top-6 hidden flex-none flex-col gap-5 pt-[72px] min-[768px]:flex min-[1100px]:pt-[160px]"
          >
            {SECTIONS.map((s) => (
              <SideNavItem
                key={s.id}
                icon={s.icon}
                label={s.label}
                active={section === s.id}
                onClick={() => setSection(s.id)}
              />
            ))}
          </nav>

          <div className={`min-w-0 flex-1 basis-0 max-w-[600px] ${view === "preview" ? "max-[767px]:hidden" : ""}`}>
            <div className="box-border rounded-none bg-transparent p-0 min-[768px]:rounded-[var(--radius-card)] min-[768px]:bg-surface-card min-[768px]:p-5 min-[768px]:shadow-[var(--shadow-card)] min-[900px]:p-6 min-[1100px]:p-9">
              {section === "content" ? (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="m-0 flex-1 font-display text-[length:var(--text-heading-md)] font-extrabold tracking-[var(--tracking-heading)]">
                      Content
                    </h1>
                    {/* Reorder and Archive aren't part of this lesson. */}
                    <IconButton icon={ArrowUpDown} label="Reorder (coming soon)" variant="ghost" disabled />
                    <IconButton icon={Archive} label="Archive (coming soon)" variant="ghost" disabled />
                  </div>
                  <Tabs
                    label="Content type"
                    idPrefix="content"
                    items={[{ id: "links", label: "Links" }]}
                    value="links"
                    className="mt-5"
                  />
                  <div role="tabpanel" id="content-panel-links" aria-labelledby="content-tab-links">

                  <div className="my-6 flex items-center gap-4">
                    <span className="min-[768px]:hidden">
                      <Avatar name={displayName} size={56} />
                    </span>
                    <span className="hidden min-[768px]:inline-flex">
                      <Avatar name={displayName} size={72} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-[18px] font-semibold">{displayName}</span>
                      <span className="truncate text-body-sm text-fg-secondary">@{handle}</span>
                    </div>
                  </div>

                  <Button fullWidth onClick={() => setAddOpen(true)}>
                    <Plus size={20} aria-hidden />
                    Add
                  </Button>

                  <div className="mt-6 flex flex-col gap-3">
                    {optimisticLinks.length === 0 ? (
                      <p className="m-0 rounded-xl border border-dashed border-border-default px-5 py-8 text-center text-body text-fg-secondary">
                        Add your first link. It will show up here and on your profile.
                      </p>
                    ) : (
                      optimisticLinks.map((link) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          editing={editingId === link.id}
                          onStartEdit={() => setEditingId(link.id)}
                          onEndEdit={() => setEditingId(null)}
                          onSaved={(message, saved) => {
                            confirmLinkChange(link.id, saved);
                            setEditingId(null);
                            showToast(message);
                          }}
                          onGone={(message) => {
                            confirmLinkRemoved(link.id);
                            setEditingId(null);
                            showToast(message, "error");
                          }}
                          onToggle={(isActive) => toggleLink(link.id, isActive)}
                          onDelete={() => setDeleteTarget(link)}
                        />
                      ))
                    )}
                  </div>

                  <div aria-hidden className="my-7 h-px bg-border-subtle" />

                  <div className="rounded-xl border border-border-subtle bg-surface-card px-5 py-4 min-[768px]:bg-transparent min-[768px]:p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 font-semibold">Linkbase footer</span>
                      <Switch checked={optimisticFooter} onChange={toggleFooter} label="Show Linkbase footer" />
                    </div>
                    <div className={`mt-4 transition-opacity ${optimisticFooter ? "opacity-100" : "opacity-35"}`}>
                      <Wordmark size={22} />
                    </div>
                  </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-fg-secondary">
                  <h2 className="m-0 mb-2 font-display text-[24px] font-extrabold tracking-[-0.02em] text-fg-primary">
                    {sectionLabel}
                  </h2>
                  Coming next — this section isn’t designed yet.
                </div>
              )}
            </div>
          </div>

          <aside
            aria-label="Live preview"
            className={`top-6 flex min-w-0 flex-auto items-start justify-center gap-4 min-[768px]:sticky min-[768px]:flex-none ${
              view === "edit" ? "max-[767px]:hidden" : ""
            }`}
          >
            <ProfilePreviewPhone
              name={displayName}
              handle={handle}
              links={optimisticLinks}
              showFooter={optimisticFooter}
              theme={theme}
            />
            <div className="hidden flex-col gap-1 rounded-[20px] bg-white p-1.5 shadow-[var(--shadow-sm)] min-[1100px]:flex">
              <IconButton
                icon={SlidersHorizontal}
                label="Preview settings"
                variant="ghost"
                onClick={() => setSettingsOpen(true)}
              />
              {/* The public profile page (/user/[handle]) isn't built yet. */}
              <IconButton icon={ExternalLink} label="Open profile (coming soon)" variant="ghost" disabled />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom bar: the same sections as the rail. */}
      <nav
        aria-label="Dashboard sections"
        className="fixed right-0 bottom-0 left-0 z-20 flex justify-around border-t border-border-subtle bg-white px-1 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] min-[768px]:hidden"
      >
        {SECTIONS.map((s) => (
          <SideNavItem
            key={s.id}
            icon={s.icon}
            label={s.label}
            active={section === s.id}
            onClick={() => {
              setSection(s.id);
              setView("edit");
            }}
          />
        ))}
      </nav>

      <AddLinkDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(message, link) => {
          if (link) confirmLinkAdded(link);
          setAddOpen(false);
          showToast(message);
        }}
      />
      <DeleteLinkDialog
        link={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(message) => {
          if (deleteTarget) confirmLinkRemoved(deleteTarget.id);
          setDeleteTarget(null);
          setEditingId(null);
          showToast(message);
        }}
        onGone={(message) => {
          if (deleteTarget) confirmLinkRemoved(deleteTarget.id);
          setDeleteTarget(null);
          showToast(message, "error");
        }}
      />
      <PreviewSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        bannerOn={bannerOn}
        onBannerChange={setBannerOn}
      />

      {/* One polite live region for every toast. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[104px] left-1/2 z-[200] -translate-x-1/2 min-[768px]:bottom-7"
      >
        {toast ? (
          <div className="pointer-events-auto">
            <Toast key={toast.id} message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
