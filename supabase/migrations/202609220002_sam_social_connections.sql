create table if not exists public.sam_social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube','meta','tiktok')),
  external_account_id text,
  account_name text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, platform)
);

alter table public.sam_social_connections enable row level security;

create policy "sam_social_connections_select_own"
on public.sam_social_connections for select
using (auth.uid() = user_id);

create index if not exists sam_social_connections_user_idx on public.sam_social_connections(user_id);
