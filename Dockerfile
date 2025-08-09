# ----------------------------
# Stage 1: Install prod deps (build native addons here)
# ----------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Toolchain for native modules (e.g., better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy manifests first for better layer caching
COPY package*.json ./

# Install only production deps (locks native builds to this layer)
RUN npm ci --omit=dev

# ----------------------------
# Stage 2: Runtime
# ----------------------------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Create an unprivileged user (node exists in node:alpine, uid ~1000)
# If you prefer explicit uid/gid, uncomment the lines below instead.
# RUN addgroup -S app && adduser -S app -G app
# USER app

# Copy node_modules built in the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Create a writable data dir for SQLite DB; ensure permissions for the node user
RUN mkdir -p /app/data && chown -R node:node /app
USER node

# Sensible defaults (override via env/compose)
ENV DB_PATH=/app/data/flightcache.db \
    POLL_INTERVAL_MS=60000

# Optional: set timezone; override at runtime
ENV TZ=Etc/UTC

# Start the app
CMD ["node", "src/index.js"]
