# Tech Stack

## Core

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript 5** (strict) |
| Styling | **Tailwind CSS v4** |
| Database / Auth | **Supabase** (Postgres + RLS + Auth) |
| Supabase client | `@supabase/ssr` — SSR-safe cookie-based sessions |

> ⚠️ This project is on **Next.js 16**, which has breaking changes from Next.js 13/14/15. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## UI & Forms

- **Radix UI** primitives (`@radix-ui/*`) for accessible headless components
- **lucide-react** for icons
- **react-hook-form** + **@hookform/resolvers** + **Zod v4** for form validation
- **class-variance-authority** + **clsx** + **tailwind-merge** (via `cn()` helper in `src/lib/utils.ts`)
- **date-fns v4** with `ptBR` locale for all date formatting

## Testing

- **Vitest** as the test runner
- **@testing-library/react** for component tests
- Two test categories:
  - Unit tests (`src/__tests__/business-rules.test.ts`) — pure logic, no DB
  - Integration tests (`src/__tests__/rls-isolation.test.ts`) — RLS policies against a real Supabase instance

## Environment Variables

| Variable | Used in |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (admin client) — never exposed to the browser |
| `NEXT_PUBLIC_APP_URL` | Redirects / CORS |

Copy `.env.example` → `.env.local` and fill in values. Never commit `.env.local`.

## Common Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Run all unit tests (single pass)
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only (requires live Supabase)
npm run test:integration
```

## Supabase Setup

Migrations must be applied in order via the Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_triggers_and_functions.sql
```

The admin Supabase client (`src/lib/supabase/admin.ts`) uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS. Only use it for privileged server-side operations (e.g., creating users via `auth.admin`).
