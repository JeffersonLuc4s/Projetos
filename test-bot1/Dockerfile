FROM node:20-slim

# Dependências do sistema para o Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# Instala o Chromium na versão exata que o Playwright do projeto usa
RUN npx playwright install --with-deps chromium

COPY . .

RUN mkdir -p /data

ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
