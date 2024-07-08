# 使用更专注的基础映像
FROM node:20-slim as builder

WORKDIR /workspace

# 结合更新、安装和清理以减少层大小并确保所有操作在一层中完成
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

# 使用 node slim 以确保仅安装必要的软件包
FROM node:20-slim
WORKDIR /workspace

# 安装必要的运行时依赖项，包括 libdbus-1-3 和 libdrm2
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

# 安装 Puppeteer
RUN npm install puppeteer@22.12.1

# 安装 Chrome
RUN npx puppeteer browsers install chrome

# 复制必要的文件
COPY --from=builder /workspace/node_modules ./node_modules/
COPY ./ecosystem.config.cjs .
COPY ./package.json .
COPY ./src ./src/
COPY ./error.log ./src/
COPY ./error.log .
COPY ./combined.log .
COPY ./combined.log ./src/

EXPOSE 3000

# udp port
EXPOSE 36978/udp
EXPOSE 47295/udp
EXPOSE 35846/udp
EXPOSE 36562/udp
EXPOSE 54328/udp

CMD ["npm", "run", "run-prod"]