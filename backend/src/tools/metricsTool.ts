import { z } from "zod";
import { getMetricsSummary } from "../engines/metricsEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "get_metrics";
export const toolDescription = "Retrieve detailed CloudWatch metrics for a specific instance";

export const toolInputSchema = z.object({
    instanceId: z.string(),
    durationMinutes: z.number().default(60)
});

export const toolHandler = async ({ instanceId, durationMinutes }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Fetching metrics for", instanceId);

        const metrics = await getMetricsSummary(instanceId, durationMinutes);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(metrics, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to fetch metrics",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
