-- Chart Academy: one row per user. Run this in the Supabase SQL editor.
--
-- progress holds the same JSON the app keeps in localStorage, so a signed-in
-- student's path, hearts, XP, streak and mastery follow them between devices.
-- plan is read by the paywall (free | premium); nothing in the app can write it,
-- only the Stripe webhook (later) with the service role key.

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text,
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  progress    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read and write their own row, but never the plan column
-- (enforced by the trigger below, since RLS can't restrict columns).
create policy "own row: select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own row: insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer as $$
begin
  -- Only the service role (webhooks, admin) may change the plan.
  if tg_op = 'UPDATE' and new.plan is distinct from old.plan
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'plan is read-only';
  end if;
  if tg_op = 'INSERT' and new.plan <> 'free'
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    new.plan := 'free';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- Create the row the moment a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, email) values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
