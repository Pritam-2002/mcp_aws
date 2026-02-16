import { getInstanceMetrics } from "../aws/cloudwatchService.js";
import { Datapoint } from "@aws-sdk/client-cloudwatch";

export interface AnomalyResult {
  instanceId: string;
  metric: string;
  value: number;
  mean: number;
  stdDev: number;
  sigmaDeviation: number;
  isAnomaly: boolean;
  severity: "NORMAL" | "MINOR" | "MAJOR" | "CRITICAL";
}

export interface AnomalyDetectionSummary {
  instanceId: string;
  durationMinutes: number;
  anomaliesDetected: AnomalyResult[];
  totalMetricsAnalyzed: number;
  anomalyCount: number;
}

/**
 * Calculates mean (average) of a dataset
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculates standard deviation of a dataset
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;

  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Determines anomaly severity based on sigma deviation
 */
function determineSeverity(sigmaDeviation: number): "NORMAL" | "MINOR" | "MAJOR" | "CRITICAL" {
  const absSigma = Math.abs(sigmaDeviation);

  if (absSigma < 3) return "NORMAL";
  if (absSigma < 4) return "MINOR";
 if (absSigma < 5) return "MAJOR";
  return "CRITICAL";
}

/**
 * Performs 3-sigma anomaly detection on a metric dataset
 */
function detect3SigmaAnomalies(
  metricName: string,
  instanceId: string,
  datapoints: Datapoint[]
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // Extract valid values
  const values = datapoints
    .map(dp => dp.Average)
    .filter((val): val is number => val !== undefined && !isNaN(val));

  // Need at least 3 datapoints for meaningful statistics
  if (values.length < 3) {
    return anomalies;
  }

  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);

  // If stdDev is 0 (all values identical), no anomalies possible
  if (stdDev === 0) {
    return anomalies;
  }

  // Check each datapoint for anomalies
  datapoints.forEach(dp => {
    if (dp.Average === undefined || isNaN(dp.Average)) return;

    const value = dp.Average;
    const sigmaDeviation = (value - mean) / stdDev;
    const absSigma = Math.abs(sigmaDeviation);

    // Flag as anomaly if beyond 3 sigma
    if (absSigma >= 3) {
      anomalies.push({
        instanceId,
        metric: metricName,
        value,
        mean,
        stdDev,
        sigmaDeviation,
        isAnomaly: true,
        severity: determineSeverity(sigmaDeviation)
      });
    }
  });

  return anomalies;
}

/**
 * Main function: Detects anomalies across all metrics for an instance
 */
export async function detectAnomalies(
  instanceId: string,
  durationMinutes: number = 60
): Promise<AnomalyDetectionSummary> {
  // Fetch raw metrics data
  const metricsData = await getInstanceMetrics(instanceId, durationMinutes);

  const allAnomalies: AnomalyResult[] = [];

  // Analyze CPU metrics
  const cpuAnomalies = detect3SigmaAnomalies(
    "CPUUtilization",
    instanceId,
    metricsData.cpu
  );
  allAnomalies.push(...cpuAnomalies);

  // Analyze Network In metrics
  const netInAnomalies = detect3SigmaAnomalies(
    "NetworkIn",
    instanceId,
    metricsData.networkIn
  );
  allAnomalies.push(...netInAnomalies);

  // Analyze Network Out metrics
  const netOutAnomalies = detect3SigmaAnomalies(
    "NetworkOut",
    instanceId,
    metricsData.networkOut
  );
  allAnomalies.push(...netOutAnomalies);

  return {
    instanceId,
    durationMinutes,
    anomaliesDetected: allAnomalies,
    totalMetricsAnalyzed: 3,
    anomalyCount: allAnomalies.length
  };
}
