"use client";

import { useActionState } from "react";
import type { KeyboardEvent } from "react";
import { GripVertical, Link as LinkIcon } from "lucide-react";

import { updateLinkAction } from "@/app/(dashboard)/dashboard/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatClicks, getLinkDomain } from "@/lib/links/display";
import type { DashboardLink } from "@/lib/links/display";
import type { FormState } from "@/lib/types/action-result";
import { LINK_MESSAGES, LINK_TITLE_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/validation/link";

import { LinkMenu } from "./link-menu";

type LinkCardProps = {
  link: DashboardLink;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onSaved: (message: string, saved: { title: string; url: string }) => void;
  /** The link no longer exists (e.g. deleted in another tab). */
  onGone: (message: string) => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
};

/** One link on the dashboard (design system `LinkCard`), or its inline edit form. */
export function LinkCard({ link, editing, onStartEdit, onEndEdit, onSaved, onGone, onToggle, onDelete }: LinkCardProps) {
  if (editing) {
    return <LinkEditForm link={link} onCancel={onEndEdit} onSaved={onSaved} onGone={onGone} />;
  }

  const domain = getLinkDomain(link.url);
  // Fade only the content of an inactive link. Opacity on the whole card would create a
  // stacking context that traps the open ⋮ menu under the next card.
  const fade = link.isActive ? "" : "opacity-60";

  return (
    <div
      className={`box-border flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-card py-3 pr-2 pl-3.5 transition-[border-color] duration-[120ms] hover:border-border-default min-[768px]:gap-4 min-[900px]:py-4 min-[900px]:pr-3 min-[900px]:pl-2`}
    >
      {/* Reordering isn't built: the handle is the design's glyph only (Doc/ui.md). */}
      <GripVertical size={18} aria-hidden className={`hidden flex-none text-fg-tertiary min-[900px]:block ${fade}`} />
      <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-md bg-surface-fill shadow-[var(--shadow-xs)] ${fade}`}>
        <LinkIcon size={22} aria-hidden />
      </span>
      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${fade}`}>
        <span className="truncate text-body font-semibold text-fg-primary">{link.title}</span>
        <span className="flex min-w-0 gap-1.5 text-body-sm whitespace-nowrap text-fg-secondary">
          <span>{formatClicks(link.clicks)}</span>
          {domain ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{domain}</span>
            </>
          ) : null}
        </span>
      </div>
      <Switch size="sm" checked={link.isActive} onChange={onToggle} label={`Show ${link.title}`} />
      <LinkMenu title={link.title} onEdit={onStartEdit} onDelete={onDelete} />
    </div>
  );
}

type LinkEditFormProps = {
  link: DashboardLink;
  onCancel: () => void;
  onSaved: (message: string, saved: { title: string; url: string }) => void;
  onGone: (message: string) => void;
};

type LinkFormState = FormState<"id" | "title" | "url">;

function LinkEditForm({ link, onCancel, onSaved, onGone }: LinkEditFormProps) {
  const [state, formAction, pending] = useActionState(async (prev: LinkFormState, formData: FormData) => {
    const result = await updateLinkAction(prev, formData);
    if (result.ok) {
      onSaved(result.message ?? "Link updated", {
        title: result.values?.title ?? link.title,
        url: result.values?.url ?? link.url,
      });
    } else if (result.message === LINK_MESSAGES.notFound) {
      // The refreshed list no longer has this link, so the form is about to disappear:
      // tell the parent, which removes the row and explains why in a toast.
      onGone(result.message);
    }
    return result;
  }, { ok: false });
  const errors = state.fieldErrors;

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !pending) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form
      action={formAction}
      noValidate
      onKeyDown={handleKeyDown}
      aria-label={`Edit ${link.title}`}
      className="box-border flex flex-col gap-4 rounded-xl border border-border-strong bg-surface-card p-4 min-[768px]:p-5"
    >
      {state.message && !state.ok ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <input type="hidden" name="id" value={link.id} />
      <Input
        name="title"
        id={`title-${link.id}`}
        label="Title"
        size="md"
        autoFocus
        maxLength={LINK_TITLE_MAX_LENGTH}
        defaultValue={state.values?.title ?? link.title}
        readOnly={pending}
        error={errors?.title?.[0]}
      />
      <Input
        name="url"
        id={`url-${link.id}`}
        label="URL"
        type="url"
        size="md"
        iconLeft={LinkIcon}
        autoComplete="url"
        maxLength={LINK_URL_MAX_LENGTH}
        defaultValue={state.values?.url ?? link.url}
        readOnly={pending}
        error={errors?.url?.[0]}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
