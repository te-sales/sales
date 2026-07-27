-- TE Sales Dashboard — เพิ่มรูปนามบัตร (ด้านหน้า/ด้านหลัง) ให้ลูกค้า Book 3 สี
-- เจ้าของขอ 27 ก.ค. 2569
--
-- เก็บเป็น data URL (base64 JPEG ย่อแล้ว ~150–250KB/รูป) เหมือน customers.photo_url
--   • card_front_url = นามบัตรด้านหน้า · card_back_url = ด้านหลัง
--   • สิทธิ์/RLS ใช้ของ customers เดิมทั้งหมด (ไม่ต้องเพิ่ม policy) — เป็นแค่คอลัมน์เพิ่ม
--
-- ไม่รันก็ยังใช้ระบบได้ (adapter ตัด 2 คอลัมน์นี้ออกอัตโนมัติถ้ายังไม่มี) แค่ยังเก็บนามบัตรไม่ได้
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run · 🔒 ห้ามใส่ข้อมูลลูกค้าจริงในไฟล์นี้ (repo public)

alter table customers add column if not exists card_front_url text;
alter table customers add column if not exists card_back_url  text;

-- ตรวจผล
select 'customers.card_front_url' as col,
       count(*)::text as result, '1 expected' as note
from information_schema.columns
where table_schema = 'public' and table_name = 'customers' and column_name = 'card_front_url'
union all
select 'customers.card_back_url',
       count(*)::text, '1 expected'
from information_schema.columns
where table_schema = 'public' and table_name = 'customers' and column_name = 'card_back_url';
