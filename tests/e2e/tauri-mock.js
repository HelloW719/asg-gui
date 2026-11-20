(() => {
  const callbacks = new Map();
  const eventHandlers = new Map();
  let callbackId = 1;
  let jobId = 0;
  const testInvokes = [];
  window.__TAURI_TEST_INVOKES__ = testInvokes;

  const result = (command, data) => ({
    schema_version: 1,
    ok: true,
    command,
    data,
  });

  const emitJob = (id, kind, data) => {
    const handlerId = eventHandlers.get("asg://job");
    const handler = handlerId ? callbacks.get(handlerId) : null;
    if (!handler) return;
    setTimeout(
      () =>
        handler({
          event: "asg://job",
          id: Math.random(),
          payload: { jobId: id, kind, data },
        }),
      0,
    );
  };

  const finish = (id, value) => {
    setTimeout(() => {
      emitJob(id, "result", value);
      emitJob(id, "exit", 0);
    }, 30);
  };

  globalThis.isTauri = true;
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
      if (command === "get_app_state") {
        return {
          root: "C:\\ASG-Fixture",
          rootValid: true,
          platform: "windows",
          version: "0.1.0",
          theme: "dark",
        };
      }
      if (command === "set_theme" || command === "show_window" || command === "hide_window") {
        return null;
      }
      if (command !== "run_cli") return null;

      const id = `fixture-${++jobId}`;
      const cliArgs = args.args ?? [];
      const name = cliArgs[0];
      emitJob(id, "started");
      if (name === "status") {
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
            ],
          }),
        );
      } else {
        finish(id, result(name || "fixture", {}));
      }
      return { jobId: id, cancellable: false, mutating: false };
    },
  };
})();

