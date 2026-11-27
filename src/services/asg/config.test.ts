import { describe, expect, it } from "vitest";
import type {
  AsgCommandRunner,
  AsgRunOptions,
  CliDataParser,
} from "./command";
import { createConfigService } from "./config";

function runnerFor(data: unknown): AsgCommandRunner {
  return {
    async run<T>(
      _args: string[],
      _options: AsgRunOptions,
      parseData: CliDataParser<T>,
    ): Promise<T> {
      return parseData(data);
    },
    async stream() {
      throw new Error("stream is not used");
    },
  };
}

describe("config service contract", () => {
  it("preserves validation warnings from the CLI result", async () => {
    const service = createConfigService(
      runnerFor({
        valid: true,
        warnings: ["deprecated option"],
      }),
    );

    await expect(service.validate()).resolves.toEqual({
      valid: true,
      warnings: ["deprecated option"],
    });
  });

  it("preserves mutation restart status", async () => {
    const service = createConfigService(
      runnerFor({
        changed: ["gateway.port"],
        restart: "all",
        restarted: true,
      }),
    );

    await expect(service.set("gateway.port", "3100", false)).resolves.toEqual({
      changed: ["gateway.port"],
      restart: "all",
      restarted: true,
    });
  });
});
