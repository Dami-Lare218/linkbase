"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { checkHandleAvailability, claimHandleAction } from "@/app/onboarding/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHandleFieldState } from "@/lib/onboarding/handle-field-state";
import type { HandleAvailability } from "@/lib/onboarding/handle-field-state";
import { getHandleFormatError, HANDLE_MAX_LENGTH } from "@/lib/validation/handle-rules";

import { ProfilePreview } from "./profile-preview";

/** Same pause as the design before asking the server. */
const CHECK_DELAY_MS = 450;

type HandleOnboardingProps = {
  /** Wordmark + Log out row, rendered on the server. */
  header: ReactNode;
};

/**
 * "Choose your Linkbase handle" (Welcome Handle v3): the form column and the example
 * profile, which share the handle being typed so the preview updates live.
 */
export function HandleOnboarding({ header }: HandleOnboardingProps) {
  const [state, formAction, submitting] = useActionState(claimHandleAction, { ok: false });
  const [value, setValue] = useState("");
  const [checkingHandle, setCheckingHandle] = useState<string | null>(null);
  const [availability, setAvailability] = useState<HandleAvailability | null>(null);
  const latestValue = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function check(handle: string) {
    setCheckingHandle(handle);
    let result: HandleAvailability;
    try {
      result = await checkHandleAvailability(handle);
    } catch {
      // Network or server failure. Show it instead of spinning forever; typing again retries.
      result = { status: "error", handle };
    }
    // Ignore replies for a value the user has already changed.
    if (latestValue.current !== handle) return;
    setAvailability(result);
    setCheckingHandle(null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const next = input.value.toLowerCase();
    if (next !== input.value) {
      // Lowercase in place, keeping the caret where the user is typing.
      const caret = input.selectionStart;
      input.value = next;
      input.setSelectionRange(caret, caret);
    }
    latestValue.current = next;
    setValue(next);
    setCheckingHandle(null);
    if (timer.current) clearTimeout(timer.current);
    if (getHandleFormatError(next) === null) {
      timer.current = setTimeout(() => void check(next), CHECK_DELAY_MS);
    }
  }

  const { error, helperText, isChecking, isAvailable, previewHandle } = getHandleFieldState({
    value,
    availability,
    checkingHandle,
    claim: { handle: state.values?.handle, error: state.fieldErrors?.handle?.[0] },
  });

  return (
    <div className="@container box-border flex min-h-svh flex-1 flex-wrap overflow-x-hidden bg-surface-page font-sans text-fg-primary">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col">
        {header}
        <main className="box-border flex flex-1 flex-col px-[clamp(20px,4cqi,40px)] pt-[clamp(40px,7cqi,64px)] pb-[clamp(48px,7cqi,80px)]">
          <form
            action={formAction}
            noValidate
            className="m-auto flex w-full max-w-[440px] flex-col gap-[clamp(32px,3.5cqi,40px)]"
          >
            <div className="flex flex-col gap-[clamp(12px,1.4cqi,16px)]">
              <h1 className="m-0 font-display text-[length:clamp(36px,3.2cqi+24px,56px)] leading-none font-extrabold tracking-[var(--tracking-display)] text-balance">
                Choose your <span className="text-fg-brand">Linkbase</span> handle
              </h1>
              <p className="m-0 max-w-[400px] text-[length:clamp(16px,0.4cqi+15px,18px)] leading-[1.5] text-pretty text-fg-secondary">
                Your handle completes your profile link — the one address you’ll share everywhere.
              </p>
            </div>

            {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}

            <div className="flex flex-col gap-2.5">
              <Input
                name="handle"
                label="Handle"
                prefix="linkba.se/"
                placeholder="yourname"
                value={value}
                onChange={handleChange}
                error={error}
                success={isAvailable}
                helperText={helperText}
                trailing={
                  isChecking ? (
                    <LoaderCircle
                      size={20}
                      aria-hidden
                      className="flex-none animate-[lb-spin_800ms_linear_infinite] text-fg-secondary"
                    />
                  ) : null
                }
                readOnly={submitting}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={HANDLE_MAX_LENGTH}
                describedBy="handle-guide"
                liveMessage
              />
              <p id="handle-guide" className="m-0 text-body-sm text-pretty text-fg-tertiary">
                3–30 characters. Lowercase letters, numbers, hyphens and underscores only.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                type="submit"
                size="lg"
                fullWidth
                variant={isAvailable ? "primary" : "outline"}
                disabled={!isAvailable}
                loading={submitting}
              >
                {submitting ? "Claiming…" : "Claim my handle"}
              </Button>
              <p className="m-0 text-center text-body-sm text-pretty text-fg-secondary">
                Next, you’ll add your photo, bio and first links.
              </p>
            </div>
          </form>
        </main>
      </div>

      <ProfilePreview handle={previewHandle} />
    </div>
  );
}
