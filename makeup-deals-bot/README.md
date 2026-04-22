# 💄 Makeup Deals Bot

Bot de promoções de maquiagem, skincare, cabelo e perfumaria para Telegram com afiliados via **Rakuten Advertising**.

Coleta ofertas na **Beleza na Web** e **Ocean/Océane**, pontua as melhores, gera copy persuasiva com IA e publica automaticamente em canais do Telegram.

## ✨ Features

- Coleta 3x por dia (10h / 16h / 22h Brasília) via cron
- Scraping com Playwright (Chromium headless)
- Filtros: desconto mínimo por categoria, anti-spam, menor preço histórico
- Pontuação 0–100 (desconto + rating + menor preço + marca viral)
- Copy persuasiva via Claude (fallback para templates)
- Publicação na hora via fila em memória (sem Redis)
- Banco SQLite local ou Turso remoto
- Links encurtados via is.gd

## 🔧 Stack

- Node.js + TypeScript (`tsx`)
- Playwright (scraping)
- grammy (Telegram Bot API)
- node-cron (agendamento)
- @libsql/client (SQLite / Turso)
- Anthropic SDK (copy com IA)

## 🚀 Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # preencha as variáveis
npm run dev
```

## 🔑 Variáveis de ambiente

Ver [.env.example](.env.example). Principais:

- `TELEGRAM_BOT_TOKEN` — token do @BotFather
- `TELEGRAM_CHANNEL_IDS` — IDs dos canais (separados por vírgula)
- `RAKUTEN_CLIENT_ID` / `RAKUTEN_CLIENT_SECRET` — credenciais OAuth do app Rakuten
- `RAKUTEN_SID` — SID da publisher account
- `RAKUTEN_ADVERTISER_BELEZA` / `RAKUTEN_ADVERTISER_OCEAN` — IDs dos advertisers aprovados
- `ANTHROPIC_API_KEY` — para copy com IA (opcional, cai no template se vazio)

## 🏗️ Estrutura

```
src/
  collectors/       # Scrapers Beleza na Web, Ocean + Rakuten Deep Link
  filters/          # Filtros anti-spam, desconto mínimo
  scoring/          # Pontuação 0–100
  copy/             # Geração de copy (IA + template)
  affiliate/        # Rakuten Deep Link + is.gd
  telegram/         # Publisher grammy
  queue/            # Filas em memória (collect + publish)
  scheduler/        # node-cron
  database/         # Schema + queries libsql
```

## 📦 Deploy

- **Railway** — usa `railway.toml`
- **Docker** — `docker compose up -d`
- **PM2** — `pm2 start ecosystem.config.js`

## 📝 Licença

Uso pessoal.
