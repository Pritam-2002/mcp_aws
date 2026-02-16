import { listLogGroups, queryLogs } from "../aws/logsService.js";

async function runTest() {
    console.log("Testing listLogGroups...");
    try {
        const groups = await listLogGroups(5);
        console.log("Found log groups:", groups);
        if (groups.length > 0) {
            const groupName = groups[0]!;
            console.log(`Querying first group: ${groupName}`);
            const result = await queryLogs(groupName, undefined, 5, 2);
            console.log("Query result:", JSON.stringify(result, null, 2));
        } else {
            console.log("No log groups found to query logs.");
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTest();
