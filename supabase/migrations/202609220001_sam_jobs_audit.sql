-- SAM-owned database contract. Apply only to a dedicated SAM Supabase project.
-- Never apply this migration to CreateSoul/CreatorFlow.

create table if not exists public.sam_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'youtube.upload','youtube.seo','facebook.video','instagram.video','tiktok.video'
  )),
  title text not null check (char_length(title) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'awaiting_approval' check (
    status in ('queued','awaiting_approval','running','succeeded','failed')
  ),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  verified_at timestamptz,
  error text
);

create index if not exists sam_jobs_user_created_idx
  on public.sam_jobs(user_id, created_at desc);

create index if not exists sam_jobs_status_idx
  on public.sam_jobs(status);

alter table public.sam_jobs enable row level security;

drop policy if exists "sam_jobs_select_own" on public.sam_jobs;
create policy "sam_jobs_select_own"
  on public.sam_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "sam_jobs_insert_own" on public.sam_jobs;
create policy "sam_jobs_insert_own"
  on public.sam_jobs for insert
  with check (auth.uid() = user_id);

-- State changes and service credentials must never be client-writable.
-- Backend uses a server-side trusted role after authentication/authorization.

create table if not exists public.sam_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.sam_jobs(id) on delete set null,
  event_type text not null,
  action text,
  verification_status text not null check (
    verification_status in ('not_executed','verified','failed','blocked')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sam_audit_user_created_idx
  on public.sam_audit_events(user_id, created_at desc);

alter table public.sam_audit_events enable row level security;

drop policy if exists "sam_audit_select_own" on public.sam_audit_events;
create policy "sam_audit_select_own"
  on public.sam_audit_events for select
  using (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE policies: audit records are backend-only.
