# 🚛 Muvv Rotas — Driver App

App de logística ZPE Piauí · React 18 + Vite + TypeScript + Tailwind CSS v4

## Estrutura do Projeto

```
muvv-app/
├── index.html                      # Entry HTML — carrega fonte Rubik
├── vite.config.ts                  # 🔧 base: '/muvv_rotas/' para GitHub Pages
├── tsconfig.app.json               # Config TypeScript + alias @/
├── src/
│   ├── main.tsx                    # Monta o React no DOM
│   ├── index.css                   # Tailwind v4 @theme + utilitários de gradiente
│   ├── App.tsx                     # Roteamento e estado de navegação
│   ├── types/
│   │   └── index.ts                # FreightCategory, Screen, Freight, Transaction...
│   ├── utils/
│   │   └── calculations.ts         # 🔧 TAXAS MUVV + calcNet() + brlToEur()
│   ├── components/
│   │   ├── Icon.tsx                # SVG path renderer + ICON_PATHS catalog
│   │   ├── AnimCounter.tsx         # Contador animado de número
│   │   ├── WeeklyChart.tsx         # Gráfico de barras semanal
│   │   ├── ZpeMap.tsx              # Mapa SVG das rotas ZPE Piauí
│   │   ├── SlideToAccept.tsx       # Botão deslizante de confirmação
│   │   └── BottomNav.tsx           # Navegação inferior fixa (4 tabs)
│   └── screens/
│       ├── HomeScreen.tsx          # Mapa + Card de frete + Slide to Accept
│       ├── DocsScreen.tsx          # Onboarding CNH/ANTT/CRLV/Seguro
│       ├── WalletScreen.tsx        # Carteira R$/€ + gráfico + extrato
│       ├── OrderDetailScreen.tsx   # 💡 Calculadora de lucro (regra de negócio)
│       └── ProfileScreen.tsx       # Perfil do motorista + menu
```

## Instalação e Desenvolvimento

```bash
npm install
npm run dev
```

> Acesse: http://localhost:5173/muvv_rotas/

## Deploy no GitHub Pages

```bash
# 1. Instale o gh-pages (já no package.json)
# 2. Verifique que vite.config.ts tem base: '/muvv_rotas/'
npm run deploy
```

## 🔧 Onde alterar valores

| O que alterar | Arquivo | Constante/Variável |
|---|---|---|
| Taxa Muvv por categoria | `src/utils/calculations.ts` | `MUVV_RATES` |
| Cotação do Euro | `src/utils/calculations.ts` | `EUR_BRL_RATE` |
| Frete de demonstração | `src/screens/HomeScreen.tsx` | `DEMO_FREIGHT` |
| Dados do perfil | `src/screens/ProfileScreen.tsx` | `DRIVER_DATA` |
| Saldo da carteira | `src/screens/WalletScreen.tsx` | `BALANCE_BRL / BALANCE_EUR` |
| Cores da paleta | `src/index.css` | `@theme { --color-muvv-* }` |
| Base path do deploy | `vite.config.ts` | `base` |
| Documentos exigidos | `src/screens/DocsScreen.tsx` | `DOCS` |

## Design System — Paleta Litoral Orgânico

| Token | Cor | Uso |
|---|---|---|
| `muvv-primary` | `#EAEFF2` | Fundos e superfícies |
| `muvv-secondary` | `#57A6C1` | Headers e branding |
| `muvv-accent` | `#1CC8C8` | CTAs e valor líquido |
| `muvv-prestige` | `#DAA520` | Selos Gold e ZPE |
