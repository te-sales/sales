-- TE Sales Dashboard — ลายเซ็นหัวหน้า (signatures · phase 3.18)
--
-- เก็บรูปลายเซ็น (data URL) ต่อบัญชี 1 คน 1 ลายเซ็น
-- admin เป็นผู้จัดการ (อัปโหลด/แทนที่/ลบ) ในหน้า "ตั้งค่าระบบ"
-- ใช้ตอนหัวหน้า "เซ็นรับทราบ" → พิมพ์ PDF จะเอารูปลายเซ็นของผู้เซ็น
-- ไปวางในคอลัมน์ NEXT DOING แถวเดียวกับแถวเซ็นรับทราบ (เอียง 45° ให้เหมือนลายเซ็นจริง)
--
-- 🔒 สิทธิ์:
--    อ่าน  — ทุกคนที่ล็อกอิน (ต้องอ่านลายเซ็นของผู้เซ็นมาแสดงบนฟอร์มที่พิมพ์)
--    เพิ่ม/แก้/ลบ — admin เท่านั้น (บังคับที่ RLS ไม่ใช่แค่ UI · is_admin() นิยามใน policies.sql)
--
-- ไม่รันไฟล์นี้ก็ไม่พัง — adapter คืน [] ถ้าตารางยังไม่มี · แค่ยังเก็บ/โชว์ลายเซ็นไม่ได้
-- วิธีรัน: วางไฟล์นี้ใน Supabase → SQL Editor → Run (รันซ้ำได้ ปลอดภัย)

create table if not exists signatures (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  image_url   text not null,                                           -- data URL (PNG ย่อแล้ว รองรับพื้นหลังโปร่งใส)
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null default auth.uid()
);

alter table signatures enable row level security;

drop policy if exists sig_select on signatures;
drop policy if exists sig_write  on signatures;

-- อ่าน: ทุกคนที่ล็อกอิน
create policy sig_select on signatures
  for select to authenticated
  using (true);

-- เพิ่ม/แก้/ลบ: admin เท่านั้น
create policy sig_write on signatures
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on signatures to authenticated;
revoke all on signatures from anon;
