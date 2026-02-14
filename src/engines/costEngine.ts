/**
 * Cost Engine - Simulates AWS EC2 cost scenarios
 * Provides hackathon-safe cost estimation without actual AWS billing API calls
 */

export interface InstanceCost {
  instanceType: string;
  onDemandHourly: number;
  onDemandMonthly: number;
}

export interface CostSimulationResult {
  scenario: string;
  currentCost: InstanceCost;
  proposedCost: InstanceCost;
  monthlySavings: number;
  monthlySavingsPercent: number;
  annualSavings: number;
  recommendation: string;
}

export interface FleetCostSummary {
  totalInstances: number;
  currentMonthlyCost: number;
  estimatedAnnualCost: number;
  costByInstanceType: Record<string, { count: number; monthlyCost: number }>;
}

/**
 * Approximate EC2 pricing (US East - On Demand)
 * These are simplified estimates for hackathon purposes
 */
const EC2_PRICING_MAP: Record<string, number> = {
  // T-series (Burstable)
  "t2.micro": 0.0116,
  "t2.small": 0.023,
  "t2.medium": 0.0464,
  "t2.large": 0.0928,
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "t3.xlarge": 0.1664,
  "t3.2xlarge": 0.3328,

  // M-series (General Purpose)
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "m5.2xlarge": 0.384,
  "m5.4xlarge": 0.768,
  "m5.8xlarge": 1.536,
  "m6i.large": 0.096,
  "m6i.xlarge": 0.192,
  "m6i.2xlarge": 0.384,

  // C-series (Compute Optimized)
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "c5.2xlarge": 0.34,
  "c5.4xlarge": 0.68,
  "c6i.large": 0.085,
  "c6i.xlarge": 0.17,

  // R-series (Memory Optimized)
  "r5.large": 0.126,
  "r5.xlarge": 0.252,
  "r5.2xlarge": 0.504,
  "r5.4xlarge": 1.008,

  // Default fallback
  "unknown": 0.05
};

/**
 * Gets hourly cost for instance type
 */
export function getInstanceHourlyCost(instanceType: string): number {
  const cost = EC2_PRICING_MAP[instanceType];
  return cost !== undefined ? cost : EC2_PRICING_MAP["unknown"] as number;
}

/**
 * Calculates monthly cost from hourly rate
 */
function calculateMonthlyCost(hourlyRate: number): number {
  // 730 hours per month (365 days * 24 hours / 12 months)
  return hourlyRate * 730;
}

/**
 * Creates instance cost object
 */
function createInstanceCost(instanceType: string): InstanceCost {
  const hourlyRate = getInstanceHourlyCost(instanceType);
  const monthlyRate = calculateMonthlyCost(hourlyRate);

  return {
    instanceType,
    onDemandHourly: Math.round(hourlyRate * 10000) / 10000,
    onDemandMonthly: Math.round(monthlyRate * 100) / 100
  };
}

/**
 * Generates recommendation based on cost difference
 */
function generateCostRecommendation(
  scenario: string,
  savingsPercent: number,
  currentType: string,
  proposedType: string
): string {
  if (scenario === "downsize") {
    if (savingsPercent > 50) {
      return `Significant cost savings opportunity. Consider migrating from ${currentType} to ${proposedType}.`;
    }
    if (savingsPercent > 25) {
      return `Moderate cost savings available. Evaluate workload requirements before downsizing.`;
    }
    return `Minor cost reduction. Ensure performance requirements are still met.`;
  }

  if (scenario === "upsize") {
    return `Upgrading to ${proposedType} will increase costs by ${Math.abs(savingsPercent).toFixed(1)}%. Recommended only if current performance is insufficient.`;
  }

  if (scenario === "optimize") {
    if (savingsPercent > 0) {
      return `Switch to ${proposedType} for better price-performance ratio.`;
    }
    return `Current instance type is already cost-optimized for this workload class.`;
  }

  return "Review workload requirements against instance capabilities.";
}

/**
 * Simulates cost impact of instance type change
 */
export function simulateCostChange(
  currentInstanceType: string,
  proposedInstanceType: string,
  scenario: string = "resize"
): CostSimulationResult {
  const currentCost = createInstanceCost(currentInstanceType);
  const proposedCost = createInstanceCost(proposedInstanceType);

  const monthlySavings = currentCost.onDemandMonthly - proposedCost.onDemandMonthly;
  const monthlySavingsPercent = currentCost.onDemandMonthly > 0
    ? (monthlySavings / currentCost.onDemandMonthly) * 100
    : 0;
  const annualSavings = monthlySavings * 12;

  const recommendation = generateCostRecommendation(
    scenario,
    monthlySavingsPercent,
    currentInstanceType,
    proposedInstanceType
  );

  return {
    scenario,
    currentCost,
    proposedCost,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    monthlySavingsPercent: Math.round(monthlySavingsPercent * 10) / 10,
    annualSavings: Math.round(annualSavings * 100) / 100,
    recommendation
  };
}

/**
 * Suggests optimal instance type based on CPU utilization
 */
export function suggestInstanceType(
  currentType: string,
  avgCpuUtilization: number
): string {
  // Parse current instance family and size
  const parts = currentType.split(".");
  if (parts.length !== 2) return currentType;

  const family = parts[0];
  const size = parts[1];

  if (!family || !size) return currentType;

  // Size hierarchy for each family
  const sizeHierarchy = [
    "nano", "micro", "small", "medium", "large", "xlarge", "2xlarge",
    "4xlarge", "8xlarge", "12xlarge", "16xlarge", "24xlarge"
  ];

  const currentSizeIndex = sizeHierarchy.indexOf(size);
  if (currentSizeIndex === -1) return currentType;

  // Decision logic based on CPU utilization
  if (avgCpuUtilization < 10) {
    // Severely underutilized - downsize by 2 steps if possible
    const newIndex = Math.max(0, currentSizeIndex - 2);
    const newSize = sizeHierarchy[newIndex];
    return newSize ? `${family}.${newSize}` : currentType;
  }

  if (avgCpuUtilization < 30) {
    // Underutilized - downsize by 1 step
    const newIndex = Math.max(0, currentSizeIndex - 1);
    const newSize = sizeHierarchy[newIndex];
    return newSize ? `${family}.${newSize}` : currentType;
  }

  if (avgCpuUtilization > 80) {
    // Overutilized - upsize by 1 step
    const newIndex = Math.min(sizeHierarchy.length - 1, currentSizeIndex + 1);
    const newSize = sizeHierarchy[newIndex];
    return newSize ? `${family}.${newSize}` : currentType;
  }

  if (avgCpuUtilization > 90) {
    // Critically overutilized - upsize by 2 steps
    const newIndex = Math.min(sizeHierarchy.length - 1, currentSizeIndex + 2);
    const newSize = sizeHierarchy[newIndex];
    return newSize ? `${family}.${newSize}` : currentType;
  }

  // Optimally utilized - no change
  return currentType;
}

/**
 * Calculates total fleet cost summary
 */
export function calculateFleetCost(
  instances: Array<{ instanceId: string; type: string }>
): FleetCostSummary {
  const costByType: Record<string, { count: number; monthlyCost: number }> = {};
  let totalMonthlyCost = 0;

  instances.forEach(instance => {
    const instanceCost = createInstanceCost(instance.type);

    if (!costByType[instance.type]) {
      costByType[instance.type] = { count: 0, monthlyCost: 0 };
    }

    const typeInfo = costByType[instance.type];
    if (typeInfo) {
      typeInfo.count += 1;
      typeInfo.monthlyCost += instanceCost.onDemandMonthly;
    }
    totalMonthlyCost += instanceCost.onDemandMonthly;
  });

  return {
    totalInstances: instances.length,
    currentMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    estimatedAnnualCost: Math.round(totalMonthlyCost * 12 * 100) / 100,
    costByInstanceType: costByType
  };
}
