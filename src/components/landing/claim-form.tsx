"use client";

import { useRef } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";

type ClaimFormProps = {
  /** "start" for the hero, "center" for the closing call to action. */
  align?: "start" | "center";
};

/**
 * Username claim field. Placeholder for now: sign-up doesn't exist yet,
 * so submitting keeps focus in the field and sends nothing.
 */
export function ClaimForm({ align = "start" }: ClaimFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    input.value = input.value.trim();
    input.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full max-w-[540px] flex-wrap gap-3 ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <label className="box-border flex h-[var(--control-lg)] min-w-0 flex-[1_1_240px] cursor-text items-center rounded-md bg-white px-[18px] text-left text-[16px] focus-within:shadow-[var(--shadow-focus)]">
        <span className="whitespace-nowrap text-fg-secondary">linkba.se/</span>
        <input
          ref={inputRef}
          name="username"
          placeholder="yourname"
          aria-label="Choose your username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          className="min-w-0 flex-1 border-none bg-transparent p-0 font-[inherit] text-fg-primary outline-none placeholder:text-gray-400"
        />
      </label>
      <Button type="submit" size="lg" className="flex-[1_0_auto]">
        Claim your Linkbase
      </Button>
    </form>
  );
}
