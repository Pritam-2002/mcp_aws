import { z } from "zod";
import { predictFailure } from "../engines/predictionEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "predict_failure";
export const toolInputSchema = z.object({
    instanceId: z.string(),
    durationMinutes: z.number().default(60)
});

export const toolHandler = async ({ instanceId, durationMinutes }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Predicting failure for", instanceId);

        const prediction = await predictFailure(instanceId, durationMinutes);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(prediction, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to predict failure",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
