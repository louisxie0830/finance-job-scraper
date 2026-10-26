# syntax=docker/dockerfile:1

# Builder stage: compile TypeScript, then keep production dependencies only.
FROM node:24-slim AS builder
WORKDIR /workspace

# The headless browser is installed in the runtime stage, not by Puppeteer's postinstall.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src/
# PM2 (optional dependency) is not needed in a container: Docker/Render restart the process.
RUN npm run build && npm prune --omit=dev --omit=optional --no-audit --no-fund

# Runtime stage
FROM node:24-slim
WORKDIR /workspace

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/opt/puppeteer

COPY --from=builder /workspace/node_modules ./node_modules/
COPY --from=builder /workspace/dist ./dist/
COPY package.json ./

# chrome-headless-shell (the version Puppeteer is built for) plus only the system libraries it
# needs, instead of the full Google Chrome package and its fonts (unzip is only for the download). tini runs as PID 1 to forward
# signals and reap Chrome's child processes.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates unzip \
    && npx puppeteer browsers install chrome-headless-shell --install-deps \
    && apt-get purge -y unzip \
    && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/*

# App files stay owned by root (read-only for the app user); only logs/ is writable.
RUN mkdir -p logs && chown node:node logs
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
