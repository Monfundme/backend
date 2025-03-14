const express = require('express');
const { isAddress, toUtf8Bytes, keccak256 } = require('ethers');
const { addToQueue, recordVote, getCampaignsByStatus } = require('../services/voteService');
const router = express.Router();


// Validation middleware
const validateCampaign = (req, res, next) => {
  const { title, description, targetAmount, deadline, campaignOwner, imageUrl } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Valid description is required' });
  }
  if (!targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: 'Valid target amount is required' });
  }
  if (!deadline || isNaN(deadline) || deadline <= 0) {
    return res.status(400).json({ error: 'Valid deadline is required' });
  }
  if (!campaignOwner || typeof campaignOwner !== 'string' || campaignOwner.trim().length === 0) {
    return res.status(400).json({ error: 'Valid campaignOwner is required' });
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Valid imageUrl is required' });
  }

  next();
};

module.exports = (db) => {
  // Create new campaign (adds to queue)
  router.post('/create', validateCampaign, async (req, res) => {
    try {

      const proposalId = keccak256(toUtf8Bytes(req.body.campaignOwner + req.body.title));
      const result = await addToQueue(db, proposalId, req.body);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all pending campaigns
  router.get('/pending', async (req, res) => {
    try {
      const campaigns = await getCampaignsByStatus(db, 'pending');
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching pending campaigns:', error);
      res.status(500).json({ error: error.message });
    }
  });



  // Get all queued campaigns
  router.get('/queued', async (req, res) => {
    try {
      const campaigns = await getCampaignsByStatus(db, 'queued');
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching queued campaigns:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific campaign details
  router.get('/:campaignId', async (db, req, res) => {
    try {
      const campaignId = req.params.campaignId;
      const campaign = await db
        .collection('pending_campaigns')
        .doc(campaignId)
        .get();

      if (!campaign.exists) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const campaignData = campaign.data();
      const votes = campaignData.votes || {}; // Ensure votes object exists

      const totalVoters = Object.keys(votes).length; // Count voters
      const voteCounts = {}; // Count votes per choice

      Object.values(votes).forEach((choice) => {
        voteCounts[choice] = (voteCounts[choice] || 0) + 1;
      });

      res.json({
        id: campaign.id,
        totalVoters,
        voteCounts,
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cast a vote on a proposal
  router.post('/', async (db, req, res) => {
    try {
      const { signature, message, campaignId, voteChoice, address } = req.body;

      // Validate input
      if (!signature || !message || !campaignId || !voteChoice || !address) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: signature, message, campaignId, voteChoice, or address'
        });
      }

      // Check if voter is a allowed to vote
      const isAllowed = await verifyVoter(message, signature, address);

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to vote'
        });
      }

      // Record the vote
      const result = await recordVote(db, campaignId, address, voteChoice);

      return res.json({
        success: true,
        message: 'Vote recorded successfully',
        data: result
      });
    } catch (error) {
      console.error('Error casting vote:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing vote',
        error: error.message
      });
    }
  });

  return router;
};