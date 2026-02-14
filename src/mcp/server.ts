import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listInstances } from "../aws/ec2Service";

import { log } from "../utils/logger";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMetricsSummary } from "../engines/metricsEngine";
import { fleetHealth } from "../engines/healthEngine";

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

  /*
   ------------------------
   TOOL 1: hello_tool
   ------------------------
  */
  server.registerTool(
    "hello_tool",
    {},
    async () => {
      return {
        content: [{ type: "text", text: "Hello MCP working!" }]
      };
    }
  );

  /*
   ------------------------
   TOOL 2: list_instances
   ------------------------
  */

  server.registerTool(
    "list_instances",
    {},
    async () => {
      const instances = await listInstances();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(instances, null, 2)
          }
        ]
      };
    }
  );

  /*
   ------------------------
   TOOL 3: get metrics of an instance 
   ------------------------
  */

  server.registerTool(
  "get_metrics", 
  
    {
    inputSchema:{
       instanceId: z.string(),
      durationMinutes: z.number().default(60)
        }   
    },
     async ({ instanceId, durationMinutes }) => {
      log("Fetching metrics for", instanceId);

      const metrics = await getMetricsSummary(instanceId, durationMinutes);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(metrics, null, 2)
          }
        ]
      };
    }
  
  );


  /*
   ------------------------
   TOOL 3: get health status  of an instance 
   ------------------------
  */
  server.registerTool(
  "fleet_health", 
  
    {
    inputSchema:{
      
      durationMinutes: z.number().default(60)
        }   
    },
     async ({durationMinutes }) => {
      log("Fetching metrics for", durationMinutes);

      const result = await fleetHealth(durationMinutes);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  
  );
  return server;
}

export async function startServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  log("MCP Server started");
}
