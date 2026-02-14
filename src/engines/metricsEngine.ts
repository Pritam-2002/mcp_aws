import { getInstanceMetrics } from "../aws/cloudwatchService.js";
import { Datapoint } from "@aws-sdk/client-cloudwatch";

export interface MetricsSummary {
  instanceId: string;
  cpuAvg: number;
  netInAvg: number;
  netOutAvg: number;
  insights: string[];
}

function avg(datapoints: Datapoint[]): number {
  if (!datapoints.length) return 0;

  const sum = datapoints.reduce(
    (acc, dp) => acc + (dp.Average || 0),
    0
  );

  return sum / datapoints.length;
}

function generateInsights(cpuAvg: number): string[] {
  const insights: string[] = [];

  if (cpuAvg > 80)
    insights.push("High CPU load detected");

  if (cpuAvg < 10)
    insights.push("Instance may be underutilized");

  return insights;
}

export async function getMetricsSummary(
  instanceId: string,
  durationMinutes: number
): Promise<MetricsSummary> {
  const metrics = await getInstanceMetrics(
    instanceId,
    durationMinutes
  );

  const cpuAvg = avg(metrics.cpu);
  const netInAvg = avg(metrics.networkIn);
  const netOutAvg = avg(metrics.networkOut);

  const insights = generateInsights(cpuAvg);

  return {
    instanceId,
    cpuAvg: Math.round(cpuAvg * 100) / 100,
    netInAvg: Math.round(netInAvg * 100) / 100,
    netOutAvg: Math.round(netOutAvg * 100) / 100,
    insights
  };
}
