# PartBank MVP — Project Context

> Single source of truth for every Claude Code session.  
> Read this before writing any code.

---

## 1. What Is PartBank

PartBank is a managed B2B platform for sourcing rare commercial vehicle spare parts in Indonesia. It connects three actors — truck owners (Buyers), verified manufacturers (Workshops), and PartBank internal staff — to facilitate custom parts manufacturing and delivery.

**MVP goal:** A working end-to-end demo for a business competition. Judges roleplay all three actors live. Not production-ready.

Two order paths exist:
- **Custom / RE flow** — part not catalogued yet, requires Reverse Engineering
- **Ready-to-Produce flow** — part already has a technical drawing, skips RE entirely

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (fullstack — no separate backend) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (5 buckets — see §8) |
| Deployment | Vercel |
| Icons | lucide-react |
| Tables | @tanstack/react-table v8 |
| Nav progress | nextjs-toploader |

---

## 3. Three Roles

| Role | DB value | Description | Access |
|---|---|---|---|
| Buyer | `customer` | Truck owners browsing catalog and ordering parts | Own orders only |
| Workshop | `workshop` | Verified manufacturers fulfilling orders | Own assigned orders only |
| Internal | `internal` | PartBank staff managing the entire pipeline | Full access |

Roles are stored in the `profiles` table (FK to `auth.users`). Route protection is in `middleware.ts` — every request checks role and redirects to `/auth/login` if unauthorized.

**Demo accounts (seed data):**
```
internal@partbank.com  /  password  /  role: internal
workshop@bengkel.com   /  password  /  role: workshop
buyer@buyer.com        /  password  /  role: customer
```

---

## 4. Role Color System

Centralized in `lib/utils/roles.ts`. Used by Sidebar and login demo cards.

| Role | Accent | Pill | Active bar |
|---|---|---|---|
| internal | navy | `bg-navy-50 text-navy-700` | `bg-navy-700` |
| workshop | amber | `bg-amber-50 text-amber-700` | `bg-amber-500` |
| customer | teal | `bg-teal-50 text-teal-600` | `bg-teal-500` |

Active nav background is always `bg-surface-secondary` with `text-text-primary` — role color appears only in the left bar and pill badge. This keeps the nav readable regardless of role.

> **Tailwind purge note:** `lib/utils/roles.ts` is the source of role color classes. `lib/**/*.{ts,tsx}` must be in `tailwind.config.ts` content paths or these classes get purged.

---

## 5. Folder Structure

```
app/
  (auth)/login, /register          ← public auth pages
  (customer)/
    catalog/[brandId]/[modelId]/[partId]/  ← 3-level catalog drill
    orders/new                             ← new order form (custom or catalog)
    orders/[orderId]                       ← order detail + upload receipts
    orders/                                ← my orders list
  internal/
    dashboard/                     ← all orders summary
    orders/[orderId]/               ← full action panel
    orders/                         ← all orders table
    catalog/                        ← CRUD brands/models/categories/parts
    workshops/                      ← list + approve/reject + edit
  workshop/
    dashboard/                      ← assigned orders summary
    orders/[orderId]/               ← order detail + accept/reject + mark complete
    orders/                         ← assigned orders list
  api/
    notifications/route.ts          ← GET: fetch + mark-read notifications (polling)
    uploads/route.ts                ← POST: file upload to storage + files table

components/
  ui/             ← shadcn/ui primitives only (button, input, dialog, table, etc.)
  shared/         ← cross-role (Sidebar, PageHeader, StatusBadge, StatusTimeline,
  |                              NotificationBell, FileUpload, EmptyState)
  customer/       ← NewOrderForm, UploadReceiptForm
  internal/       ← OrderActionPanel, OrdersTable, CatalogManager,
  |                  WorkshopApprovalButtons, WorkshopEditor
  workshop/       ← WorkshopActionPanel

lib/
  supabase/
    server.ts     ← createClient() SSR (Server Components + Actions)
    client.ts     ← createBrowserClient() (Client Components)
    admin.ts      ← createAdminClient() service-role (bypasses RLS)
    middleware.ts ← session refresh logic
    storage.ts    ← uploadFile, getSignedUrl, getPublicUrl, deleteFile
  types/
    database.types.ts   ← Supabase-generated + hand-written enums
    order.ts            ← ORDER_STATUS constants, NOTIFICATION_MESSAGES
  actions/
    orders.ts       ← all internal order mutations (applyTransition, submitDrawing, etc.)
    create-order.ts ← customer order creation
    catalog.ts      ← catalog CRUD + image/logo/drawing uploads
    workshops.ts    ← workshop approval + tag/tier updates
    auth.ts         ← signup/login
  utils/
    status.ts   ← STATUS_COLORS, STATUS_LABELS
    roles.ts    ← ROLE_COLORS, ROLE_LABELS (source of truth for role theming)
    format.ts   ← formatCurrency, formatDateTime
  utils.ts          ← cn(), misc helpers
  notifications.ts  ← createNotification, createNotificationsForRole

middleware.ts         ← route protection (role check on every request)
scripts/              ← dev utilities: create-buckets.mjs, seed-demo.mjs, etc.
supabase/migrations/  ← all schema migrations (run in order)
```

---

## 6. Order Status State Machine

Core of the platform. Every status change triggers notifications. Status transitions live in `lib/actions/orders.ts` via `applyTransition()`.

| # | Status | Triggered by | Notifies |
|---|---|---|---|
| 1 | `pending_re_confirmation` | Customer submits order | Internal |
| 2 | `pending_re_payment` | Internal confirms RE fee + amount | Customer |
| 3 | `pending_re_receipt` | Customer uploads RE payment receipt | Internal |
| 4 | `re_in_progress` | Internal confirms receipt | Customer |
| 5 | `pending_price_estimation` | Internal uploads technical drawing | Customer |
| 6 | `pending_part_payment` | Internal sets part price estimate | Customer |
| 7 | `pending_payment_confirmation` | Customer uploads part payment receipt | Internal |
| 8 | `finding_workshop` | Internal confirms part payment | Customer |
| 9 | `in_production` | Internal assigns workshop + sets final price | Customer + Workshop |
| 10 | `pending_qc` | Workshop marks production complete | Internal + Customer |
| 11 | `qc_failed_cancelled` | Internal marks QC failed | Customer + Workshop |
| 12 | `cancelled_refunded` | Internal clicks Refund Processed | Customer |
| 13 | `in_delivery` | Internal marks QC passed + enters tracking number | Customer |
| 14 | `completed` | Internal marks delivered | Customer |

**Terminal statuses:** `completed`, `cancelled_refunded`  
**QC failure is final** — no re-production loop in MVP  
**Drawing visibility:** accessible to the assigned workshop from status 8 (`finding_workshop`) onwards

---

## 7. Ready-to-Produce Flow

When a part already has a `drawing_url`, orders skip the entire RE phase:

- Order created at status `finding_workshop` (skips statuses 1–8)
- No RE fee, no drawing upload needed
- Part detail page shows "Ready to produce" badge + green card header
- New order page shows simplified "How It Works" (3 steps, 3–7 day turnaround)
- Order form hides the reference photo upload

**Drawing auto-advance:** When Internal uploads a drawing for one order, `submitDrawing` also:
1. Sets `parts.drawing_url` + `parts.status = 'ready_to_make'`
2. Auto-advances any other orders for the same part in `re_in_progress` to `finding_workshop`

---

## 8. Database Tables

```sql
profiles          -- extends auth.users; stores role, full_name, phone
truck_brands      -- brand name, logo_url (public CDN URL)
truck_models      -- brand_id FK, name, year_range, image_url (public CDN URL)
part_categories   -- model_id FK, name
parts             -- category_id + model_id FK, name, description, material_spec,
                  -- notes, manufacturability_grade (A/B/C/D), status (request_only |
                  -- ready_to_make), drawing_url, price_reference
orders            -- customer_id, part_id (null for custom), workshop_id, status,
                  -- quantity, notes, re_fee, part_price, tracking_number,
                  -- qc_failure_notes, custom_part_name, custom_part_description,
                  -- truck_info, created_at, updated_at
order_events      -- audit log: order_id, actor_id, from_status, to_status, notes
notifications     -- user_id, order_id, message, is_read, created_at
files             -- order_id, uploader_id, file_type (re_receipt | part_receipt |
                  -- drawing | reference_photo), storage_path, created_at
workshops         -- profile_id FK, name, address, capability_tags[], tier
                  -- (Bronze/Silver/Platinum), is_verified
```

---

## 9. Storage Buckets

| Bucket | Access | Max size | Content |
|---|---|---|---|
| `receipts` | Private (signed URL) | 10MB | RE fee + part payment receipts |
| `drawings` | Private (signed URL) | 10MB | Technical drawings (PDF/image) |
| `references` | Private (signed URL) | 10MB | Customer reference photos |
| `brand-logos` | Public | 2MB | Truck brand logos (PNG/JPEG/WebP/SVG) |
| `model-images` | Public | 5MB | Truck model photos (PNG/JPEG/WebP) |

Bucket creation: `node scripts/create-buckets.mjs`

---

## 10. Row Level Security

```
orders:        customer → own orders | workshop → assigned orders | internal → all
notifications: user → own notifications only
files:         drawing → assigned workshop (status ≥ finding_workshop) + internal
               other files → owner + internal
profiles:      user → own profile | internal → all
parts:         all authenticated users read | internal write only
truck_brands,
truck_models,
part_categories: all authenticated users read | internal write only
workshops:     workshop user → own row | internal → all
```

---

## 11. Key Conventions

**Server Actions** for all mutations — return `{ error: string | null }`, never throw  
**Server Components** by default — `'use client'` only for interactivity  
**Admin client** (`createAdminClient`) for status transitions and notifications — bypasses RLS  
**SSR client** (`createClient`) for data reads in Server Components  
**Browser client** (`createBrowserClient`) in Client Components  
**`cn()`** from `lib/utils` for all conditional classNames  
**`formData.getAll('file')`** for multi-file uploads (not `get`)  
**Types** always from `lib/types/database.types.ts` (Supabase generated)  
**Status constants** defined in `lib/types/order.ts` as `const` object

---

## 12. Design System

### Color palette (`tailwind.config.ts`)

```ts
navy:    { 950: '#0F1F35', 900: '#1E3A5F', 800: '#2A4E7F', 700: '#2E6DA4', 100: '#D5E8F0', 50: '#EBF4FF' }
surface: { DEFAULT: '#FFFFFF', secondary: '#F8F9FC', tertiary: '#F1F5F9' }
border:  { DEFAULT: '#E2E8F0', strong: '#CBD5E1' }
text:    { primary: '#0F172A', secondary: '#475569', muted: '#94A3B8' }
```

### Status badge colors (`lib/utils/status.ts`)

```ts
pending_re_confirmation:      'bg-slate-100 text-slate-700'
pending_re_payment:           'bg-amber-50 text-amber-700'
pending_re_receipt:           'bg-amber-50 text-amber-700'
re_in_progress:               'bg-blue-50 text-blue-700'
pending_price_estimation:     'bg-blue-50 text-blue-700'
pending_part_payment:         'bg-amber-50 text-amber-700'
pending_payment_confirmation: 'bg-amber-50 text-amber-700'
finding_workshop:             'bg-purple-50 text-purple-700'
in_production:                'bg-indigo-50 text-indigo-700'
pending_qc:                   'bg-orange-50 text-orange-700'
qc_failed_cancelled:          'bg-red-50 text-red-700'
cancelled_refunded:           'bg-red-50 text-red-600'
in_delivery:                  'bg-green-50 text-green-700'
completed:                    'bg-green-100 text-green-800'
```

### Layout

```
┌──────────────────────────────────────────────────┐
│  Sidebar (240px, navy-950 bg)                     │  fixed, full height
│  ┌─ Logo + role pill (role color) ───────────────┐│
│  │ Nav items                                      ││
│  │   inactive: text-white/70, hover:bg-navy-800   ││
│  │   active:   bg-surface-secondary + text-primary││
│  │             + left bar (role accent color)     ││
│  │ Notification bell + avatar (bottom)            ││
│  └────────────────────────────────────────────────┘│
│  Main content (flex-1, bg-surface-secondary)       │
│  ┌─ PageHeader (white bg, border-b) ──────────────┐│
│  │  Title + subtitle | optional right action      ││
│  └────────────────────────────────────────────────┘│
│  ┌─ Content (px-8 pt-7 pb-10) ───────────────────┐│
│  │  Cards: bg-white rounded-xl border border-border││
│  └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Typography
- Page title: `text-lg font-semibold text-text-primary`
- Section heading: `text-base font-medium text-text-primary`
- Body: `text-sm text-text-secondary`
- Label / caption: `text-xs text-text-muted`
- Max weight: `font-semibold` (600) — never `font-bold`

### Spacing
- Page padding: `px-8 pt-7 pb-10`
- Card padding: `p-5` or `p-6`
- Between sections: `space-y-6`
- Between card elements: `space-y-4`
- Form field gap: `space-y-1.5` (label → input)

### Rules
- ✓ White cards on `surface-secondary` page background
- ✓ Navy sidebar, white text
- ✓ Subtle 1px borders (`border-border`)
- ✓ Status badges are pill-shaped with soft background
- ✗ No gradients
- ✗ No drop shadows (use borders instead)
- ✗ No bright accent colors outside status badges + role pills

---

## 13. Notification Messages

```ts
pending_re_payment:           "RE fee confirmed. Please complete your payment."
re_in_progress:               "RE payment received. Reverse Engineering has started."
pending_price_estimation:     "Technical drawing complete. Price estimation is being prepared."
pending_part_payment:         "Price estimation ready. Please complete your payment."
finding_workshop:             "Payment confirmed. We are finding a workshop for your order."
in_production (customer):     "Workshop assigned. Production has started."
in_production (workshop):     "You have a new order from PartBank."
pending_qc:                   "Production complete. Part is under QC inspection."
qc_failed_cancelled:          "Part failed QC. Order cancelled. Refund will be processed."
cancelled_refunded:           "Refund processed. Funds arrive within 1–3 business days."
in_delivery:                  "Part passed QC and is on its way. Tracking: {number}"
completed:                    "Your order is complete. Thank you!"
```

---

## 14. Language

All UI copy in **English**. Indonesian only for proper nouns (brand names, city names, demo account names like "Bengkel Maju Jaya").
