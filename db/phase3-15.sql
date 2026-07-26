-- TE Sales Dashboard — บันทึกการสำรองขึ้น Google Drive (backup_log · task 5)
--
-- Edge Function `daily-backup` เขียนแถวลงตารางนี้ทุกครั้งที่สำรอง (ผ่าน service_role · ข้าม RLS)
-- หน้า Admin อ่านเพื่อโชว์ "สำรองล่าสุด / กำหนดครั้งถัดไป / สถานะ"
--
-- วิธีรัน: วางไฟล์นี้ใน Supabase → SQL Editor → Run
--   จากนั้นตั้งเวลาอัตโนมัติด้วย pg_cron (บล็อกท้ายไฟล์) และ deploy Edge Function (ดู README)

create table if not exists backup_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  file_name      text,
  drive_file_id  text,
  drive_view_url text,
  size_bytes     bigint,
  table_counts   jsonb,
  status         text not null default 'ok',   -- ok | error
  error          text,
  triggered_by   text                          -- 'cron' | 'manual'
);

create index if not exists idx_backup_log_created on backup_log(created_at desc);

alter table backup_log enable row level security;

-- อ่าน: admin เท่านั้น (ดูสถานะการสำรอง) · เขียน: Edge Function ใช้ service_role (ข้าม RLS อยู่แล้ว ไม่ต้องมี policy insert)
drop policy if exists backup_log_select on backup_log;
create policy backup_log_select on backup_log
  for select to authenticated
  using (is_admin());

grant select on backup_log to authenticated;
revoke all on backup_log from anon;

-- ══════════════════════════════════════════════════════════
-- ตั้งเวลาอัตโนมัติ (รันหลัง deploy Edge Function + ตั้ง secrets แล้ว)
--
-- ต้องเปิด 2 extension ก่อน (Supabase → Database → Extensions): pg_cron, pg_net
--   หรือรัน:  create extension if not exists pg_cron;  create extension if not exists pg_net;
--
-- ⚠️ แก้ 2 ค่าให้ตรงโปรเจกต์ก่อนรัน:
--    <PROJECT_REF>  = subdomain ของ Supabase (เช่น ejszfgsecuuysaamvtcn)
--    <BACKUP_CRON_SECRET> = ค่าเดียวกับที่ `supabase secrets set BACKUP_CRON_SECRET=...`
--
-- เวลา '0 19 * * *' (UTC) = 02:00 น. ไทย ทุกวัน  (ปรับได้ตามต้องการ)
-- ══════════════════════════════════════════════════════════

-- select cron.schedule(
--   'daily-drive-backup',
--   '0 19 * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-backup',
--     headers := jsonb_build_object(
--                  'Content-Type', 'application/json',
--                  'x-backup-secret', '<BACKUP_CRON_SECRET>'
--                ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );

-- ยกเลิก/แก้ตารางเวลา:   select cron.unschedule('daily-drive-backup');
-- ดูงานที่ตั้งไว้:        select * from cron.job;
-- ดูประวัติการรัน cron:  select * from cron.job_run_details order by start_time desc limit 20;
