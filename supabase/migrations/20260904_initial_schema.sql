-- Scadenzario Veicoli: initial Supabase schema
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plate text not null,
  make text not null default '',
  model text not null default '',
  registration_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_plate_format check (plate ~ '^[A-Z0-9-]{3,12}$'),
  constraint vehicles_plate_uppercase check (plate = upper(plate)),
  constraint vehicles_make_length check (char_length(make) <= 60),
  constraint vehicles_model_length check (char_length(model) <= 80),
  constraint vehicles_notes_length check (char_length(notes) <= 500),
  constraint vehicles_user_plate_key unique (user_id, plate),
  constraint vehicles_id_user_key unique (id, user_id)
);

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null,
  type text not null check (type in ('Bollo', 'Assicurazione', 'Revisione', 'Altro')),
  expires_on date not null,
  insurer text not null default '',
  policy_number text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_documents_insurer_length check (char_length(insurer) <= 100),
  constraint vehicle_documents_policy_number_length check (char_length(policy_number) <= 80),
  constraint vehicle_documents_notes_length check (char_length(notes) <= 500),
  constraint vehicle_documents_vehicle_owner_fkey foreign key (vehicle_id, user_id) references public.vehicles(id, user_id) on delete cascade
);

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists vehicle_documents_user_id_idx on public.vehicle_documents(user_id);
create index if not exists vehicle_documents_vehicle_owner_idx on public.vehicle_documents(vehicle_id, user_id);
create index if not exists vehicle_documents_user_expiry_idx on public.vehicle_documents(user_id, expires_on);
create index if not exists vehicle_documents_vehicle_expiry_idx on public.vehicle_documents(vehicle_id, expires_on);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_documents_set_updated_at on public.vehicle_documents;
create trigger vehicle_documents_set_updated_at
before update on public.vehicle_documents
for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;
alter table public.vehicle_documents enable row level security;

-- Vehicles: each authenticated user can access only their own rows.
drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own" on public.vehicles
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own" on public.vehicles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own" on public.vehicles
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Documents: user ownership is enforced by RLS and the composite parent foreign key.
drop policy if exists "vehicle_documents_select_own" on public.vehicle_documents;
create policy "vehicle_documents_select_own" on public.vehicle_documents
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "vehicle_documents_insert_own" on public.vehicle_documents;
create policy "vehicle_documents_insert_own" on public.vehicle_documents
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "vehicle_documents_update_own" on public.vehicle_documents;
create policy "vehicle_documents_update_own" on public.vehicle_documents
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "vehicle_documents_delete_own" on public.vehicle_documents;
create policy "vehicle_documents_delete_own" on public.vehicle_documents
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.vehicle_documents from anon, authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.vehicle_documents to authenticated;
