-- Virtual Animal ONLY
-- This schema belongs to a dedicated Supabase project.
-- DO NOT run this migration against the MySkyParcel Supabase project.

create table if not exists public.animals (
  id text primary key,
  name text not null,
  species text not null,
  description text,
  image_url text,
  model_url text,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  rarity text not null default 'common',
  level integer not null default 1 check (level > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_animals (
  user_id uuid not null references auth.users(id) on delete cascade,
  animal_id text not null references public.animals(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, animal_id)
);

alter table public.animals enable row level security;
alter table public.user_animals enable row level security;

-- Public discovery data: only active animals are readable by clients.
drop policy if exists "active animals are readable" on public.animals;
create policy "active animals are readable"
  on public.animals
  for select
  to anon, authenticated
  using (is_active = true);

-- Ownership data is private to the authenticated owner.
drop policy if exists "users can read their animals" on public.user_animals;
create policy "users can read their animals"
  on public.user_animals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can acquire animals for themselves" on public.user_animals;
create policy "users can acquire animals for themselves"
  on public.user_animals
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create index if not exists animals_active_location_idx
  on public.animals (is_active, latitude, longitude);

create index if not exists user_animals_user_idx
  on public.user_animals (user_id);
