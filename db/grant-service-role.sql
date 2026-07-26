-- แก้ 403: Edge Function (service_role) อ่านตารางไม่ได้
--
-- อาการ: daily-backup ขึ้น "อ่านตาราง ... ไม่ได้ (403)"
-- สาเหตุ: โปรเจกต์นี้ auto-grant ให้ role มาตรฐานไม่ทำงาน (ดูโน้ตหัวข้อ GRANT ใน policies.sql)
--         ตอนตั้งระบบ grant ให้ `authenticated` ไว้ แต่ยังไม่ได้ grant ให้ `service_role`
--         → Edge Function (ใช้ service_role / secret key) เลยโดน permission denied (403)
--
-- service_role = role ฝั่งเซิร์ฟเวอร์ของ Supabase (Edge Function เท่านั้น · คีย์ไม่เคยอยู่ใน frontend)
--   bypass RLS อยู่แล้ว · การให้สิทธิ์เต็มเป็นค่ามาตรฐานของทุกโปรเจกต์ Supabase — ปลอดภัย
--
-- วิธีรัน: วางไฟล์นี้ใน Supabase → SQL Editor → Run (ครั้งเดียว) แล้วกด "สำรองขึ้น Drive เดี๋ยวนี้" อีกครั้ง

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ตารางที่สร้างใหม่ในอนาคต ให้ service_role ได้สิทธิ์อัตโนมัติ (กันเจอ 403 ซ้ำตอนเพิ่มตาราง)
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
