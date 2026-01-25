
# Stage 1: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
# Using npm ci for deterministic and faster builds
RUN npm ci --legacy-peer-deps

# Copy source code and build
COPY . .
COPY .env.local .env.production

# Build the application
# Disabling telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove development dependencies
# Remove development dependencies
# RUN npm prune --production

# Stage 2: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
# Copy the standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Set user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000

# Start command
CMD ["node", "server.js"]
