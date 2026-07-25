-- TE Sales Dashboard — step 3.13
-- เป้ารายเดือน "รายคน" (per-sale) — ต่อยอดจากเป้ารายทีม (team_targets)
--
-- ⚠️ ห้ามใส่ข้อมูลลูกค้าจริงในไฟล์นี้ — repo เป็น public
--
-- เจ้าของขอ (25 ก.ค. 2569): ตั้งเป้ารายเดือนต่อ "คน" ได้ด้วย (นอกจากต่อทีม)
--   sum เป้ารายคน = ดูเทียบกับเป้าทีม · โชว์มิติ "รายคน" ในหน้า drill-down เป้า
--
-- โครงเหมือน team_targets เป๊ะ แค่คีย์เป็น profile_id แทน team_id · period='YYYY-MM'
--   (เป้าทีมยังเป็นตัวหลักที่ใช้รวมบน dashboard · เป้ารายคนเป็นการซอยย่อยในทีม)
--
-- ต้องรัน schema.sql · policies.sql · phase2.sql · phase2-4.sql · phase3-10.sql มาก่อน
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run · รันซ้ำได้ทั้งไฟล์
-- (ไม่รันก็ยังใช้ระบบได้ — adapter จะคืนรายการว่างถ้ายังไม่มีตาราง)

create table if not exists sale_targets (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  period      text not null default 'H2-2026',   -- 'YYYY-MM' = เป้ารายเดือน
  target_baht numeric(15,2) not null default 0 check (target_baht >= 0),
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (profile_id, period)
);
create index if not exists idx_sale_targets_profile on sale_targets(profile_id);

alter table sale_targets enable row level security;

-- อ่านได้ทุกคนที่ล็อกอิน (เป็นแค่ตัวเลขแผน · ใช้โชว์ในหน้า drill-down) · เขียนเฉพาะ admin
--   (หน้าตั้งค่าเป็น admin-only อยู่แล้ว — เป้ารายคนตั้งจากที่นั่น)
drop policy if exists st_select on sale_targets;
create policy st_select on sale_targets
  for select to authenticated using (true);

drop policy if exists st_write on sale_targets;
create policy st_write on sale_targets
  for all to authenticated using (is_admin()) with check (is_admin());

grant select, insert, update, delete on sale_targets to authenticated;
revoke all on sale_targets from anon;

-- ── ตรวจผล (ควรได้ 1 = มีตาราง sale_targets แล้ว) ──
select 'ตาราง sale_targets' as check, count(*)::text as got, '1 expected' as expect
  from information_schema.tables
 where table_name = 'sale_targets';
