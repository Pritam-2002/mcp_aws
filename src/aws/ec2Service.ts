import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const ec2 = new EC2Client({});

export interface EC2Instance {
  instanceId: string;
  state: string;
  type: string;
}

export async function listInstances(): Promise<EC2Instance[]> {
  try {
    const command = new DescribeInstancesCommand({});
    const response = await ec2.send(command);

    const instances = (response.Reservations?.flatMap((reservation) =>
      reservation.Instances?.map((instance) => ({
        instanceId: instance.InstanceId || "unknown",
        state: instance.State?.Name || "unknown",
        type: instance.InstanceType || "unknown",
      }))
    ) || []).filter((inst): inst is EC2Instance => inst !== undefined);

    return instances;
  } catch (error) {
    console.error("Error listing EC2 instances:", error);
    throw new Error(`Failed to list EC2 instances: ${error instanceof Error ? error.message : String(error)}`);
  }
}
