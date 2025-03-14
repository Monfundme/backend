const admin = require('firebase-admin');
const { Contract } = require('ethers');
const cron = require('node-cron');
const { registerProposalOnChain, executeProposalOnChain } = require('./web3Service');

// Collection names
const QUEUE_COLLECTION = 'queue_campaigns';
const PENDING_COLLECTION = 'pending_campaigns';
const ACTIVE_COLLECTION = 'active_campaigns';
const REJECTED_COLLECTION = 'rejected_campaigns';

const addToQueue = async (db, proposalId, campaignData) => {
  try {
    // Check if proposalId already exists in queue
    const queueSnapshot = await db
      .collection(QUEUE_COLLECTION)
      .where('proposalId', '==', proposalId)
      .get();

    if (!queueSnapshot.empty) {
      return { success: false, message: 'Campaign with this proposalId already exists in queue' };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const campaign = {
      proposalId,
      ...campaignData,
      status: 'queued',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.collection(QUEUE_COLLECTION).add(campaign);
    return { success: true, message: 'Campaign added to queue successfully' };
  } catch (error) {

    console.error('Error adding campaign to queue:', error);
    return { success: false, message: 'Error adding campaign to queue' };

  }
};

const processPendingCampaigns = async (db, provider, contractAddress, voteExecutorABI) => {
  const batch = db.batch();
  try {
    // Get all pending campaigns
    const pendingSnapshot = await db
      .collection(PENDING_COLLECTION)
      .where('status', '==', 'pending')
      .get();

    if (pendingSnapshot.empty) {
      return { success: true, message: 'No pending campaigns to resolve' };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const contract = new Contract(contractAddress, voteExecutorABI, provider);

    // Process each campaign
    for (const doc of pendingSnapshot.docs) {
      const campaign = { id: doc.id, ...doc.data() };

      try {
        const voteResult = await contract.getVoteResult(campaign.id);
        const hasPassedVoting = voteResult.passed;

        //Execute the campaign to the blockchain
        await executeProposalOnChain(campaign);

        // If the vote has passed, set the campaign to active
        if (hasPassedVoting) {
          await contract.execResult(campaign.id);
          const activeRef = db.collection(ACTIVE_COLLECTION).doc(campaign.id);
          batch.set(activeRef, {
            ...campaign,
            status: 'active',
            votePassed: true,
            resolvedAt: timestamp,
            updatedAt: timestamp
          });

        } else {
          const rejectedRef = db.collection(REJECTED_COLLECTION).doc(campaign.id);
          batch.set(rejectedRef, {
            ...campaign,
            status: 'rejected',
            votePassed: false,
            resolvedAt: timestamp,
            updatedAt: timestamp
          });
        }
        batch.delete(doc.ref);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        batch.update(doc.ref, {
          status: 'error',
          error: error.message,
          updatedAt: timestamp
        });
      }
    }

    await batch.commit();
    return {
      success: true,
      message: `Processed ${pendingSnapshot.size} pending campaigns`
    };
  } catch (error) {
    console.error('Error resolving campaigns:', error);
    return { success: false, message: 'Error resolving campaigns' };
  }
};

const recordVote = async (db, campaignId, address, voteChoice) => {
  const campaignRef = db.collection(PENDING_COLLECTION).doc(campaignId);
  const campaign = await campaignRef.get();
  if (!campaign.exists) {
    throw new Error('Campaign not found');
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const campaignData = campaign.data();

  // Check if votes object exists, if not initialize it
  if (!campaignData.votes) {
    await campaignRef.update({
      votes: {
        [address]: voteChoice
      },
      updatedAt: timestamp
    });
  } else {
    await campaignRef.update({
      [`votes.${address}`]: voteChoice,
      updatedAt: timestamp
    });
  }

  return { success: true, message: 'Vote recorded successfully' };
};

const processQueuedCampaigns = async (db) => {
  const batch = db.batch();
  try {
    const queueSnapshot = await db
      .collection(QUEUE_COLLECTION)
      .orderBy('createdAt')
      .limit(10)
      .get();

    if (queueSnapshot.empty) {
      return { success: true, message: 'No campaigns in queue' };
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    for (const doc of queueSnapshot.docs) {

      // Register proposal on chain
      await registerProposalOnChain(doc.data());

      const campaignData = doc.data();
      const pendingRef = db.collection(PENDING_COLLECTION).doc();
      batch.set(pendingRef, {
        ...campaignData,
        status: 'pending',
        queuedAt: campaignData.createdAt,
        updatedAt: timestamp,
      });
      batch.delete(doc.ref);

    }

    await batch.commit();

    return {
      success: true,
      message: `Moved ${queueSnapshot.size} campaigns to pending`
    };
  } catch (error) {
    console.error('Error moving campaigns to pending:', error);
    return { success: false, message: 'Error moving campaigns to pending' };
  }
};

// Get all campaigns by status
const getCampaignsByStatus = async (db, status) => {
  try {
    const collection = status === 'queued' ? QUEUE_COLLECTION : PENDING_COLLECTION;
    const snapshot = await db
      .collection(collection)
      .where('status', '==', status)
      .orderBy('createdAt')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return { success: false, message: 'Error fetching campaigns' };
  }
};

// Initialize the cron job for campaign processing
const initializeCampaignProcessor = (db, provider, contractAddress, voteExecutorABI) => {
  // Run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily campaign processing...');
    try {
      // Process queued campaigns first
      await processQueuedCampaigns(db);

      // Then process pending campaigns
      await processPendingCampaigns(db, provider, contractAddress, voteExecutorABI);

      console.log('Daily campaign processing completed successfully');
    } catch (error) {
      console.error('Error in daily campaign processing:', error);
      return { success: false, message: 'Error in daily campaign processing' };
    }
  });

  console.log('Campaign processor initialized');
};

module.exports = {
  addToQueue,
  processPendingCampaigns,
  processQueuedCampaigns,
  initializeCampaignProcessor,
  getCampaignsByStatus,
  recordVote
}; 