-- 定时发送：letters 表增加 scheduled_at，null 表示立即发送
alter table public.letters
add column if not exists scheduled_at timestamptz default null;

comment on column public.letters.scheduled_at is '定时发送时间，null 表示立即发送；收件人仅在 scheduled_at <= now() 时可见';
