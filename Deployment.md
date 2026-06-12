# PartBank MVP — Deployment Guide

## Platform: Vercel (recommended)

Vercel is the natural host for Next.js 14 App Router projects. Server Actions, middleware, and edge functions all work with zero config. Free tier is more than sufficient for a demo.

> **Why not Docker?** Docker + a container host (Railway, Fly.io, etc.) adds a Dockerfile, `output: 'standalone'` config, and manual container management — extra complexity with no benefit for a demo. Use Docker if you ever need to self-host on your own infrastructure.

---

## Prerequisites

- [ ] Supabase project created ✅ (already done)
- [ ] Supabase schema applied + demo data seeded ✅ (already done)
- [ ] Supabase Storage buckets created (`receipts`, `drawings`, `references`)
- [ ] GitHub account
- [ ] Vercel account (free) — vercel.com

---

## Step 1 — Push to GitHub

```bash
# In the project root
git init   # already done
git add .
git commit -m "Initial commit — PartBank MVP"

# Create a new repo on github.com (private), then:
git remote add origin https://github.com/<your-username>/partbank-mvp.git
git branch -M main
git push -u origin main
```

**Before committing, verify `.env.local` is NOT staged:**
```bash
git status   # should NOT list .env.local
```

---

## Step 2 — Get Supabase Credentials

In your Supabase dashboard → **Project Settings → API**:

| Variable | Where to find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project API Keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API Keys → `service_role` (keep secret) |

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → connect GitHub → select `partbank-mvp`
3. Framework preset: **Next.js** (auto-detected)
4. Leave build settings as-is (Vercel handles Next.js automatically)
5. Open **Environment Variables** section — add all three:

```
NEXT_PUBLIC_SUPABASE_URL             = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY            = eyJ...
```

6. Click **Deploy**

Build takes ~1–2 minutes. Vercel assigns a URL like `partbank-mvp.vercel.app`.

---

## Step 4 — Supabase Auth Callback URL

After deployment, add your Vercel URL to Supabase's allowed redirect URLs:

1. Supabase dashboard → **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://partbank-mvp.vercel.app/**
   ```
3. Set **Site URL** to:
   ```
   https://partbank-mvp.vercel.app
   ```

---

## Step 5 — Post-Deploy Verification

Run through these checks on the live URL:

**Auth**
- [ ] `buyer@buyer.com` / `password` → logs in, lands on `/catalog`
- [ ] `workshop@bengkel.com` / `password` → logs in, lands on `/workshop/dashboard`
- [ ] `internal@partbank.com` / `password` → logs in, lands on `/internal/dashboard`
- [ ] Wrong role URL redirects to login (e.g. buyer accessing `/internal/dashboard`)

**Core flows**
- [ ] Catalog loads: brands → models → categories → parts
- [ ] Internal orders list shows the seeded demo order
- [ ] Order detail page loads with status timeline
- [ ] Notification bell fetches and displays unread count

**Files**
- [ ] File upload works (upload a small image as a receipt)
- [ ] Signed URL download works for technical drawings

**Build sanity**
- [ ] No 500 errors in Vercel function logs (check: Vercel dashboard → Deployments → Functions)
- [ ] No errors in browser console

---

## Redeployment

Every `git push` to `main` triggers an automatic redeploy. No manual steps needed.

```bash
git add .
git commit -m "fix: ..."
git push
```

---

## Custom Domain (optional, for demo polish)

1. Vercel dashboard → your project → **Settings → Domains**
2. Add domain → follow DNS instructions from your registrar
3. Add new domain to Supabase redirect URLs (same as Step 4)

---

## Environment Variables Reference

| Variable | Required | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client + Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server only (never expose to client) |
