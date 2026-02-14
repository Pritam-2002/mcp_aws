import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  Datapoint
} from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({});

export interface MetricsData {
  cpu: Datapoint[];
  networkIn: Datapoint[];
  networkOut: Datapoint[];
}

export async function fetchMetric(
  metricName: string,
  instanceId: string,
  durationMinutes: number
): Promise<Datapoint[]> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - durationMinutes * 60000);

    const command = new GetMetricStatisticsCommand({
      Namespace: "AWS/EC2",
      MetricName: metricName,
      Dimensions: [
        {
          Name: "InstanceId",
          Value: instanceId
        }
      ],
      StartTime: start,
      EndTime: end,
      Period: 300,
      Statistics: ["Average"]
    });

    const response = await cloudwatch.send(command);

    return response.Datapoints || [];
  } catch (error) {
    console.error(`Error fetching ${metricName} for ${instanceId}:`, error);
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

export async function getInstanceMetrics(
  instanceId: string,
  durationMinutes: number
): Promise<MetricsData> {
  try {
    // Fetch metrics in parallel for better performance
    const [cpu, networkIn, networkOut] = await Promise.all([
      fetchMetric("CPUUtilization", instanceId, durationMinutes),
      fetchMetric("NetworkIn", instanceId, durationMinutes),
      fetchMetric("NetworkOut", instanceId, durationMinutes)
    ]);

    return { cpu, networkIn, networkOut };
  } catch (error) {
    console.error(`Error fetching metrics for ${instanceId}:`, error);
    throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
  }
}
