import { z } from "zod";
import { queryLogs } from "../aws/logsService.js";
import { log } from "../utils/logger.js";

export const toolName = "check_logs";
export const toolInputSchema = z.object({
    logGroupName: z.string(),
    filterPattern: z.string().default(""),
    durationMinutes: z.number().default(60),
    limit: z.number().default(100)
});

export const toolHandler = async ({ logGroupName, filterPattern, durationMinutes, limit }: z.infer<typeof toolInputSchema>) => {
    try {
        log("Querying logs for", logGroupName);

        const logs = await queryLogs(logGroupName, filterPattern, durationMinutes, limit);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(logs, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to query logs",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
