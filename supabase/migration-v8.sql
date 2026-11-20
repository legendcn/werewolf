-- Server-referee v8 (NOT the upstream browser-writer replay grant of the same name).
-- Run after v7, in a maintenance window. Legacy rooms remain archived: their
-- player IDs cannot safely be associated with authenticated accounts.
begin;
do $$ begin
  if to_regclass('public.replays') is null then
    raise exception '缺少回放表，请先完成 migration-v7.sql';
  end if;
end $$;
alter table public.rooms add column if not exists protocol integer;
alter table public.rooms add column if not exists revision bigint not null default 0;
alter table public.players add column if not exists account_id uuid references auth.users(id);
alter table public.players add column if not exists last_seen timestamptz not null default now();
alter table public.players add column if not exists departed boolean not null default false;
create unique index if not exists players_room_account on public.players(room_code, account_id) where account_id is not null;
alter table public.game_actions add column if not exists match_id uuid;
alter table public.game_actions add column if not exists phase text;
create index if not exists actions_match_step on public.game_actions(match_id,step,id);
alter table public.replays add column if not exists match_id uuid unique;

-- The game Edge Function is the sole writer/referee. Neither a player's JWT
-- nor the public API key has access to the raw game tables (including roles).
revoke all on public.rooms, public.players, public.game_actions, public.replays, public.ratings, public.profiles from public, anon, authenticated;
-- Defense in depth: an accidental future GRANT must not restore the v5 policies.
drop policy if exists "rooms readable" on public.rooms;
drop policy if exists "rooms creatable" on public.rooms;
drop policy if exists "rooms updatable" on public.rooms;
drop policy if exists "players readable" on public.players;
drop policy if exists "players insertable" on public.players;
drop policy if exists "players updatable" on public.players;
drop policy if exists "players deletable" on public.players;
drop policy if exists "actions readable" on public.game_actions;
drop policy if exists "actions insertable" on public.game_actions;
drop policy if exists "actions deletable" on public.game_actions;
drop policy if exists "ratings insertable" on public.ratings;
drop policy if exists "ratings updatable" on public.ratings;
drop policy if exists "replays insertable" on public.replays;
drop policy if exists "profiles insert self" on public.profiles;
-- Repair v0.15 replay reads without ever authorizing browser inserts.
grant usage on schema public to authenticated;
alter table public.replays enable row level security;
drop policy if exists "replays readable" on public.replays;
create policy "replays readable" on public.replays for select to authenticated using (public.is_approved());
grant select on public.replays, public.ratings, public.profiles to authenticated;
grant update(role,status) on public.profiles to authenticated;
-- A table privilege is not needed for player presence; don't broadcast secrets.
do $$ declare t text; begin
  foreach t in array array['rooms','players','game_actions'] loop
    if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime drop table public.%I',t);
    end if;
  end loop;
end $$;

create or replace function public.is_owner() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and status='approved');
$$;
create or replace function public.profiles_guard_insert() returns trigger language plpgsql set search_path='' as $$
begin
  new.role := 'member'; new.status := 'pending'; return new;
end $$;
create or replace function public.profiles_guard_update() returns trigger language plpgsql set search_path='' as $$
begin
  if new.id <> old.id or new.username <> old.username then raise exception '账号身份不可修改'; end if;
  -- SQL Editor / trusted migration only. No browser can provision an owner.
  if auth.uid() is null then return new; end if;
  if old.role='owner' or new.role='owner' then raise exception '站长须由数据库管理员设置'; end if;
  if not public.is_owner() and (old.role='admin' or new.role<>old.role or old.status='banned') then
    raise exception '权限不足';
  end if;
  return new;
end $$;

-- The auth record and profile are inserted by the SAME PostgreSQL transaction.
create or replace function public.wolf_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare n text := new.raw_user_meta_data->>'wolf_username'; begin
  if n is null then return new; end if;
  if n !~ '^[一-龥A-Za-z0-9_]{2,12}$' or new.email is distinct from
    'u_'||left(encode(sha256(convert_to('wolf:'||lower(n),'UTF8')),'hex'),24)||'@werewolf.local'
    then raise exception '用户名或登录标识无效'; end if;
  insert into public.profiles(id,username) values(new.id,n);
  return new;
end $$;
drop trigger if exists wolf_signup_profile on auth.users;
create trigger wolf_signup_profile after insert on auth.users for each row execute function public.wolf_signup_profile();
-- Recovery for users created by old clients whose profile insert failed.
create or replace function public.repair_wolf_profile(n text) returns void language plpgsql security definer set search_path='' as $$
begin
  if n is null or n !~ '^[一-龥A-Za-z0-9_]{2,12}$' or not exists(select 1 from auth.users where id=auth.uid() and
    email='u_'||left(encode(sha256(convert_to('wolf:'||lower(n),'UTF8')),'hex'),24)||'@werewolf.local')
    then raise exception '用户名与登录账号不符'; end if;
  insert into public.profiles(id,username) values(auth.uid(),n) on conflict(id) do nothing;
end $$;
revoke all on function public.wolf_signup_profile(), public.repair_wolf_profile(text) from public, anon, authenticated;
grant execute on function public.repair_wolf_profile(text) to authenticated;
notify pgrst, 'reload schema';
commit;
