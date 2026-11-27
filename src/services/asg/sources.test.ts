import { describe, expect, it } from "vitest";
import type { ExtensionInfo } from "../../types/cli";
import type {
  AsgCommandRunner,
  AsgRunOptions,
  CliDataParser,
} from "./command";
import { createSourcesService } from "./sources";

const extension: ExtensionInfo = {
  id: "demo-fetch",
  path: "/extensions/demo-fetch",
};

function runnerFor(responses: Record<string, unknown>): AsgCommandRunner {
  return {
    async run<T>(
      args: string[],
      _options: AsgRunOptions,
      parseData: CliDataParser<T>,
    ): Promise<T> {
      return parseData(responses[args.join(" ")]);
    },
    async stream() {
      throw new Error("stream is not used");
    },
  };
}

describe("sources extension config contract", () => {
  it("preserves invalid config status and schema errors", async () => {
    const service = createSourcesService(
      runnerFor({
        "extensions config demo-fetch": {
          id: "demo-fetch",
          config: { limit: "invalid" },
          valid: false,
          error: "limit must be a number",
        },
        "extensions config demo-fetch --describe": {
          id: "demo-fetch",
          fields: [
            {
              key: "limit",
              type: "number",
              required: false,
            },
          ],
        },
      }),
    );

    await expect(service.loadExtensionConfig(extension)).resolves.toEqual({
      id: "demo-fetch",
      config: { limit: "invalid" },
      fields: [
        {
          key: "limit",
          type: "number",
          required: false,
        },
      ],
      valid: false,
      error: "limit must be a number",
    });
  });

  it("rejects config responses for a different extension", async () => {
    const service = createSourcesService(
      runnerFor({
        "extensions config demo-fetch": {
          id: "other-extension",
          config: {},
          valid: true,
        },
        "extensions config demo-fetch --describe": {
          id: "demo-fetch",
          fields: [],
        },
      }),
    );

    await expect(service.loadExtensionConfig(extension)).rejects.toThrow(
      "ASG 扩展配置响应与请求的扩展不匹配",
    );
  });
});
