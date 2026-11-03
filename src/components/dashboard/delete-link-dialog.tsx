"use client";

import { useActionState } from "react";

import { deleteLinkAction } from "@/app/(dashboard)/dashboard/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { DashboardLink } from "@/lib/links/display";
import type { FormState } from "@/lib/types/action-result";
import { LINK_MESSAGES } from "@/lib/validation/link";

type DeleteLinkDialogProps = {
  /** The link to delete, or null when the dialog is closed. */
  link: DashboardLink | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
  /** The link no longer exists (e.g. deleted in another tab). */
  onGone: (message: string) => void;
};

/** Confirmation before deleting a link. Cancel comes first, so it has focus when the dialog opens. */
export function DeleteLinkDialog({ link, onClose, onDeleted, onGone }: DeleteLinkDialogProps) {
  return (
    <Dialog
      open={link !== null}
      onClose={onClose}
      title="Delete this link?"
      description={link ? `“${link.title}” will be removed from your Linkbase. This can’t be undone.` : undefined}
      width={440}
    >
      {link ? <DeleteLinkForm key={link.id} id={link.id} onCancel={onClose} onDeleted={onDeleted} onGone={onGone} /> : null}
    </Dialog>
  );
}

type DeleteFormState = FormState<"id" | "title" | "url">;

function DeleteLinkForm({
  id,
  onCancel,
  onDeleted,
  onGone,
}: {
  id: string;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onGone: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: DeleteFormState, formData: FormData) => {
    const result = await deleteLinkAction(prev, formData);
    if (result.ok) onDeleted(result.message ?? "Link deleted");
    else if (result.message === LINK_MESSAGES.notFound) onGone(result.message);
    return result;
  }, { ok: false });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Delete link
        </Button>
      </div>
    </form>
  );
}
