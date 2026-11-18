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

function expectNoImports(
  files: Array<[string, string]>,
  forbidden: RegExp,
  rule: string,
): void {
  const violations = files.flatMap(([path, source]) => {
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    return imports.filter((target) => forbidden.test(target)).map(
      (target) => `${path} -> ${target}`,
    );
  });
  expect(violations, rule).toEqual([]);
}

describe("frontend architecture boundaries", () => {
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

  it("keeps feature modules from reaching into each other", () => {
    expectNoImports(
      filesIn("features"),
      /(^|\/)features\/(dashboard|explorer|sources|settings|logs|maintenance|setup)(\/|$)/,
      "功能模块只能通过 app 层或共享 UI 进行跨模块协作",
    );
  });

  it("does not expose low-level tasks or CLI arguments to pages", () => {
    const violations = filesIn("features")
      .filter(([path]) => path.endsWith("Page.vue"))
      .flatMap(([path, source]) => {
      const patterns = [
        /services\/desktop/,
        /\bjobClient\b/,
        /\bjobs\.(execute|stream)\s*\(/,
        /runner\.(run|stream)\s*\(/,
        /\[\s*["'](status|logs|doctor|engines|plugins|extensions|config|browser|adlist|update)["']/,
      ];
      return patterns.some((pattern) => pattern.test(source)) ? [path] : [];
      });
    expect(violations, "页面必须通过 useAsgServices 或功能组合式函数访问能力").toEqual([]);
  });
});
