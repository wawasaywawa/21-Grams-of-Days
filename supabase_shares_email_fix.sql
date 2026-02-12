-- 被邀请人看不到横幅时用：用函数安全地取当前用户邮箱，并做大小写不敏感匹配

-- 1. 在 public 里建一个能读 auth.users 的函数（RLS 里可直接用）
create or replace function public.current_user_email()
returns text
language sql
security definer
set search_path = public
as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

-- 2. 用该函数重写「读取发给自己的邀请」策略（大小写不敏感）
drop policy if exists "Users can read invites sent to their email" on public.shares;
create policy "Users can read invites sent to their email"
on public.shares for select
to authenticated
using (
  lower(trim(to_email)) = public.current_user_email()
);

-- 3. 接受邀请策略也改为用函数 + 大小写不敏感
drop policy if exists "Users can accept pending invite" on public.shares;
create policy "Users can accept pending invite"
on public.shares for update to authenticated
using (
  to_user_id is null and status = 'pending'
  and lower(trim(to_email)) = public.current_user_email()
)
with check (to_user_id = auth.uid() and status = 'accepted');

-- 4. 拒绝（删除）邀请策略
drop policy if exists "Users can delete pending invite sent to their email" on public.shares;
create policy "Users can delete pending invite sent to their email"
on public.shares for delete to authenticated
using (
  status = 'pending' and lower(trim(to_email)) = public.current_user_email()
);
