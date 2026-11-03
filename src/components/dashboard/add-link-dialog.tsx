"use client";

import { useActionState } from "react";
import { Link as LinkIcon } from "lucide-react";

import { createLinkAction } from "@/app/(dashboard)/dashboard/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DashboardLink } from "@/lib/links/display";
import type { FormState } from "@/lib/types/action-result";
import { LINK_TITLE_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/validation/link";

type AddLinkDialogProps = {
  open: boolean;
  onClose: () => void;
  /** `link` is the saved link, so the list can show it straight away. */
  onAdded: (message: string, link: DashboardLink | null) => void;
};

/** "Add a link" dialog from the design. Title is required here (the lesson rule), unlike the design. */
export function AddLinkDialog({ open, onClose, onAdded }: AddLinkDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a link"
      description="Add the address and the title people will see."
    >
      {/* Rendered only while open, so every opening starts with an empty form. */}
      <AddLinkForm onCancel={onClose} onAdded={onAdded} />
    </Dialog>
  );
}

type LinkFormState = FormState<"id" | "title" | "url">;

function AddLinkForm({ onCancel, onAdded }: Pick<AddLinkDialogProps, "onAdded"> & { onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(async (prev: LinkFormState, formData: FormData) => {
    const result = await createLinkAction(prev, formData);
    if (result.ok) {
      const { id, title, url } = result.values ?? {};
      const link = id && title && url ? { id, title, url, isActive: true, clicks: 0 } : null;
      onAdded(result.message ?? "Link added", link);
    }
    return result;
  }, { ok: false });
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {state.message && !state.ok ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <Input
        name="url"
        id="new-link-url"
        label="URL"
        type="url"
        size="md"
        iconLeft={LinkIcon}
        placeholder="https://"
        autoComplete="url"
        maxLength={LINK_URL_MAX_LENGTH}
        required
        defaultValue={state.values?.url}
        readOnly={pending}
        error={errors?.url?.[0]}
      />
      <Input
        name="title"
        id="new-link-title"
        label="Title"
        size="md"
        placeholder="My portfolio"
        maxLength={LINK_TITLE_MAX_LENGTH}
        required
        defaultValue={state.values?.title}
        readOnly={pending}
        error={errors?.title?.[0]}
      />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Add link
        </Button>
      </div>
    </form>
  );
}
