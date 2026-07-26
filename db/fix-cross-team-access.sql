-- แก้บั๊ก: ติ๊ก "อ่านข้ามทีมได้" ให้หัวหน้าแล้ว แต่กลับอ่านไม่ได้ (ต้องเป็น admin ถึงจะเห็น)
--
-- อาการ: nanthawan (หัวหน้างาน/manager) ได้สิทธิ์ team_access ให้ดูทีมอื่น แต่เปิดแล้วไม่เห็น
--        เห็นได้ต่อเมื่อเปลี่ยน role เป็น admin เท่านั้น
--
-- 🔴 ต้นเหตุ: ฟังก์ชัน can_access_team() ถูก "เขียนทับ" ด้วยเวอร์ชันเก่าใน db/policies.sql
--    (บรรทัด ~51) ซึ่งเช็กแค่ `target_team = my_team_id()` — **ไม่ได้อ่าน team_access เลย**
--    พอเจ้าของรัน policies.sql ซ้ำ (ตามโน้ตเดิมที่ให้รันซ้ำเพื่อแก้ pending_delete)
--    can_access_team เวอร์ชันเต็ม (จาก phase3-10) เลยถูกทับด้วยเวอร์ชันโง่ → สิทธิ์ข้ามทีมพังทั้งระบบ
--    (is_admin() ยังผ่านเสมอ จึงดูเหมือน "ต้องเป็น admin เท่านั้น")
--
-- ✅ ไฟล์นี้ = คืนสภาพให้ถูกต้อง (idempotent · รันซ้ำได้ปลอดภัย):
--    1) can_access_team() = อ่าน team_access + ไล่ขึ้นทีมแม่ (เวอร์ชัน phase3-10)
--    2) can_edit_team()   = แยกสิทธิ์ "แก้" ออกจาก "ดู" (ต้องติ๊ก can_edit ถึงแก้ได้)
--    3) policy อ่าน (select) ใช้ can_access_team · policy เขียน (insert/update) ใช้ can_edit_team
--       (กันกรณี policies.sql ที่รันทับ ทำให้ policy เขียนกลับไปใช้ can_access_team)
--
-- 🛡️ กันซ้ำ: db/policies.sql แก้แล้วให้ "ไม่ทับ" can_access_team ถ้า team_access มีอยู่แล้ว
--    (รัน policies.sql ซ้ำหลังจากนี้จะไม่พังอีก — ดูหมายเหตุในไฟล์นั้น)
--
-- วิธีรัน: Supabase → SQL Editor → วางทั้งไฟล์ → Run · ต้องเคยรัน schema/policies/phase2/phase2-4/phase3-9/phase3-10 มาก่อน
-- 🔒 ห้ามใส่ข้อมูลลูกค้าจริงในไฟล์นี้ — repo เป็น public

-- ══════════════════════════════════════════════════════════
-- 1) can_access_team() — สิทธิ์ "ดู" (อ่าน team_access + ไล่ขึ้นทีมแม่)
--    เห็นทีม T ได้ ถ้า "ทีมที่ได้รับสิทธิ์" (ทีมตัวเอง หรือใน team_access)
--    เป็น T เอง หรือเป็นทีมแม่/ปู่ของ T → ให้สิทธิ์ TE-IMP = เห็น IMP1/IMP2 อัตโนมัติ
-- ══════════════════════════════════════════════════════════

create or replace function can_access_team(target_team uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with recursive chain as (
    select target_team as tid, 0 as depth
    union all
    select t.parent_team_id, c.depth + 1
    from teams t
    join chain c on t.id = c.tid
    where t.parent_team_id is not null and c.depth < 10
  )
  select
    is_admin()
    or (target_team is not null and exists (
          select 1 from chain
          where tid = my_team_id()
             or tid in (select team_id from team_access where profile_id = auth.uid())
        ));
$$;

-- ══════════════════════════════════════════════════════════
-- 2) can_edit_team() — สิทธิ์ "แก้" (ต้องมี can_edit ใน team_access · ไล่ขึ้นทีมแม่)
-- ══════════════════════════════════════════════════════════

create or replace function can_edit_team(target_team uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with recursive chain as (
    select target_team as tid, 0 as depth
    union all
    select t.parent_team_id, c.depth + 1
    from teams t
    join chain c on t.id = c.tid
    where t.parent_team_id is not null and c.depth < 10
  )
  select
    is_admin()
    or (target_team is not null and (
          my_team_id() in (select tid from chain)
          or exists (
               select 1 from team_access ta
               where ta.profile_id = auth.uid() and ta.can_edit
                 and ta.team_id in (select tid from chain)
             )
        ));
$$;

-- ══════════════════════════════════════════════════════════
-- 3) คืน policy ให้ อ่าน = can_access_team · เขียน = can_edit_team
--    (เผื่อ policies.sql ที่รันทับ ทำให้ policy เขียนกลับไปใช้ can_access_team)
-- ══════════════════════════════════════════════════════════

-- ── pending_projects ──
drop policy if exists pending_insert on pending_projects;
create policy pending_insert on pending_projects
  for insert to authenticated
  with check (can_edit_team(team_id));

drop policy if exists pending_update on pending_projects;
create policy pending_update on pending_projects
  for update to authenticated
  using (can_edit_team(team_id))
  with check (can_edit_team(team_id));

-- ── customers ──
drop policy if exists cust_insert on customers;
create policy cust_insert on customers
  for insert to authenticated
  with check (can_edit_team(team_id));

drop policy if exists cust_update on customers;
create policy cust_update on customers
  for update to authenticated
  using (can_edit_team(team_id))
  with check (can_edit_team(team_id));

-- ── activities ──
drop policy if exists act_insert on activities;
create policy act_insert on activities
  for insert to authenticated
  with check (can_edit_team(team_id));

drop policy if exists act_update on activities;
create policy act_update on activities
  for update to authenticated
  using (can_edit_team(team_id))
  with check (can_edit_team(team_id));

-- ── follow_logs · customer_logs : "เพิ่มบันทึก" = แก้ข้อมูลของงาน → can_edit_team ──
drop policy if exists follow_insert on follow_logs;
create policy follow_insert on follow_logs
  for insert to authenticated
  with check (exists (
    select 1 from pending_projects p
    where p.id = follow_logs.pending_id and can_edit_team(p.team_id)
  ));

drop policy if exists clog_insert on customer_logs;
create policy clog_insert on customer_logs
  for insert to authenticated
  with check (exists (
    select 1 from customers c
    where c.id = customer_logs.customer_id and can_edit_team(c.team_id)
  ));

-- ── project_contacts : อ่าน (view) + เขียน (edit) ──
drop policy if exists contacts_all    on project_contacts;
drop policy if exists contacts_select on project_contacts;
drop policy if exists contacts_write  on project_contacts;

create policy contacts_select on project_contacts
  for select to authenticated
  using (exists (
    select 1 from pending_projects p
    where p.id = project_contacts.pending_id and can_access_team(p.team_id)
  ));

create policy contacts_write on project_contacts
  for all to authenticated
  using (exists (
    select 1 from pending_projects p
    where p.id = project_contacts.pending_id and can_edit_team(p.team_id)
  ))
  with check (exists (
    select 1 from pending_projects p
    where p.id = project_contacts.pending_id and can_edit_team(p.team_id)
  ));

-- ── pending_products (phase3-9) : อ่าน (view) + เขียน (edit) ── กันไว้เผื่อยังไม่ได้รัน phase3-9
do $$
begin
  if to_regclass('public.pending_products') is not null then
    execute $q$ drop policy if exists pproducts_all    on pending_products $q$;
    execute $q$ drop policy if exists pproducts_select on pending_products $q$;
    execute $q$ drop policy if exists pproducts_write  on pending_products $q$;
    execute $q$ create policy pproducts_select on pending_products for select to authenticated
               using (exists (select 1 from pending_projects p
                              where p.id = pending_products.pending_id and can_access_team(p.team_id))) $q$;
    execute $q$ create policy pproducts_write on pending_products for all to authenticated
               using (exists (select 1 from pending_projects p
                              where p.id = pending_products.pending_id and can_edit_team(p.team_id)))
               with check (exists (select 1 from pending_projects p
                              where p.id = pending_products.pending_id and can_edit_team(p.team_id))) $q$;
  end if;
end $$;

-- ── team_targets (phase3-10) : อ่าน can_access_team · เขียน can_edit_team ── กันไว้เผื่อยังไม่ได้รัน phase3-10
do $$
begin
  if to_regclass('public.team_targets') is not null then
    execute $q$ alter table team_targets enable row level security $q$;
    execute $q$ drop policy if exists tt_select on team_targets $q$;
    execute $q$ create policy tt_select on team_targets for select to authenticated
               using (can_access_team(team_id)) $q$;
    execute $q$ drop policy if exists tt_write on team_targets $q$;
    execute $q$ create policy tt_write on team_targets for all to authenticated
               using (can_edit_team(team_id)) with check (can_edit_team(team_id)) $q$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- ตรวจผล (ควรได้ตามคาด)
-- ══════════════════════════════════════════════════════════
select 'can_access_team อ่าน team_access แล้ว' as check,
       case when prosrc ilike '%team_access%' then '✅ ใช่' else '❌ ยังเป็นเวอร์ชันเก่า' end as result
from pg_proc where proname = 'can_access_team';

select 'can_access_team ไล่ทีมแม่ (recursive)' as check,
       case when prosrc ilike '%recursive%' then '✅ ใช่' else '❌ ไม่' end as result
from pg_proc where proname = 'can_access_team';

select 'policy เขียนใช้ can_edit_team' as check,
       count(*)::text || ' policy' as result
from pg_policies
where schemaname = 'public' and with_check ilike '%can_edit_team%';
