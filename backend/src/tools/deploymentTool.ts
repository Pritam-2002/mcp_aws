import { z } from "zod";
import { simulateCostChange, getInstanceHourlyCost } from "../engines/costEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "deploy_preview";

export const toolInputSchema = z.object({
    action: z.enum(["resize_instance", "scale_fleet"]),
    instanceId: z.string().optional(),
    currentInstanceType: z.string().optional(),
    targetInstanceType: z.string().optional(),
    currentFleetSize: z.number().optional(),
    targetFleetSize: z.number().optional(),
    instanceType: z.string().optional()
});

export const toolHandler = async ({ action, instanceId, currentInstanceType, targetInstanceType, currentFleetSize, targetFleetSize, instanceType }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Previewing deployment:", action);

        // SIMULATION ONLY - DO NOT MODIFY AWS RESOURCES
        if (action === "resize_instance") {
            if (!currentInstanceType || !targetInstanceType) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                error: "Missing required parameters: currentInstanceType and targetInstanceType"
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }

            const costImpact = simulateCostChange(currentInstanceType, targetInstanceType, "resize");

            const preview = {
                action: "resize_instance",
                simulation: true,
                instanceId: instanceId || "N/A",
                changes: {
                    from: currentInstanceType,
                    to: targetInstanceType
                },
                impact: {
                    monthlyCostDifference: costImpact.monthlySavings,
                    percentChange: costImpact.monthlySavingsPercent,
                    annualImpact: costImpact.annualSavings
                },
                recommendation: costImpact.recommendation,
                warning: "This is a SIMULATION ONLY. No actual AWS resources will be modified."
            };

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(preview, null, 2)
                    }
                ]
            };
        }

        if (action === "scale_fleet") {
            if (currentFleetSize === undefined || targetFleetSize === undefined || !instanceType) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                error: "Missing required parameters: currentFleetSize, targetFleetSize, and instanceType"
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }

            const instanceCost = getInstanceHourlyCost(instanceType) * 730; // Monthly cost
            const currentCost = currentFleetSize * instanceCost;
            const targetCost = targetFleetSize * instanceCost;
            const costDifference = currentCost - targetCost;

            const preview = {
                action: "scale_fleet",
                simulation: true,
                changes: {
                    currentSize: currentFleetSize,
                    targetSize: targetFleetSize,
                    instanceType: instanceType,
                    instanceChange: targetFleetSize - currentFleetSize
                },
                impact: {
                    currentMonthlyCost: Math.round(currentCost * 100) / 100,
                    targetMonthlyCost: Math.round(targetCost * 100) / 100,
                    monthlySavings: Math.round(costDifference * 100) / 100,
                    annualImpact: Math.round(costDifference * 12 * 100) / 100
                },
                recommendation: targetFleetSize > currentFleetSize
                    ? "Scaling up will increase capacity and costs. Ensure demand justifies expansion."
                    : "Scaling down will reduce costs. Verify remaining capacity meets requirements.",
                warning: "This is a SIMULATION ONLY. No actual AWS resources will be modified."
            };

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(preview, null, 2)
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Unknown action. Supported actions: resize_instance, scale_fleet"
                    }, null, 2)
                }
            ],
            isError: true
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to preview deployment",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
