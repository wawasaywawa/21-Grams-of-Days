-- 用户资料表：用于显示用户名，界面中可用用户名替换「ta」
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  updated_at timestamptz default now()
);

create unique index if not exists profiles_username_key on public.profiles (username) where username is not null;

alter table public.profiles enable row level security;

-- 所有人可读（用于展示对方用户名）
create policy "Profiles are viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

-- 仅能更新自己的资料
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());
