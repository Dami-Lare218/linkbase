import { Benefits } from "@/components/landing/benefits";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { SiteNav } from "@/components/landing/site-nav";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Benefits />
        <Faq />
        <FinalCta />
      </main>
    </>
  );
}
