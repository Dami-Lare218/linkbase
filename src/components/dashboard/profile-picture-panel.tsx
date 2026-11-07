"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { CircleAlert, ImageUp, Trash2 } from "lucide-react";

import { uploadProfilePictureAction } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import type { PictureFormState } from "@/app/(dashboard)/dashboard/profile-picture-actions";
import { FormMessage } from "@/components/auth/form-message";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPictureFileError, PICTURE_ACCEPT, PICTURE_MESSAGES } from "@/lib/validation/profile-picture";

import { RemovePictureDialog } from "./remove-picture-dialog";

type ProfilePicturePanelProps = {
  handle: string;
  /** The current picture URL, or null. */
  image: string | null;
  /** `url` is the new picture, or null after removing it. */
  onChanged: (url: string | null, message: string) => void;
};

/**
 * Dashboard → Header: upload, replace or remove the profile picture. The browser checks
 * type and size for instant feedback and shows a local preview; the Server Action checks
 * everything again and stores a processed copy.
 */
export function ProfilePicturePanel({ handle, image, onChanged }: ProfilePicturePanelProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  // True once a new file is chosen: the last save's error no longer applies.
  const [resultStale, setResultStale] = useState(false);

  const [state, formAction, pending] = useActionState(async (prev: PictureFormState, formData: FormData) => {
    let result: PictureFormState;
    try {
      result = await uploadProfilePictureAction(prev, formData);
    } catch {
      // The request never got an answer: connection lost, or a body over the server's limit
      // (only possible when the browser checks are bypassed). Keep the dashboard usable.
      result = { ok: false, message: PICTURE_MESSAGES.storage };
    }
    clearPreview();
    setResultStale(false);
    if (result.ok) onChanged(result.values?.picture || null, result.message ?? "Profile picture updated");
    return result;
  }, { ok: false });

  // Free the local preview's memory when it changes or the panel unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clearPreview() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResultStale(true);
    const problem = getPictureFileError(file);
    if (problem) {
      setClientError(problem);
      clearPreview();
      return;
    }
    setClientError(null);
    setPreview(URL.createObjectURL(file));
  }

  const serverError = state.ok || resultStale ? undefined : (state.fieldErrors?.picture?.[0] ?? undefined);
  const error = clientError ?? (preview ? null : serverError);
  const serverMessage = state.ok || resultStale ? undefined : state.message;
  const shown = preview ?? image;

  return (
    <section aria-labelledby={`${inputId}-heading`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[length:var(--text-heading-md)] font-extrabold tracking-[var(--tracking-heading)]">
          Header
        </h1>
        <p className="m-0 text-body text-fg-secondary">Your picture appears in a circle above your handle.</p>
      </div>

      <form action={formAction} className="flex flex-col items-center gap-5 min-[480px]:flex-row min-[480px]:items-center">
        <span className="relative flex-none">
          <span className="min-[480px]:hidden">
            {/* A local preview is a blob: URL, which next/image can't load: show it with <img>. */}
            {preview ? <PreviewImage src={preview} size={96} /> : <Avatar name={`@${handle}`} src={shown} size={96} />}
          </span>
          <span className="hidden min-[480px]:inline-flex">
            {preview ? <PreviewImage src={preview} size={120} /> : <Avatar name={`@${handle}`} src={shown} size={120} />}
          </span>
        </span>

        <div className="flex w-full min-w-0 flex-col items-center gap-3 min-[480px]:items-start">
          <h2 id={`${inputId}-heading`} className="m-0 text-body font-semibold">
            Profile picture
          </h2>
          <p className="m-0 text-center text-body-sm text-fg-secondary min-[480px]:text-left">
            JPEG, PNG or WebP, up to 2 MB.
          </p>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            name="picture"
            accept={PICTURE_ACCEPT}
            onChange={handleFile}
            disabled={pending}
            // Opened by the Upload/Replace button, which is the control people tab to.
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />

          {serverMessage ? <FormMessage tone="error">{serverMessage}</FormMessage> : null}

          <div className="flex flex-wrap justify-center gap-2 min-[480px]:justify-start">
            {preview ? (
              <>
                <Button type="submit" loading={pending}>
                  Save picture
                </Button>
                <Button variant="secondary" onClick={clearPreview} disabled={pending}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => inputRef.current?.click()}>
                  <ImageUp size={18} aria-hidden />
                  {image ? "Replace picture" : "Upload picture"}
                </Button>
                {image ? (
                  <Button variant="secondary" onClick={() => setRemoveOpen(true)}>
                    <Trash2 size={18} aria-hidden />
                    Remove
                  </Button>
                ) : null}
              </>
            )}
          </div>

          <p
            id={errorId}
            aria-live="polite"
            className="m-0 flex min-h-5 items-start gap-1.5 text-body-sm text-[var(--status-error)]"
          >
            {error ? (
              <>
                <CircleAlert size={16} aria-hidden className="mt-0.5 flex-none" />
                <span>{error}</span>
              </>
            ) : null}
          </p>
        </div>
      </form>

      <RemovePictureDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onRemoved={(message) => {
          setRemoveOpen(false);
          onChanged(null, message);
        }}
      />
    </section>
  );
}

function PreviewImage({ src, size }: { src: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a remote image
    <img
      src={src}
      alt="Preview of your new profile picture"
      width={size}
      height={size}
      className="flex-none rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
