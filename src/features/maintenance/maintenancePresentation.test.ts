import { describe, expect, it } from "vitest";
import {
  adlistSuccessMessage,
  updateSuccessMessage,
} from "./maintenancePresentation";

describe("maintenance success messages", () => {
  it("does not claim a restart when ad filtering is off", () => {
    expect(
      adlistSuccessMessage({
        level: "off",
        entries: 0,
        path: "/data/adblock/hosts",
        restart: "all",
        restarted: false,
      }),
    ).toBe("广告过滤级别为 off，无需更新列表。");
  });

  it("reports whether adlist and update operations restarted the stack", () => {
    expect(
      adlistSuccessMessage({
        level: "full",
        entries: 42,
        path: "/data/adblock/hosts",
        restart: "all",
        restarted: false,
      }),
    ).toContain("本次未重启");
    expect(
      updateSuccessMessage({
        action: "apply",
        version: "0.5.0",
        restarted: true,
      }),
    ).toContain("整栈已重启");
  });
});
