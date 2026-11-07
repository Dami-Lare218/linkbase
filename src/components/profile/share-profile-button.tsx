"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { Toast } from "@/components/ui/toast";
import type { ToastTone } from "@/components/ui/toast";

const TOAST_MS = 2400;

/** The profile's Share button: copies the profile URL and confirms with a toast (design). */
export function ShareProfileButton({ handle }: { handle: string }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/user/${handle}`);
      setToast({ message: `Copied linkba.se/${handle}`, tone: "success" });
    } catch {
      setToast({ message: "Couldn’t copy the link.", tone: "error" });
    }
  }

  return (
    <>
      <IconButton icon={Share} label="Share profile" variant="white" shape="rounded" onClick={share} />
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2"
      >
        {toast ? (
          <div className="pointer-events-auto">
            <Toast message={toast.message} tone={toast.tone} />
          </div>
        ) : null}
      </div>
    </>
  );
}
