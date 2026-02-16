import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as helloTool from "../tools/helloTool.js";
import * as instancesTool from "../tools/instancesTool.js";
import * as metricsTool from "../tools/metricsTool.js";
import * as fleetHealthTool from "../tools/fleetHealthTool.js";
import * as anomalyTool from "../tools/anomalyTool.js";
import * as predictionTool from "../tools/predictionTool.js";
import * as costTool from "../tools/costTool.js";
import * as logsTool from "../tools/logsTool.js";
import * as deploymentTool from "../tools/deploymentTool.js";

export function createMcpServer() {
    const server = new McpServer(
        {
            name: "aws-sre-mcp",
            version: "1.0.0"
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );

    // Register Tools
    server.registerTool(helloTool.toolName, { inputSchema: helloTool.toolInputSchema }, helloTool.toolHandler);
    server.registerTool(instancesTool.toolName, { inputSchema: instancesTool.toolInputSchema }, instancesTool.toolHandler);
    server.registerTool(metricsTool.toolName, { inputSchema: metricsTool.toolInputSchema }, metricsTool.toolHandler);
    server.registerTool(fleetHealthTool.toolName, { inputSchema: fleetHealthTool.toolInputSchema }, fleetHealthTool.toolHandler);
    server.registerTool(anomalyTool.toolName, { inputSchema: anomalyTool.toolInputSchema }, anomalyTool.toolHandler);
    server.registerTool(predictionTool.toolName, { inputSchema: predictionTool.toolInputSchema }, predictionTool.toolHandler);
    server.registerTool(costTool.toolName, { inputSchema: costTool.toolInputSchema }, costTool.toolHandler);
    server.registerTool(logsTool.toolName, { inputSchema: logsTool.toolInputSchema }, logsTool.toolHandler);
    server.registerTool(deploymentTool.toolName, { inputSchema: deploymentTool.toolInputSchema }, deploymentTool.toolHandler);

    return server;
}
