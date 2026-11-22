import {
  chooseImageFile,
  openExternalUrl,
} from "@/services/desktop";

export function useDesktopIntegration() {
  return {
    chooseImageFile,
    openExternalUrl,
  };
}
