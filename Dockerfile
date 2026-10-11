# ==============================================================================
# ENCALM PROJECT DASHBOARD - PRODUCTION DOCKERFILE
# Multi-stage build for minimal image size, high security, and fast cold-starts
# ==============================================================================

# Stage 1: Build the client assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for node native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build Vite frontend bundle
RUN npm run build:client

# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Ensure runtime dependencies for SQLite native bindings
RUN apk add --no-cache sqlite dumb-init

ENV NODE_ENV=production
ENV PORT=5000
ENV API_PORT=5000

# Install production dependencies only
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend source code and seed files
COPY server ./server
COPY tsconfig.json ./

# Create persistent storage directory for SQLite database and photo uploads
RUN mkdir -p /app/server/data/uploads

# Expose HTTP port
EXPOSE 5000

# Volume declaration for data persistence
VOLUME ["/app/server/data"]

# Use dumb-init to properly forward SIGTERM/SIGINT signals to Node
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Launch Express production server
CMD ["npx", "tsx", "server/src/index.ts"]
