-- ══════════════════════════════════════════════════════════
-- test-accounts.sql — บัญชีทดสอบสำหรับดู "แต่ละกลุ่มเห็นอะไร / เจอปัญหาอะไรจริง"
--
-- ⭐ ทำไมต้องเป็นบัญชีจริงใน Supabase (ไม่ใช่โหมด local):
--    สิทธิ์การมองเห็นถูกบังคับที่ RLS ในตัว DB — วิธีเดียวที่เห็น "ของจริง" คือ
--    ล็อกอินด้วยบัญชีจริงต่างกลุ่มกัน แล้วดูว่าแต่ละคนเห็นแถวไหน กดอะไรได้/ไม่ได้
--
-- 🔒 ใช้ "ข้อมูลปลอมเท่านั้น" — ห้ามผูกข้อมูลลูกค้าจริงกับบัญชีทดสอบ
--
-- ── ต้องทำก่อน (prerequisite) ──
--   • รัน db/schema.sql · db/policies.sql · db/seed.sql · db/phase2-4.sql มาแล้ว
--     (phase2-4.sql = ตัวที่เพิ่ม role 'manager' + ตาราง team_access)
--
-- ── ขั้นตอน (2 ขั้น) ──
--   1) สร้างบัญชี Auth ก่อน — Supabase Dashboard → Authentication → Users → "Add user"
--      ใส่ email ตามด้านล่าง + password (เช่น Test1234!) + ✅ ติ๊ก "Auto Confirm User"
--      (trigger handle_new_user จะสร้างแถวใน profiles ให้อัตโนมัติ · role เริ่มต้น = sale, team ว่าง)
--
--      สร้าง 6 บัญชีนี้ (email ต้องตรงเป๊ะกับสคริปต์):
--        te.admin@te-test.com
--        te.mgr.gov@te-test.com
--        te.mgr.imp@te-test.com
--        te.sale.gov1@te-test.com
--        te.sale.imp1@te-test.com
--        te.sale.noteam@te-test.com
--
--   2) รันสคริปต์นี้ทั้งไฟล์ใน Supabase → SQL Editor (ตั้ง role/ทีม/สิทธิ์ให้ครบ)
--      หมายเหตุ: guard_profile_privilege ปล่อยผ่านเมื่อ auth.uid() เป็น null (คือรันจาก SQL Editor) จึงตั้งได้
-- ══════════════════════════════════════════════════════════

-- helper: หา team_id จาก code (อ่านง่ายกว่า hardcode uuid)
-- ใช้ (select id from teams where code = 'GOV.1') ในแต่ละ statement

-- ── 1) admin — เห็นทุกทีม · เซ็นรับทราบได้ · เข้าหน้า "ตั้งค่าระบบ" ได้ ──
update profiles set role = 'admin', team_id = null, is_active = true,
       full_name = 'ทดสอบ · Admin'
 where email = 'te.admin@te-test.com';

-- ── 2) manager สายราชการ — ทีมหลัก GOV.1 + ดูข้าม GOV.3/GOV.4 ได้ (แต่ไม่เห็น TE-IMP) ──
update profiles set role = 'manager', is_active = true,
       team_id = (select id from teams where code = 'GOV.1'),
       full_name = 'ทดสอบ · หัวหน้าสายราชการ'
 where email = 'te.mgr.gov@te-test.com';

insert into team_access (profile_id, team_id, can_edit)
select p.id, t.id, true
  from profiles p
  cross join teams t
 where p.email = 'te.mgr.gov@te-test.com'
   and t.code in ('GOV.1', 'GOV.3', 'GOV.4')
on conflict (profile_id, team_id) do update set can_edit = excluded.can_edit;

-- ── 3) manager สายเอกชน — ทีมแม่ TE-IMP → ควรเห็นทีมลูก IMP1/IMP2 ด้วย (สิทธิ์ไล่ขึ้นทีมแม่) ──
update profiles set role = 'manager', is_active = true,
       team_id = (select id from teams where code = 'TE-IMP'),
       full_name = 'ทดสอบ · หัวหน้าสายเอกชน'
 where email = 'te.mgr.imp@te-test.com';

insert into team_access (profile_id, team_id, can_edit)
select p.id, t.id, true
  from profiles p
  cross join teams t
 where p.email = 'te.mgr.imp@te-test.com'
   and t.code = 'TE-IMP'
on conflict (profile_id, team_id) do update set can_edit = excluded.can_edit;

-- ── 4) sale GOV.1 — เห็นเฉพาะงานทีม GOV.1 · เซ็นรับทราบไม่ได้ ──
update profiles set role = 'sale', is_active = true,
       team_id = (select id from teams where code = 'GOV.1'),
       full_name = 'ทดสอบ · Sale GOV.1'
 where email = 'te.sale.gov1@te-test.com';

-- ── 5) sale IMP1 (ทีมลูก) — เห็นเฉพาะ IMP1 · หัวหน้าสายเอกชน (ข้อ 3) ควรเห็นงานของคนนี้ ──
update profiles set role = 'sale', is_active = true,
       team_id = (select id from teams where code = 'IMP1'),
       full_name = 'ทดสอบ · Sale IMP1'
 where email = 'te.sale.imp1@te-test.com';

-- ── 6) sale ไม่มีทีม — เคสกับดัก: team_id ว่าง → can_access_team() คืน false → แตะแถวทีมไม่ได้ ──
--    ใช้ยืนยันว่าระบบเตือน/กันถูกต้อง (adapter เติมทีมให้ตอนบันทึกผ่าน fillTeam — ถ้าไม่มีทีมจะโดนปฏิเสธ)
update profiles set role = 'sale', is_active = true, team_id = null,
       full_name = 'ทดสอบ · Sale ไม่มีทีม'
 where email = 'te.sale.noteam@te-test.com';

-- ── ตรวจผลลัพธ์ (ควรเห็น 6 แถว role/ทีมตามด้านบน) ──
select p.email, p.full_name, p.role,
       coalesce(t.code, '— ไม่มีทีม —') as team,
       (select string_agg(tt.code, ', ' order by tt.code)
          from team_access ta join teams tt on tt.id = ta.team_id
         where ta.profile_id = p.id) as team_access_codes
  from profiles p
  left join teams t on t.id = p.team_id
 where p.email like 'te.%@te-test.com'
 order by p.role, p.email;

-- ══════════════════════════════════════════════════════════
-- ลบบัญชีทดสอบทีหลัง: Dashboard → Authentication → Users → ลบ 6 บัญชีนี้
--   (on delete cascade จะลบ profiles + team_access ให้เอง ไม่ต้องรัน SQL)
-- ══════════════════════════════════════════════════════════
