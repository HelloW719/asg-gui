import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { JobEvent } from "../../types/cli";
import { isJobEvent, isRecord } from "../../utils/cli";

export async function listenJobEvents(
  handler: (event: JobEvent) => void,
): Promise<UnlistenFn> {
  return listen<unknown>("asg://job", (event) => {
    if (isJobEvent(event.payload)) handler(event.payload);
  });
}

export async function listenNavigate(
  handler: (route: string) => void,
): Promise<UnlistenFn> {
  return listen<unknown>("asg://navigate", (event) => {
    if (typeof event.payload === "string") handler(event.payload);
  });
}

export async function listenQuitBlocked(
  handler: (payload: { message?: string; jobId?: string }) => void,
): Promise<UnlistenFn> {
  return listen<unknown>("asg://quit-blocked", (event) => {
    const payload = event.payload;
    if (
      isRecord(payload) &&
      (payload.message === undefined || typeof payload.message === "string") &&
      (payload.jobId === undefined || typeof payload.jobId === "string")
    ) {
      handler({
        ...(payload.message === undefined ? {} : { message: payload.message }),
        ...(payload.jobId === undefined ? {} : { jobId: payload.jobId }),
      });
    }
  });
}
