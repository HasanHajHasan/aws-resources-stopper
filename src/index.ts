import { getInput, setFailed, setOutput } from "@actions/core";
import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";
import { stopRDSInstances } from "./stop/stop-rds";
import { stopECSServiceTasks } from "./stop/stop-ecs";

async function getAWSResources(): Promise<void> {
    const region: string = getInput('region', { required: true });// "ap-south-1"//
    let keysString: string = getInput('keys', { required: true, trimWhitespace: true })//"Environment";//
    const valuesString: string = getInput('values', { required: true });// ' dev  '//

    console.log("keysString", keysString);
    console.log("valuesString", valuesString);


    let keys = keysString.split(",")
    for (let i = 0; i < keys.length; i++) {
        keys[i] = keys[i].trim();
        if (keys[i].length == 0) setFailed(`keys: Empty value at index ${i} is not accpeted`);

    }

    const parsedValues = valuesString.split("|");
    let tagValues: string[][] = [];
    for (let i = 0; i < parsedValues.length; i++) {
        let values = parsedValues[i].split(",");
        for (let j = 0; j < values.length; j++) {
            values[j] = values[j].trim();
            if (values[j].length == 0) setFailed(`value: Empty value at index ${i} ${j} is not accpeted`);
        }
        tagValues.push(values)
    }
    if (keys.length != tagValues.length) setFailed("Keys and Values must be of the same length");
    try {
        const resourceTagClient = new ResourceGroupsTaggingAPIClient({
            region: region,
        });
        const tagFilters = keys.map((key, index) => ({
            Key: key,
            Values: tagValues[index],
        }));
        const getResourcesCommand = new GetResourcesCommand({
            TagFilters: tagFilters,
        });
        const resourcesARN = (await resourceTagClient.send(getResourcesCommand)).ResourceTagMappingList.map((resource) => {
            return resource.ResourceARN
        });
        console.log(resourcesARN);

        // await stopRDSInstances(region,resourcesARN);
        await stopECSServiceTasks(region,resourcesARN)
    }
    catch (error) {
        setFailed(error);

    }

}

async function stopResources() {

}
getAWSResources()