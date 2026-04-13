# 🤖 Anime Deals Bot

Bot 100% automático de promoções de anime/mangá para Telegram com links de afiliado.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRON SCHEDULER                          │
│         (08h / 12h / 18h / 21h / 00h) — America/Sao_Paulo      │
└────────────────────────┬────────────────────────────────────────┘
                         │ addCollectJob()
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS + BULLMQ QUEUES                        │
│   collect queue ──► collect worker                              │
│   publish queue ──► publish worker                              │
└────────┬────────────────────────────────────┬───────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌────────────────────┐
│  COLLECT WORKER │                  │  PUBLISH WORKER    │
│                 │                  │                    │
│  ┌───────────┐  │                  │  Telegram Bot API  │
│  │  Amazon   │  │                  │  sendPhoto()       │
│  │  Coletor  │  │                  │  sendMessage()     │
│  └───────────┘  │                  └──────────┬─────────┘
│  ┌───────────┐  │                             │
│  │  ML       │  │                             ▼
│  │  Coletor  │  │                  ┌────────────────────┐
│  └───────────┘  │                  │  SQLite Database   │
│       │         │                  │  posts + metrics   │
│       ▼         │                  └────────────────────┘
│  ┌───────────┐  │
│  │  FILTER   │  │
│  │ desconto  │  │
│  │ rating    │  │
│  │ anti-spam │  │
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │  SCORER   │  │
│  │ 0–100 pts │  │
│  │ normal/   │  │
│  │ boa/insana│  │
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │ COPY GEN  │  │
│  │ Claude AI │  │
│  │ + template│  │
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │ AFFILIATE │  │
│  │ tag + bit.ly│ │
│  └───────────┘  │
└─────────────────┘
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Telegram | Grammy |
| Scraping | Playwright (fallback Amazon) |
| HTTP | Axios |
| Banco | SQLite (better-sqlite3) |
| Filas | BullMQ + Redis |
| Cron | node-cron |
| IA (copy) | Claude Haiku via Anthropic SDK |
| Logs | Winston |

## Estrutura de Pastas

```
anime-deals-bot/
├── src/
│   ├── collectors/
│   │   ├── amazon.ts          # PAAPI v5 + scraping fallback
│   │   ├── mercadolivre.ts    # API pública do ML
│   │   └── types.ts           # Tipos + keywords de anime
│   ├── filters/
│   │   └── deal-filter.ts     # Regras de negócio (desconto, rating, spam)
│   ├── scoring/
│   │   └── deal-scorer.ts     # Algoritmo de pontuação 0–100
│   ├── copy/
│   │   └── copy-generator.ts  # IA + templates de fallback
│   ├── affiliate/
│   │   └── link-manager.ts    # Tags de afiliado + bit.ly
│   ├── telegram/
│   │   └── publisher.ts       # Envio de mensagens + comandos
│   ├── queue/
│   │   ├── queues.ts          # Definição das filas BullMQ
│   │   └── workers/
│   │       ├── collect.worker.ts
│   │       └── publish.worker.ts
│   ├── scheduler/
│   │   └── cron.ts            # Agendamento dos horários peak
│   ├── metrics/
│   │   └── tracker.ts         # Dashboard de estatísticas
│   ├── database/
│   │   ├── schema.ts          # Migrations SQLite
│   │   └── queries.ts         # Queries tipadas
│   └── utils/
│       └── logger.ts          # Winston logger
├── data/                      # SQLite database (gitignore)
├── logs/                      # Arquivos de log (gitignore)
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 20+
- Redis rodando (ou Docker)

### 2. Instalar dependências

```bash
cd anime-deals-bot
npm install
npx playwright install chromium  # Apenas se usar scraping Amazon
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com seus tokens
```

**Mínimo necessário para funcionar:**
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHANNEL_IDS=-1001234567890
REDIS_URL=redis://localhost:6379
```

### 4. Criar o bot no Telegram

1. Abra o [@BotFather](https://t.me/BotFather)
2. `/newbot` → escolha um nome
3. Copie o token para `TELEGRAM_BOT_TOKEN`
4. Adicione o bot como **administrador** no seu canal
5. Pegue o ID do canal: encaminhe uma mensagem para [@userinfobot](https://t.me/userinfobot)

### 5. Rodar Redis com Docker

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 6. Iniciar o bot

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build && npm start

# Com coleta imediata ao iniciar
COLLECT_ON_START=true npm run dev
```

## Afiliados

### Amazon

1. Cadastre-se no [Programa de Afiliados Amazon Brasil](https://associados.amazon.com.br/)
2. Configure `AMAZON_AFFILIATE_TAG=seutag-20`
3. (Opcional) Para PAAPI: solicite acesso e configure `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG`

### Mercado Livre

1. Cadastre-se no [Mercado Livre Afiliados](https://www.mercadolivre.com.br/afiliados)
2. Configure `MERCADOLIVRE_AFFILIATE_ID=seuId`

## Como subir em produção

### Opção 1: VPS (recomendado — Railway, DigitalOcean, Hetzner)

```bash
# No servidor
git clone <seu-repo>
cd anime-deals-bot
cp .env.example .env
# Edite o .env

docker-compose up -d
```

### Opção 2: Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Adicione um serviço Redis
3. Configure as variáveis de ambiente no dashboard
4. Deploy automático

### Opção 3: Render

1. Crie um Web Service no [Render](https://render.com)
2. Crie um Redis instance
3. Configure as env vars
4. Build command: `npm run build`
5. Start command: `npm start`

> ⚠️ **Nota:** Vercel **não** é ideal para este projeto pois exige processo contínuo (workers + cron). Use VPS ou Railway.

## Algoritmo de scoring

```
Score (0-100) = desconto (0-40) + popularidade (0-40) + menor preço (0-20) + viral (0-10)

┌──────────────────────────────────────────────────┐
│ Score ≥ 70 → "🔥 OFERTA INSANA"                  │
│ Score ≥ 45 → "💥 BOA OFERTA"                     │
│ Score < 45 → "🛒 PROMOÇÃO"                       │
└──────────────────────────────────────────────────┘
```

## Exemplo de post gerado

```
🔥 OFERTA INSANA!

🗿 Figure Gojo Satoru - Jujutsu Kaisen - Banpresto

💸 De R$ 199,00 por apenas R$ 129,00
🏷️ 35% OFF
📉 Menor preço dos últimos 90 dias!
⭐ 4.8/5 — 2.347 avaliações
Aprovado pelos otakus! ✅

⚡ Oferta por tempo limitado!

👉 https://bit.ly/abc123
```

## Melhorias futuras

- [ ] Painel web com Next.js para visualizar métricas
- [ ] Webhook para rastrear cliques (redirect server)
- [ ] A/B test automático com aprendizado por CTR
- [ ] Notificação de restock de produtos esgotados
- [ ] Suporte a Shopee e Amazon Japonesa
- [ ] Integração com histórico de preços (Keepa API)
- [ ] Bot que responde perguntas dos assinantes
- [ ] Categorias separadas por canal (ex: canal só de mangá, canal só de figures)
