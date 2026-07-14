# PartBank Hub

A managed B2B platform for sourcing rare commercial vehicle spare parts in Indonesia. It connects truck owners, verified workshops, and PartBank internal staff to coordinate custom parts manufacturing end-to-end — from reverse engineering through production, QC, and delivery.

The platform runs across two isolated environments: a **lab** sandbox (seeded demo data, one-click demo logins) and **production** (real data, empty except the admin account).

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

- **Framework:** Next.js 14 App Router (fullstack — no separate backend)
- **Language:** TypeScript (strict)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (5 buckets)
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **Deployment:** Vercel

---

## Three Roles

| Role | DB value | What they do |
|---|---|---|
| **Internal** | `internal` | Manages the full pipeline — RE, drawings, pricing, workshop assignment, QC, delivery |
| **Workshop** | `workshop` | Receives assigned orders, downloads drawings, marks production complete |
| **Buyer** | `customer` | Browses catalog, places orders, uploads payment receipts |

Roles live in the `profiles` table (FK to `auth.users`) and are enforced by `middleware.ts` on every request plus Row Level Security in the database.

---

## Environments

The app targets **two separate Supabase projects**. Each has its own env file at the repo root, using the **same variable names** — each file is a self-contained config for one project.

| Environment | Env file | Supabase project | Data | Demo logins |
|---|---|---|---|---|
| **Lab** | `.env.lab` | sandbox | Seeded demo catalog + demo accounts | Shown on login page |
| **Production** | `.env` (or `.env.local`) | live | Empty except the internal admin account | Hidden |

How each consumer resolves the environment:

- **The Next.js app** (dev server and Vercel) only ever reads `.env` / `.env.local` / Vercel env vars — it **never** reads `.env.lab`. To run the app against lab locally, put the lab values into `.env.local`.
- **The CLI scripts** (`supabase/scripts/*`, `supabase/seed/*`) select the target explicitly: default loads `.env.local` → `.env` (production), and `--env=lab` loads `.env.lab`.
- **`NEXT_PUBLIC_APP_ENV`** controls the demo login cards on the login page: they show unless the value is exactly `production`. It also guards the demo-data seed from running against production.

### Environment variables

Copy `.env.example` to create each file:

```bash
cp .env.example .env       # production
cp .env.example .env.lab   # lab
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ACCESS_TOKEN=<account-token>   # from supabase.com/dashboard/account/tokens — needed by run-migration.mjs
NEXT_PUBLIC_APP_ENV=production           # "lab" or "production" (falls back to lab if empty)
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → **Project Settings → API**.
- `SUPABASE_ACCESS_TOKEN` — an account-wide token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens); required to run migrations via the Management API. The project ref is derived from the URL, so no separate `SUPABASE_PROJECT_REF` is needed.

> All env files (`.env`, `.env.lab`, `.env*.local`) are git-ignored — never commit real credentials.

---

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- One or two Supabase projects (free tier works — one for lab, one for production)

### 1. Install

```bash
git clone <repo-url>
cd partbank-hub
npm install
```

### 2. Configure environment

Create your env file(s) as described in [Environments](#environments) above. For local development against the lab project, put the lab values in `.env.local` so `npm run dev` picks them up.

### 3. Run database migrations

Apply each migration in `supabase/migrations/` in chronological order, oldest first. The helper script applies the SQL and records it in the migration history:

```bash
# production (default)
node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql

# lab
node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql --env=lab
```

> Storage buckets (`receipts`, `drawings`, `references`, `brand-logos`, `model-images`) are created by the migrations — no separate step needed.

### 4. Seed accounts and data

Create the internal admin account (environment-agnostic, idempotent — run it against whichever project your env file points to):

```bash
node supabase/seed/20260613080000_internal_account.mjs --pass=<your-password>
```

For **lab only**, seed the demo accounts and sample catalog:

```bash
node supabase/seed/20260613083000_demo_data.mjs
```

> The demo-data seed refuses to run when `NEXT_PUBLIC_APP_ENV=production` (override with `--force` only if you know what you're doing). Production stays empty except the admin account.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page. In lab, the demo login cards let you jump straight into any role.

**Lab demo accounts** (password `password` for all):

| Role | Email |
|---|---|
| Internal | `internal@partbank.com` |
| Workshop | `workshop@bengkel.com` |
| Buyer | `buyer@buyer.com` |

---

## Useful Scripts

All scripts run from the repo root and accept `--env=lab` to target the lab project (default is production).

| Script | Purpose |
|---|---|
| `supabase/scripts/run-migration.mjs <file>` | Apply a migration and record it in history (`--record-only` to only record) |
| `supabase/scripts/sync-roles.mjs` | Reconcile `profiles.role` with auth user metadata |
| `supabase/scripts/reset-password.mjs` | Reset a user's password |
| `supabase/scripts/inspect-user.mjs` | Inspect an auth user + profile |
| `supabase/seed/20260613080000_internal_account.mjs --pass=<pw>` | Create/ensure the internal admin account |
| `supabase/seed/20260613083000_demo_data.mjs` | Seed lab demo accounts + catalog |

---

## Project Docs

| Document | What it covers |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | Full project spec — architecture, DB schema, order state machine, design system, conventions |
| [`docs/FLOWS.md`](docs/FLOWS.md) | Order state machine, RE flow, ready-to-produce flow, payment flows, QC flow |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | Architecture deep-dive, key patterns, how to extend the codebase |

---

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new) (Vercel auto-detects Next.js — no config needed).
3. Add the **production** environment variables (from your `.env`), including `NEXT_PUBLIC_APP_ENV=production` so the demo logins stay hidden.
4. Deploy.
5. After the first deploy, apply the migrations against your production Supabase project (see [step 3](#3-run-database-migrations)), then create the admin account:
   ```bash
   node supabase/seed/20260613080000_internal_account.mjs --pass=<your-password>
   ```
   Do **not** run the demo-data seed against production — it's lab-only.
