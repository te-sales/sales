-- TE Sales Dashboard — เพิ่มช่อง DOCC (ประเภทลูกค้า) ให้ Book 3 สี
-- เจ้าของขอ 27 ก.ค. 2569
--
-- DOCC = ประเภทของผู้ติดต่อในงานก่อสร้าง 4 แบบ (ตัวย่อ D-O-C-C):
--   D = Designer   (ผู้ออกแบบ)
--   O = Owner      (เจ้าของงาน)
--   C = Contractor (ผู้รับเหมา)
--   C = Consult    (ที่ปรึกษา)
--   ⚠️ ตัว C ซ้ำกัน 2 แบบ (Contractor/Consult) → เก็บเป็น "คำเต็ม" ในฐานข้อมูลกันชนกัน
--      (designer/owner/contractor/consult) · หน้าจอโชว์ตัวย่อ D/O/C/C ให้ตรงกับที่เจ้าของเรียก
--
-- ใช้กรอง (filter) ลูกค้าตามประเภทในหน้า Book 3 สี
-- ไม่รันก็ยังใช้ระบบได้ (adapter ตัดคอลัมน์นี้ออกอัตโนมัติถ้ายังไม่มี) แค่ยังเก็บ DOCC ไม่ได้
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run · 🔒 ห้ามใส่ข้อมูลลูกค้าจริงในไฟล์นี้ (repo public)

alter table customers add column if not exists docc text
  check (docc is null or docc in ('designer', 'owner', 'contractor', 'consult'));

create index if not exists idx_cust_docc on customers(docc) where docc is not null;

-- ตรวจผล
select 'customers.docc' as col,
       count(*)::text as result, '1 expected' as note
from information_schema.columns
where table_schema = 'public' and table_name = 'customers' and column_name = 'docc';
