-- 狼人杀 · 阶段7：历史对局回放
-- 用法：Supabase 后台 → SQL Editor → New query → 整段粘贴 → Run
-- 在 migration-v6.sql 之后执行一次即可
-- 作用：每局结束时由房主把完整对局（含白天发言、狼人夜间讨论、夜间行动、投票、流程记录）写入 replays 表；
--       首页「历史对局」和旁观页的完整回放从这里读取，只有审核通过的登录用户可读/可写。

create table if not exists public.replays (
  id bigint generated always as identity primary key,
  room_code text not null,
  mode text not null default '',
  mode_name text not null default '',
  finished_at timestamptz not null default now(),
  winner text not null default '',
  win_reason text not null default '',
  days int not null default 0,
  players jsonb not null default '[]'::jsonb,
  log jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  rating jsonb
);

create index if not exists replays_finished_idx on public.replays (finished_at desc);
create index if not exists replays_room_idx on public.replays (room_code, finished_at desc);

alter table public.replays enable row level security;

drop policy if exists "replays readable" on public.replays;
drop policy if exists "replays insertable" on public.replays;

create policy "replays readable" on public.replays for select to authenticated
  using (public.is_approved());
create policy "replays insertable" on public.replays for insert to authenticated
  with check (public.is_approved());

revoke all on public.replays from anon;
grant select, insert on public.replays to authenticated;
grant usage, select on all sequences in schema public to authenticated;
