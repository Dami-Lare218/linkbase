"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FormMessage } from "./form-message";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, { ok: false });
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.message ? <FormMessage tone={state.ok ? "info" : "error"}>{state.message}</FormMessage> : null}

      <Input
        name="name"
        label="Name"
        autoComplete="name"
        maxLength={50}
        required
        defaultValue={state.values?.name}
        error={errors?.name?.[0]}
      />
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
        autoComplete="new-password"
        minLength={8}
        required
        helperText="At least 8 characters."
        error={errors?.password?.[0]}
      />

      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-1">
        Create account
      </Button>

      <p className="m-0 text-center text-body-sm text-fg-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-fg-primary">
          Log in
        </Link>
      </p>
    </form>
  );
}
