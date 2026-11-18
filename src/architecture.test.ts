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

  it("does not expose low-level tasks or CLI arguments to route pages", () => {
    const violations = filesIn("views").flatMap(([path, source]) => {
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
