import { createAsgServices } from "../services/asg";
import { useJobsStore } from "../stores/jobs";

export type { FollowLogHandle } from "../services/asg";

export function useAsgServices() {
  const jobs = useJobsStore();
  return createAsgServices(jobs.commandRunner);
}
