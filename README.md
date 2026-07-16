# SGI 4.0 — Sistema de Gestão Integrada

Aplicação web para controle de **Verba de Promoção Comercial (VPC)**, campanhas e **projeção de faturamento**.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + **PostgreSQL (Neon)**
- NextAuth (Credentials) — Vendedor, ADM, Gestor, Developer
- Recharts, Excel (xlsx) e PDF (jsPDF)

## Banco Neon (hospedado)

1. Crie um projeto em [console.neon.tech](https://console.neon.tech)
2. Em **Connect**, copie:
   - **Pooled connection** → `DATABASE_URL` (app / Vercel)
   - **Direct connection** → `DIRECT_URL` (migrate / seed)
3. Cole no `.env` (local) e nas variáveis do host (Vercel etc.)

```bash
copy .env.example .env
# edite DATABASE_URL e DIRECT_URL com as URLs do Neon
```

4. Crie as tabelas e (opcional) dados demo:

```bash
npm install
npx prisma db push
npm run db:seed
```

## Como rodar local

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Deploy (ex.: Vercel)

Variáveis de ambiente obrigatórias:

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** (`…-pooler…`) |
| `DIRECT_URL` | Neon **direct** |
| `NEXTAUTH_URL` | URL pública do app (`https://seu-dominio.vercel.app`) |
| `NEXTAUTH_SECRET` | String longa aleatória |

Depois do deploy, rode o seed uma vez (local apontando para o Neon, ou `npx prisma db seed` com as envs de produção).

## Logins demo (após seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Developer | `developer@vpc.local` | `demo123` |
| Gestor | `gestor@vpc.local` | `demo123` |
| Administrador | `adm@vpc.local` | `demo123` |
| Vendedor | `vendedor@vpc.local` | `demo123` |

## Funcionalidades

- Cadastro de distribuidores, produtos e usuários
- Campanhas Sell Out, Vendeu Ganhou e Personalizada
- Lançamento de verba e descontos (unitário e Excel)
- Projeção de faturamento (pendente / ganho / perdido)
- Flags de abas por usuário (perfil Developer)
- Dashboard, extrato, alertas e relatório mensal
