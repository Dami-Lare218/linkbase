import Link from "next/link";

import { Wordmark } from "@/components/ui/wordmark";

/** Welcome-style form column (ui.md §7.2), without the art panel. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-white p-[clamp(20px,4vw,36px)]">
      <Link href="/" aria-label="Linkbase home" className="flex self-start rounded-md no-underline">
        <Wordmark size={30} />
      </Link>
      <main className="mx-auto mt-[clamp(48px,8vw,72px)] mb-12 flex w-full max-w-[440px] flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
