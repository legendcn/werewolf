-- 狼人杀 · 阶段5：玩家 Elo 评分
-- 用法：Supabase 后台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 在 schema.sql / migration-v3.sql 之后执行一次即可

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
