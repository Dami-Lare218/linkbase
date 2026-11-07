"use client";

import { useActionState } from "react";

import { removeProfilePictureAction } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import type { PictureFormState } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PICTURE_MESSAGES } from "@/lib/validation/profile-picture";

type RemovePictureDialogProps = {
  open: boolean;
  onClose: () => void;
  onRemoved: (message: string) => void;
};

/** Confirmation before removing the profile picture. Cancel comes first, so it has focus. */
export function RemovePictureDialog({ open, onClose, onRemoved }: RemovePictureDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Remove your profile picture?"
      description="Your initials will show instead. You can upload a new picture any time."
      width={440}
    >
      <RemovePictureForm onCancel={onClose} onRemoved={onRemoved} />
    </Dialog>
  );
}

function RemovePictureForm({ onCancel, onRemoved }: { onCancel: () => void; onRemoved: (message: string) => void }) {
  const [state, formAction, pending] = useActionState(async () => {
    let result: PictureFormState;
    try {
      result = await removeProfilePictureAction();
    } catch {
      // No answer (connection lost or a server error): keep the dashboard usable.
      result = { ok: false, message: PICTURE_MESSAGES.removeFailed };
    }
    if (result.ok) onRemoved(result.message ?? "Profile picture removed");
    return result;
  }, { ok: false } as PictureFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message && !state.ok ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Remove picture
        </Button>
      </div>
    </form>
  );
}
