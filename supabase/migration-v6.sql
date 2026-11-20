-- 狼人杀 · 阶段 v6：人机玩家 + 封禁机制
-- 用法：Supabase 后台 → 左侧 SQL Editor → New query → 整段粘贴 → Run
-- 在 migration-v5.sql 之后执行一次即可

-- 1) 玩家表增加“人机”标记（人机由房主引擎代为行动，不会发言）
alter table public.players add column if not exists is_bot boolean not null default false;

-- 2) 账号状态允许 banned（已封禁）
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'banned'));

-- 3) 更新保护：管理员可以封禁普通成员，但只有站长能解封；站长账号不可封禁
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
  if new.status = 'banned' and old.role = 'owner' then
    raise exception '管理员不能封禁站长';
  end if;
  if old.status = 'banned' and new.status <> 'banned' and not public.is_owner() then
    raise exception '只有站长可以解封账号';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update before update on public.profiles
for each row execute function public.profiles_guard_update();
