import { describe, expect, it } from "vitest";
import type { StackStatus } from "../types/cli";
import { deriveVisualState } from "./state";

function stack(
  gateway: boolean,
  searxng: boolean,
  flaresolverr: boolean,
  supervisorActive = false,
): StackStatus {
  return {
    services: {
      gateway: { up: gateway },
      searxng: { up: searxng },
      flaresolverr: { up: flaresolverr },
    },
    supervisor: { managed: true, mode: "systemd", active: supervisorActive },
  };
}

describe("deriveVisualState", () => {
  const base = {
    statusPending: false,
    statusError: null,
    operationState: null,
  };

  it("prioritizes an invalid root", () => {
    expect(
      deriveVisualState({
        ...base,
        rootValid: false,
        status: stack(true, true, true),
      }),
    ).toBe("unconfigured");
  });

  it("prioritizes a local operation over probe data", () => {
    expect(
      deriveVisualState({
        ...base,
        rootValid: true,
        status: stack(true, true, true),
        operationState: "restarting",
      }),
    ).toBe("restarting");
  });

  it("reports stable only when every probe is reachable", () => {
    expect(
      deriveVisualState({
        ...base,
        rootValid: true,
        status: stack(true, true, true),
      }),
    ).toBe("stable");
  });

  it("distinguishes degraded, failed, and stopped stacks", () => {
    expect(
      deriveVisualState({
        ...base,
        rootValid: true,
        status: stack(true, false, true),
      }),
    ).toBe("degraded");
    expect(
      deriveVisualState({
        ...base,
        rootValid: true,
        status: stack(false, true, true, true),
      }),
    ).toBe("failed");
    expect(
      deriveVisualState({
        ...base,
        rootValid: true,
        status: stack(false, false, false),
      }),
    ).toBe("stopped");
  });

  it("reports a probe error before an old stack snapshot", () => {
    expect(
      deriveVisualState({
        rootValid: true,
        status: stack(true, true, true),
        statusPending: false,
        statusError: "ECONNREFUSED",
        operationState: null,
      }),
    ).toBe("disconnected");
  });
});

