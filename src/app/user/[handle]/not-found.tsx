import { Button } from "@/components/ui/button";
import { HomeChip, ProfileFrame } from "@/components/profile/public-profile";

/** 404 for an unknown handle, in the profile's frame. Served with status 404 (page.tsx). */
export default function ProfileNotFound() {
  return (
    <ProfileFrame label="Profile not found">
      <div className="mb-[clamp(16px,4vw,28px)] flex items-center">
        <HomeChip />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-24 text-center">
        <h1 className="m-0 text-[length:clamp(20px,5vw,24px)] leading-[1.2] font-bold tracking-[-0.02em]">
          This Linkbase doesn’t exist yet
        </h1>
        <p className="m-0 max-w-[40ch] text-[15px] leading-[1.5] text-fg-secondary">
          Check the link, or claim this name for yourself.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button href="/signup">Claim it</Button>
          <Button href="/" variant="secondary">
            Go home
          </Button>
        </div>
      </div>
    </ProfileFrame>
  );
}
