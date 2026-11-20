import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { inTauri } from "./api";

const desktopWindow = inTauri ? getCurrentWindow() : null;

export async function startWindowDragging(): Promise<void> {
  await desktopWindow?.startDragging();
}

export async function minimizeWindow(): Promise<void> {
  await desktopWindow?.minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  await desktopWindow?.toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  await desktopWindow?.close();
}

export async function revealWindow(): Promise<void> {
  if (inTauri) await invoke("show_window");
}

export async function hideWindow(): Promise<void> {
  if (inTauri) await invoke("hide_window");
}

export async function quitGui(): Promise<void> {
  if (inTauri) await invoke("quit_gui");
}
