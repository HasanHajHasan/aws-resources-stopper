import { getInput, setFailed, setOutput, info } from "@actions/core";
import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from "@aws-sdk/client-ecs";

export async function startECSServiceTasks(region: string, resourcesARN: string[]) {
    const ecsClient = new ECSClient({
        region: region,
    }); // Replace with your desired region
    let clusterName: string;
    let serviceName: string;
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
                if(runningCount == 0) break;
                const updateCommand = new UpdateServiceCommand({
                    cluster: clusterName,
                    service: serviceName,
                    desiredCount: 0,
                });
                // await ecsClient.send(updateCommand);
                info(`Update command issued to set desired tasks to 0 for service ${serviceName} in cluster ${clusterName}.`);

            }
        }
    } catch (error) {
        setFailed(`Error updating ECS service ${serviceName} in cluster ${clusterName}: ${error.message}`);
    }
}

interface ServiceParams {
    clusterName: string;
    serviceName: string;
}


function isECSService(resourceARN: string):boolean{
    if(!resourceARN.startsWith("arn:aws:ecs:")) return false;
    const arnParts = resourceARN.split(':');
    const clusterAndService = arnParts[5].split('/');
    return clusterAndService[0].toLocaleLowerCase() == "service"
}
function parseECSServiceArn(serviceArn: string): ServiceParams {
    const arnParts = serviceArn.split(':');    
    const clusterAndService = arnParts[5].split('/');
    const clusterName = clusterAndService[1]; // Cluster name is after "cluster/"
    const serviceName = clusterAndService[2]; // Service name is after "service/"
    return { clusterName, serviceName };
}