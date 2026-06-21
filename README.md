# Módulo de Discipulado

Aplicação web independente para gestão do ciclo de discipulado de novos convertidos.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Auth + Postgres com RLS)
- Idioma: português do Brasil — datas em `dd/MM/yyyy`

## Execução local

### Pré-requisitos

- Node.js ≥ 20
- Conta no [Supabase](https://supabase.com)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com as chaves do seu projeto Supabase
```

### 3. Aplicar as migrations

No painel do Supabase → SQL Editor, execute em ordem:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_triggers_and_functions.sql
```

### 4. Seed de desenvolvimento (opcional)

```bash
# No SQL Editor do Supabase:
-- cole o conteúdo de supabase/seed.sql
```

| E-mail | Senha | Papel |
|--------|-------|-------|
| admin@plataforma.dev | senha123 | Admin Plataforma |
| admin@central.dev | senha123 | Admin Discipulado (Igreja Central) |
| discipulador@central.dev | senha123 | Discipulador |
| secretaria@central.dev | senha123 | Secretaria |
| admin@norte.dev | senha123 | Admin (Igreja Norte — isolamento) |

### 5. Iniciar servidor

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
