#!/bin/bash
set -e

# Configuration
APP_DIR="/path/to/flexi-subscription"
SERVER_NAME="flexi-gym-server"

echo "Starting deployment process..."

# Function to handle errors
handle_error() {
  echo "Error occurred on line $1"
  exit 1
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Check Node.js version and install compatible version if needed
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 || echo "0.0.0")
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

# We need at least Node.js v16 for Vite
if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
  echo "Node.js version $NODE_VERSION is not compatible. Installing Node.js v18..."
  
  # Install Node.js 18.x
  echo "Installing Node.js 18.x..."
  # Update the repository sources
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  
  echo "Node.js $(node -v) installed successfully"
fi

# Stop any running instances
if pm2 list | grep -q "$SERVER_NAME"; then
  echo "Stopping existing server instance..."
  pm2 stop $SERVER_NAME || true
else
  echo "No existing server instance found."
fi

# Navigate to project directory
echo "Navigating to project directory..."
cd $APP_DIR

# Pull latest changes
echo "Pulling latest changes from git repository..."
git pull

# Fix optional chaining in server.js for older Node.js versions
echo "Checking for optional chaining in server.js..."
if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
  echo "Fixing optional chaining in server.js for compatibility..."
  # Replace ?.
  sed -i 's/\([a-zA-Z0-9_\.]\+\)?\./$1 \&\& $1./g' server/server.js
  echo "Fixed optional chaining in server.js"
fi

# Server setup
echo "Setting up server..."
cd server
npm install --production

# Copy production environment file
echo "Setting up production environment..."
cp .env.production .env

# Build the frontend
echo "Building frontend..."
cd ..
# Clear node_modules to avoid any conflicts
rm -rf node_modules
npm ci # Using npm ci for cleaner installs
npm run build

# Start the server using PM2
echo "Starting server with PM2..."
cd server
pm2 start server.js --name "$SERVER_NAME"

# Display status
echo "Deployment completed. Current PM2 status:"
pm2 status

echo "Deployment completed successfully! Server running at http://161.97.177.233:5000" 