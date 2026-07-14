# PartBank MVP

A managed B2B platform for sourcing rare commercial vehicle spare parts in Indonesia. Connects truck owners, verified workshops, and PartBank internal staff to coordinate custom parts manufacturing end-to-end.

Built as a working competition demo — all three roles can be exercised live.

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

- **Framework:** Next.js 14 App Router (fullstack — no separate backend)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (5 buckets)
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

---

## Three Roles

| Role | Login | What they do |
|---|---|---|
| **Internal** | `internal@partbank.com` | Manages the full pipeline — RE, drawings, pricing, workshop assignment, QC |
| **Workshop** | `workshop@bengkel.com` | Receives assigned orders, downloads drawings, marks production complete |
| **Buyer** | `buyer@buyer.com` | Browses catalog, places orders, uploads payment receipts |

All demo passwords: `password`

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- npm

### 1. Clone and install

```bash
git clone <repo-url>
cd partbank-mvp
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_PROJECT_REF=<project-ref>
```

All four values are in your Supabase dashboard under **Project Settings → API**.

### 3. Run database migrations

Apply each migration in chronological order using the provided script:

```bash
# run once per file, oldest first:
node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql
```

Or apply them manually via the Supabase SQL editor in `supabase/migrations/`, in chronological order.

> Storage buckets (`receipts`, `drawings`, `references`, `brand-logos`, `model-images`) are created by the migrations — no separate step needed.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Project Docs

| Document | What it covers |
|---|---|
| [`docs/FLOWS.md`](docs/FLOWS.md) | Order state machine, RE flow, ready-to-produce flow, payment flows, QC flow |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | Architecture deep-dive, key patterns, how to extend the codebase |
| [`CONTEXT.md`](CONTEXT.md) | Full project spec — design system, conventions, DB schema, role colors |

---

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add the environment variables from step 2 above, plus `NEXT_PUBLIC_APP_ENV=production` (hides the demo logins)
4. Deploy — Vercel auto-detects Next.js, no config needed
5. After first deploy, apply the migrations against your production Supabase project (see step 3), then create the admin account:
   ```bash
   node supabase/seed/20260613080000_internal_account.mjs --pass=<your-password>
   ```
   Do **not** run the demo-data seed (`20260613083000_demo_data.mjs`) — it's lab-only, and production stays empty except this admin account.
