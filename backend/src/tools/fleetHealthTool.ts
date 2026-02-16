import { z } from "zod";
import { fleetHealth } from "../engines/healthEngine.js";
import { log } from "../utils/logger.js";

export const toolName = "fleet_health";
export const toolDescription = "Analyze the health of all instances based on CPU utilization";

export const toolInputSchema = z.object({
    durationMinutes: z.number().default(60)
});

export const toolHandler = async ({ durationMinutes }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Fetching fleet health for", durationMinutes);

        const result = await fleetHealth(durationMinutes);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to fetch fleet health",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
