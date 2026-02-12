-- 伴侣信件表：建立关系后可互相写信
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists letters_to_user_read_at on public.letters (to_user_id, read_at);

alter table public.letters enable row level security;

-- 只能读自己发出或收到的信
create policy "Users can read own letters"
on public.letters for select to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- 只能以自己身份发信
create policy "Users can send letters"
on public.letters for insert to authenticated
with check (from_user_id = auth.uid());

-- 收件人可更新（用于标记已读 read_at）
create policy "Recipient can update letter"
on public.letters for update to authenticated
using (to_user_id = auth.uid())
with check (to_user_id = auth.uid());
