create extension if not exists pgcrypto;

create table if not exists public.audit_reports (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  email text not null,
  tool_name text not null,
  plan text not null,
  monthly_spend numeric not null,
  seats integer not null,
  team_size text not null,
  use_case text not null,
  recommendations jsonb not null default '[]'::jsonb,
  total_monthly_savings numeric not null default 0,
  total_annual_savings numeric not null default 0,
  summary_text text,
  summary_source text,
  created_at timestamptz not null default now()
);

alter table public.audit_reports
  add column if not exists public_id uuid default gen_random_uuid();

update public.audit_reports
set public_id = gen_random_uuid()
where public_id is null;

alter table public.audit_reports
  alter column public_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_reports_public_id_key'
  ) then
    alter table public.audit_reports
      add constraint audit_reports_public_id_key unique (public_id);
  end if;
end $$;

create index if not exists audit_reports_email_idx on public.audit_reports (email);
create index if not exists audit_reports_created_at_idx on public.audit_reports (created_at desc);
create index if not exists audit_reports_public_id_idx on public.audit_reports (public_id);
