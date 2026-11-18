import { invoke, isTauri } from "@tauri-apps/api/core";
import type {
  DesktopAppState,
  RootSelection,
  ThemePreference,
} from "../../types/cli";

export const inTauri = isTauri();

export async function getDesktopAppState(): Promise<DesktopAppState> {
  return invoke<DesktopAppState>("get_app_state");
}

export async function chooseAsgRoot(): Promise<RootSelection | null> {
  return invoke<RootSelection | null>("choose_asg_root");
}

export async function setAsgRoot(path: string): Promise<RootSelection> {
  return invoke<RootSelection>("set_asg_root", { path });
}

export async function clearAsgRoot(): Promise<void> {
  await invoke("clear_asg_root");
}

export async function setDesktopTheme(theme: ThemePreference): Promise<void> {
  await invoke("set_theme", { theme });
}

export async function startCliJob(
  args: string[],
  stdin: string | null,
  mode: "json" | "jsonl",
) {
  return invoke<{
    jobId: string;
    cancellable: boolean;
    mutating: boolean;
  }>("run_cli", { args, stdin, mode });
}

export async function cancelCliJob(jobId: string): Promise<void> {
  await invoke("cancel_cli", { jobId });
}
