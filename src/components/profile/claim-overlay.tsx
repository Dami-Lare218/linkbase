"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/**
 * The design's sticky "Join {handle} on Linkbase today" overlay at the bottom of a profile,
 * shown when the owner keeps the Linkbase footer on. The pill leads to sign-up; ✕ dismisses it.
 */
export function ClaimOverlay({ handle }: { handle: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="pointer-events-none sticky bottom-0 -mx-[clamp(16px,4vw,24px)] -mt-[140px] box-border flex h-[180px] flex-col items-center justify-end gap-3 bg-[linear-gradient(to_bottom,rgba(17,17,16,0),rgba(17,17,16,.85))] px-4 pb-6">
      <div className="pointer-events-auto flex h-[52px] max-w-full items-center gap-1 rounded-full bg-white pr-2 pl-5 shadow-[var(--shadow-sm)]">
        <Link href="/signup" className="truncate text-body font-medium text-ink no-underline hover:text-ink">
          linkba.se/you
        </Link>
        <button
          type="button"
          aria-label="Dismiss the Linkbase sign-up banner"
          onClick={() => setDismissed(true)}
          className="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink hover:bg-surface-fill"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      <p className="m-0 text-center text-[15px] font-medium text-white">Join {handle} on Linkbase today</p>
    </div>
  );
}
