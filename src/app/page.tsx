import { HeaderAuth, MobileMenuLogIn } from "@/components/auth/header-auth";
import { Benefits } from "@/components/landing/benefits";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { SiteNav } from "@/components/ui/site-nav";

const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export default function HomePage() {
  return (
    <>
      <SiteNav links={navLinks} actions={<HeaderAuth />} menuFooter={<MobileMenuLogIn />} />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Benefits />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
