-- 狼人杀 · 阶段8：历史回放权限修复（自检）
-- 用法：Supabase 后台 → SQL Editor → New query → 整段粘贴 → Run
-- 在 migration-v7.sql 之后执行一次即可，重复运行也没关系。
-- 现象：首页「历史对局」显示「没有权限读取回放」，或打完一局后首页没有记录。
-- 作用：重新确认 replays 表的读取/写入权限和 RLS 策略，并刷新接口缓存。

do $$
begin
  if to_regclass('public.replays') is null then
    raise exception 'replays 表不存在：请先运行 supabase/migration-v7.sql';
  end if;
end
$$;

grant usage on schema public to authenticated;

alter table public.replays enable row level security;

revoke all on public.replays from anon;

grant select, insert on public.replays to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "replays readable" on public.replays;
drop policy if exists "replays insertable" on public.replays;

create policy "replays readable" on public.replays for select to authenticated
  using (public.is_approved());
create policy "replays insertable" on public.replays for insert to authenticated
  with check (public.is_approved());

notify pgrst, 'reload schema';

-- 自检：现在一共有多少条回放
select count(*) as replay_count from public.replays;
