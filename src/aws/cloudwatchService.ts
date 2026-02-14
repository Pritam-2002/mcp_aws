import {
  CloudWatchClient,
  GetMetricStatisticsCommand
} from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({});

export async function fetchMetric(
  metricName:string,
  instanceId: string,
  durationMinutes: number
) {
  const end = new Date();
  const start = new Date(end.getTime() - durationMinutes * 60000);

  const command = new GetMetricStatisticsCommand({
    Namespace: "AWS/EC2",
    MetricName:metricName,
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
}

export async function getInstanceMetrics(
  instanceId: string,
  durationMinutes: number
) {
  const cpu = await fetchMetric(
    "CPUUtilization",
    instanceId,
    durationMinutes
  );

  const networkIn = await fetchMetric(
    "NetworkIn",
    instanceId,
    durationMinutes
  );

  const networkOut = await fetchMetric(
    "NetworkOut",
    instanceId,
    durationMinutes
  );

  return { cpu, networkIn, networkOut };
}
