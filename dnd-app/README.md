# ⚔️ Grimório do Aventureiro — D&D 5E
### Deploy: Vercel (frontend + backend) + Neon (PostgreSQL)

---

## 📁 Estrutura do projeto

```
dnd-app/
├── .env.example               ← modelo das variáveis de ambiente
├── package.json               ← dependências: express, pg, bcrypt, jwt, cors
├── vercel.json                ← config do Vercel (redireciona tudo para /api/server)
├── api/
│   └── server.js              ← entry point do Vercel (só exporta o Express)
├── server/
│   ├── index.js               ← app Express (roda local E no Vercel)
│   ├── db.js                  ← pool PostgreSQL + helpers + migrations
│   ├── auth.js                ← bcrypt + JWT
│   ├── migrate.js             ← script para criar tabelas manualmente
│   └── routes/
│       ├── authRoutes.js      ← POST /api/auth/register|login  GET /api/auth/me
│       └── characterRoutes.js ← GET|POST|PUT|DELETE /api/characters
└── public/
    ├── index.html
    ├── style.css
    ├── api.js                 ← fetch com JWT automático
    └── script.js              ← ficha + auth integrada
```

---

## 🚀 Passo a Passo Completo

---

### PASSO 1 — Criar o banco no Neon

1. Acesse **https://neon.tech** e crie uma conta gratuita

2. Clique em **"New Project"**
   - Dê um nome (ex: `grimorio-dnd`)
   - Escolha a região mais próxima (ex: `US East`)
   - Clique em **Create Project**

3. Na página do projeto, clique em **"Connection string"**

4. Copie a string no formato:
   ```
   postgresql://jeff:senha123@ep-quiet-river-abc123.us-east-2.aws.neon.tech/grimorio?sslmode=require
   ```
   > Guarde essa string — você vai precisar dela nos próximos passos

---

### PASSO 2 — Configurar o projeto localmente

1. Crie a pasta e copie todos os arquivos:
   ```
   dnd-app/
   ├── api/server.js
   ├── server/ (todos os arquivos)
   ├── public/ (todos os arquivos)
   ├── package.json
   ├── vercel.json
   └── .env.example
   ```

2. Copie o `.env.example` para `.env`:
   ```bash
   # Windows
   copy .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

3. Abra o `.env` e preencha com suas informações:
   ```env
   DATABASE_URL=postgresql://jeff:senha@ep-xxxx.neon.tech/grimorio?sslmode=require
   JWT_SECRET=cole-aqui-uma-frase-longa-e-aleatoria
   PORT=3000
   ```
   
   Para gerar um JWT_SECRET seguro, execute:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

### PASSO 3 — Instalar dependências e criar as tabelas

```bash
cd dnd-app

# Instalar pacotes (sem compilação nativa, funciona em qualquer SO)
npm install

# Criar todas as tabelas no Neon
node server/migrate.js
```

Saída esperada:
```
🔄 Conectando ao banco de dados…
✅ Migrations aplicadas com sucesso.
🎉 Banco pronto!
```

---

### PASSO 4 — Testar localmente

```bash
node server/index.js
```

Saída:
```
⚔️  Grimório do Aventureiro · D&D 5E
🌐  http://localhost:3000
📦  Banco: Neon PostgreSQL (DATABASE_URL)
✅  Servidor rodando na porta 3000
```

Abra **http://localhost:3000** e teste:
- ✅ Criar conta
- ✅ Fazer login
- ✅ Criar personagem
- ✅ Salvar e recarregar

---

### PASSO 5 — Subir para o GitHub

1. Crie um repositório no GitHub (pode ser privado)

2. Crie um `.gitignore` na raiz:
   ```
   node_modules/
   .env
   grimorio.db
   ```

3. Suba o código:
   ```bash
   git init
   git add .
   git commit -m "Grimório do Aventureiro - primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/dnd-app.git
   git push -u origin main
   ```

---

### PASSO 6 — Deploy no Vercel

1. Acesse **https://vercel.com** e faça login (pode usar a conta GitHub)

2. Clique em **"Add New Project"**

3. Clique em **"Import"** no seu repositório `dnd-app`

4. Na tela de configuração:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (deixe em branco)
   - **Build Command:** deixe em branco
   - **Output Directory:** deixe em branco

5. Abra a seção **"Environment Variables"** e adicione:

   | Nome | Valor |
   |------|-------|
   | `DATABASE_URL` | `postgresql://...neon.tech/grimorio?sslmode=require` |
   | `JWT_SECRET` | sua frase secreta gerada no Passo 2 |
   | `NODE_ENV` | `production` |

6. Clique em **"Deploy"**

7. Aguarde ~1 minuto. A Vercel vai mostrar uma URL como:
   ```
   https://dnd-app-seu-nome.vercel.app
   ```

8. Acesse a URL e teste tudo! 🎉

---

### PASSO 7 — Testar a URL de produção

Abra no navegador:
```
https://dnd-app-seu-nome.vercel.app
```

Teste:
- Criar conta com um username novo
- Criar um personagem
- Fechar o navegador, abrir de novo → personagem ainda está lá ✅

---

## 🔧 Como funciona a arquitetura

```
Navegador
    │
    ▼
Vercel (edge)
    │
    ├── /          → public/index.html  (frontend estático)
    ├── /style.css → public/style.css
    ├── /api.js    → public/api.js
    ├── /script.js → public/script.js
    │
    └── /api/*     → api/server.js → Express
                         │
                         ├── /api/auth/register
                         ├── /api/auth/login
                         ├── /api/auth/me
                         └── /api/characters (CRUD)
                                  │
                                  ▼
                             Neon PostgreSQL
                         (banco gerenciado na nuvem)
```

---

## 🌐 Rotas da API

### Autenticação
| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| `POST` | `/api/auth/register` | `{ username, password }` | `{ token, username, userId }` |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ token, username, userId }` |
| `GET`  | `/api/auth/me` | — *(requer token)* | `{ id, username, created_at }` |

### Personagens *(todas requerem `Authorization: Bearer TOKEN`)*
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/characters` | Lista personagens do usuário logado |
| `GET` | `/api/characters/:id` | Carrega personagem completo |
| `POST` | `/api/characters` | Cria novo personagem |
| `PUT` | `/api/characters/:id` | Salva alterações |
| `DELETE` | `/api/characters/:id` | Deleta personagem |

---

## 🗄️ Tabelas criadas no Neon

| Tabela | Conteúdo |
|--------|----------|
| `users` | Usuários (id, username, hash da senha) |
| `characters` | Dados principais do personagem |
| `attributes` | Os 6 atributos + bases raciais |
| `saving_throw_profs` | Proficiências em saving throws |
| `skill_profs` | Proficiências em perícias |
| `inventory` | Itens do inventário |
| `weapons` | Armas com dano e atributo |
| `spells` | Magias conhecidas/preparadas |
| `conditions` | Condições ativas (agarrado, cego…) |
| `resistances` | Resistências e imunidades |
| `magic_config` | Atributo conjurador + slots usados |
| `personality` | Traços, ideais, vínculos, defeitos |
| `appearance` | Aparência física |
| `languages` | Idiomas conhecidos |
| `coins` | Moedas (PP, PO, PE, PC) |

---

## 🔒 Segurança

- ✅ Senhas com **bcrypt** (12 rounds) — nunca salvas em texto puro
- ✅ **JWT** com expiração de 7 dias
- ✅ Cada usuário acessa **apenas seus próprios** personagens
- ✅ Validação de input no backend
- ✅ Resposta idêntica para usuário inexistente e senha errada
- ✅ **SSL obrigatório** na conexão com o Neon
- ✅ Neon é acessado diretamente — nenhuma senha fica exposta no frontend

---

## ❓ Problemas comuns

### `npm install` dá erro
Certifique-se de estar na pasta `dnd-app` antes de rodar `npm install`.

### `node server/migrate.js` dá erro de conexão
Verifique se o `DATABASE_URL` no `.env` está correto.
Teste a conexão com:
```bash
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); p.query('SELECT 1').then(()=>{console.log('✅ Conectado!');p.end()}).catch(e=>{console.error('❌',e.message);p.end()})"
```

### Vercel dá erro 500
- Verifique se as **Environment Variables** foram adicionadas corretamente
- Acesse o painel do Vercel → seu projeto → aba **"Functions"** → clique em uma função → veja o log de erro

### Personagem não salva após fechar o navegador
O token JWT pode ter expirado (7 dias). Faça login novamente.

### Esqueceu a senha de um usuário
Acesse o Neon SQL Editor e execute:
```sql
DELETE FROM users WHERE username = 'nome_do_usuario';
```

---

## 🔄 Atualizando o código

Toda vez que você fizer `git push`, o Vercel faz o **redeploy automático** em ~30 segundos.

```bash
git add .
git commit -m "minha atualização"
git push
```

---

## 💡 Diferença SQLite → PostgreSQL (para referência)

| SQLite | PostgreSQL |
|--------|-----------|
| `?` | `$1, $2, $3...` |
| `INTEGER AUTOINCREMENT` | `SERIAL` |
| `datetime('now')` | `NOW()` |
| `INTEGER` (0/1 para bool) | `BOOLEAN` (true/false) |
| `ON CONFLICT ... DO UPDATE` | igual ✅ |
| Arquivo local `.db` | Servidor gerenciado Neon |
| Síncrono | Assíncrono (async/await) |
