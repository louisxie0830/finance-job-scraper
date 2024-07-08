# Use a more focused base image
FROM node:20-slim as builder

WORKDIR /workspace

# Combine update, install and cleanup to reduce layer size and ensure all actions are in one layer
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

# Using node slim again to ensure only necessary packages are installed
FROM node:20-slim
WORKDIR /workspace

# Only install necessary runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgconf-2-4 \
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
    wget \
    libxshmfence1 \
    libgbm1 \
    libpango1.0-0 \
    libcairo2 \
    libxkbcommon0 \
    libxshmfence-dev \
    libgbm-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv

# Install Puppeteer
RUN npm install puppeteer@22.12.1

# Install Chrome
RUN npx puppeteer browsers install chrome

# Copy only necessary files
COPY --from=builder /workspace/node_modules node_modules/
COPY ./ecosystem.config.cjs .
COPY ./package.json .
COPY ./src src/
COPY ./error.log src/
COPY ./error.log .
COPY ./combined.log .
COPY ./combined.log src/

EXPOSE 3000

CMD ["npm", "run", "run-prod"]