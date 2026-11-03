"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { PREVIEW_THEMES } from "./profile-preview-phone";
import type { PreviewTheme } from "./profile-preview-phone";

type PreviewSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  theme: PreviewTheme;
  onThemeChange: (theme: PreviewTheme) => void;
  bannerOn: boolean;
  onBannerChange: (on: boolean) => void;
};

function isPreviewTheme(value: string): value is PreviewTheme {
  return PREVIEW_THEMES.some((theme) => theme.value === value);
}

/** Preview-only settings (not saved): the phone's theme and the upsell banner. */
export function PreviewSettingsDialog({
  open,
  onClose,
  theme,
  onThemeChange,
  bannerOn,
  onBannerChange,
}: PreviewSettingsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Preview settings"
      description="These only change this preview. They aren't saved."
      width={420}
    >
      <div className="flex flex-col gap-5">
        <Select
          id="preview-theme"
          label="Theme"
          value={theme}
          options={PREVIEW_THEMES.map(({ value, label }) => ({ value, label }))}
          onChange={(value) => {
            if (isPreviewTheme(value)) onThemeChange(value);
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-body font-medium">Show banner</span>
          <Switch checked={bannerOn} onChange={onBannerChange} label="Show banner" />
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
