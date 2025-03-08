const express = require('express');
const { isAddress } = require('ethers');
const router = express.Router();

// Validation middleware
const validateCampaign = (req, res, next) => {
  const { title, description, goal, userId } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Valid description is required' });
  }
  if (!goal || isNaN(goal) || goal <= 0) {
    return res.status(400).json({ error: 'Valid goal amount is required' });
  }
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }

  next();
};

const validateVote = (req, res, next) => {
  const { campaignId, vote, voterAddress } = req.body;
  
  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ error: 'Valid campaignId is required' });
  }
  if (typeof vote !== 'boolean') {
    return res.status(400).json({ error: 'Vote must be true (approve) or false (reject)' });
  }
  if (!voterAddress || !isAddress(voterAddress)) {
    return res.status(400).json({ error: 'Valid Ethereum address is required' });
  }

  next();
};

module.exports = (db, campaignService, voteContract) => {
  // Create new campaign (adds to queue)
  router.post('/create', validateCampaign, async (req, res) => {
    try {
      const result = await campaignService.addToQueue(db, req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vote on a pending campaign
  router.post('/vote', validateVote, async (req, res) => {
    try {
      const { campaignId, vote, voterAddress } = req.body;

      // Check if campaign exists and is pending
      const campaign = await db
        .collection('pending_campaigns')
        .doc(campaignId)
        .get();

      if (!campaign.exists) {
        return res.status(404).json({ error: 'Campaign not found or not in pending state' });
      }

      // Update campaign document with vote information
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      await campaign.ref.update({
        [`votes.${voterAddress}`]: vote,
        updatedAt: timestamp
      });

      res.json({ 
        success: true,
        message: 'Vote recorded successfully'
      });
      
    } catch (error) {
      console.error('Error processing vote:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all pending campaigns
  router.get('/pending', async (req, res) => {
    try {
      const campaigns = await campaignService.getCampaignsByStatus(db, 'pending');
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching pending campaigns:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific campaign details
  router.get('/:campaignId', async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      const campaign = await db
        .collection('pending_campaigns')
        .doc(campaignId)
        .get();

      if (!campaign.exists) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // If campaign exists, get its voting status from blockchain
      const voteResult = await voteContract.getVoteResult(campaignId);

      res.json({
        id: campaign.id,
        ...campaign.data(),
        currentVoteStatus: voteResult
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};