-- Lab-only demo access gate: time-boxed invitation keys.
-- A key unlocks the one-click demo account logins on the login page until it expires.
-- Generate keys with: node supabase/scripts/generate-invite.mjs --days=<n> [--env=lab]
-- Validation happens server-side via the /api/demo-invite route (service role only).

create table if not exists public.demo_invitations (
  key         text primary key,
  label       text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Fast lookup of live keys.
create index if not exists demo_invitations_expires_at_idx
  on public.demo_invitations (expires_at);

-- Locked down: no client (anon/authenticated) access. Reads/writes go through the
-- service-role API route only, which bypasses RLS. Enabling RLS with no policies
-- means nothing is readable by ordinary clients.
alter table public.demo_invitations enable row level security;
