-- 狼人杀 · 阶段6：账号、审核与管理员
-- 用法：Supabase 后台 → SQL Editor → New query → 整段粘贴 → Run
-- 在 migration-v4.sql 之后执行一次即可
-- 执行后：先注册用户名 legendcn（自动成为站长），再注册其他账号等待审核

-- 1) 用户资料表（auth.users 只存邮箱和加密后的密码，这里存用户名、角色、审核状态）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- 2) 权限判断函数（security definer 避免 RLS 递归）
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role in ('admin', 'owner')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and username = 'legendcn' and role = 'owner'
  );
$$;

revoke all on function public.is_approved() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- 3) 注册时强制角色与状态：legendcn = 站长且免审核，其余一律待审核
create or replace function public.profiles_guard_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username = 'legendcn' then
    new.role := 'owner';
    new.status := 'approved';
  elsif lower(new.username) = 'legendcn' then
    raise exception '该用户名已被保留';
  else
    new.role := 'member';
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert before insert on public.profiles
for each row execute function public.profiles_guard_insert();

-- 4) 更新保护：用户名不可改；站长账号不可改；只有站长能设置/取消管理员
create or replace function public.profiles_guard_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username <> old.username then
    raise exception '用户名不可修改';
  end if;
  if old.username = 'legendcn' then
    raise exception '站长账号不可修改';
  end if;
  if old.role in ('admin', 'owner') and not public.is_owner() then
    raise exception '只有站长可以修改管理员账号';
  end if;
  if new.role <> old.role and not public.is_owner() then
    raise exception '只有站长可以设置管理员';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update before update on public.profiles
for each row execute function public.profiles_guard_update();

-- 5) 注册前查重（匿名可调用，只返回是否存在）
create or replace function public.username_taken(name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

revoke all on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;

-- 6) profiles 权限：本人可读，管理员可读全部；本人只能创建自己；只有管理员能改
drop policy if exists "profiles select" on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
drop policy if exists "profiles update admin" on public.profiles;

create policy "profiles select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update admin" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.profiles to authenticated;

-- 7) 游戏数据表收紧：只有审核通过的登录用户可读写
drop policy if exists "rooms readable" on public.rooms;
drop policy if exists "rooms creatable" on public.rooms;
drop policy if exists "rooms updatable" on public.rooms;
create policy "rooms readable" on public.rooms for select to authenticated
  using (public.is_approved());
create policy "rooms creatable" on public.rooms for insert to authenticated
  with check (public.is_approved());
create policy "rooms updatable" on public.rooms for update to authenticated
  using (public.is_approved()) with check (public.is_approved());

drop policy if exists "players readable" on public.players;
drop policy if exists "players insertable" on public.players;
drop policy if exists "players updatable" on public.players;
drop policy if exists "players deletable" on public.players;
create policy "players readable" on public.players for select to authenticated
  using (public.is_approved());
create policy "players insertable" on public.players for insert to authenticated
  with check (public.is_approved());
create policy "players updatable" on public.players for update to authenticated
  using (public.is_approved()) with check (public.is_approved());
create policy "players deletable" on public.players for delete to authenticated
  using (public.is_approved());

drop policy if exists "actions readable" on public.game_actions;
drop policy if exists "actions insertable" on public.game_actions;
drop policy if exists "actions deletable" on public.game_actions;
create policy "actions readable" on public.game_actions for select to authenticated
  using (public.is_approved());
create policy "actions insertable" on public.game_actions for insert to authenticated
  with check (public.is_approved());
create policy "actions deletable" on public.game_actions for delete to authenticated
  using (public.is_approved());

drop policy if exists "ratings readable" on public.ratings;
drop policy if exists "ratings insertable" on public.ratings;
drop policy if exists "ratings updatable" on public.ratings;
create policy "ratings readable" on public.ratings for select to authenticated
  using (public.is_approved());
create policy "ratings insertable" on public.ratings for insert to authenticated
  with check (public.is_approved());
create policy "ratings updatable" on public.ratings for update to authenticated
  using (public.is_approved()) with check (public.is_approved());

-- 8) 权限授予：登录用户（authenticated）可访问，匿名（anon）不再拥有游戏表权限
revoke all on public.rooms, public.players, public.game_actions, public.ratings from anon;
revoke all on public.profiles from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update on public.rooms to authenticated;
grant select, insert, update, delete on public.players to authenticated;
grant select, insert, delete on public.game_actions to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update on public.ratings to authenticated;
