-- 狼人杀 · 阶段2：房间与玩家表
-- 用法：Supabase 后台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 只需执行一次；若提示 publication 已存在可忽略

create table if not exists public.rooms (
  code text primary key,
  created_at timestamptz not null default now(),
  options jsonb not null default '{}'::jsonb
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null check (char_length(name) between 1 and 12),
  joined_at timestamptz not null default now()
);

create index if not exists players_room_code_idx on public.players (room_code);

-- 阶段3：发牌相关列
alter table public.players add column if not exists seat int;
alter table public.players add column if not exists role text;
alter table public.players add column if not exists alive boolean not null default true;

alter table public.rooms enable row level security;
alter table public.players enable row level security;

drop policy if exists "rooms readable" on public.rooms;
drop policy if exists "rooms creatable" on public.rooms;
drop policy if exists "players readable" on public.players;
drop policy if exists "players insertable" on public.players;
drop policy if exists "players deletable" on public.players;

create policy "rooms readable" on public.rooms for select using (true);
create policy "rooms creatable" on public.rooms for insert with check (true);
create policy "players readable" on public.players for select using (true);
create policy "players insertable" on public.players for insert with check (true);
create policy "players deletable" on public.players for delete using (true);
drop policy if exists "players updatable" on public.players;
create policy "players updatable" on public.players for update using (true) with check (true);
drop policy if exists "rooms updatable" on public.rooms;
create policy "rooms updatable" on public.rooms for update using (true) with check (true);

grant select, insert, update on public.rooms to anon;
grant select, insert, update, delete on public.players to anon;

alter publication supabase_realtime add table public.players;
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;

-- 阶段4：夜晚行动 / 白天发言 / 投票
create table if not exists public.game_actions (
  id bigint generated always as identity primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  day int not null default 1,
  step text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  target_seat int,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_actions_room_step_idx
  on public.game_actions (room_code, day, step, created_at);

alter table public.game_actions enable row level security;

drop policy if exists "actions readable" on public.game_actions;
drop policy if exists "actions insertable" on public.game_actions;
drop policy if exists "actions deletable" on public.game_actions;

create policy "actions readable" on public.game_actions for select using (true);
create policy "actions insertable" on public.game_actions for insert with check (true);
create policy "actions deletable" on public.game_actions for delete using (true);

grant select, insert, delete on public.game_actions to anon;
grant usage, select on all sequences in schema public to anon;

do $$
begin
  alter publication supabase_realtime add table public.game_actions;
exception
  when duplicate_object then null;
end $$;

-- 阶段5：玩家 Elo 评分（按昵称永久保存）
create table if not exists public.ratings (
  name text primary key,
  rating int not null default 1500,
  games int not null default 0,
  wins int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

drop policy if exists "ratings readable" on public.ratings;
drop policy if exists "ratings insertable" on public.ratings;
drop policy if exists "ratings updatable" on public.ratings;

create policy "ratings readable" on public.ratings for select using (true);
create policy "ratings insertable" on public.ratings for insert with check (true);
create policy "ratings updatable" on public.ratings for update using (true) with check (true);

grant select, insert, update on public.ratings to anon;
