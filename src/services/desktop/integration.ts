import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { inTauri } from "./api";

export async function chooseImageFile(): Promise<string | null> {
  if (!inTauri) return null;
  const selected = await open({
    title: "选择用于反向图搜的图片",
    multiple: false,
    directory: false,
    filters: [
      { name: "图片", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
    ],
  });
  return typeof selected === "string" ? selected : null;
}

export async function openExternalUrl(value: string): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只允许打开 http/https 外链。");
  }
  if (inTauri) {
    await openUrl(url.toString());
    return;
  }
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}
