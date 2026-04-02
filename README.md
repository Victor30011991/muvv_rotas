# Muvv Rotas 🚀

**Plataforma de logística inteligente para o Nordeste**

Conecta motoristas autônomos e embarcadores com match dinâmico, precificação transparente e pagamento via PIX. Primeiro produto do tipo no litoral piauiense.

---

## Estrutura do projeto

```
muvv-rotas/
├── apps/
│   ├── backend/     → API Node.js + Fastify + TypeScript + PostgreSQL
│   ├── web/         → Painel admin React + Vite + TypeScript
│   └── mobile/      → App do motorista React Native + Expo
├── packages/
│   └── shared/      → Tipos e utilitários compartilhados
└── package.json     → Monorepo root
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Fastify + TypeScript |
| Banco de dados | PostgreSQL + Prisma ORM |
| Web Admin | React + Vite + TypeScript |
| App Mobile | React Native + Expo |
| Auth | JWT + Refresh Token |
| Pagamento | PIX (Efí Bank / Mercado Pago) |
| Maps | Google Maps SDK |
| Realtime | Socket.io |
| Deploy Backend | Railway |
| Deploy Web | Vercel |

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/muvv-rotas.git
cd muvv-rotas

# Instale as dependências
npm install

# Configure o ambiente
cp apps/backend/.env.example apps/backend/.env
# edite o .env com suas credenciais

# Rode as migrations
npm run db:migrate

# Popule o banco com dados iniciais
npm run db:seed

# Inicie o backend
npm run dev:backend

# Em outro terminal, inicie o web
npm run dev:web
```

---

## Variáveis de ambiente

Veja `apps/backend/.env.example` para todas as variáveis necessárias.

---

## Roadmap

- [x] Fase 0 — Estrutura do projeto
- [ ] Fase 1 — Backend + Banco de dados
- [ ] Fase 2 — App Mobile
- [ ] Fase 3 — Painel Web Admin
- [ ] Fase 4 — Integrações (PIX, Maps, Socket.io)
- [ ] Fase 5 — Piloto em Parnaíba

---

## Licença

Proprietário — © 2026 Muvv Rotas. Todos os direitos reservados.
