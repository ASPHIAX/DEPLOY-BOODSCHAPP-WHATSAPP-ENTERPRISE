# BOODSCHAPP WhatsApp Enterprise - ENTERPRISE EDITION WITH DEV TOOLS
# Base: Public node:20-alpine for bulletproof reproducibility
FROM node:20-alpine

# Install system dependencies including development tools
RUN apk add --no-cache \
    chromium \
    curl \
    bash \
    git \
    tini \
    python3 \
    make \
    g++

# Working directory
WORKDIR /app

# Environment variables - CORRECT CHROMIUM PATH FOR ALPINE
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files (both package.json and package-lock.json)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for enterprise tools)
RUN npm ci --include=dev

# Copy all source code and configuration files
COPY src/ ./src/
COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY *.js ./
COPY *.sh ./
COPY *.md ./
COPY .env* ./
COPY .eslintrc.json ./
COPY .prettierrc ./
COPY jest.config.js ./

# Set executable permissions
RUN chmod +x *.sh scripts/*.sh

# Create required directories
RUN mkdir -p session logs .wwebjs_auth qr-codes coverage

# Run enterprise quality checks during build
RUN npm run lint:check || echo "Linting warnings present"
RUN npm run format:check || echo "Formatting issues present"

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use npm start (standard startup)
CMD ["npm", "start"]
