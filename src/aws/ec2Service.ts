import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const ec2 = new EC2Client({});

export async function listInstances() {
  const command = new DescribeInstancesCommand({});
  const response = await ec2.send(command);

  const instances =
    response.Reservations?.flatMap((reservation) =>
      reservation.Instances?.map((instance) => ({
        instanceId: instance.InstanceId,
        state: instance.State?.Name,
        type: instance.InstanceType,
      }))
    ) || [];

  return instances;
}
