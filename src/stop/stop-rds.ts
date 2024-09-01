import { DescribeDBInstancesCommand,RDSClient, StopDBInstanceCommand } from "@aws-sdk/client-rds";


export async function stopRDSInstances(region: string, resourcesARN: string[]) {
    const rdsClient = new RDSClient({
        region: region,
    });
    try {
        if (!resourcesARN.length) {
            console.log("No resources found with the specified tags.");
            return;
        }

        for (const resourceARN of resourcesARN) {

            console.log(`Processing ARN: ${resourceARN}`);

            if (resourceARN.startsWith("arn:aws:rds:")) {
                const dbInstanceIdentifier = resourceARN.split(":").pop().split("/").pop();
                console.log(`Stopping RDS instance: ${dbInstanceIdentifier}`);
                const describeCommand = new DescribeDBInstancesCommand({
                    DBInstanceIdentifier: dbInstanceIdentifier,
                });
                const describeResponse = await rdsClient.send(describeCommand);
                const instanceStatus = describeResponse.DBInstances[0].DBInstanceStatus;
                console.log("instanceStatus",instanceStatus);
                if(instanceStatus.toLocaleLowerCase() != "starting") break;
                const stopCommand = new StopDBInstanceCommand({
                    DBInstanceIdentifier: dbInstanceIdentifier,
                });

                await rdsClient.send(stopCommand);
                
                console.log(`RDS instance ${dbInstanceIdentifier} stopped successfully.`);
            } else {
                console.log(`ARN does not belong to an RDS instance: ${resourceARN}`);
            }
        }
    } catch (error) {
        console.error("Error stopping RDS instances:", error);
    }
}