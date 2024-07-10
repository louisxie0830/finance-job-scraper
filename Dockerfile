# Builder stage
FROM node:20-slim as builder

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    npm set progress=false && \
    npm config set depth 0

COPY package.json package-lock.json ./
RUN npm ci

# Final stage
FROM node:20-slim
WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y wget gnupg xvfb dbus-x11 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get install -y \
    libvips \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libpango-1.0-0 \
    libgcc1 \
    libdrm2 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    lsb-release \
    xdg-utils \
    libxshmfence1 \
    libgbm1 \
    libpango1.0-0 \
    libcairo2 \
    libxkbcommon0 \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv


COPY --from=builder /workspace/node_modules ./node_modules/
COPY ./ecosystem.config.cjs .
COPY ./package.json .
COPY ./src ./src/
COPY ./combined.log .
COPY ./combined.log ./src/
COPY ./start.sh ./

RUN chmod +x start.sh

USER root

EXPOSE 3000


CMD ["./start.sh"]