# syntax=docker/dockerfile:1

# Builder stage: compile TypeScript, then keep production dependencies only.
FROM node:24-slim AS builder
WORKDIR /workspace

# Chrome comes from the system package below, so skip Puppeteer's download.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src/
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

# Final stage
FROM node:24-slim
WORKDIR /workspace

# Install Google Chrome (amd64) from Google's apt repo; apt resolves its runtime libraries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub \
       | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable fonts-liberation fonts-noto-cjk \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/google-chrome

# App files stay owned by root (read-only for the app user); only logs/ is writable.
COPY --from=builder /workspace/node_modules ./node_modules/
COPY --from=builder /workspace/dist ./dist/
COPY package.json ecosystem.config.cjs ./

RUN mkdir -p logs && chown node:node logs
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["./node_modules/.bin/pm2-runtime", "start", "ecosystem.config.cjs"]
