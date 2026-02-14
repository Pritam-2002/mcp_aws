import { listInstances } from "../aws/ec2Service.js";
import { getMetricsSummary } from "./metricsEngine.js";

export interface InstanceHealth {
  instanceId: string;
  cpuAvg: number;
  health: "HEALTHY" | "WARNING" | "CRITICAL";
  insights: string[];
}

function classifyHealth(cpu: number): "HEALTHY" | "WARNING" | "CRITICAL" {
  if (cpu > 85) return "CRITICAL";
  if (cpu > 70) return "WARNING";
  return "HEALTHY";
}

export async function fleetHealth(durationMinutes: number): Promise<InstanceHealth[]> {
  try {
    const instances = await listInstances();

    // Process instances in parallel for better performance
    const healthPromises = instances
      .filter(inst => inst && inst.instanceId)
      .map(async (inst) => {
        try {
          const metrics = await getMetricsSummary(
            inst.instanceId,
            durationMinutes
          );

          return {
            instanceId: inst.instanceId,
            cpuAvg: metrics.cpuAvg,
            health: classifyHealth(metrics.cpuAvg),
            insights: metrics.insights
          };
        } catch (error) {
          // If metrics fetch fails for an instance, return degraded health
          console.error(`Failed to get health for ${inst.instanceId}:`, error);
          return {
            instanceId: inst.instanceId,
            cpuAvg: 0,
            health: "CRITICAL" as const,
            insights: ["Failed to fetch metrics"]
          };
        }
      });

    const results = await Promise.all(healthPromises);

    return results;
  } catch (error) {
    console.error("Error fetching fleet health:", error);
    throw new Error(`Failed to fetch fleet health: ${error instanceof Error ? error.message : String(error)}`);
  }
}
