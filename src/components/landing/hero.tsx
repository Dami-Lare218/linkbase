import { ClaimForm } from "./claim-form";
import { PhonePreview } from "./phone-preview";

export function Hero() {
  return (
    <section className="bg-tangerine-500 px-[clamp(20px,4vw,32px)] pt-[clamp(104px,14vw,160px)] pb-[clamp(48px,8vw,96px)]">
      <div className="mx-auto flex max-w-[var(--container-max)] flex-wrap items-center gap-[clamp(40px,6vw,72px)]">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[clamp(18px,3vw,24px)]">
          <h1 className="m-0 font-display text-[length:clamp(38px,min(12vw,3.6vw_+_30px),88px)] leading-[0.96] font-extrabold tracking-[var(--tracking-display)] text-balance text-ink">
            Everything you share. One simple link.
          </h1>
          <p className="m-0 max-w-[500px] text-body-lg text-pretty text-ink">
            Put your socials, portfolio, videos, shop and website on one page — then share a
            single Linkbase URL wherever your audience finds you.
          </p>
          <div className="mt-2">
            <ClaimForm />
          </div>
          <p className="m-0 -mt-2 text-body-sm text-ink">
            Free to start. You can always change your username later.
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] justify-center">
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}
