-- TE Sales Dashboard — ข่าวสารโอกาสงานประจำสัปดาห์ (news_reports · phase 3.14)
--
-- เก็บรายงาน HTML ที่สร้างจาก Claude Code รายสัปดาห์ (เช่น DOS Water Opportunity Radar)
-- แล้วเอาไปแสดงเป็น "การ์ดข่าวใหม่" การ์ดแรกในแถบแหล่งงาน (F7)
--
-- 🔒 ทำไมเก็บใน DB ไม่ใช่ใน repo:
--    repo เป็น public — รายงานมี target list / วิธีเข้าหา / วิเคราะห์คู่แข่ง ของ DOS
--    ถ้าวางเป็นไฟล์ใน docs/ คู่แข่งเปิดอ่านได้หมด · เก็บใน Supabase = เห็นเฉพาะคนที่ล็อกอิน
--
-- สิทธิ์:
--    อ่าน  — ทุกคนที่ล็อกอิน (ทั้งทีม)
--    เขียน/ลบ — admin เท่านั้น (บังคับที่ RLS ไม่ใช่แค่ที่ UI)
--
-- วิธีรัน: วางไฟล์นี้ใน Supabase → SQL Editor → Run (รันซ้ำได้ ปลอดภัย)

create table if not exists news_reports (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  week_label   text,                                   -- ป้ายอ่านง่าย เช่น "26 ก.ค. 2569"
  report_date  date not null default current_date,     -- ใช้เรียงใหม่→เก่า
  html         text not null,                          -- ไฟล์ HTML ทั้งไฟล์ (self-contained)
  is_active    boolean not null default true,          -- ปิดไม่ให้แสดง โดยไม่ต้องลบ
  created_by   uuid references profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_news_reports_date on news_reports(report_date desc);

alter table news_reports enable row level security;

drop policy if exists news_select on news_reports;
drop policy if exists news_write  on news_reports;

-- อ่าน: ทุกคนที่ล็อกอิน
create policy news_select on news_reports
  for select to authenticated
  using (true);

-- เพิ่ม/แก้/ลบ: admin เท่านั้น (is_admin() นิยามไว้ใน policies.sql)
create policy news_write on news_reports
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on news_reports to authenticated;
revoke all on news_reports from anon;
