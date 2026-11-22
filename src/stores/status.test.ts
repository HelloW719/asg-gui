import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type { StackStatus } from "../types/cli";
import { useStatusStore } from "./status";

const previousStatus: StackStatus = {
  services: {
    gateway: { up: true, latency_ms: 1 },
    searxng: { up: true, latency_ms: 1 },
    flaresolverr: { up: true, latency_ms: 1 },
  },
  supervisor: { managed: true, mode: "pid", active: true },
};

describe("status store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("ignores a stale request after the installation root changes", () => {
    const store = useStatusStore();
    const staleRevision = store.beginRequest();
    store.clear();
    const currentRevision = store.beginRequest();

    expect(store.settleRequest(staleRevision, previousStatus, null)).toBe(false);
    expect(store.status).toBeNull();
    expect(store.pending).toBe(true);

    expect(store.settleRequest(currentRevision, previousStatus, null)).toBe(true);
    expect(store.status).toEqual(previousStatus);
    expect(store.pending).toBe(false);
  });
});
