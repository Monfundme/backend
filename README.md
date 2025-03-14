# MonFundMe Backend Server

Backend server for managing MonFundMe campaigns using Firebase. This server handles campaign queuing, status management, and processing.

## Features

- Queue new campaigns
- Process queued campaigns (max 10 at a time)
- Update campaign statuses
- Retrieve campaigns by status
- Firebase integration for data persistence
- Input validation
- Error handling
- CORS support

## Prerequisites

- Node.js (v14 or higher)
- npm
- Firebase Admin SDK credentials

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4000
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   ```
4. Replace the Firebase configuration values with your actual Firebase Admin SDK credentials

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Campaigns

- `POST /api/campaigns/queue` - Add a new campaign to the queue
  - Required fields: title, description, goal, campaignOwner

- `POST /api/campaigns/process-queue` - Move up to 10 campaigns from queue to pending

- `PATCH /api/campaigns/:campaignId/status` - Update campaign status
  - Required field: status (approved, rejected, or completed)

- `GET /api/campaigns/status/:status` - Get campaigns by status
  - Status options: queued, pending, approved, rejected, completed

### Health Check

- `GET /health` - Check server status

## Error Handling

The server includes comprehensive error handling for:
- Invalid input validation
- Firebase operation failures
- Server errors

## Security

- Input validation using express-validator
- Firebase Admin SDK authentication
- CORS configuration
- Environment variables for sensitive data 