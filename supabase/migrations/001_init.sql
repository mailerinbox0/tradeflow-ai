-- TradeFlow AI initial schema (Supabase / PostgreSQL)
-- Apply via: supabase db push  OR  run in SQL editor

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  country text not null default '',
  phone text,
  avatar_url text,
  account_status text not null default 'active'
    check (account_status in ('active','suspended','restricted','deleted')),
  role text not null default 'user'
    check (role in ('user','employee','admin')),
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  force_password_change boolean not null default false,
  payment_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance_usd numeric(18,2) not null default 0 check (balance_usd >= 0),
  total_profit numeric(18,2) not null default 0,
  total_deposits numeric(18,2) not null default 0,
  total_withdrawals numeric(18,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.crypto_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  enabled boolean not null default true
);

create table if not exists public.crypto_networks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.crypto_assets(id) on delete cascade,
  network text not null,
  min_deposit numeric(18,8) not null default 0,
  min_withdrawal numeric(18,8) not null default 0,
  deposit_address text,
  unique(asset_id, network)
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(18,2) not null check (amount_usd > 0),
  asset_symbol text not null,
  network text not null,
  payment_address text not null,
  reference_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending','confirming','confirmed','expired','cancelled')),
  tx_hash text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(18,2) not null check (amount_usd > 0),
  asset_symbol text not null,
  network text not null,
  destination_address text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pair text not null,
  amount_usd numeric(18,2) not null check (amount_usd > 0),
  duration_seconds int not null,
  status text not null default 'active'
    check (status in ('active','won','lost','cancelled')),
  result_pnl numeric(18,2) not null default 0,
  -- Max loss never exceeds 10% of stake
  max_loss_pct numeric(5,2) not null default 10,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  settled_at timestamptz
);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('deposit','withdrawal','trade','funding','cashout')),
  message text not null,
  amount_usd numeric(18,2),
  is_public boolean not null default true,
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'extension',
  campaign_status text not null default 'queued'
    check (campaign_status in ('queued','sending','sent','unsubscribed','bounced')),
  created_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  country text not null,
  phone text,
  experience text,
  resume_url text,
  social_links text,
  status text not null default 'submitted'
    check (status in ('submitted','interview_scheduled','interviewing','ai_recommended','approved','rejected')),
  interview_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  role text not null check (role in ('assistant','applicant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('user_support','applicant','employee')),
  user_id uuid references public.profiles(id),
  application_id uuid references public.job_applications(id),
  admin_id uuid references public.profiles(id),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_role text not null check (sender_role in ('user','admin','ai','system')),
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram','tiktok')),
  -- Only real activity messages (never fabricated)
  activity_id uuid references public.activity_feed(id),
  body text not null,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','skipped')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body_html text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Seed assets
insert into public.crypto_assets (symbol, name) values
  ('BTC','Bitcoin'),('ETH','Ethereum'),('USDT','Tether'),('BNB','BNB'),
  ('SOL','Solana'),('LTC','Litecoin'),('XRP','XRP')
on conflict (symbol) do nothing;

-- RLS placeholders (enable after wiring auth policies)
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.deposits enable row level security;
alter table public.withdrawals enable row level security;
alter table public.trades enable row level security;
alter table public.leads enable row level security;
