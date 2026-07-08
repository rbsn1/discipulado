# Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group (unauthenticated)
│   │   └── login/page.tsx
│   ├── (dashboard)/            # Protected route group (requires active profile)
│   │   ├── layout.tsx          # Auth guard + Sidebar wrapper
│   │   ├── painel/             # Dashboard home
│   │   ├── discipulandos/      # Disciples list + detail
│   │   ├── turmas/             # Classes list + detail
│   │   ├── acolhimento/        # Welcome stage
│   │   ├── confraternizacao/   # Events
│   │   ├── pos-discipulado/    # Post-discipleship tracking
│   │   ├── relatorios/         # Reports
│   │   └── admin/              # Platform admin (congregations, users, modules)
│   └── api/                    # Route Handlers (REST endpoints)
│       ├── disciples/
│       ├── cases/
│       ├── classes/
│       ├── lessons/
│       ├── events/
│       ├── modules/
│       └── admin/
│           ├── congregations/
│           └── users/
├── components/
│   ├── ui/                     # Generic reusable primitives (Button, Input, Dialog…)
│   └── features/               # Domain-specific components grouped by feature
│       ├── disciples/
│       ├── cases/
│       ├── classes/
│       ├── dashboard/
│       ├── admin/
│       └── …
├── lib/
│   ├── repositories/           # All Supabase queries — one file per entity
│   ├── actions/                # Next.js Server Actions
│   ├── services/               # (reserved for business logic layer)
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client (cookies-based, use in RSC / Route Handlers)
│   │   └── admin.ts            # Service-role client (bypasses RLS — server only)
│   └── utils.ts                # cn(), formatDate(), label/color maps, CSV helpers
├── types/
│   └── index.ts                # All shared TypeScript types and interfaces
├── proxy.ts                    # Supabase session refresh middleware logic
└── __tests__/
    ├── business-rules.test.ts  # Unit tests — pure logic, no DB
    └── rls-isolation.test.ts   # Integration tests — live Supabase required
```

## Page Conventions

Each dashboard route follows a two-file pattern:

- **`page.tsx`** — React Server Component. Fetches data via repositories, reads the current profile, redirects if unauthorized. Passes data as props to the client component.
- **`client.tsx`** — `'use client'` component. Handles interactivity (forms, modals, search, router refresh). Calls API routes via `fetch` for mutations.

Detail pages use the `[id]` dynamic segment and follow the same pattern.

## API Route Conventions

Every route handler in `src/app/api/`:

1. Calls `getCurrentProfile()` first — returns `401` if unauthenticated
2. Checks `profile.congregation_id` — all data is congregation-scoped
3. Validates role permissions inline before mutations
4. Returns `NextResponse.json(data)` on success, `{ error: string }` with appropriate status on failure
5. Catches known Postgres constraint names (e.g. `_phone_congregation_unique`) to return friendly error messages

## Data Access

- All Supabase queries live in `src/lib/repositories/` — never write inline Supabase calls in pages or components
- Use `createClient()` (server) inside repositories and route handlers
- Use `createAdminClient()` only for operations that must bypass RLS (user creation, cross-tenant admin)
- The browser client (`src/lib/supabase/client.ts`) is used only in client components that need realtime or client-side auth

## Component Conventions

- `src/components/ui/` — primitive wrappers around Radix UI; no domain knowledge
- `src/components/features/{domain}/` — domain-aware components; may import from `ui/` and `types/`
- Use the `cn()` helper from `src/lib/utils.ts` for all conditional class merging
- Forms use uncontrolled `FormData` for simple cases, or `react-hook-form` + Zod for complex validation

## Types

All shared types are in `src/types/index.ts`. No inline type definitions for domain entities — always import from there. Input/DTO types (e.g. `CreateDiscipleInput`) are also defined there alongside entity types.

## Multi-tenancy / Security

- Every query must be scoped to `congregation_id` — Supabase RLS enforces this at the DB level, but the application layer must also filter explicitly
- `ADMIN_PLATAFORMA` is the only role with cross-congregation access
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client bundle

## Path Alias

`@/` maps to `src/`. Always use this alias for imports — never use relative `../../` paths.
