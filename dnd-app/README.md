# ⚔️ Grimório do Aventureiro — D&D 5E
**Ficha digital com autenticação JWT e banco SQLite**

---

## ❗ Por que usamos `sql.js` em vez de `better-sqlite3`?

O `better-sqlite3` precisa **compilar código nativo** (C++) no seu computador,
o que exige Python + Visual Studio Build Tools no Windows — e ainda pode falhar
com versões novas do Node.js (como a 24).

O `sql.js` é um SQLite **100% em JavaScript/WebAssembly**:
- ✅ Não precisa de Python, Visual Studio, ou qualquer compilador
- ✅ Funciona em Windows, macOS e Linux sem configuração
- ✅ É o mesmo SQLite real (mesma sintaxe SQL, mesmo arquivo `.db`)
- ✅ Compatível com qualquer versão do Node.js ≥ 18

---

## 📁 Estrutura do Projeto

```
dnd-app/
├── package.json               ← dependências (sql.js em vez de better-sqlite3)
├── grimorio.db                ← criado automaticamente ao iniciar
├── server/
│   ├── index.js               ← servidor Express
│   ├── db.js                  ← banco SQLite via sql.js
│   ├── auth.js                ← bcrypt + JWT
│   └── routes/
│       ├── authRoutes.js      ← /api/auth/register|login|me
│       └── characterRoutes.js ← /api/characters (CRUD completo)
└── public/
    ├── index.html             ← SPA: login, lista, ficha
    ├── style.css
    ├── api.js                 ← fetch wrapper com JWT automático
    └── script.js              ← lógica da ficha integrada
```

---

## 🚀 Instalação e Execução

### Passo 1 — Criar a estrutura de pastas

```
dnd-app/
├── server/
│   └── routes/
└── public/
```

Copie cada arquivo para seu lugar conforme a estrutura acima.

---

### Passo 2 — Instalar dependências

Abra o terminal na pasta `dnd-app` e execute:

```bash
npm install
```

Deve instalar sem erros (sem compilação nativa).

---

### Passo 3 — Iniciar o servidor

```bash
node server/index.js
```

Saída esperada:
```
⚔️  Grimório do Aventureiro · D&D 5E
🌐  http://localhost:3000
📦  Banco de dados: grimorio.db
✅  Servidor rodando na porta 3000
```

---

### Passo 4 — Abrir no navegador

**http://localhost:3000**

A primeira tela será o Login/Cadastro.

---

## ⚙️ Configuração opcional — .env

Crie um arquivo `.env` na raiz do projeto:

```
PORT=3000
JWT_SECRET=troque-por-uma-frase-longa-e-secreta-aqui!
NODE_ENV=production
```

Para carregar o `.env`:

```bash
npm install dotenv
```

Adicione no início de `server/index.js`:
```js
require('dotenv').config();
```

---

## 🔐 Como funciona a autenticação

```
Cadastro:
  1. Usuário envia username + senha
  2. Senha é "hasheada" com bcrypt (12 rounds) → nunca salva em texto puro
  3. Conta criada no banco
  4. Servidor retorna um JWT válido por 7 dias

Login:
  1. Usuário envia username + senha
  2. Servidor busca o hash no banco e compara com bcrypt.compare()
  3. Se correto → gera JWT e retorna ao frontend
  4. Frontend salva o token no localStorage

Requisições autenticadas:
  1. Frontend envia: Authorization: Bearer <token>
  2. Servidor verifica o JWT em cada rota protegida
  3. Se expirado ou inválido → 401 → logout automático no frontend
```

---

## 🗄️ Banco de Dados

O banco é um arquivo `grimorio.db` criado automaticamente na primeira execução.
Usando `sql.js`, ele carrega o arquivo em memória e persiste ao disco após cada escrita.

### Tabelas

| Tabela | Conteúdo |
|--------|----------|
| `users` | Usuários (id, username, hash de senha) |
| `characters` | Dados principais do personagem |
| `attributes` | Os 6 atributos + bases |
| `saving_throw_profs` | Proficiências em saving throws |
| `skill_profs` | Proficiências em perícias |
| `inventory` | Itens do inventário |
| `weapons` | Armas com cálculo de ataque |
| `spells` | Magias conhecidas/preparadas |
| `conditions` | Condições ativas (agarrado, cego, etc.) |
| `resistances` | Resistências e imunidades |
| `magic_config` | Atributo conjurador + slots usados |
| `personality` | Traços, ideais, vínculos, defeitos |
| `appearance` | Aparência física |
| `languages` | Idiomas conhecidos |
| `coins` | Moedas (PP, PO, PE, PC) |

### Ver o banco

Você pode abrir o arquivo `grimorio.db` com qualquer visualizador de SQLite:
- **DB Browser for SQLite** (gratuito): https://sqlitebrowser.org
- Extensão **SQLite Viewer** no VS Code

---

## 🌐 Rotas da API

### Auth
| Método | Rota | Corpo | Descrição |
|--------|------|-------|-----------|
| POST | `/api/auth/register` | `{ username, password }` | Cadastrar |
| POST | `/api/auth/login` | `{ username, password }` | Login |
| GET  | `/api/auth/me` | — | Dados do usuário (requer token) |

### Personagens (todas requerem `Authorization: Bearer TOKEN`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/characters` | Listar personagens do usuário |
| GET    | `/api/characters/:id` | Carregar um personagem completo |
| POST   | `/api/characters` | Criar novo personagem |
| PUT    | `/api/characters/:id` | Atualizar personagem |
| DELETE | `/api/characters/:id` | Deletar personagem |

---

## 🚀 Colocar em produção

### Com PM2 (recomendado)
```bash
npm install -g pm2
pm2 start server/index.js --name grimorio
pm2 save && pm2 startup
```

### Com Nginx como proxy
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

### Backup
```bash
# O banco é um arquivo único — basta copiar
copy grimorio.db grimorio-backup.db   # Windows
cp   grimorio.db grimorio-backup.db   # Linux/macOS
```

---

## ❓ Problemas comuns

| Erro | Solução |
|------|---------|
| `Cannot find module 'sql.js'` | Execute `npm install` na pasta `dnd-app` |
| `EADDRINUSE port 3000` | Mude a porta: `PORT=3001 node server/index.js` |
| Tela em branco / erros JS | Verifique o console do navegador (F12) |
| Esqueceu a senha | Abra `grimorio.db` no DB Browser e delete o usuário |

---

## 🔒 Segurança implementada

- ✅ Senhas com bcrypt (12 rounds) — nunca em texto puro
- ✅ JWT com expiração de 7 dias
- ✅ Cada usuário só acessa **seus próprios** personagens
- ✅ Validação de input no backend
- ✅ Resposta idêntica para usuário inexistente e senha errada (evita enumeração)
- ✅ Foreign Keys com CASCADE para evitar dados órfãos
- ✅ Limite de tamanho nas requisições (`2mb`)
