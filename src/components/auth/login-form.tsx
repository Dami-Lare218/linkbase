"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { logIn } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FormMessage } from "./form-message";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, { ok: false });
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}

      {/* The search params are request-time data, so only this field waits for them. */}
      <Suspense fallback={null}>
        <CallbackUrlField />
      </Suspense>

      <Input
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        defaultValue={state.values?.email}
        error={errors?.email?.[0]}
      />
      <Input
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={errors?.password?.[0]}
      />

      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-1">
        Log in
      </Button>

      <p className="m-0 text-center text-body-sm text-fg-secondary">
        New to Linkbase?{" "}
        <Link href="/signup" className="font-semibold text-fg-primary">
          Sign up free
        </Link>
      </p>
    </form>
  );
}

/** Carries `?callbackUrl=` through the form. The server checks it is a same-site path. */
function CallbackUrlField() {
  const callbackUrl = useSearchParams().get("callbackUrl");
  if (!callbackUrl) return null;
  return <input type="hidden" name="callbackUrl" value={callbackUrl} />;
}
