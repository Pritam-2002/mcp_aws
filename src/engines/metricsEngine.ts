import { getInstanceMetrics } from "../aws/cloudwatchService";

function avg(datapoints: any[]) {
  if (!datapoints.length) return 0;

  const sum = datapoints.reduce(
    (acc, dp) => acc + (dp.Average || 0),
    0
  );

  return sum / datapoints.length;
}

function generateInsights(cpuAvg: number) {
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
) {
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
    cpuAvg,
    netInAvg,
    netOutAvg,
    insights
  };
}
