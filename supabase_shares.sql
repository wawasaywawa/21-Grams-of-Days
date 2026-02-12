-- 1. 创建 shares 表（邀请链接：from 发起，to 通过链接接受后填入）
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete set null,
  invite_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. shares RLS
alter table public.shares enable row level security;

create policy "Users can create invite (insert own)"
on public.shares for insert
to authenticated
with check (from_user_id = auth.uid());

create policy "Users can read shares they are part of"
on public.shares for select
to authenticated
using (
  from_user_id = auth.uid() or to_user_id = auth.uid()
);

-- 接受邀请：仅可更新 to_user_id 为空的 pending 行，且更新后 to_user_id = 自己
create policy "Users can accept pending invite"
on public.shares for update
to authenticated
using (to_user_id is null and status = 'pending')
with check (to_user_id = auth.uid() and status = 'accepted');

-- 3. memories 表增加策略：可读自己的 + 伴侣的（已接受 shares 的对方）
create policy "Users can read partner memories"
on public.memories for select
to authenticated
using (
  user_id = auth.uid()
  or user_id in (
    select case when from_user_id = auth.uid() then to_user_id else from_user_id end
    from public.shares
    where status = 'accepted' and (from_user_id = auth.uid() or to_user_id = auth.uid())
  )
);
