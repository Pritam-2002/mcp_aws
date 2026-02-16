import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  DescribeLogGroupsCommand
} from "@aws-sdk/client-cloudwatch-logs";

import { config } from "../config/env.js";

const logsClient = new CloudWatchLogsClient({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
  }
});

export interface LogEvent {
  timestamp: number;
  message: string;
  logStreamName: string | undefined;
}

export interface LogQueryResult {
  logGroupName: string;
  events: LogEvent[];
  totalEvents: number;
  timeRangeMinutes: number;
}

/**
 * Queries CloudWatch Logs for a specific log group
 */
export async function queryLogs(
  logGroupName: string,
  filterPattern: string = "",
  durationMinutes: number = 60,
  limit: number = 100
): Promise<LogQueryResult> {
  const endTime = Date.now();
  const startTime = endTime - durationMinutes * 60 * 1000;

  const command = new FilterLogEventsCommand({
    logGroupName,
    filterPattern: filterPattern || undefined,
    startTime,
    endTime,
    limit
  });

  try {
    const response = await logsClient.send(command);

    const events: LogEvent[] = (response.events || []).map(event => ({
      timestamp: event.timestamp || 0,
      message: event.message || "",
      logStreamName: event.logStreamName || undefined
    }));

    return {
      logGroupName,
      events,
      totalEvents: events.length,
      timeRangeMinutes: durationMinutes
    };
  } catch (error) {
    // If log group doesn't exist or no permissions, return empty result
    console.error(`Error querying logs for ${logGroupName}:`, error);
    return {
      logGroupName,
      events: [],
      totalEvents: 0,
      timeRangeMinutes: durationMinutes
    };
  }
}

/**
 * Lists available log groups
 */
export async function listLogGroups(limit: number = 50): Promise<string[]> {
  const command = new DescribeLogGroupsCommand({ limit });

  try {
    const response = await logsClient.send(command);
    return (response.logGroups || [])
      .map(lg => lg.logGroupName)
      .filter((name): name is string => name !== undefined);
  } catch (error) {
    console.error("Error listing log groups:", error);
    return [];
  }
}

/**
 * Searches logs across multiple log groups
 */
export async function searchLogsAcrossGroups(
  logGroupNames: string[],
  filterPattern: string,
  durationMinutes: number = 60
): Promise<LogQueryResult[]> {
  const queries = logGroupNames.map(groupName =>
    queryLogs(groupName, filterPattern, durationMinutes)
  );

  return Promise.all(queries);
}
