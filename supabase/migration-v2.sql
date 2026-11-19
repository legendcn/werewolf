-- 狼人杀 · 阶段3：发牌（座位 / 身份 / 存活）
-- 用法：Supabase 后台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 在 schema.sql 之后执行一次即可

alter table public.players add column if not exists seat int;
alter table public.players add column if not exists role text;
alter table public.players add column if not exists alive boolean not null default true;

-- 房主发牌时要更新其他玩家的 role/seat/alive
drop policy if exists "players updatable" on public.players;
create policy "players updatable" on public.players for update using (true) with check (true);
grant update on public.players to anon;

-- 房间 options 里记录板子和阶段（waiting / assigned）
drop policy if exists "rooms updatable" on public.rooms;
create policy "rooms updatable" on public.rooms for update using (true) with check (true);
grant update on public.rooms to anon;

-- 房间阶段变化走实时推送；已添加过会报 duplicate，忽略
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;
