import type { AutomationJob } from "./automation";

export const JOB_TRANSITIONS: Record<
  AutomationJob["status"],
  readonly AutomationJob["status"][]
> = {
  queued: ["awaiting_approval", "running", "failed"],
  awaiting_approval: ["queued", "failed"],
  running: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
};

export function canTransition(
  from: AutomationJob["status"],
  to: AutomationJob["status"]
): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}
