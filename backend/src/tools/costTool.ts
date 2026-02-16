import { z } from "zod";
import { simulateCostChange, suggestInstanceType } from "../engines/costEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "cost_simulator";
export const toolInputSchema = z.object({
    instanceId: z.string().optional(),
    currentInstanceType: z.string(),
    proposedInstanceType: z.string().optional(),
    scenario: z.enum(["downsize", "upsize", "optimize", "resize"]).default("resize"),
    avgCpuUtilization: z.number().optional()
});

export const toolHandler = async ({ instanceId, currentInstanceType, proposedInstanceType, scenario, avgCpuUtilization }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Simulating cost for", currentInstanceType);

        // If no proposed type, suggest based on CPU utilization
        let targetType = proposedInstanceType;
        if (!targetType && avgCpuUtilization !== undefined) {
            targetType = suggestInstanceType(currentInstanceType, avgCpuUtilization);
        }

        // Default to same type if still no proposed type
        if (!targetType) {
            targetType = currentInstanceType;
        }

        const simulation = simulateCostChange(currentInstanceType, targetType, scenario);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(simulation, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to simulate cost",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
