import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const LOCK_VERSION = 1;
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const optional = args.has("--optional");
const workspace = process.cwd();
const coreRoot = path.resolve(
  process.env.ASG_CORE_DIR ?? path.join(workspace, "..", "agent_search_gateway"),
);
const lockPath = path.join(workspace, "contracts", "asg-cli-contract.lock.json");
const requiredMarker = path.join(coreRoot, "docs", "cli-contract.md");

if (!existsSync(requiredMarker)) {
  const message =
    `未找到 ASG core 契约仓库：${coreRoot}。` +
    " 可通过 ASG_CORE_DIR 指定路径。";
  if (optional && !shouldWrite) {
    console.log(`跳过跨仓库契约检查：${message}`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

const commandRoot = path.join(coreRoot, "src", "cli", "commands");
const monitoredCommands = new Set([
  "adlist.ts",
  "browser.ts",
  "config.ts",
  "dataplane-common.ts",
  "doctor.ts",
  "engines.ts",
  "extensions.ts",
  "fetch.ts",
  "logs.ts",
  "restart.ts",
  "search.ts",
  "start.ts",
  "status.ts",
  "stop.ts",
  "update.ts",
]);
const commandFiles = readdirSync(commandRoot)
  .filter((name) => monitoredCommands.has(name))
  .map((name) => `src/cli/commands/${name}`);
const monitoredFiles = [
  "docs/cli-contract.md",
  "src/cli/asg.ts",
  "src/cli/context.ts",
  "src/cli/output.ts",
  "src/cli/runtime/health.ts",
  "src/cli/runtime/logs.ts",
  "src/cli/runtime/stack.ts",
  "src/cli/deps/browser.ts",
  "src/cli/deps/update.ts",
  "src/engines/types.ts",
  "src/extensions/install.ts",
  "src/extensions/manifest.ts",
  ...commandFiles,
].sort();

const missingFiles = monitoredFiles.filter(
  (relativePath) => !existsSync(path.join(coreRoot, relativePath)),
);
if (missingFiles.length > 0) {
  console.error("ASG core 缺少受监控的契约文件：");
  for (const relativePath of missingFiles) console.error(`- ${relativePath}`);
  process.exit(1);
}

function digest(relativePath) {
  const content = readFileSync(path.join(coreRoot, relativePath));
  return createHash("sha256").update(content).digest("hex");
}

const current = {
  schema_version: LOCK_VERSION,
  source: "agent_search_gateway",
  files: Object.fromEntries(
    monitoredFiles.map((relativePath) => [relativePath, digest(relativePath)]),
  ),
};

if (shouldWrite) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`已更新 ASG CLI 契约指纹：${lockPath}`);
  process.exit(0);
}

if (!existsSync(lockPath)) {
  console.error(`缺少契约指纹：${lockPath}。请先运行 npm run sync:contract。`);
  process.exit(1);
}

let expected;
try {
  expected = JSON.parse(readFileSync(lockPath, "utf8"));
} catch (error) {
  console.error(`无法读取契约指纹：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (
  expected?.schema_version !== LOCK_VERSION ||
  expected?.source !== "agent_search_gateway" ||
  !expected.files ||
  typeof expected.files !== "object" ||
  Array.isArray(expected.files) ||
  Object.values(expected.files).some((value) => typeof value !== "string")
) {
  console.error("契约指纹格式无效，请重新运行 npm run sync:contract。");
  process.exit(1);
}

const allFiles = new Set([
  ...Object.keys(expected.files),
  ...Object.keys(current.files),
]);
const changes = [];
for (const relativePath of [...allFiles].sort()) {
  const before = expected.files[relativePath];
  const after = current.files[relativePath];
  if (before === after) continue;
  const kind = before === undefined
    ? "新增"
    : after === undefined
      ? "删除"
      : "修改";
  changes.push(`${kind} ${relativePath}`);
}

if (changes.length > 0) {
  console.error("ASG core CLI 契约源文件已变化：");
  for (const change of changes) console.error(`- ${change}`);
  console.error(
    "请先同步 src/types/cli.ts、运行时守卫和契约测试，再运行 npm run sync:contract。",
  );
  process.exit(1);
}

console.log(`ASG CLI 契约指纹一致（${monitoredFiles.length} 个文件）。`);
