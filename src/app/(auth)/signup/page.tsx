import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";

export const metadata: Metadata = {
  title: "Sign up · Linkbase",
};

export default function SignupPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[length:clamp(32px,6vw,40px)] leading-[1.05] font-extrabold tracking-[var(--tracking-display)] text-fg-primary">
          Create your Linkbase
        </h1>
        <p className="m-0 text-body-lg text-fg-secondary">
          Free to start. You’ll pick your handle next.
        </p>
      </div>
      <SignupForm />
      <RedirectIfSignedIn />
    </>
  );
}
