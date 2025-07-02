# BOODSCHAPP WhatsApp Enterprise - PORCELAIN COPY FROM GITHUB
# Base: Public node:20-alpine for bulletproof reproducibility
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache     chromium     curl     bash     git     tini

# Working directory
WORKDIR /app

# Environment variables - CORRECT CHROMIUM PATH FOR ALPINE
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all source code from GitHub porcelain copy
COPY src/ ./src/
COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY *.js ./
COPY *.sh ./
COPY *.md ./
COPY .env* ./

# Set executable permissions
RUN chmod +x *.sh scripts/*.sh

# Create required directories
RUN mkdir -p session logs .wwebjs_auth qr-codes

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3   CMD curl -f http://localhost:3000/api/health || exit 1

# Use npm start (standard startup)
CMD ["npm", "start"]
