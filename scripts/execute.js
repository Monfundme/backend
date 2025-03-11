const { initializeFirebase } = require("../src/config/firebase");
const { processQueuedCampaigns } = require("../src/services/voteService");

const db = initializeFirebase();

const main = async () => {
    try {
        console.log("Moving Queued campaigns... ")
        const res = await processQueuedCampaigns(db);
        console.log("res....", res)

    } catch (error) {
        console.log("error...", error)
    }

}

main();