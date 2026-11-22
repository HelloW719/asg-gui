(() => {
  const callbacks = new Map();
  const eventHandlers = new Map();
  let callbackId = 1;
  let jobId = 0;
  const testInvokes = [];
  const testCliCommands = [];
  const runningJobs = new Map();
  const scenario = (window.__TAURI_TEST_SCENARIO__ ??= {});
  scenario.root ??= "C:\\ASG-Fixture";
  scenario.rootValid ??= true;
  scenario.selectedRoot ??= null;
  scenario.statusCallCount ??= 0;
  scenario.configCallCount ??= 0;
  window.__TAURI_TEST_INVOKES__ = testInvokes;
  window.__TAURI_TEST_CLI_COMMANDS__ = testCliCommands;

  const result = (command, data) => ({
    schema_version: 1,
    ok: true,
    command,
    data,
  });

  const emitEvent = (event, payload) => {
    const handlerId = eventHandlers.get(event);
    const handler = handlerId ? callbacks.get(handlerId) : null;
    if (!handler) return;
    setTimeout(
      () =>
        handler({
          event,
          id: Math.random(),
          payload,
        }),
      0,
    );
  };

  const emitJob = (id, kind, data) => {
    emitEvent("asg://job", { jobId: id, kind, data });
  };

  const finish = (id, value) => {
    setTimeout(() => {
      runningJobs.delete(id);
      emitJob(id, "result", value);
      emitJob(id, "exit", 0);
    }, 30);
  };

  const failure = (command, code, message) => ({
    schema_version: 1,
    ok: false,
    command,
    error: { code, message },
  });

  globalThis.isTauri = true;
  window.__TAURI_TEST_EMIT__ = emitEvent;
  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
    callbacks,
    transformCallback(callback, once = false) {
      const id = callbackId++;
      callbacks.set(id, (data) => {
        if (once) callbacks.delete(id);
        callback(data);
      });
      return id;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
    async invoke(command, args = {}) {
      testInvokes.push(command);
      if (command === "plugin:event|listen") {
        eventHandlers.set(args.event, args.handler);
        return callbackId++;
      }
      if (command === "plugin:event|unlisten") return null;
      if (command === "plugin:dialog|open") {
        return scenario.selectedRoot;
      }
      if (command === "get_app_state") {
        return {
          root: scenario.root,
          rootValid: scenario.rootValid,
          platform: "windows",
          version: "0.1.0",
          theme: "dark",
        };
      }
      if (command === "set_asg_root") {
        scenario.root = args.path;
        scenario.rootValid = true;
        return {
          path: args.path,
          valid: true,
        };
      }
      if (command === "choose_asg_root") {
        if (!scenario.selectedRoot) return null;
        scenario.root = scenario.selectedRoot;
        scenario.rootValid = true;
        return {
          path: scenario.root,
          valid: true,
        };
      }
      if (command === "clear_asg_root") {
        scenario.root = null;
        scenario.rootValid = false;
        return null;
      }
      if (command === "set_theme" || command === "show_window" || command === "hide_window") {
        return null;
      }
      if (command === "cancel_cli") {
        const id = args.jobId;
        if (runningJobs.has(id)) {
          runningJobs.delete(id);
          emitJob(id, "cancelled");
          emitJob(id, "exit", null);
        }
        return null;
      }
      if (command !== "run_cli") return null;

      const id = `fixture-${++jobId}`;
      const cliArgs = args.args ?? [];
      const name = cliArgs[0];
      const subcommand = cliArgs[1];
      testCliCommands.push(name);
      if (name === "logs" && cliArgs.includes("-f") && scenario.followStartDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, scenario.followStartDelay),
        );
      }
      emitJob(id, "started");
      runningJobs.set(id, name);
      if (name === "status") {
        scenario.statusCallCount += 1;
        finish(
          id,
          result("status", {
            services: {
              gateway: { up: true, latency_ms: 7, version: "0.3.7", uptime_s: 4382 },
              searxng: { up: true, latency_ms: 4 },
              flaresolverr: { up: true, latency_ms: 12 },
            },
            supervisor: { managed: true, mode: "schtasks", active: true },
          }),
        );
      } else if (name === "logs") {
        if (cliArgs.includes("-f")) {
          if (scenario.followRuntimeError) {
            finish(id, failure("logs", "LOG_STREAM_FAILED", "日志流异常结束。"));
          }
          return { jobId: id, cancellable: true, mutating: false };
        }
        finish(
          id,
          result("logs", {
            lines: [
              { service: "gateway", at: new Date().toISOString(), line: "gateway listening on 127.0.0.1:3000" },
              { service: "supervisor", at: new Date().toISOString(), line: "searxng health check passed" },
              { service: "flaresolverr", at: new Date().toISOString(), line: "service ready" },
            ],
          }),
        );
      } else if (name === "doctor") {
        finish(
          id,
          result("doctor", {
            checks: [
              { name: "installation", ok: true, level: "error", message: "版本目录有效" },
              { name: "node", ok: true, level: "error", message: "Node 22" },
              { name: "services", ok: true, level: "warn", message: "三个服务均可达" },
            ],
          }),
        );
      } else if (name === "engines") {
        if (
          (subcommand === "enable" || subcommand === "disable") &&
          scenario.engineMutationError
        ) {
          finish(
            id,
            failure("engines", "ENGINE_UPDATE_FAILED", scenario.engineMutationError),
          );
        } else {
          finish(
            id,
            result("engines", {
              engines: [
                {
                  id: "gateway.upstream:deepseek",
                  group: "gateway.upstream",
                  name: "deepseek",
                  kind: "gateway",
                  enabled: false,
                  available: false,
                  routing: ["general"],
                  requires: ["secrets.search.deepseek.api_key"],
                },
                {
                  id: "gateway.search:main",
                  group: "gateway.search",
                  name: "main search",
                  kind: "gateway",
                  enabled: true,
                  available: true,
                  routing: ["category:news"],
                },
              ],
            }),
          );
        }
      } else if (name === "extensions") {
        if (subcommand === "config") {
          const args = cliArgs.slice(2);
          if (args.includes("--describe")) {
            finish(
              id,
              result("extensions.config", {
                id: args[0],
                fields: scenario.extensionConfigFields ?? [],
              }),
            );
          } else {
            finish(
              id,
              result("extensions.config", {
                id: args[0],
                config: scenario.extensionConfig ?? {},
              }),
            );
          }
        } else {
          finish(
            id,
            result("extensions", {
              extensions: scenario.extensions ?? [
                {
                  id: "example-v2",
                  name: "Example V2",
                  version: "1.2.0",
                  provides: ["fetch", "search"],
                  entry: "index.mjs",
                  path: "C:\\ASG-Fixture\\data\\extensions\\example-v2",
                  backends: [
                    {
                      id: "example-api",
                      name: "Example API",
                      installed: true,
                      enabled: true,
                      version: "0.8.0",
                    },
                  ],
                  fetch_channels: [
                    {
                      id: "example:cli",
                      name: "Example CLI",
                      backends: ["example-api"],
                    },
                  ],
                  search_engines: [
                    {
                      id: "gateway.search:example",
                      name: "Example Search",
                    },
                  ],
                },
              ],
            }),
          );
        }
      } else if (
        name === "config" &&
        subcommand === "set" &&
        cliArgs.includes("--stdin") &&
        scenario.secretError
      ) {
        finish(id, failure("config.set", "SECRET_WRITE_FAILED", scenario.secretError));
      } else if (name === "config" && subcommand === "get") {
        scenario.configCallCount += 1;
        finish(
          id,
          result("config.get", {
            gateway: { port: 3000, root_marker: scenario.root },
            secrets: { test: { api_key: "set" } },
          }),
        );
      } else {
        finish(id, result(name || "fixture", {}));
      }
      return {
        jobId: id,
        cancellable: name === "logs" && cliArgs.includes("-f"),
        mutating: false,
      };
    },
  };
})();

