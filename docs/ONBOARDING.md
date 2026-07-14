# PartBank — Developer Onboarding

This doc gets a new developer from zero to productive. Read `CONTEXT.md` first for the full spec, then come here for the "how things actually work" layer.

---

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works — you need the URL, anon key, and service role key)
- Familiarity with Next.js App Router and TypeScript

---

## First Run

```bash
git clone <repo-url>
cd partbank-mvp
npm install

cp .env.example .env.local
# Fill in the four Supabase values

node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql  # per file, oldest first (incl. storage buckets)
node supabase/seed/20260613080000_internal_account.mjs --pass=<password> # admin account (any env)
node supabase/seed/20260613083000_demo_data.mjs   # LAB ONLY — workshop + buyer + catalog

npm run dev
```

Go to `http://localhost:3000` → register an account (or use a demo account if your DB is seeded).

---

## Architecture Overview

```
Browser
  │
  ├── Server Components (data fetch on server, no JS bundle cost)
  │     └── read via createClient() [SSR Supabase client]
  │
  ├── Client Components ('use client')
  │     └── read via createBrowserClient() [browser Supabase client]
  │
  └── Server Actions ('use server' functions)
        └── mutations via createAdminClient() [service-role, bypasses RLS]
              └── applyTransition() → DB update + createNotification()
```

**Why admin client for mutations?**  
Status transitions need to write across multiple tables (orders, order_events, notifications) atomically, often touching rows the acting user doesn't own (e.g. writing a notification to another user's row). The service-role key bypasses RLS safely — but only after the caller's identity and role have been verified in code.

**Why Server Actions instead of API routes?**  
Simpler — form submissions and button clicks call server actions directly. No fetch, no JSON serialization, no API handler boilerplate. API routes (`app/api/`) are only used for polling (notifications GET) and file uploads (POST).

---

## Key Files to Read First

| File | Why |
|---|---|
| `lib/types/order.ts` | All 14 status constants + notification message templates |
| `lib/actions/orders.ts` | The entire order state machine in code |
| `lib/supabase/storage.ts` | How files are uploaded and URLs generated |
| `lib/notifications.ts` | How in-app notifications are created |
| `supabase/migrations/20260613000000_initial_schema.sql` | Full DB schema + RLS policies |

---

## How the State Machine Works

Every status transition goes through `applyTransition()` in `lib/actions/orders.ts`:

```ts
await applyTransition(admin, {
  orderId,
  fromStatus: 're_in_progress',
  toStatus: 'pending_price_estimation',
  actorId: user.id,
  notes: 'Drawing uploaded.',
  notifyUserId: order.customer_id,
  notifyMessage: NOTIFICATION_MESSAGES.pending_price_estimation,
})
```

`applyTransition` does three things in sequence:
1. Updates `orders.status` from `fromStatus` → `toStatus` (fails if current status doesn't match)
2. Inserts a row into `order_events` (audit log)
3. Calls `createNotification()` if `notifyUserId` is provided

If `fromStatus` doesn't match the current DB value, the update is a no-op — this prevents race conditions when multiple staff act simultaneously.

---

## How to Add a New Order Status

Say you want to add a `pending_workshop_quote` status between `finding_workshop` and `in_production`.

**1. Add the constant** — `lib/types/order.ts`
```ts
export const ORDER_STATUS = {
  // ... existing
  PENDING_WORKSHOP_QUOTE: 'pending_workshop_quote',
} as const
```

**2. Add the color** — `lib/utils/status.ts`
```ts
pending_workshop_quote: 'bg-violet-50 text-violet-700',
```

**3. Add the label** — `lib/utils/status.ts`
```ts
pending_workshop_quote: 'Pending Workshop Quote',
```

**4. Add a DB migration** — `supabase/migrations/<timestamp>_new_status.sql`
```sql
ALTER TYPE order_status ADD VALUE 'pending_workshop_quote';
```

**5. Add the transition** — `lib/actions/orders.ts`
```ts
export async function requestWorkshopQuote(orderId: string): Promise<ActionResult> {
  // verify caller is internal
  // fetch order
  // applyTransition(..., fromStatus: 'finding_workshop', toStatus: 'pending_workshop_quote')
}
```

**6. Add the action panel UI** — `components/internal/OrderActionPanel.tsx`
Add a new section inside the component that renders when `order.status === 'pending_workshop_quote'`.

**7. Update the workshop action panel** if the workshop needs to respond — `components/workshop/WorkshopActionPanel.tsx`.

---

## How to Add a New Role Action

Example: let a workshop submit a quote amount.

**1. Write the server action** in `lib/actions/orders.ts` (or a new file):
```ts
'use server'
export async function submitWorkshopQuote(
  orderId: string,
  quoteAmount: number
): Promise<ActionResult> {
  const { supabase, error } = await requireWorkshop() // check role
  if (error) return { error }
  // update DB, call applyTransition
}
```

**2. Call it from a Client Component** — use a form with `action={submitWorkshopQuote}` or call it in an `onClick` handler.

**3. Reload data** — Server Actions automatically trigger `revalidatePath()` (already called inside `applyTransition`). The page re-renders with fresh data.

---

## File Upload Pattern

All file uploads use `app/api/uploads/route.ts` (POST):

```ts
// client side
const fd = new FormData()
fd.append('file', file)
fd.append('bucket', 'receipts')
fd.append('orderId', orderId)
fd.append('fileType', 're_receipt')

await fetch('/api/uploads', { method: 'POST', body: fd })
```

The API route:
1. Validates file size + MIME type
2. Uploads to Supabase Storage via `uploadFile()` (admin client)
3. Inserts a row in the `files` table
4. Returns `{ path, url }`

For multi-file uploads (technical drawings), use `formData.getAll('file')` — not `formData.get('file')`.

---

## Supabase Client Reference

| Client | Import | When to use |
|---|---|---|
| SSR server | `createClient()` from `@/lib/supabase/server` | Server Components, Server Actions reads |
| Browser | `createBrowserClient()` from `@/lib/supabase/client` | Client Components |
| Admin | `createAdminClient()` from `@/lib/supabase/admin` | Server Actions mutations, bypasses RLS |

Never use the admin client in Client Components — the service role key must never reach the browser.

---

## Notification System

Notifications are stored in the `notifications` table and polled by `NotificationBell` every 10 seconds via `/api/notifications`.

To create a notification:
```ts
import { createNotification } from '@/lib/notifications'

await createNotification({
  userId: customer.id,
  orderId: order.id,
  message: 'Your order is on its way.',
})
```

`createNotification` uses the admin client and never throws — a notification failure never blocks a status transition.

---

## Role Colors

Role-specific colors are centralized in `lib/utils/roles.ts` — do not hardcode role colors anywhere else.

```ts
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/utils/roles'

const colors = ROLE_COLORS['workshop'] // amber
// colors.pill, colors.activeBar, colors.hover, colors.iconColor, colors.labelColor
```

**Important:** Because these classes are defined in `lib/`, Tailwind won't include them unless `lib/**/*.{ts,tsx}` is in `content` in `tailwind.config.ts`. This is already configured — don't remove it.

---

## Catalog Structure

The catalog is a 4-level hierarchy:

```
Truck Brand  (truck_brands)
  └── Model  (truck_models)  ← has image_url
        └── Category  (part_categories)
              └── Part  (parts)  ← has drawing_url, status, price_reference
```

Parts have two statuses:
- `request_only` — no drawing yet, orders require RE
- `ready_to_make` — drawing exists, orders skip RE

When Internal uploads a drawing via the order action panel, `parts.status` is automatically set to `ready_to_make`.

---

## Common Gotchas

**1. Using `formData.get()` for multi-file uploads**  
Use `formData.getAll('file')` — `get()` only returns the first file.

**2. Tailwind purging classes from `lib/`**  
If you add Tailwind classes to any file in `lib/`, verify `lib/**/*.{ts,tsx}` is in `tailwind.config.ts` content paths. If classes are present in code but missing from rendered CSS, this is why.

**3. Signing URLs for private buckets**  
`receipts`, `drawings`, and `references` are private. To display them in the browser, generate a signed URL server-side:
```ts
const { url } = await getSignedUrl({ bucket: 'drawings', path: filePath, expiresIn: 3600 })
```
Never store signed URLs in the DB — they expire. Store the path, generate the URL at render time.

**4. Browser-cached images after re-upload**  
Public bucket URLs (brand logos, model images) are served from CDN. When re-uploading to the same path, append `?v=<timestamp>` to the stored URL to bust the browser cache:
```ts
const publicUrl = getPublicUrl('brand-logos', path) + `?v=${Date.now()}`
```

**5. Admin client vs SSR client for mutations**  
Always use `createAdminClient()` for any write that touches a row not owned by the current user (e.g. notifications to other users, order status changes that workshops trigger). Use `createClient()` for user-scoped reads.

**6. `revalidatePath` scope**  
`applyTransition` calls `revalidatePath` on order-related paths. If you add a new page that shows order data, add it to the revalidation list in `lib/actions/orders.ts`.

---

## Scripts Reference

All Supabase helper scripts live in `supabase/scripts/`:

| Script | Purpose |
|---|---|
| `supabase/scripts/run-migration.mjs` | Apply a SQL migration file (Management API) **and record it in `schema_migrations`**. `--record-only` marks a migration applied without running it. |
| `supabase/scripts/sync-roles.mjs` | Sync `profiles.role` → `auth.users.user_metadata.role` |
| `supabase/scripts/inspect-user.mjs` | Debug: print auth metadata + profile row for an email |
| `supabase/scripts/reset-password.mjs` | Admin: reset a user's password |
| `supabase/seed/20260613080000_internal_account.mjs` | Create the internal (admin) account — **any env**. Requires `--pass=<password>` |
| `supabase/seed/20260613083000_demo_data.mjs` | **Lab only** — workshop + buyer accounts + sample catalog (idempotent; refuses when `NEXT_PUBLIC_APP_ENV=production`) |

All scripts read from `.env.local` (preferred) or `.env` at the repo root, and must be run from the repo root.

---

## Deployment

1. Push to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_ENV=production` (hides the demo logins)
4. Deploy — Vercel auto-detects Next.js
5. Apply migrations against the production Supabase project:
   ```bash
   # with production creds in .env, apply each migration file (oldest first):
   node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql  # schema + storage buckets
   ```
