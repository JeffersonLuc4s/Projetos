FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /data

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
