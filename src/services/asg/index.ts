import type { AsgCommandRunner } from "./command";
import { createConfigService } from "./config";
import { createExplorerService } from "./explorer";
import { createLifecycleService } from "./lifecycle";
import { createLogService } from "./logs";
import { createMaintenanceService } from "./maintenance";
import { createSourcesService } from "./sources";
import { createStatusService } from "./status";

export { AsgCommandError } from "./command";
export type {
  AsgCommandRunner,
  AsgRunOptions,
  AsgStreamHandle,
} from "./command";
export type { FollowLogHandle } from "./logs";
export type { ExtensionConfigSnapshot } from "./sources";

export function createAsgServices(runner: AsgCommandRunner) {
  return {
    status: createStatusService(runner),
    lifecycle: createLifecycleService(runner),
    logs: createLogService(runner),
    explorer: createExplorerService(runner),
    config: createConfigService(runner),
    sources: createSourcesService(runner),
    maintenance: createMaintenanceService(runner),
  };
}
