-- Runtime snapshot for the Next.js app (bridges demo-store → durable Postgres on Fly)
-- until full table-by-table API migration is complete.

create table if not exists public.app_runtime_state (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_runtime_state enable row level security;

-- No public policies: service role only (server-side)

comment on table public.app_runtime_state is
  'Serialized TradeFlow demo-store snapshot for single-instance Fly deploys';
