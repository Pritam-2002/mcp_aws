import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listInstances } from "../aws/ec2Service.js";
import { queryLogs, listLogGroups } from "../aws/logsService.js";

import { log } from "../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMetricsSummary } from "../engines/metricsEngine.js";
import { fleetHealth } from "../engines/healthEngine.js";
import { detectAnomalies } from "../engines/anomalyEngine.js";
import { predictFailure } from "../engines/predictionEngine.js";
import { simulateCostChange, suggestInstanceType, getInstanceHourlyCost } from "../engines/costEngine.js";

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
      try {
        const instances = await listInstances();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(instances, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to list EC2 instances",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );

  /*
   ------------------------
   TOOL 3: get_metrics
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
      try {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to fetch metrics",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }

  );


  /*
   ------------------------
   TOOL 4: fleet_health
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
      try {
        log("Fetching fleet health for", durationMinutes);

        const result = await fleetHealth(durationMinutes);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to fetch fleet health",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }

  );

  /*
   ------------------------
   TOOL 5: anomaly_detector (DAY 3)
   ------------------------
  */
  server.registerTool(
    "anomaly_detector",
    {
      inputSchema: {
        instanceId: z.string(),
        durationMinutes: z.number().default(60)
      }
    },
    async ({ instanceId, durationMinutes }) => {
      try {
        log("Detecting anomalies for", instanceId);

        const anomalies = await detectAnomalies(instanceId, durationMinutes);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(anomalies, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to detect anomalies",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );

  /*
   ------------------------
   TOOL 6: predict_failure (DAY 3)
   ------------------------
  */
  server.registerTool(
    "predict_failure",
    {
      inputSchema: {
        instanceId: z.string(),
        durationMinutes: z.number().default(60)
      }
    },
    async ({ instanceId, durationMinutes }) => {
      try {
        log("Predicting failure for", instanceId);

        const prediction = await predictFailure(instanceId, durationMinutes);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(prediction, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to predict failure",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );

  /*
   ------------------------
   TOOL 7: cost_simulator (DAY 3)
   ------------------------
  */
  server.registerTool(
    "cost_simulator",
    {
      inputSchema: {
        instanceId: z.string().optional(),
        currentInstanceType: z.string(),
        proposedInstanceType: z.string().optional(),
        scenario: z.enum(["downsize", "upsize", "optimize", "resize"]).default("resize"),
        avgCpuUtilization: z.number().optional()
      }
    },
    async ({ instanceId, currentInstanceType, proposedInstanceType, scenario, avgCpuUtilization }) => {
      try {
        log("Simulating cost for", currentInstanceType);

        // If no proposed type, suggest based on CPU utilization
        let targetType = proposedInstanceType;
        if (!targetType && avgCpuUtilization !== undefined) {
          targetType = suggestInstanceType(currentInstanceType, avgCpuUtilization);
        }

        // Default to same type if still no proposed type
        if (!targetType) {
          targetType = currentInstanceType;
        }

        const simulation = simulateCostChange(currentInstanceType, targetType, scenario);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(simulation, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to simulate cost",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );

  /*
   ------------------------
   TOOL 8: check_logs (DAY 4)
   ------------------------
  */
  server.registerTool(
    "check_logs",
    {
      inputSchema: {
        logGroupName: z.string(),
        filterPattern: z.string().default(""),
        durationMinutes: z.number().default(60),
        limit: z.number().default(100)
      }
    },
    async ({ logGroupName, filterPattern, durationMinutes, limit }) => {
      try {
        log("Querying logs for", logGroupName);

        const logs = await queryLogs(logGroupName, filterPattern, durationMinutes, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(logs, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to query logs",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );

  /*
   ------------------------
   TOOL 9: deploy_preview (DAY 4)
   ------------------------
  */
  server.registerTool(
    "deploy_preview",
    {
      inputSchema: {
        action: z.enum(["resize_instance", "scale_fleet"]),
        instanceId: z.string().optional(),
        currentInstanceType: z.string().optional(),
        targetInstanceType: z.string().optional(),
        currentFleetSize: z.number().optional(),
        targetFleetSize: z.number().optional(),
        instanceType: z.string().optional()
      }
    },
    async ({ action, instanceId, currentInstanceType, targetInstanceType, currentFleetSize, targetFleetSize, instanceType }) => {
      try {
        log("Previewing deployment:", action);

        // SIMULATION ONLY - DO NOT MODIFY AWS RESOURCES
        if (action === "resize_instance") {
          if (!currentInstanceType || !targetInstanceType) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "Missing required parameters: currentInstanceType and targetInstanceType"
                  }, null, 2)
                }
              ],
              isError: true
            };
          }

          const costImpact = simulateCostChange(currentInstanceType, targetInstanceType, "resize");

          const preview = {
            action: "resize_instance",
            simulation: true,
            instanceId: instanceId || "N/A",
            changes: {
              from: currentInstanceType,
              to: targetInstanceType
            },
            impact: {
              monthlyCostDifference: costImpact.monthlySavings,
              percentChange: costImpact.monthlySavingsPercent,
              annualImpact: costImpact.annualSavings
            },
            recommendation: costImpact.recommendation,
            warning: "This is a SIMULATION ONLY. No actual AWS resources will be modified."
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(preview, null, 2)
              }
            ]
          };
        }

        if (action === "scale_fleet") {
          if (currentFleetSize === undefined || targetFleetSize === undefined || !instanceType) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "Missing required parameters: currentFleetSize, targetFleetSize, and instanceType"
                  }, null, 2)
                }
              ],
              isError: true
            };
          }

          const instanceCost = getInstanceHourlyCost(instanceType) * 730; // Monthly cost
          const currentCost = currentFleetSize * instanceCost;
          const targetCost = targetFleetSize * instanceCost;
          const costDifference = currentCost - targetCost;

          const preview = {
            action: "scale_fleet",
            simulation: true,
            changes: {
              currentSize: currentFleetSize,
              targetSize: targetFleetSize,
              instanceType: instanceType,
              instanceChange: targetFleetSize - currentFleetSize
            },
            impact: {
              currentMonthlyCost: Math.round(currentCost * 100) / 100,
              targetMonthlyCost: Math.round(targetCost * 100) / 100,
              monthlySavings: Math.round(costDifference * 100) / 100,
              annualImpact: Math.round(costDifference * 12 * 100) / 100
            },
            recommendation: targetFleetSize > currentFleetSize
              ? "Scaling up will increase capacity and costs. Ensure demand justifies expansion."
              : "Scaling down will reduce costs. Verify remaining capacity meets requirements.",
            warning: "This is a SIMULATION ONLY. No actual AWS resources will be modified."
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(preview, null, 2)
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Unknown action. Supported actions: resize_instance, scale_fleet"
              }, null, 2)
            }
          ],
          isError: true
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to preview deployment",
                message: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
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
