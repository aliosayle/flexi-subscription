#!/bin/bash

# Stop any running instances
pm2 stop flexi-gym-server || true

# Navigate to project directory
cd /path/to/flexi-subscription

# Pull latest changes
git pull

# Install dependencies for server
cd server
npm install --production

# Use production .env file
cp .env.production .env

# Build the frontend
cd ..
npm install
npm run build

# Start the server using PM2
cd server
pm2 start server.js --name "flexi-gym-server"

# Display status
pm2 status

echo "Deployment completed successfully!" 