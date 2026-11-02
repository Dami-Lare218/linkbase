import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in · Linkbase",
};

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[length:clamp(32px,6vw,40px)] leading-[1.05] font-extrabold tracking-[var(--tracking-display)] text-fg-primary">
          Welcome back
        </h1>
        <p className="m-0 text-body-lg text-fg-secondary">Log in to manage your Linkbase.</p>
      </div>
      <LoginForm />
    </>
  );
}
