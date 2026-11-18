import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { JobEvent } from "../../types/cli";

export async function listenJobEvents(
  handler: (event: JobEvent) => void,
): Promise<UnlistenFn> {
  return listen<JobEvent>("asg://job", (event) => handler(event.payload));
}

export async function listenNavigate(
  handler: (route: string) => void,
): Promise<UnlistenFn> {
  return listen<string>("asg://navigate", (event) => handler(event.payload));
}

export async function listenQuitBlocked(
  handler: (payload: { message?: string; jobId?: string }) => void,
): Promise<UnlistenFn> {
  return listen<{ message?: string; jobId?: string }>("asg://quit-blocked", (event) =>
    handler(event.payload),
  );
}
