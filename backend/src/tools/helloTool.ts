import { z } from "zod";

export const toolName = "hello_tool";
export const toolInputSchema = z.object({});

export const toolHandler = async () => {
    return {
        content: [{ type: "text" as const, text: "Hello MCP working!" }]
    };
};
