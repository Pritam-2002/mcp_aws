import { z } from "zod";
import { listInstances } from "../aws/ec2Service.js";

export const toolName = "list_instances";

export const toolDescription = "List all EC2 instances in the current region";

export const toolInputSchema = z.object({});

export const toolHandler = async () => {
    try {
        const instances = await listInstances();

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(instances, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: "Failed to list EC2 instances",
                        message: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
};
