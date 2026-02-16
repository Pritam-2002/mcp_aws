import { z } from "zod";
import { detectAnomalies } from "../engines/anomalyEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "anomaly_detector";
export const toolInputSchema = z.object({
    instanceId: z.string(),
    durationMinutes: z.number().default(60)
});

export const toolHandler = async ({ instanceId, durationMinutes }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Detecting anomalies for", instanceId);

        const anomalies = await detectAnomalies(instanceId, durationMinutes);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(anomalies, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to detect anomalies",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
