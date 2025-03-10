require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { initializeFirebase } = require('./config/firebase');
const voteService = require('./services/voteService');
const voteRoutes = require('./routes/voteRoutes');
const voteExecutorABI = require('../abi/voteExecutorABI.json');
const campaignRoutes = require('./routes/campaignRoutes');
const app = express();
const port = process.env.PORT || 4000;

// Initialize Firebase
const db = initializeFirebase();

// Initialize blockchain provider and contract
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const voteContract = new ethers.Contract(
  process.env.VOTE_EXECUTOR_ADDRESS,
  voteExecutorABI,
  wallet
);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || `http://localhost:${port}`,
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Initialize campaign processor
voteService.initializeCampaignProcessor(
  db,
  provider,
  process.env.VOTE_EXECUTOR_ADDRESS,
  voteExecutorABI
);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/votes', voteRoutes(db, voteService, voteContract));
app.use('/api/campaigns', campaignRoutes);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware`
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 