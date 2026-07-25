-- TE Sales Dashboard — step 3.12
-- เก็บ "อายุ" ของลูกค้าไว้เป็นคอลัมน์แยก (Book 3 สี)
--
-- ⚠️ ห้ามใส่ข้อมูลลูกค้าจริงในไฟล์นี้เด็ดขาด — repo เป็น public
--
-- ทำไม: ~90% ของลูกค้า "ไม่รู้วันเกิด" แต่อยากเก็บอายุไว้ (เจ้าของสั่ง 25 ก.ค. 2569)
--   เดิมช่อง AGE คำนวณจาก birthday อย่างเดียว → ถ้าไม่รู้วันเกิดก็กรอกอายุไม่ได้
--   และถ้าปั้นวันเกิดปลอมจากอายุ จะแสดงวันเกิดที่ไม่ตรงความจริง
--
-- กติกาใหม่:
--   • มีวันเกิดจริง  → คำนวณอายุจาก birthday (คอลัมน์ age = null · อายุแม่นเสมอ)
--   • ไม่รู้วันเกิด  → กรอกเลขอายุ เก็บใน customers.age (ไม่สร้างวันเกิดปลอม)
--
-- 💡 การเก็บอายุดิบมีข้อจำกัด: ปีถัดไปตัวเลขจะไม่อัปเดตเอง (ต่างจาก birthday)
--   → รับได้ เพราะเป็นแค่ "อายุโดยประมาณ" ของผู้ติดต่อ · อัปเดตเองได้เมื่อทราบเพิ่ม
--
-- ต้องรัน db/schema.sql · policies.sql · phase2.sql ให้เสร็จก่อน
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run · รันซ้ำได้ทั้งไฟล์
-- (ถ้ายังไม่รัน ระบบก็ยังบันทึกลูกค้าได้ปกติ แค่ยังไม่เก็บช่องอายุ — adapter ตัด age ให้อัตโนมัติ)

alter table customers
  add column if not exists age smallint
  check (age is null or (age >= 0 and age <= 130));

comment on column customers.age is
  'อายุที่กรอกเอง (ใช้เมื่อไม่รู้วันเกิด) · ถ้ามี birthday ให้คำนวณจาก birthday แทน คอลัมน์นี้เป็น null';

-- ── ตรวจผล (ควรได้ 1 = มีคอลัมน์ age แล้ว) ──
select 'คอลัมน์ age' as check, count(*)::text as got, '1 expected' as expect
  from information_schema.columns
 where table_name = 'customers' and column_name = 'age';
