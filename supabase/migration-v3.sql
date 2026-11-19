-- 狼人杀 · 阶段4：完整对局（夜晚行动 / 白天发言 / 投票）
-- 用法：Supabase 后台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 只需执行一次；可重复执行

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
