FROM node:20-alpine

# Playwright deps
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser

CMD ["node", "dist/index.js"]
