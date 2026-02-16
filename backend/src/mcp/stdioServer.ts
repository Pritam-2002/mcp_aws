import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../core/createMcpServer.js";
import { log, error } from "../utils/logger.js";
import { fileURLToPath } from "url";

export async function run() {
    try {
        const server = createMcpServer();
        const transport = new StdioServerTransport();

        await server.connect(transport);

        // SILENT OPERATON: No console.log or startup messages
        // This is critical for Archestra/MCP stdio compatibility

        // Keep the process alive
        process.on("SIGINT", async () => {
            await server.close();
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            await server.close();
            process.exit(0);
        });

    } catch (err: any) {
        error("Failed to start MCP server:", err);
        process.exit(1);
    }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    run();
}
