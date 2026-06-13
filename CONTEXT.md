# PartBank MVP — Claude Code Context

> This file is the single source of truth for every Claude Code session.
> Read this before writing any code.

---

## 1. Project Overview

PartBank is a managed digital platform for sourcing rare commercial vehicle spare parts in Indonesia. The platform connects three actors: Buyers (truck owners), Workshops (manufacturers), and Internal PartBank staff.

**MVP goal:** A working end-to-end demo for a business competition. Not production-ready. Judges will roleplay all three actors live.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (fullstack — no separate backend) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (technical drawings + transfer receipts) |
| Deployment | Vercel |

---

## 3. Three Roles

| Role | Description | Access |
|---|---|---|
| `customer` | Truck owners browsing catalog and submitting orders | Own orders only |
| `workshop` | Verified manufacturers receiving and fulfilling orders | Own assigned orders only |
| `internal` | PartBank staff managing everything end-to-end | Full access |

Roles are stored in a `profiles` table linked to `auth.users`. Route protection is handled via Next.js middleware checking the role on every request.

---

## 4. Folder Structure

```
/app
  /(auth)
    /login
    /register
  /(customer)
    /catalog
      /[truckBrand]
        /[model]
          /[partId]
    /orders
      /[orderId]
  /(workshop)
    /dashboard
    /orders
      /[orderId]
  /(internal)
    /dashboard
    /orders
      /[orderId]
    /catalog
    /workshops
  /api
    /orders
    /notifications
    /uploads
/components
  /ui          ← shadcn/ui components only
  /shared      ← shared across roles (StatusBadge, NotificationBell, etc.)
  /customer
  /workshop
  /internal
/lib
  /supabase    ← client, server, middleware helpers
  /types       ← generated + manual types
  /utils       ← cn(), formatters, constants
/hooks         ← custom React hooks
```

---

## 5. Order Status State Machine

This is the core of the platform. Every status change triggers in-app notifications to the relevant parties. Notifications are stored in DB and fetched on page load (polling — no WebSocket).

| # | Status | Triggered By | Notifies |
|---|---|---|---|
| 1 | `pending_re_confirmation` | Customer submits order | Internal |
| 2 | `pending_re_payment` | Internal confirms RE fee | Customer |
| 3 | `pending_re_receipt` | Internal approves RE fee | Customer |
| 4 | `re_in_progress` | Internal confirms RE receipt | Customer |
| 5 | `pending_price_estimation` | Internal uploads drawing + sets price | Customer |
| 6 | `pending_part_payment` | Internal sets price estimation | Customer |
| 7 | `pending_payment_confirmation` | Customer uploads part payment receipt | Internal |
| 8 | `finding_workshop` | Internal confirms part payment | Customer |
| 9 | `in_production` | Internal assigns workshop | Customer + Workshop |
| 10 | `pending_qc` | Workshop marks production complete | Internal + Customer |
| 11 | `qc_failed_cancelled` | Internal marks QC failed | Customer + Workshop |
| 12 | `cancelled_refunded` | Internal clicks Refund Processed | Customer |
| 13 | `in_delivery` | Internal marks QC passed + inputs tracking number | Customer |
| 14 | `completed` | Internal confirms delivered | Customer |

**Rules:**
- Status 11 is final for the order — no re-production loop in MVP
- After status 11, internal manually transfers refund to customer then clicks Refund Processed
- Technical drawing file is only accessible to the assigned workshop after status 9

---

## 6. MVP Feature Scope

### Customer
- [x] Register & login
- [x] Browse catalog (Truck Brand → Model → Category → Part)
- [x] Part detail page with status badge and Request button
- [x] Submit Custom Order form (quantity, notes, optional reference photo)
- [x] Upload transfer receipt (RE fee)
- [x] Upload transfer receipt (part payment)
- [x] Order detail page with status timeline
- [x] In-app notification center (bell icon, polling)

### Workshop
- [x] Register & login (account activated manually by internal)
- [x] Profile form with capability tags
- [x] Direct Order Dashboard (list of assigned orders)
- [x] Order detail: view specs, download technical drawing
- [x] Accept / Reject order
- [x] Mark production complete
- [x] In-app notification center

### Internal
- [x] Login (no public registration)
- [x] All orders dashboard with status filter
- [x] Order detail with full action panel:
  - Confirm RE fee → set amount
  - Confirm RE receipt upload
  - Upload technical drawing
  - Set price estimation
  - Confirm part payment receipt
  - Assign workshop (dropdown of active workshops)
  - Mark QC passed → input tracking number
  - Mark QC failed → input failure notes → order cancelled
  - Mark Refund Processed
  - Mark order completed
- [x] Approve / reject workshop registration
- [x] Catalog management (CRUD: truck brands, models, categories, parts)

### Explicitly NOT in MVP
- Ready-to-Make flow (all orders go through Custom Order)
- Open Bounty Board / RFQ system
- Payment gateway (manual transfer + receipt upload)
- Real-time notifications (WebSocket/SSE)
- Rating & review system
- Analytics dashboard
- Quality Tier progression
- Ready Stock / inventory

---

## 7. Key Database Tables

```sql
profiles          -- extends auth.users, stores role + workshop metadata
truck_brands      -- catalog: brands (Hino, Mitsubishi Fuso, etc.)
truck_models      -- catalog: models per brand
part_categories   -- catalog: categories per model
parts             -- catalog: individual parts with status + drawing ref
orders            -- core: links customer + part + workshop + status
order_events      -- audit log: every status change with timestamp + actor
notifications     -- in-app: user_id, message, is_read, order_id
files             -- references to Supabase Storage objects
```

---

## 8. Notification Rules

Notifications are plain text stored in the `notifications` table. They are created server-side (in API routes or Server Actions) whenever an order status changes.

```ts
// Example notification messages per status
pending_re_payment:        "RE fee confirmed. Please complete your payment."
re_in_progress:            "RE payment received. Reverse Engineering process has started."
pending_price_estimation:  "Technical drawing complete. Price estimation is being prepared."
pending_part_payment:      "Price estimation ready. Please complete your payment."
in_production:             "Workshop assigned. Production has started."          // → customer
in_production:             "You have a new order from PartBank."                 // → workshop
pending_qc:                "Part is under PartBank QC inspection."
qc_failed_cancelled:       "Part failed QC. Order has been cancelled. Refund will be processed shortly."
cancelled_refunded:        "Refund has been processed. Funds will arrive within 1–3 business days."
in_delivery:               "Part passed QC and is on its way. Tracking: {tracking}"
completed:                 "Your order is complete. Thank you!"
```

---

## 9. Row Level Security Rules (Supabase)

```
orders:        customer sees own orders | workshop sees assigned orders | internal sees all
notifications: user sees own notifications only
files:         drawing files accessible to assigned workshop (status >= in_production) + internal
profiles:      user sees own profile | internal sees all
parts:         all authenticated users can read | only internal can write
```

---

## 10. Language

**All UI copy must be in English.** This includes: labels, buttons, page titles, error messages, empty states, notification messages, status labels, and any other user-facing text. Indonesian is only used for proper nouns (e.g. company/brand names like "Hino", "Mitsubishi Fuso", demo account names like "Bengkel Maju Jaya").

---

## 11. Design System

### Visual Style
Clean & professional B2B. Dark navy sidebar, white content area. Feels like a reliable industrial platform — not a startup SaaS template.

### Color Palette

```ts
// tailwind.config.ts — extend these
colors: {
  navy: {
    950: '#0F1F35',  // sidebar background
    900: '#1E3A5F',  // sidebar header, primary buttons
    800: '#2A4E7F',  // sidebar hover state
    700: '#2E6DA4',  // links, secondary actions
    100: '#D5E8F0',  // light blue tint backgrounds
    50:  '#EBF4FF',  // subtle blue backgrounds, badges
  },
  surface: {
    DEFAULT: '#FFFFFF',  // main content background
    secondary: '#F8F9FC', // page background, table rows alternate
    tertiary: '#F1F5F9',  // input backgrounds, disabled states
  },
  border: {
    DEFAULT: '#E2E8F0',  // all borders
    strong:  '#CBD5E1',  // table headers, dividers
  },
  text: {
    primary:   '#0F172A',  // headings, important labels
    secondary: '#475569',  // body text, descriptions
    muted:     '#94A3B8',  // placeholder, timestamps
  },
}
```

### Status Badge Colors
Every order status must use one of these — consistent across all three dashboards.

```ts
// lib/utils/status.ts
export const STATUS_COLORS = {
  pending_re_confirmation:   'bg-slate-100 text-slate-700',
  pending_re_payment:        'bg-amber-50 text-amber-700',
  pending_re_receipt:        'bg-amber-50 text-amber-700',
  re_in_progress:            'bg-blue-50 text-blue-700',
  pending_price_estimation:  'bg-blue-50 text-blue-700',
  pending_part_payment:      'bg-amber-50 text-amber-700',
  pending_payment_confirmation: 'bg-amber-50 text-amber-700',
  finding_workshop:          'bg-purple-50 text-purple-700',
  in_production:             'bg-indigo-50 text-indigo-700',
  pending_qc:                'bg-orange-50 text-orange-700',
  qc_failed_cancelled:       'bg-red-50 text-red-700',
  cancelled_refunded:        'bg-red-50 text-red-600',
  in_delivery:               'bg-green-50 text-green-700',
  completed:                 'bg-green-100 text-green-800',
} as const
```

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Sidebar (240px, navy-950)                       │  ← fixed, full height
│  ┌─────────────────────────────────────────────┐│
│  │ Logo + role label (navy-900 header)          ││
│  │─────────────────────────────────────────────││
│  │ Nav items (white text, navy-800 on hover)    ││
│  │ Active: white bg + navy-900 text             ││
│  │─────────────────────────────────────────────││
│  │ Notification bell + user avatar (bottom)     ││
│  └─────────────────────────────────────────────┘│
│  Main content (flex-1, surface-secondary bg)     │
│  ┌─────────────────────────────────────────────┐│
│  │ Page header (white bg, border-bottom)        ││
│  │ Title + subtitle + action button (right)     ││
│  │─────────────────────────────────────────────││
│  │ Content area (padding 24px)                  ││
│  │ Cards use white bg + border + rounded-lg     ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Component Rules

**Sidebar nav item:**
```tsx
// active
<div className="flex items-center gap-3 px-3 py-2 rounded-md bg-white text-navy-900 font-medium text-sm">
// inactive
<div className="flex items-center gap-3 px-3 py-2 rounded-md text-white/70 hover:bg-navy-800 hover:text-white text-sm">
```

**Page header:**
```tsx
<div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
  <div>
    <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
    <p className="text-sm text-text-secondary">{subtitle}</p>
  </div>
  {action}
</div>
```

**Content card:**
```tsx
<div className="bg-white rounded-lg border border-border p-5">
```

**Primary button:**
```tsx
<Button className="bg-navy-900 hover:bg-navy-800 text-white">
```

**Table:**
```tsx
// header row: bg-surface-secondary, text-text-secondary text-xs uppercase tracking-wide
// data rows: white bg, hover:bg-surface-secondary
// all rows: border-b border-border
```

### Typography
- Font: Inter (Next.js default) or Geist Sans
- Page title: `text-lg font-semibold text-text-primary`
- Section heading: `text-base font-medium text-text-primary`
- Body: `text-sm text-text-secondary`
- Label / caption: `text-xs text-text-muted`
- Never use font-bold (700) — use font-semibold (600) max

### Spacing
- Page padding: `p-6`
- Card padding: `p-5`
- Between sections: `space-y-6`
- Between card elements: `space-y-4`
- Form field gap: `space-y-2` (label → input)

### Do's and Don'ts
- ✓ White cards on light gray page background
- ✓ Navy sidebar with white text
- ✓ Subtle borders (1px, border-border color)
- ✓ Status badges are pill-shaped with soft background
- ✓ Tables have alternating row hover states
- ✗ No gradients anywhere
- ✗ No colored page backgrounds (only surface-secondary)
- ✗ No rounded-full on non-pill elements
- ✗ No drop shadows (use borders instead)
- ✗ No bright accent colors outside of status badges

---

## 11. Conventions

- **Server Actions** for all mutations (form submissions, status changes)
- **Server Components** by default, `'use client'` only when needed (interactivity, hooks)
- **`/api` routes** only for file uploads and notification fetch
- **`cn()`** from `lib/utils` for all conditional classNames
- **Supabase SSR client** (`createServerClient`) in Server Components and Actions
- **Supabase browser client** (`createBrowserClient`) in Client Components
- **Types:** always use generated Supabase types from `lib/types/database.types.ts`
- **Error handling:** all Server Actions return `{ data, error }` — never throw
- **Status constants:** define all 14 statuses as a const enum in `lib/types/order.ts`

---

## 11. Demo Accounts (seed data)

```
internal@partbank.com   / password: password   / role: internal
workshop@bengkel.com    / password: password   / role: workshop
buyer@buyer.com         / password: password      / role: customer
```

Seed data includes: 3 truck brands, 2 models each, 3 categories each, 3–5 parts each.
```
