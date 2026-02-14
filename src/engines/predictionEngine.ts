import { getInstanceMetrics } from "../aws/cloudwatchService.js";
import { Datapoint } from "@aws-sdk/client-cloudwatch";

export interface PredictionResult {
  instanceId: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  trendSlope: number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  failureProbability: number;
  recommendation: string;
}

export interface FailurePredictionSummary {
  instanceId: string;
  durationMinutes: number;
  predictions: PredictionResult[];
  overallRiskScore: number;
  overallRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timeToFailureEstimate: string;
}

/**
 * Calculates linear regression slope for trend analysis
 * Returns slope value (positive = increasing, negative = decreasing)
 */
function calculateTrendSlope(datapoints: Datapoint[]): number {
  // Extract valid datapoints
  const validPoints = datapoints
    .map((dp, index) => ({
      x: index, // Time index
      y: dp.Average
    }))
    .filter((point): point is { x: number; y: number } =>
      point.y !== undefined && !isNaN(point.y)
    );

  if (validPoints.length < 2) return 0;

  const n = validPoints.length;
  const sumX = validPoints.reduce((acc, p) => acc + p.x, 0);
  const sumY = validPoints.reduce((acc, p) => acc + p.y, 0);
  const sumXY = validPoints.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = validPoints.reduce((acc, p) => acc + p.x * p.x, 0);

  const denominator = (n * sumXX - sumX * sumX);

  // Avoid division by zero
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;

  return slope;
}

/**
 * Determines trend direction based on slope
 */
function determineTrend(slope: number): "INCREASING" | "DECREASING" | "STABLE" {
  if (Math.abs(slope) < 0.1) return "STABLE";
  return slope > 0 ? "INCREASING" : "DECREASING";
}

/**
 * Calculates risk score for CPU metrics (0-100 scale)
 */
function calculateCPURiskScore(
  currentValue: number,
  slope: number,
  predictedValue: number
): number {
  let riskScore = 0;

  // Base risk from current utilization
  if (currentValue > 80) riskScore += 40;
  else if (currentValue > 60) riskScore += 20;
  else if (currentValue > 40) riskScore += 10;

  // Risk from trend
  if (slope > 0) {
    // Increasing trend - more risky
    riskScore += Math.min(30, slope * 5);
  }

  // Risk from prediction
  if (predictedValue > 90) riskScore += 30;
  else if (predictedValue > 80) riskScore += 20;
  else if (predictedValue > 70) riskScore += 10;

  return Math.min(100, Math.max(0, riskScore));
}

/**
 * Determines risk level from risk score
 */
function determineRiskLevel(riskScore: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (riskScore >= 75) return "CRITICAL";
  if (riskScore >= 50) return "HIGH";
  if (riskScore >= 25) return "MEDIUM";
  return "LOW";
}

/**
 * Generates recommendation based on risk analysis
 */
function generateRecommendation(
  metric: string,
  riskLevel: string,
  trend: string,
  currentValue: number
): string {
  if (metric === "CPUUtilization") {
    if (riskLevel === "CRITICAL") {
      return "Immediate action required: Scale up instance or optimize workload";
    }
    if (riskLevel === "HIGH") {
      return "Consider scaling up instance or investigating high CPU processes";
    }
    if (trend === "INCREASING" && currentValue > 50) {
      return "Monitor closely - CPU trending upward";
    }
    if (currentValue < 20) {
      return "Instance may be over-provisioned - consider downsizing";
    }
  }

  return "Continue monitoring";
}

/**
 * Predicts CPU failure based on trend analysis
 */
function predictCPUFailure(
  instanceId: string,
  datapoints: Datapoint[]
): PredictionResult {
  // Extract valid values
  const values = datapoints
    .map(dp => dp.Average)
    .filter((val): val is number => val !== undefined && !isNaN(val));

  // Get current value safely
  const lastValue = values[values.length - 1];
  const currentValue = lastValue !== undefined ? lastValue : 0;

  const slope = calculateTrendSlope(datapoints);

  // Simple linear prediction (current + slope * future_periods)
  const predictedValue = Math.max(0, Math.min(100, currentValue + slope * 10));

  const trend = determineTrend(slope);
  const riskScore = calculateCPURiskScore(currentValue, slope, predictedValue);
  const riskLevel = determineRiskLevel(riskScore);

  // Failure probability (0-1 scale)
  const failureProbability = Math.min(1, riskScore / 100);

  const recommendation = generateRecommendation(
    "CPUUtilization",
    riskLevel,
    trend,
    currentValue
  );

  return {
    instanceId,
    metric: "CPUUtilization",
    currentValue,
    predictedValue,
    trend,
    trendSlope: slope,
    riskScore,
    riskLevel,
    failureProbability,
    recommendation
  };
}

/**
 * Estimates time to failure based on trend
 */
function estimateTimeToFailure(slope: number, currentValue: number): string {
  if (slope <= 0) return "No immediate failure risk (stable or decreasing trend)";

  // Calculate periods until reaching 90% threshold
  const threshold = 90;
  const periodsToFailure = (threshold - currentValue) / slope;

  if (periodsToFailure <= 0) return "Already at critical levels";
  if (periodsToFailure < 6) return "< 30 minutes";
  if (periodsToFailure < 12) return "30-60 minutes";
  if (periodsToFailure < 24) return "1-2 hours";
  if (periodsToFailure < 72) return "2-6 hours";

  return "> 6 hours";
}

/**
 * Main function: Predicts instance failure based on metric trends
 */
export async function predictFailure(
  instanceId: string,
  durationMinutes: number = 60
): Promise<FailurePredictionSummary> {
  // Fetch metrics data
  const metricsData = await getInstanceMetrics(instanceId, durationMinutes);

  const predictions: PredictionResult[] = [];

  // Predict CPU failure
  const cpuPrediction = predictCPUFailure(instanceId, metricsData.cpu);
  predictions.push(cpuPrediction);

  // Calculate overall risk score (average of all predictions)
  const overallRiskScore = predictions.length > 0
    ? predictions.reduce((acc, p) => acc + p.riskScore, 0) / predictions.length
    : 0;

  const overallRiskLevel = determineRiskLevel(overallRiskScore);

  const timeToFailureEstimate = estimateTimeToFailure(
    cpuPrediction.trendSlope,
    cpuPrediction.currentValue
  );

  return {
    instanceId,
    durationMinutes,
    predictions,
    overallRiskScore: Math.round(overallRiskScore),
    overallRiskLevel,
    timeToFailureEstimate
  };
}
