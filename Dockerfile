# Multi-stage Dockerfile for auth-service
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies (including dev) so Prisma can generate client
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Provide DATABASE_URL at build time so Prisma can generate the client
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@auth-postgres:5432/shipops_db"}

# Generate Prisma client (requires DATABASE_URL available)
RUN npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy app files and node_modules from builder
COPY --from=builder /app .

EXPOSE 5001
CMD ["node", "server.js"]
