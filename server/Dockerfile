# syntax=docker/dockerfile:1

# ---- dependencies (production only, cached unless package files change) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The official image ships an unprivileged "node" user; never run as root.
USER node

EXPOSE 5000

# Uses the public liveness route (no DB access), via Node's built-in fetch so
# the image needs no curl/wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `node` directly (not `npm start`) so SIGTERM from `docker stop` reaches the
# app and triggers its graceful shutdown.
CMD ["node", "index.js"]
