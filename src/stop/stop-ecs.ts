import { info, setFailed } from "@actions/core";
import { DescribeServicesCommand, ECSClient, UpdateServiceCommand } from "@aws-sdk/client-ecs";
import { Resource } from "../interfaces/resource";
interface ServiceParams {
    clusterName: string;
    serviceName: string;
}

export async function stopECSServiceTasks(region: string, resourcesARN: string[]): Promise<Resource[]> {
    const ecsClient = new ECSClient({
        region: region,
    });
    let clusterName: string;
    let serviceName: string;
    let stoppedResources: Resource[] = []
    try {
        if (!resourcesARN.length) {
            console.log("No resources found with the specified tags.");
            return;
        }
        for (const resourceARN of resourcesARN) {

            if (isECSService(resourceARN)) {
                const serviceParams = parseECSServiceArn(resourceARN);
                clusterName = serviceParams.clusterName;
                serviceName = serviceParams.serviceName;

                const describeCommand = new DescribeServicesCommand({
                    cluster: clusterName,
                    services: [serviceName],
                });
                const describeResponse = await ecsClient.send(describeCommand);
                const runningCount = describeResponse.services[0].runningCount;
                if (runningCount == 0) continue;
                stoppedResources.push({
                    type: "ecs",
                    status: "STOPPED",
                    lastActivity: Math.floor(Date.now() / 1000),
                    desired: runningCount
                })
                const updateCommand = new UpdateServiceCommand({
                    cluster: clusterName,
                    service: serviceName,
                    desiredCount: 0,
                });
                await ecsClient.send(updateCommand);
                info(`Update command issued to set desired tasks to 0 for service ${serviceName} in cluster ${clusterName}.`);
            }
        }
        return stoppedResources;
    } catch (error) {
        setFailed(`Error updating ECS service ${serviceName} in cluster ${clusterName}: ${error.message}`);
    }
}


function isECSService(resourceARN: string): boolean {
    if (!resourceARN.startsWith("arn:aws:ecs:")) return false;
    const arnParts = resourceARN.split(':');
    const clusterAndService = arnParts[5].split('/');
    return clusterAndService[0].toLocaleLowerCase() == "service"
}
function parseECSServiceArn(serviceArn: string): ServiceParams {
    const arnParts = serviceArn.split(':');
    const clusterAndService = arnParts[5].split('/');
    const clusterName = clusterAndService[1];
    const serviceName = clusterAndService[2];
    return { clusterName, serviceName };
}