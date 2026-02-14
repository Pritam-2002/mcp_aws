import { listInstances } from "../aws/ec2Service";
import { getMetricsSummary } from "./metricsEngine";

function classifyHealth(cpu: number) {
  if (cpu > 85) return "CRITICAL";
  if (cpu > 70) return "WARNING";
  return "HEALTHY";
}

export async function fleetHealth(durationMinutes: number) {
  const instances = await listInstances();

  const results = [];

  for (const inst of instances) {
    if (!inst || !inst.instanceId) continue;

    const metrics = await getMetricsSummary(
      inst.instanceId,
      durationMinutes
    );

    results.push({
      instanceId: inst.instanceId,
      cpuAvg: metrics.cpuAvg,
      health: classifyHealth(metrics.cpuAvg),
      insights: metrics.insights
    });
  }

  return results;
}
