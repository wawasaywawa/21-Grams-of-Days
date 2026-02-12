-- 邮箱邀请：在 shares 表增加 to_email，并允许被邀请人读取/接受
alter table public.shares
  add column if not exists to_email text;

-- 允许用户读取「发给自己的」待处理邀请（用于显示「有人想与你共享」）
create policy "Users can read invites sent to their email"
on public.shares for select
to authenticated
using (
  to_email = (select email from auth.users where id = auth.uid())
);

-- 仅被邀请人（to_email = 当前用户邮箱）可接受该条邀请
drop policy if exists "Users can accept pending invite" on public.shares;
create policy "Users can accept pending invite"
on public.shares for update to authenticated
using (
  to_user_id is null and status = 'pending'
  and to_email = (select email from auth.users where id = auth.uid())
)
with check (to_user_id = auth.uid() and status = 'accepted');

-- 被邀请人可删除对自己的 pending 邀请（拒绝）
create policy "Users can delete pending invite sent to their email"
on public.shares for delete
to authenticated
using (
  status = 'pending' and to_email = (select email from auth.users where id = auth.uid())
);
