import type {
  CliErrorPayload,
  JobEvent,
  VisualState,
} from "../../types/cli";
import type { CliDataParser } from "../../utils/cli";

export type { CliDataParser } from "../../utils/cli";

export interface AsgRunOptions {
  label: string;
  stdin?: string;
  mode?: "json" | "jsonl";
  visualState?: VisualState | null;
  onEvent?: (event: JobEvent) => void;
}

export interface AsgStreamHandle<T> {
  jobId: string;
  cancellable: boolean;
  done: Promise<T>;
  cancel: () => Promise<void>;
}

export interface AsgCommandRunner {
  run<T>(
    args: string[],
    options: AsgRunOptions,
    parseData: CliDataParser<T>,
  ): Promise<T>;
  stream<T>(
    args: string[],
    options: AsgRunOptions,
    parseData: CliDataParser<T>,
  ): Promise<AsgStreamHandle<T>>;
}

export class AsgCommandError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly command: string | undefined;
  readonly data?: unknown;

  constructor(
    payload: CliErrorPayload,
    command?: string,
    fallback = "ASG 命令执行失败。",
    data?: unknown,
  ) {
    super(payload.message || fallback);
    this.name = "AsgCommandError";
    this.code = payload.code;
    this.details = payload.details;
    this.command = command;
    this.data = data;
  }
}
