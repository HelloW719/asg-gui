import { createApp, defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import StatusGeometry from "./StatusGeometry.vue";
import type { VisualState } from "../types/cli";

describe("StatusGeometry", () => {
  const states: VisualState[] = [
    "unconfigured",
    "disconnected",
    "stopped",
    "loading",
    "starting",
    "restarting",
    "stable",
    "degraded",
    "failed",
  ];

  it.each(states)("exposes an accessible state for %s", (state) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = defineComponent({
      render: () => h(StatusGeometry, { state, reducedMotion: false }),
    });
    const app = createApp(root);
    app.mount(host);
    const geometry = host.querySelector(".status-geometry");
    expect(geometry?.getAttribute("aria-label")).toContain(state);
    expect(geometry?.classList.contains(`geometry--${state}`)).toBe(true);
    app.unmount();
    host.remove();
  });
});

