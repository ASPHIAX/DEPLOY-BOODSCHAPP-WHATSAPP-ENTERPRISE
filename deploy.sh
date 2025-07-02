#!/bin/bash

# BOODSCHAPP WhatsApp MCP Deployment Script

set -e

echo '🚀 Deploying BOODSCHAPP WhatsApp MCP Server...'

# Configuration
CONTAINER_NAME='BOODSCHAPP-WHATSAPP-MCP'
IMAGE_NAME='boodschapp-whatsapp-mcp'
PORT='19212'
NETWORK='boss-dev-network'
MONGODB_URI='mongodb://admin:admin@BOSS-MONGODB-DEV:27017/boodschapp?authSource=admin'

# Build Docker image
echo '🔨 Building Docker image...'
docker build -t $IMAGE_NAME .

# Stop and remove existing container if it exists
echo '🛑 Stopping existing container...'
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run new container
echo '🏃 Starting WhatsApp MCP server...'
docker run -d \
  --name $CONTAINER_NAME \
  --network $NETWORK \
  -p $PORT:8080 \
  -e MONGODB_URI=$MONGODB_URI \
  -e PORT=8080 \
  -e LOG_LEVEL=info \
  $IMAGE_NAME

# Check if container is running
echo '✅ Checking container status...'
docker ps | grep $CONTAINER_NAME

echo
echo '✅ BOODSCHAPP WhatsApp MCP Server deployed!'
echo
echo '📝 IMPORTANT NOTES:'
echo '1. To use the WhatsApp service:'
echo '   docker exec -it BOODSCHAPP-WHATSAPP-MCP sh -c "cd /app && node src/index.js"'
echo '   Then scan the QR code with your WhatsApp mobile app'
echo
echo '2. The service is accessible on port: '$PORT
echo '3. MongoDB connection: '$MONGODB_URI
echo
echo '🔧 To check logs:'
echo '   docker logs BOODSCHAPP-WHATSAPP-MCP'
echo
echo '📱 WhatsApp Integration:'
echo '   - Send receipt images to the connected WhatsApp number'
echo '   - Bot will respond in Dutch'
echo '   - Images are saved to MongoDB for processing'
echo
