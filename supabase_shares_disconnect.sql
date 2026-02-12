-- 允许用户删除自己参与过的 share（用于「取消链接」）
create policy "Users can delete shares they are part of"
on public.shares for delete
to authenticated
using (
  from_user_id = auth.uid() or to_user_id = auth.uid()
);
