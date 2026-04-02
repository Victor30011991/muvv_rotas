# 🚀 MUVV ROTAS — Guia de Instalação e Execução

## Pré-requisitos

Instale antes de começar:

| Ferramenta | Link | Para que serve |
|---|---|---|
| Node.js 18+ | https://nodejs.org | Rodar backend e web |
| PostgreSQL 14+ | https://postgresql.org/download | Banco de dados |
| Git | https://git-scm.com | Versionar o código |
| VS Code | https://code.visualstudio.com | Editor |
| Expo Go (celular) | App Store / Play Store | Testar o app no celular |

---

## 1. Abrir o projeto no VS Code

```bash
# Clone ou abra a pasta do projeto
code muvv-rotas
```

Ou: abra o VS Code → File → Open Folder → selecione a pasta `muvv-rotas`

---

## 2. Configurar o banco de dados

### Criar o banco no PostgreSQL:
```sql
CREATE DATABASE muvv_rotas;
```

### Configurar o .env do backend:
```bash
cd apps/backend
cp .env.example .env
```

Abra o arquivo `.env` e preencha:
```
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/muvv_rotas"
JWT_SECRET="muvv-rotas-secret-2026"
JWT_REFRESH_SECRET="muvv-rotas-refresh-2026"
```

---

## 3. Instalar dependências

Na raiz do projeto (pasta `muvv-rotas`):
```bash
npm install
```

---

## 4. Rodar o banco de dados (migrations + seed)

```bash
cd apps/backend

# Cria as tabelas no banco
npx prisma migrate dev --name init

# Popula com dados iniciais (preços de Parnaíba + usuários de teste)
npm run seed
```

---

## 5. Iniciar o backend

```bash
# Na pasta apps/backend
npm run dev
```

O servidor vai rodar em: **http://localhost:3333**

Teste se está funcionando:
```
http://localhost:3333/health
```

Deve aparecer: `{"status":"ok","app":"Muvv Rotas API"}`

---

## 6. Iniciar o painel web (admin)

Abra outro terminal:
```bash
cd apps/web
cp .env.example .env
npm run dev
```

Acesse: **http://localhost:5173**

---

## 7. Iniciar o app mobile

Abra outro terminal:
```bash
cd apps/mobile
cp .env.example .env
npm install
npx expo start
```

- No celular, abra o **Expo Go**
- Escaneie o QR Code que aparecer no terminal

---

## Usuários de teste (criados pelo seed)

| Perfil | Email | Senha |
|---|---|---|
| Admin | admin@muvvrotas.com.br | muvv@admin2026 |
| Motorista | motorista@teste.com | motorista123 |
| Embarcador | embarcador@teste.com | embarcador123 |

---

## Estrutura de pastas

```
muvv-rotas/
├── apps/
│   ├── backend/          ← API (Node.js + Fastify + PostgreSQL)
│   │   ├── prisma/       ← Schema do banco
│   │   └── src/
│   │       ├── routes/   ← auth, fretes, motoristas, preços, carteira, avaliações
│   │       ├── services/ ← pricing, wallet
│   │       └── middlewares/
│   ├── web/              ← Painel Admin (React + Vite)
│   │   └── src/
│   │       └── pages/    ← Dashboard, Motoristas
│   └── mobile/           ← App do motorista (React Native + Expo)
│       └── src/
│           ├── app/      ← Telas (login, cadastro, mapa, financeiro, perfil)
│           ├── store/    ← Estado global (auth, freight)
│           └── lib/      ← Cliente HTTP
└── packages/
    └── shared/           ← Tipos e utilitários compartilhados
```

---

## APIs disponíveis

| Método | Rota | Descrição |
|---|---|---|
| GET | /health | Health check |
| POST | /auth/cadastro | Criar conta |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| GET | /fretes | Listar fretes disponíveis |
| POST | /fretes | Criar frete |
| POST | /fretes/:id/aceitar | Motorista aceita frete |
| POST | /fretes/:id/entregar | Confirmar entrega |
| GET | /motoristas/perfil | Perfil do motorista |
| PUT | /motoristas/disponivel | Toggle online/offline |
| GET | /precos | Tabela de preços |
| POST | /precos/calcular | Calcular frete |
| GET | /carteira | Saldo da carteira |
| GET | /carteira/extrato | Histórico |
| POST | /avaliacoes/:freteId | Avaliar frete |

---

## Problema? Solução rápida

**Banco não conecta:**
Verifique se o PostgreSQL está rodando e se a senha no `.env` está correta.

**Porta 3333 ocupada:**
Mude `PORT=3334` no `.env` do backend.

**Expo não abre:**
Certifique-se de que celular e computador estão na mesma rede Wi-Fi.
