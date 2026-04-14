FROM node:20-slim

# Dependências do Chromium para o Playwright
RUN apt-get update && apt-get install -y \
    chromium \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Playwright usa o Chromium do sistema (não baixa separado)
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Volume para persistir o banco SQLite entre deploys
RUN mkdir -p /data

CMD ["npx", "tsx", "src/index.ts"]
