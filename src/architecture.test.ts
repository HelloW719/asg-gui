import { describe, expect, it } from "vitest";

const sourceFiles = import.meta.glob("/src/**/*.{ts,vue}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
function filesIn(folder: string): Array<[string, string]> {
  return Object.entries(sourceFiles).filter(
    ([path]) => path.startsWith(`/src/${folder}/`) && !path.endsWith(".test.ts"),
  );
}

function moduleSpecifiers(source: string): string[] {
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return [...new Set(patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1] ?? ""),
  ))];
}

function expectNoImports(
  files: Array<[string, string]>,
  forbidden: RegExp,
  rule: string,
): void {
  const violations = files.flatMap(([path, source]) => {
    return moduleSpecifiers(source).filter((target) => forbidden.test(target)).map(
      (target) => `${path} -> ${target}`,
    );
  });
  expect(violations, rule).toEqual([]);
}

describe("frontend architecture boundaries", () => {
  it("recognizes every JavaScript import form used by the boundary guards", () => {
    expect(
      moduleSpecifiers(`
        import value from "static";
        import "side-effect";
        export { value } from "re-export";
        const lazy = import("dynamic");
        const legacy = require("commonjs");
      `),
    ).toEqual(
      expect.arrayContaining([
        "static",
        "side-effect",
        "re-export",
        "dynamic",
        "commonjs",
      ]),
    );
  });

  it("keeps services independent from Vue, stores and UI", () => {
    expectNoImports(
      filesIn("services"),
      /(^|\/)(vue|pinia)(\/|$)|(^|\/)(stores|components|views|features|app)(\/|$)/,
      "服务层只能依赖类型、工具和其他无 UI 服务",
    );
  });

  it("keeps stores independent from views and components", () => {
    expectNoImports(
      filesIn("stores"),
      /(^|\/)(components|views|features)(\/|$)/,
      "状态存储不能依赖页面或组件",
    );
  });

  it("keeps shared UI free from stores, services and feature code", () => {
    expectNoImports(
      filesIn("shared"),
      /(^|\/)(stores|services|features)(\/|$)/,
      "共享 UI 只能依赖自身、类型和纯工具",
    );
  });

  it("keeps CLI wire response types in the protocol module", () => {
    const protocol = sourceFiles["/src/types/cli.ts"] ?? "";
    const utilities = sourceFiles["/src/utils/cli.ts"] ?? "";
    const responseTypes = [
      "LogReadResult",
      "LogFollowResult",
      "DoctorResult",
      "EnginesResult",
      "ExtensionsResult",
      "ExtensionSearchResult",
      "ExtensionConfigResult",
      "ExtensionConfigFieldsResult",
    ];

    for (const name of responseTypes) {
      expect(protocol).toContain(`export type ${name}`);
    }
    expect(utilities).not.toMatch(
      /\bexport\s+(?:type|interface)\s+\w+(?:Result|Response)\b/,
    );
  });

  it("keeps feature modules from reaching into each other", () => {
    expectNoImports(
      filesIn("features"),
      /(^|\/)features\/(dashboard|explorer|sources|settings|logs|maintenance|setup|welcome)(\/|$)/,
      "功能模块只能通过 app 层或共享 UI 进行跨模块协作",
    );
  });

  it("keeps native integrations behind the desktop service", () => {
    const violations = filesIn("features").flatMap(([path, source]) => {
      const imports = moduleSpecifiers(source);
      return imports.some(
        (target) =>
          target.startsWith("@tauri-apps/") ||
          /(^|\/)services\/desktop(?:\/|$)/.test(target),
      )
        ? [path]
        : [];
    });
    expect(
      violations,
      "功能层必须通过 services/desktop 暴露的类型化能力访问 Tauri",
    ).toEqual([]);
  });

  it("does not expose low-level tasks or CLI arguments to feature code", () => {
    const violations = filesIn("features")
      .flatMap(([path, source]) => {
        const patterns = [
          /\bjobClient\b/,
          /\bjobs\.(execute|stream)\s*\(/,
          /runner\.(run|stream)\s*\(/,
          /\[\s*["'](status|search|fetch|start|stop|restart|logs|doctor|engines|extensions|config|browser|adlist|update)["']/,
        ];
        return patterns.some((pattern) => pattern.test(source)) ? [path] : [];
      });
    expect(
      violations,
      "页面和功能模块必须通过 useAsgServices 或功能组合式函数访问能力",
    ).toEqual([]);
  });
});
