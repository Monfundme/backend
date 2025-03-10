const express = require('express');
const router = express.Router();
const axios = require('axios');

// GraphQL endpoint
const ENVIO_ENDPOINT = 'http://localhost:8080/v1/graphql';

// Helper function to make GraphQL queries
async function queryEnvio(query, variables = {}) {
  try {
    const response = await axios.post(ENVIO_ENDPOINT, {
      query,
      variables
    });
    return response.data.data;
  } catch (error) {
    console.error('GraphQL query error:', error);
    throw new Error('Failed to fetch data from indexer');
  }
}

// Get paginated campaigns
router.get('/', async (req, res) => {
  try {
    console.log("Querying campaigns...");
    // const page = parseInt(req.query.page) || 1;
    // const skip = (page - 1) * 25;

    const query = `
      query MyQuery {
       Campaign {
        campaignId
        createdAt
        currentAmount
        deadline
        description
        id
      }
    }`;

    const data = await queryEnvio(query);
    res.json(data.campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

// Get account details and associated campaigns
router.get('/account/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const query = `
      query GetAccount($address: String!) {
        account(id: $address) {
          id
          totalCampaignsCreated
          campaigns {
            id
            title
            description
            goal
            status
            createdAt
          }
          votes {
            campaignId
            support
            votedAt
          }
        }
      }
    `;

    const data = await queryEnvio(query, { address });
    res.json(data.account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
