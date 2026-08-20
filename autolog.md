# autolog — บันทึกการเปลี่ยนแปลงอัตโนมัติ

> **ไฟล์นี้ Claude เขียนเอง** ทุกครั้งที่ทำงานเสร็จก่อนส่งคืนเจ้าของโปรเจกต์
> เป็นบันทึกว่า *"แตะอะไรไปบ้าง เมื่อไหร่ ทำไม"* — ไม่ใช่แผน ไม่ใช่คู่มือ

**แบ่งหน้าที่กับไฟล์อื่น (อย่าเขียนซ้ำกัน):**

| ไฟล์ | หน้าที่ | ใครเขียน |
|---|---|---|
| `CLAUDE.md` | แผน + กติกา + สเปค (ของถาวร) | แก้เมื่อสเปคเปลี่ยน |
| `PROGRESS.md` | รายละเอียดลึกรายไตล์ step — เหตุผลการตัดสินใจ ผลทดสอบเต็ม | ตอนปิด step |
| `autolog.md` | ไทม์ไลน์ทุกการเปลี่ยนแปลง เรียงใหม่→เก่า | **ทุกครั้งที่ทำงานเสร็จ** |
| `Workflow/index.html` | แผนผังภาพรวมว่าโมดูลไหนสร้างถึงไหน | ตอนสถานะรวมเปลี่ยน |

**รูปแบบ 1 รายการ** — สั้น อ่านแล้วรู้เรื่องทันที ไม่ต้องเปิดโค้ดดู:

```
## YYYY-MM-DD HH:MM · <commit hash หรือ "ยังไม่ commit"> · <หัวข้อ>
**step:** X.X | **ประเภท:** ฟีเจอร์ / แก้บั๊ก / เอกสาร / รีแฟกเตอร์
- ทำอะไร (บรรทัดละเรื่อง)
**ไฟล์:** path1 · path2
**ทดสอบ:** ผลจริง (เช่น "18/18 ผ่าน") หรือ "ยังไม่ทดสอบ — เหตุผล"
**ค้าง:** สิ่งที่ยังไม่จบ (ถ้าไม่มี ตัดบรรทัดนี้ทิ้ง)
```

---

<!-- ⬇️ เพิ่มรายการใหม่ใต้บรรทัดนี้ (ใหม่สุดอยู่บน) ⬇️ -->

## 2026-07-31 · ยังไม่ commit · งานติดตาม: เลือก SALE ผู้รับผิดชอบ + งานของแต่ละคน [ชุด 6 ข้อ #3+#4]
**step:** ต่อยอด (คำสั่งเจ้าของ ชุด 6 ข้อ · ข้อ 3+4) | **ประเภท:** ฟีเจอร์ (UI · ไม่ต้อง migration)
- `activities.owner_id` **มีอยู่แล้ว** (adapter default=ผู้สร้าง · listActivities กรอง owner ได้) → เพิ่มแค่ UI
- **#4** ฟอร์มกิจกรรมมี dropdown "SALE ผู้รับผิดชอบ" (`owner_id` · default=ตัวเรา) · แถวโชว์ชื่อผู้รับผิดชอบ (`.aowner` 👤 · resolve จาก profiles)
- **#3** ดรอปดาวน์ "ดูงานของ" (`#aPerson`) — 🙋 ของฉัน (ค่าเริ่มต้น · แต่ละคนเห็นงานตัวเอง) / 👥 ทั้งทีม / รายคน · กรอง `scopedRows()` ตาม owner_id · bucketize จาก scoped
- **#3** quicklog สร้างงานติดตาม (+7) จาก NEXT DOING → ตั้ง `owner_id = record owner` (`TAB[tab].ownerField`) → งานไปโผล่ใน to-do ของ SALE ผู้ดูแล ไม่ใช่คนที่กดบันทึก
**ไฟล์:** docs/js/modules/activities.js · docs/js/modules/quicklog.js · docs/css/app.css · sw.js + config.js (v0.66.2)
**ทดสอบ:** CDP — owner filter (ของฉัน/ทั้งทีม/รายคน) + ฟอร์ม SALE + มอบหมาย+บันทึก 11/11 · ไม่มี JS error
**ค้าง (ชุด 6 ข้อ):** ✅#6 ✅#1 ✅#2 ✅#3 ✅#4 · เหลือ #5 ลิงค์ปฏิทิน+แชร์ไลน์ (client-side)

## 2026-07-31 · ยังไม่ commit · รอตรวจ: ค้นหาชื่อ SALE + เรียง + แยก Pending/Book3 [ชุด 6 ข้อ #1+#2]
**step:** ต่อยอด (คำสั่งเจ้าของ ชุด 6 ข้อ · ข้อ 1+2) | **ประเภท:** ฟีเจอร์ (UI)
- โหลด profiles → แปลง `owner_id`(Pending)/`sale_id`(Book3) เป็นชื่อ SALE (`saleNameOf` · fallback sale_name) → โชว์ในแต่ละแถว (`.rv-sale` 👤)
- **#2 แท็บแยก** ทั้งหมด/▤ งาน Pending/◍ ลูกค้า Book 3 สี (`#rvKind` + ป้ายนับ)
- **#1 ค้นหา** ชื่อ SALE/ชื่องาน/ลูกค้า (`#rvSearch`) + **เรียง** (ด่วนก่อน/แก้ล่าสุด/ชื่อ SALE/มูลค่า · `#rvSort`) · กรอง+เรียงในหน่วยความจำ · เปิดรายละเอียดใช้ event delegation (รายการวาดใหม่ทุกครั้งที่กรอง)
**ไฟล์:** docs/js/modules/review.js · docs/css/app.css · sw.js + config.js (v0.66.1)
**ทดสอบ:** CDP — แยกแท็บ/ค้นหา/เรียง 12/12 · ไม่มี JS error
**ค้าง (ชุด 6 ข้อ):** ✅#6 ✅#1 ✅#2 · เหลือ #4 งานติดตามเลือก sale · #3 due date→to-do รายคน · #5 ลิงค์ปฏิทิน+แชร์ไลน์

## 2026-07-31 · ยังไม่ commit · ปฏิทิน: เลือกวันเกิดย้อนหลังได้ + พิมพ์วันที่เอง [ชุด 6 ข้อ #6]
**step:** ต่อยอด (คำสั่งเจ้าของ ชุด 6 ข้อ · ข้อ 6) | **ประเภท:** แก้บั๊ก + ฟีเจอร์
- บั๊ก: ดรอปดาวน์ปีในปฏิทินมีแค่ `nowY±5` → เลือกปีเกิดไม่ได้ · แก้: `dateField` รับ `yearsBack`/`yearsForward` (เก็บ `data-yb`/`data-yf`) · render อ่านช่วงจากช่องที่เปิด + เผื่อครอบ viewY เสมอ · ช่องวันเกิด Book 3 สี ส่ง `yearsBack:100`
- เพิ่มช่อง "พิมพ์เอง" ในปฏิทิน (`parseTyped`) — พิมพ์ วัน/เดือน/ปี (คั่น / - .) · ปี ≥2400 = พ.ศ. แปลง ค.ศ. อัตโนมัติ · Enter/ตกลง = ตั้งค่า · อ่านไม่ออกเตือนแดง · ใช้ได้ทุกช่องวันที่ (โบนัส)
**ไฟล์:** docs/js/ui/datepicker.js · docs/js/modules/book3.js · docs/css/app.css · sw.js + config.js (v0.66.0)
**ทดสอบ:** CDP — parseTyped 5 เคส + ปฏิทินวันเกิด (ปีถึง 2493 · พิมพ์ 15/8/2530→1987-08-15) 12/12 · ไม่มี JS error
**ค้าง (ชุด 6 ข้อ):** ✅#6 · เหลือ #1/#2 รอตรวจ(ค้นหา/เรียง/แยก) · #4 งานติดตามเลือก sale · #3 due date→to-do รายคน · #5 ลิงค์ปฏิทิน+แชร์ไลน์ (เจ้าของเลือกแบบ client-side)

## 2026-07-31 · ยังไม่ commit · ลายเซ็น: ตัดพื้นหลังขาวออก + ปรับขนาดจากหน้า setting
**step:** ต่อยอด (คำสั่งเจ้าของ) | **ประเภท:** ฟีเจอร์ (รูป + setting)
- **ตัดพื้นหลังสีขาว:** `fileToDataUrl` เพิ่ม option `removeWhiteBg` — แปลง alpha ตาม luminance (สว่าง≥240=โปร่งใส · เข้ม≤180=ทึบ · ระหว่างนั้นไล่ระดับขอบเนียน) → เหลือแต่ลายเส้น (น้ำเงิน/ดำ) · บังคับ output png · ใช้ตอนอัปลายเซ็นทั้ง admin + profile · แก้อาการกล่องขาวหมุนทับเส้นตารางฟอร์ม
- **ปรับขนาดจาก setting:** สไลเดอร์ "ขนาดลายเซ็นบนฟอร์มพิมพ์" (50–300%) ในการ์ดลายเซ็น (หน้าตั้งค่า admin) → เก็บ `app_settings.signature.size_pct` · formprint อ่านค่าตั้ง → เซ็ต `--sign-scale` บน `#printRoot` · print.css `.pf-sign-img`/`.pf-signoff-row td` = `calc(base * var(--sign-scale,1))` (100% = 52pt ฐานเดิม) · มีผลทั้งพรีวิว + พิมพ์
**ไฟล์:** docs/js/ui/{photofield,formprint,profile}.js · docs/js/modules/admin.js · docs/css/{print,app}.css · sw.js + config.js (v0.65.4)
**ทดสอบ:** CDP — bg removal (มุมขาว alpha 0 · น้ำเงิน alpha>200) + size (scale 2 → 104pt · สไลเดอร์บันทึก 150) 9/9 · regression admin+print 21/21 · profile 12/12 · ไม่มี JS error

## 2026-07-31 · ยังไม่ commit · ลายเซ็นพิมพ์: ขยายขนาด 2 เท่า (200%)
**step:** ต่อยอด (คำสั่งเจ้าของ) | **ประเภท:** ปรับ UI (พิมพ์)
- `.pf-sign-img` height 26pt→52pt · max-width 92pt→184pt · `.pf-signoff-row td` height 30pt→60pt (ให้แถวพอดีรูปที่ใหญ่ขึ้น) · แก้ข้อความ hint ในหน้าตั้งค่า
**ไฟล์:** docs/css/print.css · docs/js/modules/admin.js · sw.js + config.js (v0.65.3)
**ทดสอบ:** CDP emulate print — height ≈52pt (69px) · ชุด SIG 21/21 · ไม่มี JS error

## 2026-07-31 · ยังไม่ commit · หัวหน้าจัดการลายเซ็นตัวเองได้ (แก้ไข/ลบ ในโปรไฟล์)
**step:** ต่อยอด (คำสั่งเจ้าของ · เลือก "หัวหน้าจัดการของตัวเอง") | **ประเภท:** ฟีเจอร์ (UI + RLS)
- เพิ่มช่อง **"ลายเซ็นของฉัน"** ในหน้าโปรไฟล์ (`profile.js`) — โชว์เฉพาะ role admin/manager (sale ไม่เห็น) · อัปโหลด/เปลี่ยน/ลบ (ลบกด 2 ครั้ง) · โหลดลายเซ็นเดิมของตัวเองมาโชว์ตอนเปิด
- **RLS (phase3-18.sql):** `sig_write` เปลี่ยนจาก admin เท่านั้น → `is_admin() or profile_id = auth.uid()` (เจ้าของลายเซ็นเขียน/แก้/ลบของตัวเองได้) · admin ยังจัดการให้ทุกคนได้เหมือนเดิม (หน้าตั้งค่า)
- ใช้ชิ้นส่วนร่วม: `fileToDataUrl(png)` + `safePhoto` + adapter `listSignatures`/`saveSignature`/`deleteSignature` (เดิม) · CSS `.sigrow/.sig-thumb` (เดิม)
**ไฟล์:** docs/js/ui/profile.js · db/phase3-18.sql · CLAUDE.md · sw.js + config.js (v0.65.2)
**ทดสอบ:** CDP local + DOM.setFileInputFiles — โปรไฟล์ลายเซ็น 12/12 (หัวหน้าแก้/ลบได้ · sale ไม่เห็นช่อง) · regression admin+print 20/20 · ไม่มี JS error
**ค้าง:** เจ้าของต้อง **รัน `db/phase3-18.sql` ซ้ำ 1 รอบ** ใน Supabase (อัปเดต policy ให้หัวหน้าเขียนของตัวเองได้ · รันซ้ำปลอดภัย idempotent)

## 2026-07-31 · ยังไม่ commit · ลายเซ็นพิมพ์: เปลี่ยนมุมเอียง 45° → 15°
**step:** ต่อยอด (คำสั่งเจ้าของ) | **ประเภท:** ปรับ UI (พิมพ์)
- `--sign-rot` ใน print.css `-45deg` → `-15deg` (เจ้าของขอเอียงน้อยลง) · อัปเดตข้อความในหน้าตั้งค่า/คอมเมนต์ตาม
**ไฟล์:** docs/css/print.css · docs/js/modules/admin.js · docs/js/ui/formprint.js · db/phase3-18.sql · CLAUDE.md · sw.js + config.js (v0.65.1)
**ทดสอบ:** CDP emulate print — matrix ≈15° (|a|≈0.966) · ชุด SIG 20/20 · ไม่มี JS error

## 2026-07-28 · ยังไม่ commit · ลายเซ็นหัวหน้า (เซ็นรับทราบ) — admin จัดการ + วางบน PDF เอียง 45°
**step:** ต่อยอด (คำสั่งเจ้าของ) | **ประเภท:** ฟีเจอร์ (DB + adapter + UI + พิมพ์)
- **ตาราง `signatures`** (`db/phase3-18.sql`) — 1 บัญชี 1 ลายเซ็น (data URL) · RLS: อ่านทุกคนล็อกอิน · เขียน/ลบ admin เท่านั้น (โมเดลตาม news_reports)
- **หน้าตั้งค่าระบบ:** การ์ด "ลายเซ็นหัวหน้า" (admin) — ลิสต์เฉพาะ role admin/manager · อัปโหลด/เปลี่ยน/ลบ (ลบกด 2 ครั้ง) · เก็บ png ย่อ 600px คงพื้นหลังโปร่งใส
- **พิมพ์ PDF:** เมื่อผู้เซ็นมีลายเซ็นในระบบ → วางรูปในคอลัมน์ **NEXT DOING** แถวเดียวกับ "✓ เซ็นรับทราบ" · ใหญ่ ~2 บรรทัด · เอียง 45° (`transform: rotate(-45deg)` · ไม่กระทบ layout ตาราง) · ใช้ทั้ง Pending + Book 3 สี · map ผ่าน `signoff.signed_by`
- adapter methods: `listSignatures`/`saveSignature`/`deleteSignature` (supabase + local + **facade allowlist ใน adapter.js**) · `fileToDataUrl` เพิ่ม option `mime` (png) · โหลดลายเซ็นครั้งเดียวต่อการพิมพ์ (batch ไม่ดึงซ้ำ)
- 🔴 กับดักที่เจอ: adapter.js เป็น allowlist ชัดเจน — เพิ่ม method ใน impl แล้วต้องลงทะเบียนใน facade ด้วย ไม่งั้น UI เรียกไม่เจอ (เสียเทสต์ 1 รอบ)
**ไฟล์:** db/phase3-18.sql · docs/js/data/{adapter,supabase-adapter,local-adapter}.js · docs/js/modules/admin.js · docs/js/ui/{formprint,photofield}.js · docs/css/{print,app}.css · docs/sw.js + config.js (v0.65.0)
**ทดสอบ:** CDP + emulate print + DOM.setFileInputFiles (อัปโหลดจริง) — จัดการ+พิมพ์ 20/20 · regression signoff-green 5/5 · rich 18/18 · ไม่มี JS error
**ค้าง:** เจ้าของต้องรัน `db/phase3-18.sql` ใน Supabase ก่อนถึงเก็บ/โชว์ลายเซ็นได้ (ไม่รัน adapter คืน [] ไม่พัง)

## 2026-07-28 · ยังไม่ commit · พิมพ์: แถวหัวหน้าเซ็นรับทราบ = ตัวอักษรสีเขียว
**step:** ต่อยอด (คำสั่งเจ้าของ) | **ประเภท:** ปรับ UI (พิมพ์)
- แถว "หัวหน้าเซ็นรับทราบ" ตอนพิมพ์ PDF เปลี่ยนจากสีน้ำเงิน → **สีเขียว `#1f7a44`** (ใช้คลาสร่วม `.pf-signoff-row` = ครอบทั้ง Book 3 สี + Pending ในที่เดียว) · แถวบันทึกปกติยังน้ำเงินเหมือนเดิม
**ไฟล์:** docs/css/print.css · docs/js/ui/formprint.js (คอมเมนต์) · docs/sw.js + config.js (v0.64.1)
**ทดสอบ:** CDP + Emulation.setEmulatedMedia('print') — เซ็นรับทราบเขียว Pending/Book3 · แถวปกติไม่เขียว · 5/5 ผ่าน · ไม่มี JS error

## 2026-07-28 · ยังไม่ commit · rich text เฉพาะ RESPONSE/NEXT DOING + แก้บั๊กพิมพ์ในบล็อกไม่ได้ + การ์ดสีขึ้นบน
**step:** ต่อยอด (คำสั่งเจ้าของ 3 ข้อ) | **ประเภท:** แก้บั๊ก + รีแฟกเตอร์ + ฟีเจอร์
- **แก้บั๊ก "พิมพ์ในบล็อก rich text ไม่ได้"** — ต้นเหตุ: `richFieldHtml` ห่อด้วย `<label>` → คลิก contenteditable แล้วเบราว์เซอร์เด้ง focus ไปที่ปุ่มแรกในเลเบล (ปุ่ม B) caret ไม่เคยลงช่อง · **พิสูจน์ด้วย CDP คลิก+คีย์จริง** (label: activeElement=BUTTON, text="" · div: พิมพ์ได้) → เปลี่ยน wrapper เป็น `<div>`
- **ย้าย rich text ไปใช้เฉพาะ RESPONSE / NEXT DOING** (เจ้าของสั่ง) — ถอด rich ออกจากช่อง `area` ทุกช่อง (ภูมิลำเนา/การศึกษา/Win plan ฯลฯ) กลับเป็น textarea ธรรมดา · ค่าเดิมที่เคยเก็บ HTML → `richToText` ตัดเป็นข้อความล้วนตอนโชว์
- เพิ่ม rich ให้ RESPONSE/NEXT DOING ทั้ง 5 จุด: add-log (loglist `logFormHtml` = book3/quicklog) · edit-log (`bindLogEditing`) · pending qLog panel · pending full-modal (`#lgRes/#lgNext`, id-only กันไปปน FormData งาน)
- `richFieldHtml` รับ `id`/`ph`/`dataF` + `name` เป็น optional · event ผูกแบบ **delegation ที่ document ครั้งเดียว** (`installGlobalRich`) → ช่องที่สร้างทีหลัง (add/edit-log) ทำงานเลยไม่ต้อง bind รายกล่อง · เพิ่ม `richBlank` (contenteditable ว่างเหลือ `<br>` = ไม่นับว่ามีค่า) · แสดง log ผ่าน `sanitizeHtml` · loghover/print ตัดเป็นข้อความล้วน
- **การ์ด "ลูกค้า Book 3 สี" (🟢🟡🔴) ย้ายขึ้นบน** (ก่อนกริด KPI ถัดจากการ์ด DOCC) + แก้ให้ป้าย/ตัวเลขตามฟิลเตอร์ทีม/รายคน (เดิมส่ง `selected.size>0` → โหมดรายคนโชว์ "ทั้งองค์กร" ผิด · เปลี่ยนเป็น `isPerson||selected.size>0`)
**ไฟล์:** docs/js/ui/richtext.js · docs/js/ui/loglist.js · docs/js/ui/loghover.js · docs/js/ui/formprint.js · docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/modules/dashboard.js · docs/css/app.css · docs/sw.js + config.js (v0.64.0)
**ทดสอบ:** CDP headless — rich/บั๊กพิมพ์ 18/18 · การ์ดสีบนภาพรวม 13/13 · ไม่มี JS error · ยืนยันต้นเหตุ label ด้วย iso-label2 (label→focus เด้งปุ่ม, div→พิมพ์ได้)

## 2026-07-28 · ยังไม่ commit · การ์ดลูกค้าตามประเภท DOCC บนหน้าภาพรวม
**step:** ต่อยอด (นอก roadmap) | **ประเภท:** ฟีเจอร์
- เพิ่ม **การ์ด "ลูกค้าตามประเภท (DOCC)" เป็นการ์ดลำดับแรก**บนหน้าภาพรวม — นับจำนวนรายลูกค้าแยกตาม D/O/C/C + "ยังไม่ระบุ" + ยอดรวม
- นับตาม **ตัวกรองขอบเขตเดิม** (ทั้งองค์กร / เลือกทีม / เลือกรายคน) — ใช้ `scopedC` ชุดเดียวกับการ์ดสี ไม่ต้องเพิ่มตัวกรองใหม่
- `dashboard.js` import `DOCC` จาก book3.js (ไม่มี cycle) · `doccCard()` วางก่อน KPI grid · CSS `.docc-grid/.docc-item/.docc-letter`
**ไฟล์:** docs/js/modules/dashboard.js · css/app.css · sw.js(v0.63.0) · config.js
**ทดสอบ:** CDP ชุด D **16/16 ผ่าน** (การ์ดแรก · รวม 6 ราย · D=2/O=1/C=1/C=1/ยังไม่ระบุ=1 · กรองทีม GOV.1→4 ราย · กรองรายคน→2 ราย) · ไม่มี JS error
**ค้าง:** ต้องรัน `db/phase3-17.sql` ก่อน (คอลัมน์ docc) ไม่งั้นลูกค้าทุกรายไปตกช่อง "ยังไม่ระบุ"

## 2026-07-28 · ยังไม่ commit · ดูแบบฟอร์มบนจอ + โปรไฟล์(ชื่อ/รหัสผ่าน) + พิมพ์รวมหลายรายการ
**step:** ต่อยอด (นอก roadmap) | **ประเภท:** ฟีเจอร์
- **T1 ดูแบบฟอร์มบนจอ** — เปลี่ยนปุ่มในฟอร์ม Pending/Book 3 สี เป็น **"📄 ดูแบบฟอร์ม / พิมพ์"** (เปิดพรีวิวแบบฟอร์มต้นฉบับบนจอ + พิมพ์/PDF ในตัว · reuse `doPrint` เดิม ไม่สร้างใหม่)
- **T2 โปรไฟล์ของฉัน** — ปุ่ม 👤 บนแถบหัว/แถบข้าง → modal แก้ **ชื่อที่แสดง (username)** + **เปลี่ยนรหัสผ่าน** เองในแอป (`js/ui/profile.js`) · แก้ชื่อแล้วแถบหัวอัปเดตทันที · **ไม่ต้อง migration** (saveProfile own/admin + updatePassword ใช้ session token · trigger กันแก้ role/team)
- **T3 พิมพ์รวมหลายรายการ** — ปุ่ม **"🖨 พิมพ์ทั้งหมด"** ในลิสต์ Pending/Book 3 สี → รวมทุกรายการ "ที่กรองอยู่ตอนนี้" เป็น PDF ไฟล์เดียว (`printPendingBatch`/`printCustomerBatch` ต่อ `.pf-page` คั่นหน้าอัตโนมัติ · progress i/n)
**ไฟล์:** docs/js/ui/profile.js(ใหม่) · ui/formprint.js · modules/pending.js · book3.js · app.js · index.html · css/app.css · sw.js(v0.62.0) · config.js
**ทดสอบ:** CDP ชุด C **19/19 ผ่าน** (โปรไฟล์: แก้ชื่อ→แถบหัวอัปเดต · รหัสสั้น/ไม่ตรง/สำเร็จ · ดูแบบฟอร์ม Pending+Book3 · พิมพ์รวม 2 รายการ→≥2 หน้า) · ไม่มี JS error
**ค้าง:** ไม่มี — ทั้ง 3 ข้อไม่ต้องรัน SQL เพิ่ม

## 2026-07-27 · ยังไม่ commit · ชุดคำสั่งเจ้าของ 11 ข้อ (DOCC · rich text · print · สิทธิ์ · archive badge)
**step:** ต่อยอด (นอก roadmap) | **ประเภท:** ฟีเจอร์ + แก้บั๊ก
- **#1 ลบรูปนามบัตร/รูปลูกค้า** ต้องกดยืนยัน 2 ครั้ง + ให้สิทธิ์เฉพาะ admin/เจ้าของ (`canDelete` ใน cardfield/photofield · book3 คำนวณจาก sale_id)
- **#2 Archive badge "ค้าง"** — เดิมนับทั้งหมด (RLS) เลข 5 แต่รายการว่าง → นับตามขอบเขตทีม/คน + ขึ้นโน้ต "มีในคลังนอกทีม N งาน" (pending + book3)
- **#3 DOCC** (Designer/Owner/Contractor/Consult) ช่องในฟอร์ม + ดรอปดาวน์กรอง (`db/phase3-17.sql` · เก็บคำเต็ม กัน C ซ้ำ)
- **#4 บันทึกตรงไหนก็ได้** — `.modal-body{flex:1;min-height:0}` กันฟอร์มยาวดันปุ่มบันทึกทะลุ 90vh แล้วโดน overflow ตัดหาย
- **#5 หน้าจอ AI Import** ช่องข้อความโตตามเนื้อหา (autoGrow) โชว์เต็มไม่ต้องเลื่อนในกรอบ
- **#6 AI Import** เพิ่มแหล่ง "รูปฟอร์ม Book 3 สี (ลายมือ)" (book3form) → สร้าง prompt
- **#7 rich text** (ไฮไลต์/หนา/เอียง/ขีดเส้น/สีเข้ม) ช่องข้อความยาวใน Pending/Book 3 สี — `js/ui/richtext.js` (sanitize allowlist เข้ม + พาเลตสีคงที่)
- **#8 พิมพ์หน้า 2+** โชว์ชื่อ-สกุล/หน่วยงาน (`.pf-hdr-name`) · **#9 ข้อมูลที่ user กรอก = สีน้ำเงิน** ตอนพิมพ์
- **#10 บันทึกด่วน** sale เห็น/เลือกเฉพาะงาน-ลูกค้าของตัวเอง · หัวหน้า/admin เห็นหมด
- **#11 จำนวนลูกค้า 🟢🟡🔴** นับตามขอบเขต ตัวเอง/ทีมที่เลือก (เดิมนับทุกคนที่ RLS เห็น)
**ไฟล์:** docs/js/ui/richtext.js(ใหม่) · cardfield.js · photofield.js · formprint.js · modules/book3.js · pending.js · ai-intake.js · quicklog.js · data/supabase-adapter.js · css/app.css · css/print.css · config.js · sw.js(v0.61.0) · db/phase3-17.sql(ใหม่)
**ทดสอบ:** CDP — ชุด B 17/17 (AI/quicklog/print) · ชุด A 27/30 (3 fail = evaluate stall ของฮาร์เนส · diag ยืนยันหน้า Pending ถูกต้อง badge/rich/ไม่มี error) · cards regression 12/12 · sanitizeHtml กัน script/onerror/สีนอกพาเลต ผ่าน · ไม่มี JS error
**ค้าง:** เจ้าของต้องรัน `db/phase3-17.sql` (คอลัมน์ docc) · rich text เก็บ HTML ที่ sanitize แล้ว — ช่อง project_detail/education ตอนพิมพ์ตัดเหลือข้อความล้วน (คงการแบ่งบรรทัดในฟอร์ม)

## 2026-07-27 · ยังไม่ commit · นามบัตร 2 รูป (Book 3 สี) + lightbox ซูม · ย้าย log สำรองเป็นหน้าใน
**step:** — (เจ้าของสั่ง + รูป) | **ประเภท:** ฟีเจอร์
- **(1) log สำรอง Google Drive → หน้าใน:** admin.js เปลี่ยนรายการยาวเป็นปุ่ม "📋 ดูประวัติการสำรอง (N)" → เปิด modal (ไม่รกหน้า setting) · โหลด 50 รายการล่าสุด
- **(2) นามบัตรใน Book 3 สี:** เพิ่มได้สูงสุด 2 รูป (ด้านหน้า/ด้านหลัง) · เพิ่ม/แก้ไข/ลบได้ · desktop/iPad = อยู่ขวาของรูปบุคคล · มือถือ = ใต้รูปบุคคล (flex + media query 640px) · กดที่รูป → lightbox เต็มจอ ซูมเข้า-ออก (ปุ่ม +/− · ล้อเมาส์ · ปินช์ 2 นิ้ว · ลาก · ดับเบิลคลิก)
  - คอมโพเนนต์ใหม่: `js/ui/cardfield.js` (2 ช่อง เก็บ card_front_url/card_back_url) · `js/ui/lightbox.js` (ซูม/แพน/ปินช์)
  - `photofield.js` `fileToDataUrl` รับ opt {maxSide,quality} — นามบัตรย่อ 1280px/0.8 (ใหญ่กว่ารูปบุคคล 512 เพื่ออ่าน/ซูม)
  - `db/phase3-16.sql` (ใหม่) เพิ่มคอลัมน์ card_front_url/card_back_url · adapter saveCustomer ตัดคอลัมน์เสริม (age/card_*) อัตโนมัติถ้ายังไม่ migrate → **เจ้าของต้องรัน phase3-16.sql** ถึงจะเก็บนามบัตรได้
- bump VERSION 0.59.0 → 0.60.0 + precache cardfield/lightbox
**ไฟล์:** docs/js/ui/cardfield.js (ใหม่) · docs/js/ui/lightbox.js (ใหม่) · docs/js/ui/photofield.js · docs/js/modules/book3.js · docs/js/modules/admin.js · docs/js/data/supabase-adapter.js · docs/css/app.css · docs/sw.js · docs/js/config.js · db/phase3-16.sql (ใหม่)
**ทดสอบ:** Chrome จริงผ่าน CDP → **12/12 ผ่าน** (2 ช่อง หน้า/หลัง · แก้ไข/ลบ/เพิ่ม · lightbox เปิด+ซูม scale เปลี่ยน+รีเซ็ต+ปิด · save round-trip นามบัตรเก็บจริง · admin โหลดได้) + rerun team-person 11/11 · order 8/8 · ไม่มี JS error

## 2026-07-27 · ยังไม่ commit · ดรอปดาวน์ "ดูของ/เป้ารายคน" กรองรายชื่อตามทีมที่เลือก (3 หน้า)
**step:** — (เจ้าของสั่ง + รูป) | **ประเภท:** ปรับ UX
- เจ้าของขอ: กด "รวมทุกทีม" → ดรอปดาวน์รายคนแสดงครบ · กดทีม GOV.1 → เหลือเฉพาะสมาชิกทีมนั้น (ยังเคารพ RLS ที่ admin ตั้ง) · ทำทั้ง ภาพรวม/Pending/Book 3 สี
- personscope.js: `visiblePeople()` = สมาชิกของทีมที่เลือก (subtree · ให้สิทธิ์ทีมแม่เห็นทีมลูก) · เพิ่มเมธอด `setTeam(teamId)` วาดตัวเลือกใหม่ตามทีม (เลือกทีมใหม่ = กลับไป "ทุกคน" ของทีม) · ย้าย default=me เข้า component (`defaultSelf`)
- pending.js + book3.js: teamscope onChange → `pscope.setTeam(id)` + sync `view.person`
- dashboard.js: `scopedPeople()`/`personOptionsHtml()` + `renderPersonOptions()` เรียกตอนสลับทีม → dashPerson แสดงเฉพาะสมาชิกทีมที่เลือก
- bump VERSION 0.58.0 → 0.59.0
**ไฟล์:** docs/js/ui/personscope.js · docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/modules/dashboard.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Chrome จริงผ่าน CDP (seed 4 คนต่างทีม) → **11/11 ผ่าน** (ทุกทีม=ทุกคน · GOV.1=สมาชิก GOV.1 · TE-IMP=เห็นทีมลูก IMP1 · Book3/ภาพรวมเหมือนกัน) + rerun ชุดเดิม default 9/9 · appears 7/7 · order 8/8 · ไม่มี JS error

## 2026-07-27 · ยังไม่ commit · Book 3 สี: ย้าย "สีความสัมพันธ์" + "SALE ผู้ดูแล" ขึ้นบนสุดใกล้ทีม
**step:** — (เจ้าของสั่ง) | **ประเภท:** ปรับ UX
- เจ้าของขอ: ในฟอร์มลูกค้า Book 3 สี ย้าย สีความสัมพันธ์ + SALE ผู้ดูแล จากกลุ่มล่าง "การจัดกลุ่ม & ผู้ดูแล" ขึ้นไปไว้บนสุดใกล้ "ทีมผู้ดูแล"
- แก้ FORM: ลำดับกลุ่ม "ข้อมูลลูกค้า" = team_id → sale_id → color → no → name → … · ถอดกลุ่ม "การจัดกลุ่ม & ผู้ดูแล" (ว่างแล้ว) ออก
- ไม่กระทบ logic/พิมพ์ (อ่านค่าจาก name เหมือนเดิม) · bump VERSION 0.57.0 → 0.58.0
**ไฟล์:** docs/js/modules/book3.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Chrome จริงผ่าน CDP → **8/8 ผ่าน** (กลุ่มข้อมูลลูกค้า = team,sale,color,no,… · ไม่มีกลุ่มล่างแล้ว · default sale=me) · ไม่มี JS error

## 2026-07-27 · ยังไม่ commit · 🔴 แก้ดรอปดาวน์ "ดูของ" ไม่มีชื่อ sale คนอื่น ทั้งที่ได้สิทธิ์แล้ว
**step:** — (เจ้าของแจ้ง + แนบรูป) | **ประเภท:** แก้บั๊ก (RLS/DB)
- อาการ: nanthawan ได้ team_access ครบทุกทีม (view+edit) · "งาน/ลูกค้า" เห็นข้ามทีมได้แล้ว (12 โปรเจกต์) แต่ดรอปดาวน์ "ดูของ (รายคน)" ขึ้นแค่ตัวเอง — ไม่มีชื่อ sale คนอื่น
- **ต้นเหตุ:** `policies.sql` เขียน `profiles_select` แบบ `team_id = my_team_id()` (ไม่อ่าน team_access) · phase3-2 แก้ให้ใช้ can_access_team · แต่รัน policies.sql ซ้ำ**ทับ**กลับเป็นเวอร์ชันเก่า · และ `fix-cross-team-access.sql` รอบก่อน**ไม่ได้ re-apply profiles_select** → listProfiles คืนแค่ทีมตัวเอง → ดรอปดาวน์มีแค่ตัวเอง
  (คนละจุดกับบั๊ก can_access_team รอบก่อน: รอบนั้นแก้ "งาน" · รอบนี้คือ "รายชื่อคน")
- **แก้:**
  1. `db/policies.sql` — เปลี่ยน profiles_select ใช้ `can_access_team(team_id)` (ตอนติดตั้งแรก can_access_team ยังเป็นเวอร์ชันง่าย = ได้ผลเท่าเดิม · รันซ้ำไม่ revert อีก)
  2. `db/fix-cross-team-access.sql` — เพิ่ม re-apply `profiles_select` (can_access_team) → **เจ้าของต้องรันไฟล์นี้ซ้ำ 1 รอบ** (อัปเดตแล้ว)
- **ไม่แตะ frontend · ไม่ bump VERSION**
**ไฟล์:** db/policies.sql · db/fix-cross-team-access.sql · CLAUDE.md · autolog.md
**ทดสอบ:** PGlite (Postgres จริง) เพิ่มเซล 4 คนต่างทีม → **22/22 ผ่าน** (นันทวันเห็นสมาชิก 5 คนของทีมที่ได้สิทธิ์ · เห็นเซล GOV3 ข้ามทีม · ไม่เห็นเซล GOV4 · จำลองบั๊ก profiles=3 → รันไฟล์แก้ → 5 · รัน policies.sql ซ้ำไม่ revert)

## 2026-07-27 · ยังไม่ commit · แก้ดรอปดาวน์ "ดูของ" ไม่โผล่ (Pending + Book 3 สี)
**step:** — (เจ้าของแจ้ง) | **ประเภท:** แก้บั๊ก UX
- อาการ: ดรอปดาวน์เลือกรายคน "ยังไม่มา" (ไม่โผล่) บนหน้า Pending + Book 3 สี
- ต้นเหตุ: personscope ซ่อนดรอปดาวน์เมื่อ `people.length <= 1` (listProfiles คืน ≤1 คน เช่น RLS จำกัด / มีบัญชี active คนเดียว)
- แก้ 2 จุด:
  1. personscope: เปลี่ยนเงื่อนไขซ่อนเป็น `< 1` (โผล่เสมอถ้ามีอย่างน้อยตัวเราเอง)
  2. pending.js + book3.js: การันตีว่ามี "ตัวเรา" (จาก session) อยู่ในลิสต์เสมอ เผื่อ listProfiles คืนไม่ครบ/ล้มเหลว → ดรอปดาวน์โผล่แน่นอน + default=me ทำงานได้
- bump VERSION 0.56.0 → 0.57.0
**ไฟล์:** docs/js/ui/personscope.js · docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Chrome จริงผ่าน CDP · จำลอง `profiles=[]` (listProfiles ว่าง) → **7/7 ผ่าน** (ดรอปดาวน์ยังโผล่จาก session · default=me · "ทุกคน" ครบ) + rerun ชุด default เดิม 9/9 · ไม่มี JS error

## 2026-07-27 · ยังไม่ commit · ดรอปดาวน์ "ดูของ (รายคน)" default = user ที่ล็อกอิน
**step:** — (เจ้าของขอ) | **ประเภท:** ปรับ UX
- เจ้าของขอ: เปิดหน้า Pending / Book 3 สี มาให้ดรอปดาวน์ "ดูของ" ตั้งต้นที่ **ตัวเอง** (แสดงงาน/ลูกค้าของ user ที่ล็อกอิน) ไม่ใช่ "ทุกคน"
- แก้: ก่อน mount personscope ถ้า `!view.person` และ me อยู่ในลิสต์ → set `view.person = meId`
  · "ทุกคน" (person='') เลือกได้เสมอ แต่เปิดหน้าใหม่จะกลับมาตั้งต้นที่ตัวเอง · เลือกเจาะจงคนอื่น (เช่น สมชาย) = จำค่าไว้ตามเดิม
- ⚠️ หมายเหตุ: งานเก่าที่ owner_id/sale_id ว่าง (ยังไม่ระบุผู้ดูแล) จะไม่ขึ้นในค่าเริ่มต้น "ตัวเอง" — กด "ทุกคน" เพื่อดู แล้วค่อยกำหนดผู้ดูแล
- bump VERSION 0.55.0 → 0.56.0
**ไฟล์:** docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Chrome จริงผ่าน CDP (local · seed me + สมชาย) → **9/9 ผ่าน · ไม่มี JS error** (เปิดหน้า default=me เห็นเฉพาะของตัวเอง · "ทุกคน" เห็นครบ · เลือกเจาะจงจำค่า)

## 2026-07-27 · ยังไม่ commit · 🔴 แก้บั๊กสิทธิ์อ่านข้ามทีม (team_access) พัง — ต้องเป็น admin เท่านั้น
**step:** — (เจ้าของแจ้งบั๊ก) | **ประเภท:** แก้บั๊ก (RLS/DB)
- อาการ: ติ๊กให้หัวหน้า (nanthawan.s@dos.co.th) อ่านข้ามทีมได้ แต่กลับอ่านไม่ได้ · เห็นได้เฉพาะเปลี่ยน role เป็น admin
- **ต้นเหตุ:** `db/policies.sql` (~บรรทัด 51) มี `can_access_team()` เวอร์ชันเก่า (เช็กแค่ `= my_team_id()` **ไม่อ่าน team_access เลย**) · phase2-4/phase3-10 ยกระดับฟังก์ชันนี้ทีหลัง · พอรัน policies.sql ซ้ำ (ตามโน้ตเดิมที่ให้รันซ้ำแก้ pending_delete) `create or replace` เลย**ทับ**เวอร์ชันเต็มด้วยเวอร์ชันโง่ → สิทธิ์ข้ามทีมพังทั้งระบบ (is_admin ยังผ่าน = ดูเหมือน "ต้อง admin เท่านั้น")
- Admin UI + adapter (`setTeamAccess`/`listTeamAccess`) **ถูกต้องอยู่แล้ว** — บั๊กอยู่ที่ DB ล้วน ๆ ไม่แตะ frontend
- **แก้:**
  1. `db/fix-cross-team-access.sql` (ใหม่) — คืน `can_access_team()` (อ่าน team_access + ไล่ทีมแม่) + `can_edit_team()` + policy อ่าน(can_access_team)/เขียน(can_edit_team) ของทุกตารางหลัก · idempotent · guard pending_products/team_targets ด้วย to_regclass เผื่อยังไม่ได้รัน phase นั้น → **เจ้าของต้องรันไฟล์นี้ 1 รอบใน Supabase**
  2. `db/policies.sql` — ใส่ guard: ติดตั้ง can_access_team เวอร์ชันง่าย **เฉพาะตอน team_access ยังไม่มี** (`to_regclass('public.team_access') is null`) → รันซ้ำหลังตั้งระบบแล้วไม่ทับอีก (ปิดกับดักถาวร)
- **ไม่แตะ frontend · ไม่ bump VERSION**
**ไฟล์:** db/fix-cross-team-access.sql (ใหม่) · db/policies.sql · CLAUDE.md · autolog.md
**ทดสอบ:** PGlite (Postgres จริง PG16) รันไฟล์ db/ ตามลำดับจริง + shim auth.uid()/role authenticated → **16/16 ผ่าน** · จำลองบั๊ก (ทับด้วยเวอร์ชันเก่า → เห็นแค่ทีมตัวเอง) → รันไฟล์แก้ → เห็นข้ามทีมได้อีก (รวมทีมแม่→ทีมลูก) · แก้แยกตาม can_edit · patch policies.sql รันซ้ำไม่พัง

## 2026-07-26 · ยังไม่ commit · field "SALE NAME (ผู้ดูแล)" เป็น dropdown บัญชี · Pending + Book 3 สี
**step:** — (เจ้าของขอเพิ่ม) | **ประเภท:** ฟีเจอร์
- เจ้าของขอ: field SALE NAME กรอกด้วย dropdown ชื่อตามบัญชีที่มี · default = คนที่ล็อกอิน · เปลี่ยนชื่อในตั้งค่า→เปลี่ยนตามใน DB · sale ถูกลบ→blank รอ admin เลือกผู้ดูแลใหม่
- **ไม่ต้อง migration** — คอลัมน์ FK มีอยู่แล้ว: `pending_projects.owner_id` · `customers.sale_id` (ทั้งคู่ `on delete set null` → บัญชีถูกลบ = FK เป็น null อัตโนมัติ = ข้อกำหนด "blank รอ admin" ทำได้ที่ระดับ DB อยู่แล้ว)
- **เก็บ FK ไม่เก็บข้อความ** → ชื่อ resolve จากโปรไฟล์ปัจจุบันตอนแสดงผล · เปลี่ยนชื่อบัญชีในตั้งค่าระบบแล้วอัปเดตทุกที่ทันที (ไม่มีชื่อค้าง)
- คอมโพเนนต์ร่วมใหม่ `ownerSelectHtml()` ใน personscope.js — dropdown บัญชี (active ก่อน · ตัวเอง (ฉัน) · บัญชีปิด/ถูกลบยังโชว์ค่าเดิม + ชวนเลือกใหม่) · ใช้ทั้ง Pending (owner_id) + Book3 (sale_id)
- Pending: เพิ่ม field ในฟอร์ม + คอลัมน์ "SALE (ผู้ดูแล)" ในตาราง (migrate เผยคอลัมน์ครั้งเดียว) + การ์ดมือถือ + CSV · Book3: **แทนช่องพิมพ์ sale_name อิสระด้วย dropdown sale_id** (คงคอลัมน์ sale_name ไว้เป็น fallback ข้อมูลเก่า) + ตาราง/การ์ด/CSV resolve จาก sale_id
- default คนล็อกอิน: form preselect + adapter fallback (`savePending`/`saveCustomer` insert เติม owner_id/sale_id = me · ครอบ AI import/quick/ยกจาก Book3)
- 🔧 แถมแก้บั๊กที่เจอระหว่างทาง: personscope Book3 + dashboard (มุมมองรายคน) เดิมกรองลูกค้าด้วย `owner_id` ผิด → customers ไม่มีคอลัมน์นั้น (ใช้ `sale_id`) · แก้เป็น sale_id แล้ว · และ pending owner_id เดิมไม่เคยถูกเซ็ตตอน insert → per-person filter เลยว่างมาตลอด ตอนนี้เซ็ต default แล้ว
- bump VERSION 0.54.0 → 0.55.0 (config.js + sw.js)
**ไฟล์:** docs/js/ui/personscope.js · docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/modules/dashboard.js · docs/js/data/supabase-adapter.js · docs/js/data/local-adapter.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Chrome จริงผ่าน CDP (seed 3 บัญชี + งาน/ลูกค้า owner ต่างกัน + งานเจ้าของถูกลบ) → **15/15 ผ่าน · ไม่มี JS error** (คอลัมน์ SALE resolve ชื่อถูก · dropdown default = me · บัญชีถูกลบโชว์ "ยังไม่ระบุ" + ตัวเลือกให้เลือกใหม่ · Book3 ไม่มีช่องพิมพ์อิสระแล้ว · กรองรายคน sale_id · แก้ชื่อบัญชี→ตารางอัปเดตตาม)

## 2026-07-26 · ยังไม่ commit · ดรอปดาวน์ "ดูของ (รายบุคคล)" หน้า Pending + Book 3 สี
**step:** — (เจ้าของขอเพิ่ม) | **ประเภท:** ฟีเจอร์
- เจ้าของขอ: เลือกแสดง Pending / Book 3 สี ของ sale แต่ละคนเป็น dropdown
- คอมโพเนนต์ร่วมใหม่ `docs/js/ui/personscope.js` (`mountPersonScope`) — มิเรอร์ `teamscope.js` แต่เป็นดรอปดาวน์ · กรองด้วย **owner_id** (เจ้าของแถวจาก login) กติกาเดียวกับดรอปดาวน์เป้ารายคนบนหน้าภาพรวม · **ห้ามกรองด้วย sale_name (free text)**
- โผล่เฉพาะเมื่อเห็นคน >1 (RLS คัด profiles มาให้) · ตัวเองขึ้นบนสุดติดป้าย (ฉัน) · เรียงชื่อไทย
- ทำงาน **ต่อจากแถบเลือกทีม** (mountTeamScope): เลือกทีม → เจาะรายคน (กรองซ้อน ไม่ทับกัน) · จำค่าใน `view.person` (localStorage)
- pending.js: chain ใน `applyFilters()` · book3.js: รวมเป็น helper `applyScopes()` ใช้ทั้ง reload + สลับตัวกรอง
- bump VERSION 0.53.0 → 0.54.0 (config.js + sw.js) + เพิ่ม personscope.js ใน SHELL precache
**ไฟล์:** docs/js/ui/personscope.js · docs/js/modules/pending.js · docs/js/modules/book3.js · docs/css/app.css · docs/sw.js · docs/js/config.js
**ทดสอบ:** Chrome จริงผ่าน CDP (seed 3 profiles + งาน/ลูกค้า owner ต่างกัน) → **10/10 ผ่าน · ไม่มี JS error/console.error/unhandled** (ดรอปดาวน์โผล่ทั้ง 2 หน้า · เลือกคนแล้วกรอง owner_id ถูก · กลับ "ทุกคน" ครบ · จำค่าใน localStorage)

## 2026-07-26 · ✅ task 5 สำเร็จจริง · daily-backup อัปขึ้น Google Drive + ยืนยัน UTF-8
**step:** — (task 5 ปิดจ๊อบ) | **ประเภท:** ยืนยันผล/แก้บั๊กจบ
- เจ้าของทำครบ: grant-service-role.sql + OAuth refresh token (drive.file, publish app) + ตั้ง 3 secret GOOGLE_OAUTH_* + re-deploy → กด "สำรองเดี๋ยวนี้" **สำเร็จ** ได้ไฟล์ `te-backup-2026-07-26.json` (474KB) เจ้าของ theerasaku@gmail.com (OAuth = ไฟล์เป็นของ user มีพื้นที่ ไม่ใช่ SA)
- **เจ้าของกังวลว่าไฟล์ไทยเพี้ยน (mojibake `à¸à¸²à¸`)** → ผมโหลด byte จริงจาก Drive ผ่าน MCP + ถอดด้วย Python (คนละ decode path) → **ไฟล์ UTF-8 ถูกต้อง 100%** (teams[0].description="งานราชการ / ประมูล e-bidding", customers[0].name="ดร.อนพัทย์ พูลสวัสดิ์")
- 🔑 **บทเรียน: พรีวิว .json ของ Google Drive แสดงผลเป็น Latin-1 เอง (ไม่ตั้ง charset) → โชว์ mojibake ทั้งที่ไฟล์ดี** · อย่าวินิจฉัยไฟล์เสียจากพรีวิว Drive · เช็กด้วยการโหลด byte จริง (ตรงกับกฎ "เครื่องมือตรวจต้องไม่ใช่ตัวที่อาจเป็นต้นเหตุ")
- **เหลือขั้นเดียว:** เจ้าของตั้ง pg_cron (secret BACKUP_CRON_SECRET + cron.schedule '0 19 * * *' ยิง /functions/v1/daily-backup) → สำรองอัตโนมัติทุกวันตี 2

## 2026-07-26 · ยังไม่ commit · daily-backup รองรับ OAuth (แก้ storageQuotaExceeded ของ service account)
**step:** — (แก้บั๊ก task 5 ต่อ) | **ประเภท:** ฟีเจอร์/แก้บั๊ก (Edge Function)
- หลัง grant service_role → อ่านข้อมูล+ขอ token ผ่านหมด → ติดตอนอัป Drive: `Service Accounts do not have storage quota (storageQuotaExceeded)` — service account อัปลง My Drive (Gmail ส่วนตัว) ไม่ได้ (ตามที่เตือนไว้)
- แก้: index.ts รองรับ **OAuth refresh token ของผู้ใช้เอง** (`GOOGLE_OAUTH_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN`) → `googleToken()` ใช้ refresh_token grant ก่อน · ไม่งั้นตกไป service account (แยกเป็น `serviceAccountToken()`) · guard ยอมถ้ามี OAuth หรือ SA อย่างใดอย่างหนึ่ง
- README เพิ่มวิธี OAuth ครั้งเดียวผ่าน OAuth Playground (scope drive.file · publish app กัน refresh token หมดอายุ 7 วัน)
- **เจ้าของทำ:** ทำ OAuth (ได้ refresh token) → ตั้ง 3 secret → re-deploy → กดสำรอง · ไฟล์จะเก็บใน Drive ตัวเอง (มีพื้นที่)
**ไฟล์:** supabase/functions/daily-backup/index.ts · README.md · ไม่แตะ docs/ · ไม่ bump เวอร์ชัน

## 2026-07-26 · ยังไม่ commit · แก้ 403 daily-backup ต้นเหตุจริง: service_role ไม่มี GRANT
**step:** — (แก้บั๊ก task 5 ต่อ) | **ประเภท:** แก้บั๊ก (SQL grant เท่านั้น)
- หลังแก้ admin-check ผ่านแล้ว → ยัง 403 ตอน dumpAll อ่าน "teams" · ทั้ง legacy key + secret key ใหม่ 403 เหมือนกัน (ทั้งคู่ = service_role)
- **ต้นเหตุจริง:** โปรเจกต์นี้ auto-grant ไม่ทำงาน (โน้ตใน policies.sql) — เคย grant ให้ authenticated แต่**ไม่เคย grant ให้ service_role** → Edge Function โดน permission denied · admin-check ผ่านเพราะใช้สิทธิ์ผู้ใช้ (authenticated) ไม่ใช่ service_role
- แก้: `db/grant-service-role.sql` — grant all บนทุกตาราง/sequence ให้ service_role + default privileges สำหรับตารางอนาคต (service_role bypass RLS + คีย์อยู่เซิร์ฟเวอร์ · ปลอดภัย)
- **เจ้าของแค่รัน grant-service-role.sql ครั้งเดียว** แล้วกด "สำรองเดี๋ยวนี้" — ไม่ต้องแก้คีย์/deploy ใหม่ · จะใช้ legacy key หรือ secret key ก็ได้ (ทั้งคู่ = service_role ซึ่งมีสิทธิ์แล้ว)
**ไฟล์:** db/grant-service-role.sql · supabase/functions/daily-backup/README.md (troubleshooting) · ไม่แตะ docs/ · ไม่ bump เวอร์ชัน
**ทดสอบ:** SQL grant มาตรฐาน · รอเจ้าของรัน + กดยืนยัน (ผ่าน 403 แล้วจะเหลือแค่ฝั่ง Google — token/แชร์โฟลเดอร์)

## 2026-07-26 · ยังไม่ commit · แก้ daily-backup: 403 อ่าน profiles (legacy service key ใช้ไม่ได้)
**step:** — (แก้บั๊ก task 5 ต่อ) | **ประเภท:** แก้บั๊ก (Edge Function เท่านั้น · ไม่แตะ frontend)
- reason ที่ได้: "อ่าน profiles ไม่ได้ (403)" → token ผ่าน แต่ service key อ่านตารางโดน 403 → ตกเป็น role anon (ถูก revoke) → โปรเจกต์ใช้ API key ใหม่ (sb_publishable) legacy service role ใช้ไม่ได้
- แก้: ① checkAdmin ใช้ creds ผู้ใช้เอง (Authorization+apikey ที่ frontend ส่ง) อ่าน profile ตัวเอง (RLS ยอมแถวตัวเอง) — ไม่พึ่ง service key ② `SECRET = SB_SECRET_KEY || SERVICE_ROLE` ใช้กับ dumpAll/logBackup ③ dumpAll เจอ 401/403 → throw ชัด (กัน backup ว่างเปล่าเงียบ ๆ)
- **เจ้าของต้องทำ:** เปิด Legacy API keys ใน Supabase (ง่ายสุด) **หรือ** สร้าง Secret key (sb_secret_) ตั้ง secret `SB_SECRET_KEY` → แล้ว re-deploy ฟังก์ชัน
**ไฟล์:** supabase/functions/daily-backup/index.ts · README.md (ไม่แตะ docs/ · ไม่ bump เวอร์ชัน)
**ทดสอบ:** ทดสอบจริงไม่ได้ในเครื่อง (Deno/Google) — ตรวจโค้ด · รอเจ้าของ re-deploy + กดยืนยัน

## 2026-07-26 · ยังไม่ commit · แก้ daily-backup: ตรวจ admin ทนขึ้น + คืนเหตุผล — v0.53.0
**step:** — (แก้บั๊ก task 5) | **ประเภท:** แก้บั๊ก
- อาการ: เจ้าของ login admin แล้วกด "สำรองเดี๋ยวนี้" ได้ 401 "ต้องเป็นผู้ดูแลระบบ" (isAdmin ใน Edge Function คืน false)
- สาเหตุน่าจะ: โปรเจกต์ใช้ API key ใหม่ (sb_publishable) · isAdmin เดิมเรียก /auth/v1/user ด้วย ANON ตัวเดียว
- แก้: `checkAdmin()` ลอง apikey ทั้ง ANON + SERVICE_ROLE · คืน `reason` บอกจุดที่ติด (no-auth / auth-fail / role) · handler ส่ง reason กลับ · adapter ต่อ reason ให้ขึ้นบน UI
- **ต้อง re-deploy Edge Function** (วาง index.ts ใหม่) → กดอีกครั้ง จะเห็นสาเหตุชัด (หรือผ่านเลย)
**ไฟล์:** supabase/functions/daily-backup/index.ts · js/data/supabase-adapter.js · config.js · sw.js
**ทดสอบ:** แก้เฉพาะ Edge Function (ทดสอบจริงไม่ได้ในเครื่อง) + adapter (ต่อ reason) · UI เดิมผ่านแล้ว

## 2026-07-26 · ยังไม่ commit · สำรองขึ้น Google Drive อัตโนมัติ (Edge Function + pg_cron) — v0.52.0
**step:** — (คำขอเจ้าของ 5/5 ข้อ · เลือกแนวทาง B) | **ประเภท:** ฟีเจอร์ (backend + UI)
- เจ้าของเลือก **แนวทาง B: อัตโนมัติจริงฝั่งเซิร์ฟเวอร์** (เว็บ static สั่ง Drive เองไม่ได้ · MCP เป็นของ Claude ไม่ใช่เว็บ)
- `supabase/functions/daily-backup/index.ts` — ดึงทุกตารางด้วย service_role (ข้าม RLS) → ไฟล์ `te-sales-dashboard-backup` (กู้ที่ import-json.html ได้) → อัปขึ้น Google Drive ด้วย **service account** (RS256 JWT → OAuth → Drive multipart) → log ลง `backup_log` · เรียกได้ 2 ทาง: pg_cron (header x-backup-secret) หรือปุ่ม admin (ตรวจ JWT+role)
- `db/phase3-15.sql` — ตาราง `backup_log` + RLS (อ่าน admin · เขียนผ่าน service_role) + เทมเพลต pg_cron (คอมเมนต์ไว้)
- adapter: `listBackupLog`/`runDriveBackup` (facade+supabase invoke Edge Function · local คืน []/throw)
- admin.js: ส่วน "☁️ สำรองขึ้น Google Drive อัตโนมัติ" — กำหนดครั้งถัดไป (~02:00 ไทย) · สำรองล่าสุด · ประวัติ + ลิงก์เปิดไฟล์ · ปุ่ม "สำรองเดี๋ยวนี้"
- README.md วิธี setup ครบ (Google SA + แชร์โฟลเดอร์ + secrets + deploy + pg_cron) · bump 0.51→0.52
**ไฟล์:** supabase/functions/daily-backup/{index.ts,README.md} · db/phase3-15.sql · js/data/{adapter,supabase-adapter,local-adapter}.js · js/modules/admin.js · css/app.css · config.js · sw.js
**ทดสอบ:** gdbackup-test 7/7 ผ่าน (UI: section/ปุ่ม/กำหนดถัดไป/สำรองล่าสุด · local กดแล้ว error ถูกต้อง · ปุ่ม download เดิมยังอยู่ · ไม่มี error)
**ค้าง:** Edge Function + Google Drive **ทดสอบจริงไม่ได้ในเครื่องนี้** (ไม่มี deno/deploy/creds) — ตรวจโค้ดด้วยสายตา · เจ้าของต้องทำ setup ตาม README แล้วกด "สำรองเดี๋ยวนี้" เพื่อยืนยันครั้งแรก
**หมายเหตุ:** Gmail ส่วนตัว — ไฟล์เป็นของ service account (โควตา) · JSON เล็กใช้ได้นาน · ถ้าเจอ error โควตาให้ใช้ Shared Drive (README ระบุไว้)

## 2026-07-26 · ยังไม่ commit · dropdown เป้ายอดขายรายคนบน dashboard — v0.51.0
**step:** — (คำขอเจ้าของ 4/5 ข้อ) | **ประเภท:** ฟีเจอร์
- หน้าภาพรวมเพิ่ม dropdown "เป้ารายคน" (#dashPerson) — เลือก sale แต่ละคน → KPI/กราฟ/funnel นับเฉพาะงานที่ `owner_id` = คนนั้น · เป้า = รวม `sale_targets` รายเดือนในช่วงเป้า
- รายชื่อในดรอปดาวน์ = คนที่ผู้ใช้เห็น (RLS กรอง `listProfiles` ตาม login + org chart: sale=ทีมตัวเอง · manager=ทีมที่ดูแล · admin=ทุกคน) · ตัวเองขึ้นบนสุดติดป้าย (ฉัน)
- เลือกคน ↔ เลือกทีม ใช้ทีละมิติ (เลือกคนแล้วแถบทีมหรี่ `.is-off` · เลือกทีม/กด chip = ออกจากโหมดรายคน) · ค่าเริ่มต้น = ตามทีม/องค์กร (ไม่รบกวนของเดิม)
- paintBody แยกสาขา person/team · การ์ดเป้า → "เป้าของ <ชื่อ>" · ซ่อนตารางรายทีมในโหมดรายคน
- bump 0.50→0.51
**ไฟล์:** js/modules/dashboard.js · css/app.css · js/config.js · sw.js
**ทดสอบ:** persontarget-test 10/10 ผ่าน (มี dropdown+(ฉัน) · เลือกคน→เป้า 3.0/ปิด 2.5/83.3% · แถบทีมหรี่ · กลับมุมมองทีมได้ · ไม่มี error)
**ค้าง:** task 5/5 = backup อัตโนมัติขึ้น Google Drive — สถาปัตยกรรมทำจากเว็บ static ตรง ๆ ไม่ได้ · ต้องให้เจ้าของเลือกแนวทาง (ดูสรุปที่ตอบ)

## 2026-07-26 · ยังไม่ commit · ฟอนต์ลายมือ 3 ตัว + ธีมแบรนด์ DOS 2 ธีม + พิมพ์ตามฟอนต์ธีม — v0.50.0
**step:** — (คำขอเจ้าของ 3/5 ข้อ) | **ประเภท:** ฟีเจอร์
- **[พิมพ์ตามธีม]** print.css `#printRoot` เปลี่ยนจากสแตกตายตัว → `var(--font, …fallback)` = พิมพ์ PDF (Pending/Book3) ใช้ฟอนต์เดียวกับที่เลือกในธีม (fallback ปิดท้าย sans-serif กันอังกฤษเป็น serif)
- **[ฟอนต์ลายมือไทย 3]** เพิ่ม Itim · Mali · Sriracha (นิยม · SIL OFL · โหลด woff2 latin+thai รวมไฟล์ผ่าน gwfh · bundle offline) → docs/fonts/ + @font-face + `html[data-font=…]` + ตัวอย่างใน picker + FONTS ใน theme.js
- **[ธีมแบรนด์ DOS 2]** `[data-theme="doslife"]` (ขาว-เขียว · accent #1f9d57) · `[data-theme="greenovation"]` (น้ำตาล-ขาว · accent #7a5230) → app.css + THEMES ใน theme.js (accent แบรนด์ baked-in แต่ data-accent ยังทับได้)
- bump VERSION 0.49→0.50 · เพิ่มฟอนต์ 3 ไฟล์ใน sw SHELL
**ไฟล์:** css/app.css · css/print.css · js/ui/theme.js · fonts/{itim,mali,sriracha}-thai-400.woff2 · sw.js · config.js
**ทดสอบ:** theme-test 14/14 ผ่าน (ฟอนต์ 200+โหลดเข้า document.fonts · picker มีธีม/ฟอนต์ใหม่ · doslife/greenovation ใช้สีแบรนด์ · body+#printRoot ใช้ Itim · ไม่มี error)
**ค้าง:** task 3 (dropdown เป้ารายคนบน dashboard) + task 4 (backup อัตโนมัติขึ้น Google Drive — ต้องคุยสถาปัตยกรรม) ยังไม่ทำในรายการนี้

## 2026-07-26 · ยังไม่ commit · ข่าว = แท็บแยก + อัพโหลดไฟล์ + ถอด 2 แท็บ — v0.49.0
**step:** — (คำขอเจ้าของ) | **ประเภท:** ฟีเจอร์/รีแฟกเตอร์
- เจ้าของสั่ง 3 อย่าง: ① ทำข่าวเป็น **แท็บแยก** "📰 ข่าวประจำสัปดาห์" (ใหม่สุดขึ้นก่อน) ② **ลบแท็บ "ทีมขาย" + "Thai Water Expo"** ③ หน้าเพิ่มข่าวเพิ่ม **ปุ่มอัพโหลดไฟล์ HTML** + admin ลบได้
- sources.js: เหลือ 3 แท็บ [news, paths, play] · แท็บ news เป็นค่าเริ่มต้น · ย้ายการ์ดข่าวจากบนสุดของ paths → แท็บ news เต็ม (drawNews) · admin เห็น "+ เพิ่มข่าว" + ปุ่มลบต่อการ์ด (กด 2 ครั้ง)
- `openNewsAdd` มีปุ่ม "📁 เลือกไฟล์ HTML" → `FileReader.readAsText(file,'UTF-8')` เติมลง textarea + ดึง `<title>` (อ่านไฟล์เป็น UTF-8 = กันไทยเพี้ยนจาก clipboard)
- **ลบโค้ดตายทิ้ง** (ไม่มีใครนอก sources.js ใช้ · เช็กแล้ว): `drawExpo`/`openExpo`/`drawTeams`/`visibleTeamIds`/`teamRollup`/`STATUS`/`statusOf` + import `CONFIG`/`monthOf` (sources.js 897→~570 บรรทัด)
- **ถอดส่วนข่าวออกจาก admin.js** (การจัดการย้ายไปแท็บข่าวแล้ว) · CSS เพิ่ม `.newscard-wrap` (การ์ด+ปุ่มลบข้างกัน)
- bump VERSION 0.48.0 → 0.49.0
**ไฟล์:** js/modules/sources.js · js/modules/admin.js · css/app.css · js/config.js · sw.js
**ทดสอบ:** news2-test 20/20 ผ่าน (3 แท็บ·default news · อัพโหลดไฟล์→UTF-8→textarea+ดึง title · การ์ดไฮไลต์+ข่าวย้อนหลัง · iframe · ลบ 2-คลิก · paths ไม่มีข่าวแล้ว · กลยุทธ์ยังทำงาน · ไม่มี error)

## 2026-07-26 · ยังไม่ commit · ข่าวสารโอกาสงานประจำสัปดาห์ (news_reports) — v0.48.0
**step:** — (คำขอเจ้าของ) | **ประเภท:** ฟีเจอร์
- เจ้าของสร้างรายงานข่าว HTML จาก Claude Code ทุกสัปดาห์ → อยากแปะเป็นการ์ดแรก (ไฮไลต์ "ใหม่") ในแถบแหล่งงาน
- 🔒 ตัดสินใจ (ถามเจ้าของ): เก็บใน **Supabase** เห็นเฉพาะคนล็อกอิน — ไม่วางใน public repo (กลยุทธ์/target list DOS ห้ามหลุดสู่สาธารณะ) · เปิดอ่าน **เต็มจอในแอป** (iframe)
- `db/phase3-14.sql` — ตาราง `news_reports` (title, week_label, report_date, html, is_active) + RLS: อ่านทุกคนล็อกอิน · เขียน/ลบ admin เท่านั้น
- adapter: `listNews`(เมทาดาทา ไม่พก html)/`getNews`/`saveNews`/`deleteNews` (facade + supabase + local ครบ 3 ชั้น)
- sources.js: การ์ดข่าวบนสุดของแถบ "เส้นทางหางาน" · ใหม่สุด = การ์ดไฮไลต์ + ป้าย "🆕 ใหม่สัปดาห์นี้" · เก่า = "ข่าวย้อนหลัง" · กด → `openNewsReader` เปิด `<iframe srcdoc>` sandbox (allow-scripts/popups · ไม่มี allow-same-origin = แยก origin จากแอป)
- admin.js: ส่วน "📰 ข่าวสารประจำสัปดาห์" — วาง HTML ทั้งไฟล์ (ดึงชื่อจาก `<title>` อัตโนมัติ) + ลบ (กด 2 ครั้งยืนยัน)
- bump VERSION 0.47.0 → 0.48.0 (sources/admin/app.css ใน SHELL)
**ไฟล์:** db/phase3-14.sql · js/data/{adapter,supabase-adapter,local-adapter}.js · js/modules/sources.js · js/modules/admin.js · css/app.css · js/config.js · sw.js
**ทดสอบ:** news-test 19/19 ผ่าน (เพิ่มผ่าน modal · ดึง title · การ์ดแรก+ไฮไลต์ · ข่าวย้อนหลัง · iframe เนื้อหาไทยครบ · sandbox แยก origin · ลบ 2-คลิก · ไม่มี error)
**ค้าง:** ต้องรัน `db/phase3-14.sql` ใน Supabase ก่อนใช้จริง (ไม่รัน adapter คืน [] · หน้าอื่นไม่พัง)

## 2026-07-26 · ยังไม่ commit · ฟอร์มแก้ไข (modal) เป็น 2 คอลัมน์บน laptop/iPad — v0.47.0
**step:** — (คำขอเจ้าของ) | **ประเภท:** แก้บั๊ก/ปรับ UI
- เจ้าของเห็นฟอร์มแก้ไขงานเป็น 1 คอลัมน์บน Mac → อยากได้ 2 คอลัมน์
- สาเหตุ: กฎ `@media (max-width:1024px){.fgrid→1fr}` · จอ Mac หน้าต่าง ~1013px (retina/ไม่เต็มจอ) ≤1024 พอดี เลยตกเป็น 1 คอลัมน์
- แก้: ลด breakpoint 1024→600px (media ใช้ CSS px ไม่เพี้ยนตาม retina) · ตรงกับสเปก CLAUDE.md ที่ระบุ iPad = 2 คอลัมน์
- มีผลทุกฟอร์มที่ใช้ `.fgrid` (Pending/Book3/activities/admin/sources/log/contacts) — แก้ CSS จุดเดียว · ช่อง `.fld-wide` (area) ยังเต็มความกว้างเหมือนเดิม
- bump VERSION 0.46.0 → 0.47.0 (app.css อยู่ใน SHELL ต้อง refresh cache)
**ไฟล์:** css/app.css · js/config.js · sw.js
**ทดสอบ:** form2col-test 6/6 ผ่าน (laptop ~1013px=2 คอลัมน์ · มือถือ 400px=1 คอลัมน์ · iPad 810px=2 คอลัมน์ · ไม่มี error)

## 2026-07-26 · ยังไม่ commit · ปุ่มสลับมุมมอง ตาราง/การ์ด บน laptop+iPad — v0.46.0
**step:** — (คำขอเจ้าของ) | **ประเภท:** ฟีเจอร์
- เจ้าของอยากให้ Pending + Book 3 สี บน laptop เลือกดูเป็นการ์ด 2 คอลัมน์ได้ (เหมือน iPad)
- คอมโพเนนต์ร่วมใหม่ `js/ui/listview.js` — ปุ่ม "☰ ตาราง / ▤ การ์ด" (ใช้ .segmented เดิม) จำค่าใน localStorage `te:listView` ค่าเดียวใช้ร่วม 2 หน้า
- CSS: `.list-cards .cards` = grid 2 คอลัมน์ · มือถือ ≤430px บังคับการ์ด 1 คอลัมน์ + ซ่อนปุ่ม (`.segmented.viewmode`)
- default = ตาราง (คงพฤติกรรมเดิม) · สลับทันทีไม่โหลดข้อมูลใหม่ (การ์ด+ตารางอยู่ใน DOM แล้ว)
- bump VERSION 0.45.0 → 0.46.0 (config.js + sw.js) · เพิ่ม listview.js ใน SHELL
- 🪲 เจอ 1 บั๊กตอนเทสต์: `.viewmode{display:none}` โดน `.segmented` ทับ (specificity เท่า + มาทีหลัง) → แก้เป็น `.segmented.viewmode`
**ไฟล์:** js/ui/listview.js · css/app.css · js/modules/pending.js · js/modules/book3.js · sw.js · js/config.js
**ทดสอบ:** listview-test 15/15 ผ่าน (laptop สลับได้ · จำข้ามหน้า · reload จำได้ · grid 2 คอลัมน์ · มือถือ 1 คอลัมน์+ซ่อนปุ่ม · ไม่มี error)

## 2026-07-26 · ยังไม่ commit · เช็กลิสต์เตรียมขึ้น v1.0 (.md + .html)
**step:** — | **ประเภท:** เอกสาร
- เจ้าของรัน SQL ครบทุกไฟล์แล้ว (verification ผ่านทุกข้อ) → สร้างเช็กลิสต์ก้าวสู่ 1.0
- `RELEASE-1.0.md` — hard gate A–E (Supabase setup · ทดสอบเครื่องจริง 1.7 · บัญชีทีม+RLS · ข้อมูลจริง · backup round-trip) + soft signals + สิ่งที่ไม่ใช่เงื่อนไข 1.0 + ขั้นตอน tag semver
- `RELEASE-1.0.html` — เช็กลิสต์ติ๊กได้ จำสถานะใน localStorage · แถบ progress · ข้อ SQL ติ๊กมาให้แล้ว (pre-checked)
- **ไม่แตะโค้ดแอป** — เป็นเอกสารล้วน (ไม่ต้อง bump VERSION/sw.js)
**ไฟล์:** RELEASE-1.0.md · RELEASE-1.0.html
**ทดสอบ:** RELEASE-1.0.html 7/7 ผ่าน (render 21 hard + 3 soft · pre-check · progress · reload จำได้ · ไม่มี error)

## 2026-07-26 · ยังไม่ commit · ปุ่มบันทึกด่วนในเมนู + ลบ log ของตัวเอง + ชิป BY ใหม่ — v0.45.0
**step:** — | **ประเภท:** ฟีเจอร์ + แก้ UI (คำขอเจ้าของ 3 ข้อ)
- **① ปุ่มบันทึกด่วนในเมนู** (`[data-quicklog]`) แทรกระหว่าง Book 3 กับ แผนติดต่อ (sidebar + bottombar) · เด่น (accent) · ปุ่มแถบหัวเดิมคงไว้ + ขยาย ~20% (`#quickLogBtn` font 15px)
  · app.js: `openQL()` ใช้ร่วม 2 จุด · bindNav ข้าม `[data-quicklog]` (เปิด modal ไม่เปลี่ยนหน้า)
- **② ลบ log ของตัวเองได้ (admin ลบหมด)** — RLS `follow_delete`/`clog_delete` มี own-or-admin อยู่แล้ว **ไม่ต้อง migration**
  · เพิ่ม adapter `deleteFollowLog`/`deleteCustomerLog` (facade+supabase[return=representation ดัก RLS เงียบ]+local[เช็ก created_by])
  · `loglist.js bindLogEditing` รับ `deleteFn` → ปุ่ม "🗑 ลบบันทึก" ในกล่องแก้ไข กด 2 ครั้งยืนยัน · ต่อ deleteFn ทุก call ใน book3/pending
  · กันคนอื่นลบของเรา: ปุ่มอยู่ในกล่องแก้ไข (เปิดได้เฉพาะ canEditLog own/admin) + RLS อีกชั้น
- **③ ชิป BY (Quick-log):** เพิ่ม "ประชุมออนไลน์" · ตัด "นัด demo"/"ทวงถาม" ออก
**ไฟล์:** index.html · app.js · css/app.css · adapter.js · supabase-adapter.js · local-adapter.js · ui/loglist.js · modules/book3.js · modules/pending.js · modules/quicklog.js · config.js+sw.js (v0.45.0) · CLAUDE.md · WishtoHave.md
**ทดสอบ:** navdel-test 13/13 (เมนู·ไม่เปลี่ยนหน้า·ชิปใหม่·แถบหัว 15px·ลบ log จริง) + quicklog 19/19 + ailog 19/19 + aisrc 13/13 · ไม่มี JS error/rejection

## 2026-07-26 · ยังไม่ commit · เปลี่ยน label BY: "ใครติดตาม" → "ช่องทางติดต่อ" — v0.44.0
**step:** — | **ประเภท:** แก้ UI (คำขอเจ้าของ — ช่อง BY คือวิธี/ช่องทางติดต่อ ไม่ใช่ชื่อคนติดตาม)
- เปลี่ยน label ทุกจุด: `BY — ใครติดตาม` / `BY (ใคร)` → **`BY — ช่องทางติดต่อ`** + placeholder "เช่น โทร / เข้าพบ / ไลน์"
  - loglist.js (ฟอร์มเพิ่ม + กล่องแก้ไข) → คลุม Book 3 สี, Quick-log, quick-log popover
  - pending.js (ฟอร์มเต็ม + quick log)
  - ai-intake.js: FIELDS.log label → `ช่องทางติดต่อ (BY)` · PROMPT_HINTS เอา "ผู้ติดตาม" ออก
- **"BY" ในฟอร์มพิมพ์ (formprint/print) คงไว้** ตามฟอร์มกระดาษต้นฉบับ · คอลัมน์ DB `by_name` ไม่เปลี่ยน
**ไฟล์:** ui/loglist.js · modules/pending.js · modules/ai-intake.js · config.js+sw.js (v0.44.0)
**ทดสอบ:** quicklog-test 19/19 + ailog-test 19/19 ผ่าน · grep ยืนยันไม่เหลือ "ใครติดตาม"/"BY (ใคร)" ในฟอร์ม

## 2026-07-26 · ยังไม่ commit · P11 Quick-log (⚡ บันทึกเร็ว) MVP — v0.43.0
**step:** P11 (ใหม่ · นอก roadmap เดิม) | **ประเภท:** ฟีเจอร์
- โมดูลใหม่ `docs/js/modules/quicklog.js` + ปุ่ม ⚡ บันทึกเร็ว บนแถบหัว (`#quickLogBtn` · app.js)
- ประตูบันทึกจุดเดียว: แท็บ Book3/Pending → ค้นหาของเดิม (บันทึกต่อ) หรือ + เพิ่มใหม่ (ฟอร์มสั้น) → ลง log จบในหน้าเดียว
- ชิปช่องทาง (โทร/เข้าพบ/ไลน์…) เติม BY · ติ๊กสร้าง activity(+7 วัน) จาก next_doing · ฝัง 🤖 AI บันทึก (openAILog)
- "เปิดฟอร์มเต็ม" = jump ผ่าน `sessionStorage 'te:openRecord'` + navigate(view) (render ซ้ำเสมอ กัน hashchange กิน)
- **ใช้โค้ดเดิมซ้ำหมด ไม่สร้างซ้ำ:** listCustomers/listPending · loglist · addCustomerLog/addFollowLog · saveCustomer/savePending · COLORS/STAGES · openAILog
- ขอบเขต: **MVP ออนไลน์เท่านั้น** · ออฟไลน์คิว-sync = เฟส 2 (ยังไม่ทำ · UPDATE-PLAN.md)
**ไฟล์:** quicklog.js(ใหม่) · index.html(ปุ่ม) · app.js(import+bind) · css/app.css(.ql-*) · sw.js(SHELL+v0.43.0) · config.js(v0.43.0) · CLAUDE.md · UPDATE-PLAN.md · WishtoHave.md
**ทดสอบ:** quicklog-test 19/19 ผ่าน (ปุ่มแถบหัว · แท็บ · ค้นหาเจอ+บันทึกจริง · ชิปเติม BY · activity+7 · สร้างงานใหม่+บันทึก · มือถือเห็นปุ่ม/ไม่ล้นจอ · ไม่มี JS error/rejection)

## 2026-07-26 · ยังไม่ commit · แผนอัพเดต P1–P11 + ดีไซน์ Quick-log (เอกสาร ยังไม่ลงมือ)
**step:** — | **ประเภท:** เอกสาร/วางแผน (เจ้าของขอ — ประเมินไฟล์ชุดคำสั่ง P1–P11)
- ประเมินไฟล์ "ชุดคำสั่ง P1–P11" เทียบของจริง: P1/P2/P4/P6 ทำแล้ว · P3 ถอดถาวร · เหลือใหม่ P5(regex)/P7/P8/P9/P10/P11
- สร้าง `UPDATE-PLAN.md` — ตารางสถานะ P1–P11 + ลำดับที่แนะนำ (P9→P5→P11→P7+P8→P10) + **ดีไซน์เต็ม P11 Quick-log** ตามที่เจ้าของขอ
  (ปุ่มบันทึกเร็วจุดเดียว: แท็บ Pending/Book3 · ค้นหาของเดิม/เพิ่มใหม่ · ใช้ adapter/loglist/openAILog เดิมซ้ำ · MVP ออนไลน์ · เฟส 2 ออฟไลน์)
- บันทึกดัชนีลง `WishtoHave.md` (✅ ประเมินแล้ว) ชี้มา UPDATE-PLAN.md · P11 ทำเครื่องหมาย "เจ้าของสนใจ"
- ⚠️ ไฟล์ต้นทาง P1–P11 เป็น mojibake (กับดัก pbcopy ไม่ใส่ LC_CTYPE=UTF-8) — ถอดความครบแล้ว
**ไฟล์:** UPDATE-PLAN.md (ใหม่) · WishtoHave.md
**ค้าง:** ยังไม่ลงมือโค้ด — รอเจ้าของเคาะว่าจะเริ่มตัวไหน (แนะนำ P9 หรือ P11 ตามที่สนใจ)

## 2026-07-25 · ยังไม่ commit · ปุ่ม "AI บันทึก" (log) + NEXT DOING เน้นสี/หนา — v0.42.0
**step:** 3.5 (AI Intake) + 1.4/2.2 (log UI) | **ประเภท:** ฟีเจอร์ (คำขอเจ้าของ 2 ข้อ)
- **① ปุ่ม 🤖 AI บันทึก** บน Pending (`#lgAILog`) + Book 3 สี (`#blAILog`) ข้าง "+ เพิ่มบันทึก"
  → `openAILog(targetType, {recordName, defaultBy, addLogFn, onSaved})` ช่วยสรุปความก้าวหน้าเป็น "บันทึกติดตาม"
  รับ text/voice/รูปโน้ต · โหมดฟรี (ก๊อปวาง) + API key · โชว์พรีวิวแก้ได้ (เติมวันนี้/ชื่อผู้บันทึกให้) → เพิ่มผ่าน addFollowLog/addCustomerLog
- **โครงใช้ร่วม (เจ้าของสั่ง "ทุกจุด AI ต้องเท่ากัน"):** ดึง `fieldHtml`/`aiKeyBoxHtml`/`bindAIKeyBox` ออกเป็นส่วนกลาง
  + เพิ่ม target `log` ใน `FIELDS`/`PROMPT_HINTS`/`SOURCES_FOR`/`DEST_LABEL` · `buildPayload` แปลงปี พ.ศ.→ค.ศ. ของ log_date
  → AI Import กับ AI บันทึก ใช้แหล่ง/โมเดล/prompt/กล่อง key ชุดเดียวกัน อัปเดตทีเดียวได้เท่ากันหมด
- **② NEXT DOING เน้น** (`.log-next`): ตัวหนา + กล่องไฮไลต์ accent + ขอบซ้าย → อ่านปราดเดียวรู้ว่าต้องทำอะไรต่อ
- log **ไม่ผ่าน staging** (ต่างจาก 3.5) เพราะเป็นการต่อท้ายบันทึกสั้น ๆ ให้ record เดิม · created_by = หลักฐานผู้บันทึก
**ไฟล์:** ai-intake.js (openAILog + ดึงส่วนกลาง) · book3.js · pending.js · css/app.css (.log-next, .ai-log-preview) · config.js+sw.js (v0.42.0)
**ทดสอบ:** ailog-test 19/19 ผ่าน (Book3 e2e: สร้างลูกค้า→เปิดแก้ไข→AI บันทึก→วาง JSON→พรีวิว→เพิ่ม→เขียนจริง 1 แถว · NEXT DOING fw600+พื้น+ขอบ · Pending เปิดโมดัลได้) · aisrc-test 13/13 ยังผ่าน (refactor กล่อง key ไม่พัง) · ไม่มี JS error/rejection

## 2026-07-25 · ยังไม่ commit · เตรียมย้าย repo → org `te-sales` (URL ใหม่ te-sales.github.io/sales/)
**step:** — | **ประเภท:** เอกสาร / ย้ายโครงสร้าง (เจ้าของตัดสินใจ 25 ก.ค. 2569)
- เจ้าของจะย้าย repo ไป org `te-sales` แบบ A + เปลี่ยนชื่อ repo เป็น `sales`
  → URL ใหม่ `https://te-sales.github.io/sales/` · สงวน root `te-sales.github.io/` ไว้ให้แอปอื่น (ข่าว/ประมูล/supplier)
- **แอปใช้ path relative ทั้งหมด** (manifest `scope:"./"`, sw SHELL `./`, ไม่มี hardcode ชื่อ repo) → ย้ายแล้วไม่ต้องแก้โค้ด
- อัปเดตพิกัดในเอกสาร: CLAUDE.md · README.md · PROGRESS.md · Workflow/index.html (autolog เก็บประวัติเดิมไว้)
**ไฟล์:** CLAUDE.md · README.md · PROGRESS.md · Workflow/index.html
**ค้าง (เจ้าของต้องทำใน GitHub/Supabase เอง):**
  ① สร้าง org `te-sales` (ฟรี) ② Transfer repo เข้า org ③ Rename repo เป็น `sales` ④ Pages: Deploy from branch `main` /docs + Enforce HTTPS
  ⑤ **git remote set-url origin https://github.com/te-sales/sales.git** (ไม่งั้น push ต่อไม่ได้ — ทำหลัง ①–③)
  ⑥ Supabase → Auth → URL Configuration: Site URL `https://te-sales.github.io/sales/` + Redirect `https://te-sales.github.io/sales/**`
  ⑦ ทีมที่ติดตั้ง PWA ไว้ ลบไอคอนเก่า ติดตั้งใหม่จาก URL ใหม่ (PWA ผูกกับ origin)

## 2026-07-25 · ยังไม่ commit · AI Import: เพิ่มแหล่ง "ข้อความที่คัดลอก / ข้อความจากเสียงพูด" — v0.41.0
**step:** 3.5 (AI Intake) | **ประเภท:** ฟีเจอร์ (คำขอเจ้าของ — เพิ่มแหล่งข้อความ + prompt เปลี่ยนตามแหล่ง)
- เพิ่ม 2 แหล่งในหัวข้อ "1 · เลือกแหล่งข้อมูล": `text` (📋 ข้อความที่คัดลอก) · `voice` (🎤 ข้อความจากเสียงพูด)
  → ใช้ได้ทั้ง Pending และ Book 3 สี (`SOURCES_FOR` เพิ่มทั้งสองปลายทาง)
- คำสั่ง (prompt) เปลี่ยนตามแหล่งที่เลือก (`srcHint` เพิ่ม text/voice) · เป้าหมายเดิม = กรอกลง field เดิมทุกช่อง
  · voice บอก AI ว่าเป็นข้อความถอดเสียง (เผื่อคำผิด/ภาษาพูด) ให้ช่วยตีความ
- โหมด API: แหล่งข้อความ → ซ่อนปุ่มเลือกรูป (`#aiAutoRow`) · placeholder ช่องข้อความปรับตามแหล่ง
  · voice โชว์ hint "พิมพ์ด้วยเสียงได้ — แตะไมค์บนแป้นพิมพ์มือถือ" · ปุ่ม "ให้ AI อ่าน" ใช้ prompt ตามแหล่ง
**ไฟล์:** js/modules/ai-intake.js (SOURCE_LABEL · SOURCES_FOR · srcHint · syncSource · note prompt · HTML) · config.js+sw.js (v0.41.0)
**ทดสอบ:** aisrc-test 13/13 ผ่าน (Pending+Book3 มี 3 แหล่ง · prompt เปลี่ยนตามแหล่ง · field key ครบทุกแหล่ง · API ซ่อน/โชว์ปุ่มรูป · ไม่มี JS error/rejection) · screenshot ทั้งสองปลายทางผ่านตา

## 2026-07-25 · ยังไม่ commit · แสดงชื่อผู้ใช้ที่ล็อกอินบนแถบหัว — v0.40.0
**step:** 1.2 (App Shell) | **ประเภท:** ฟีเจอร์ (คำขอเจ้าของ — "ให้รู้ว่าอยู่ account ของใคร")
- เพิ่มชิปชื่อผู้ใช้บน topbar (`#topUser` = อวาตาร์อักษรแรก + ชื่อ) · โผล่ทุกขนาดจอ
  (เดิมชื่ออยู่แค่ sidebar-foot ซึ่งถูกซ่อน ≤1024px → iPad/มือถือไม่เห็นว่าล็อกอินเป็นใคร)
- `paintUser` เติมชื่อ/อวาตาร์/title (ชื่อ·อีเมล·role·ทีม) · ซ่อนก่อนล็อกอิน โผล่หลังล็อกอิน
- แก้ `.topbar-right` เป็น flex-wrap (ชิปยาวเกิน → ห่อลงบรรทัด ไม่ล้นจอมือถือ)
**ไฟล์:** index.html · css/app.css (.topuser + topbar-right wrap) · js/app.js (el + paintUser) · config.js+sw.js (v0.40.0)
**ทดสอบ:** topuser-test 9/9 ผ่าน (ซ่อนก่อน/โผล่หลังล็อกอิน · ชื่อ+อวาตาร์+title · เห็นบนมือถือ · ไม่มีแถบเลื่อนแนวนอน · ไม่มี JS error/rejection) · desktop+mobile screenshot ผ่านตา

## 2026-07-25 · ยังไม่ commit · Chunk 3: เป้ารายคน (sale) + มิติรายคนใน drill-down — v0.39.0
**step:** 3.13 (เป้ารายคน) | **ประเภท:** ฟีเจอร์ (Part 3b+4b — ก้อนสุดท้ายของชุดเป้า)
- `db/phase3-13.sql` ตาราง `sale_targets` (profile_id, period 'YYYY-MM', target_baht) · RLS select=ทุกคน write=admin
  · adapter tolerant (ยังไม่รัน migration → คืน [] ไม่พัง) · เพิ่ม listAllSaleTargets/saveSaleTarget ทั้ง facade/2 โหมด + backup
- **admin:** refactor เป็น `monthlyModal` (ใช้ร่วมทีม/รายคน) · หน้าย่อยทีมเพิ่มส่วน "เป้ารายคนในทีม"
  → กด 📅 รายคน → `openSaleMonthly` (โมดัลซ้อน z-index สูง) 12 เดือน · ปิดแล้วยอดรวมรายคนอัปเดต
- **drill-down:** เลือกทีม → เพิ่มตาราง "รายคนในทีม" (เป้า/ปิดจริงต่อ sale ในช่วงเป้า · ปิดจริงนับจาก owner_id)
- ครบวงจรเป้า: รายเดือน → รายคน/ทีม → รวมบริษัท · ชี้กราฟ/คลิกการ์ดดูรายละเอียดได้
**ไฟล์:** db/phase3-13.sql(ใหม่) · adapter.js · supabase-adapter.js · local-adapter.js · admin.js(monthlyModal/openSaleMonthly) · dashboard.js(drill รายคน) · app.css · CLAUDE.md · config.js+sw.js (v0.39.0)
**ทดสอบ:** saletarget-test 9/9 ผ่าน · libpg-query parse phase3-13 ผ่าน (โมดัลซ้อน · เก็บ 6 เดือน · รวม 12 · drill รายคน เป้า12/ปิด5)

## 2026-07-25 · ยังไม่ commit · Chunk 2: ชี้กราฟดูตัวเลข + คลิกการ์ดเป้า drill-down (Part 4) — v0.38.0
**step:** 1.5 (Dashboard) | **ประเภท:** ฟีเจอร์
- **ชี้เมาส์ที่กราฟ → tooltip** (คำขอใหม่): โซนโปร่งใสต่อเดือน (.chart-zone) + `mountChartHover` (fixed tooltip ตามเมาส์)
  โชว์ แผน(เป้า)/ปิดได้จริง/คาดปิด ของเดือนที่ชี้ · ไฮไลต์คอลัมน์
- **คลิกการ์ดเป้า → drill-down** (Part 4): `openTargetDrill` — ตาราง 12 เดือน + ไตรมาส 1-4 + ครึ่งปี×2 + รวมทั้งปี
  · คอลัมน์ เป้า/ปิดจริง · สลับขอบเขต บริษัท/รายทีม (chips) · เดือนนอกช่วงเป้าแสดงสีจาง
  · เป้า = ผลรวม team_targets รายเดือน · ปิดจริง = งาน won ตาม monthOf()
- ⏳ **ก้อนถัดไป:** เป้ารายคน (sale · ต้อง migration ตาราง sale_targets) + เพิ่มมิติ "รายคน" ใน drill-down
**ไฟล์:** docs/js/modules/dashboard.js (mountChartHover/openTargetDrill) · docs/css/app.css · config.js+sw.js (v0.38.0)
**ทดสอบ:** hoverdrill-test 10/10 ผ่าน (tooltip โชว์ ก.ย. แผน5/ปิด8 · drill 19 แถว เดือน/Q/H/ปี · สลับทีม)

## 2026-07-25 · ยังไม่ commit · Chunk 1: เป้ารายเดือนต่อทีม + สรุป Q/ครึ่งปี/ปี + โยงไปภาพรวม — v0.37.0
**step:** 3.10 (เป้ารายทีม) | **ประเภท:** ฟีเจอร์ (Part 3+4 — ก้อนที่ 1)
- ⭐ **ไม่ต้อง migration** — `team_targets.period` เดิม (unique team_id,period) ใช้เก็บ 'YYYY-MM' ได้เลย
- adapter: เพิ่ม `listAllTeamTargets()` (ทุก period) ทั้ง facade/supabase/local
- **หน้าตั้งค่า:** section "เป้ารายเดือนต่อทีม" → กด 📅 ที่ทีมย่อย → หน้าย่อย `openTeamMonthly` 12 เดือน
  + สรุป **ไตรมาส/ครึ่งปี/ปี** สด ๆ · บันทึกเมื่อออกจากช่อง (period='YYYY-MM') · ปิด→รวมยอดทีม/องค์กรอัปเดต
- **โยงไปภาพรวมอัตโนมัติ:** `rollupTargets()` รวมเป้ารายเดือนในช่วงเป้าต่อทีม → เป้ารวมบริษัท = ผลรวมทุกทีม
  (fallback settings ถ้ายังไม่ตั้ง) · sale เห็นเป้าทีมตัวเอง · admin เห็นเป้ารวม (โยงจากที่ตั้ง ไม่ใช่ค่า settings คงที่)
- ⏳ **ก้อนถัดไป:** เป้ารายคน (sale) · การ์ดเป้าคลิกดู drill-down (บริษัท/ทีม/คน × เดือน/Q/ครึ่งปี/ปี)
**ไฟล์:** adapter.js · supabase-adapter.js · local-adapter.js · dashboard.js (rollupTargets) · admin.js (openTeamMonthly) · app.css · config.js+sw.js (v0.37.0)
**ทดสอบ:** monthly-test 12/12 ผ่าน (12 เดือน · Q/H/ปี=90 · เก็บ 12 แถว period YYYY-MM · dashboard เป้ารวม=30(H2) · sale เห็นเป้าทีม 30)

## 2026-07-25 · เนื้อไฟล์เข้า `990d03e` แล้ว · เอกสารเสนอผู้บริหาร — ประหยัดงบ + คุณค่าฝ่ายขาย
**step:** — | **ประเภท:** เอกสาร (นอกโค้ด แยกจากตัวแอป)
- สร้าง `Workflow/proposal.html` — เอกสารนำเสนอผู้บริหาร: painpoint "Sale ไม่บันทึกการขาย" → ลูกโซ่ 5 ขั้น →
  วิธีที่ระบบแก้ทีละข้อ · เทียบงบ 3 ทาง (ระบบนี้ ~0 vs SaaS 450k–1.2M/3ปี) · ROI "กู้ 1 ดีลก็คุ้ม" · เงื่อนไขตามตรง
- ตัวเลขอิงของจริง: ขนาดงาน ~11,000 บรรทัด · 16 ตาราง · 61 RLS policy (วัดจากโค้ด) + เรตตลาดไทย 2569
- **จงใจวางที่ `Workflow/` ไม่ใช่ `docs/`** — `docs/` ถูก GitHub Pages เสิร์ฟออกเน็ตสาธารณะ
  เอกสารมีเรื่องงบ/กลยุทธ์ภายใน ห้ามหลุดออกไป
- มี artifact เวอร์ชันเดียวกันบน claude.ai ให้เจ้าของกดแชร์/พรีเซนต์ได้ด้วย

**ไฟล์:** `Workflow/proposal.html` (ใหม่ 428 บรรทัด · self-contained ไม่มี dependency ภายนอก)
**ทดสอบ:** ตรวจ tag ครบคู่ (unclosed/mismatched = none) · รองรับธีมสว่าง-มืด + print style
**ค้าง:** ⚠️ อีก session `git add -A` กวาดไฟล์นี้เข้า commit `990d03e` (v0.36.0) ที่ชื่อเรื่องคนละเรื่อง —
เนื้อไฟล์ครบถูกต้อง (diff เทียบ HEAD ว่าง) แค่ข้อความ commit ไม่ตรงกับของข้างใน · **ไม่แก้ประวัติ** (push แล้ว + session อื่นทำงานอยู่)
เกิดซ้ำรอบที่ 3 แล้ว — ปัญหาอยู่ที่ session อื่นใช้ `add -A`/`commit -a` ควบคุมจากฝั่งผมไม่ได้

## 2026-07-25 · ยังไม่ commit · ภาพรวมตาม role (Part 1/4) + ยืนยัน persistence (Part 2/4) — v0.36.0
**step:** 1.5 (Dashboard) | **ประเภท:** ฟีเจอร์ (คำขอใหญ่ 4 ส่วน — ทำ 2 ส่วนแรก)
- คำขอเจ้าของ 4 ส่วน: (1) ภาพรวมต่าง role (2) unlink ลบ account ไม่ลบงาน (3) เป้ารายเดือนต่อทีม+รวม Q/H/ปี (4) คลิกการ์ดเป้าดู drill-down
- **Part 1 ✅ ภาพรวมตาม role:** sale → เห็น "เป้าทีม" (เป้า+ยอดทีมตัวเอง) ไม่มีตัวกรองข้ามทีม/เป้าบริษัท
  · manager/admin/MD → เห็นเป้ารวมบริษัท + ตัวกรองทีม (สลับดูทีมตัวเอง/รวมได้) — ใช้หน้าเดียวกัน การ์ดต่างตาม role
- **Part 2 ✅ (ยืนยัน ไม่ต้องแก้โค้ด):** FK จาก pending/customers → profiles ทุกตัวเป็น `on delete set null` แล้ว
  งานผูกกับ `team_id` (ไม่ใช่ profile) → ลบ account แล้วงานคงอยู่ · owner/created_by แค่กลายเป็น null · ทีมยังเห็น/ดูแลต่อได้
- **Part 3 + 4 ⏳ ยังไม่ทำ:** เป้ารายเดือนต่อทีม (ตาราง+admin sub-page+รวม Q/H/ปี) และคลิกการ์ดเป้า drill-down
  = งานใหญ่ (แก้ DB model + adapter + admin + dashboard) → ทำต่อรอบถัดไป
**ไฟล์:** docs/js/modules/dashboard.js · config.js+sw.js (v0.36.0)
**ทดสอบ:** roledash-test 9/9 ผ่าน (admin=เป้า 385+ตัวกรอง · sale="เป้าทีม" 20 ไม่มีตัวกรอง · manager=385+ตัวกรอง)

## 2026-07-25 · ยังไม่ commit · หน้าตั้งค่า: แก้ชื่อ user ได้ + จัดการสิทธิ์ครบในหน้าเดียว + admin-only — v0.35.0
**step:** 2.4 (Admin) | **ประเภท:** ฟีเจอร์/ปรับสิทธิ์
- เจ้าของ: หลัง user ถูกเพิ่มใน Supabase → จัดการทุกอย่างในหน้าตั้งค่า ไม่ต้องกลับไป Supabase อีก
- **เพิ่มช่องแก้ "ชื่อ" (full_name)** ในตารางผู้ใช้ (เดิมโชว์เฉย ๆ แก้ไม่ได้) · บันทึกเมื่อออกจากช่อง
  (RLS `profiles_update` = `id=auth.uid() or is_admin()` อนุญาต admin แก้ชื่อคนอื่นได้อยู่แล้ว · guard ไม่บล็อก full_name)
- role / ทีมหลัก / สิทธิ์การมองเห็น (team_access ดู/แก้รายทีม) / ตำแหน่ง / สถานะ — มีครบในหน้าอยู่แล้ว
- **ตั้งค่าระบบ = admin เท่านั้น** (เดิม manager เข้าได้) — แก้ทั้ง nav (app.js) และ gate (admin.js)
**ไฟล์:** docs/js/modules/admin.js · docs/js/app.js · docs/css/app.css (.u-name) · config.js+sw.js (v0.35.0)
**ทดสอบ:** admin-test 11/11 ผ่าน (แก้ชื่อ persist · role/ทีม/คอลัมน์สิทธิ์ครบ · sale+manager เข้าตั้งค่าไม่ได้)

## 2026-07-25 · ยังไม่ commit · แก้ AGE: เก็บอายุเป็น field แยก (ไม่สร้างวันเกิดปลอม) — v0.34.4
**step:** 2.2 / 3.9 (Book3) | **ประเภท:** แก้บั๊ก/เปลี่ยนสเปค
- เจ้าของท้วง: v0.34.3 พิมพ์อายุแล้ว "สร้างวันเกิดปลอม" (1 ม.ค. 2502) มาแสดง — ไม่ต้องการ
  · ~90% ไม่รู้วันเกิดลูกค้า แต่อยากเก็บอายุ · หากรู้วันเกิดจริงค่อยคำนวณจากวันเกิด
- แก้เป็น: `customers.age` คอลัมน์แยก (`db/phase3-12.sql`)
  • ไม่มีวันเกิด → กรอกอายุ เก็บลง age (ไม่แตะ birthday)
  • มีวันเกิดจริง → คำนวณอายุจาก birthday + **ล็อกช่อง (readonly)** · บันทึก age = null (คำนวณเอา)
  • ตาราง/พิมพ์: `ageText(row)` = birthday→คำนวณ ‖ age ที่กรอก
  • 🛡️ supabase-adapter.saveCustomer ตัด `age` อัตโนมัติถ้าคอลัมน์ยังไม่มี → ไม่รัน migration ก็ไม่พัง
- ถอด birthdayFromAge + import todayISO ที่ไม่ใช้แล้วออกจาก book3
**ไฟล์:** book3.js · formprint.js · supabase-adapter.js (saveCustomer tolerant) · db/phase3-12.sql (ใหม่) · CLAUDE.md · config.js+sw.js (v0.34.4)
**ทดสอบ:** age2-test 11/11 ผ่าน · libpg-query parse phase3-12 ผ่าน (ไม่มีวันเกิด→age 67 เก็บ ไม่มี birthday ปลอม · มีวันเกิด→46 readonly age=null)

## 2026-07-25 · ยังไม่ commit · เพิ่มช่อง AGE (อายุ) ใน Book 3 สี — ผูกกับวันเกิดสองทาง — v0.34.3
**step:** 2.2 / 3.9 (Book3) | **ประเภท:** ฟีเจอร์
- เจ้าของขอช่องกรอกอายุใน Book 3 สี
- ⭐ ยังเก็บแค่ `birthday` ใน DB (ไม่เก็บ age เพราะเปลี่ยนทุกปีจะเพี้ยน — กติกาเดิม CLAUDE.md) → ทำเป็น **ผูกสองทาง**
  • มีวันเกิด → คำนวณอายุโชว์ให้อัตโนมัติ (ageNum) · เปลี่ยนวันเกิด → อายุอัปเดต
  • พิมพ์อายุ (ไม่รู้วันเกิดแน่) → ประมาณปีเกิด (1 ม.ค. ปีนั้น) เก็บลง birthday · ล้างอายุไม่แตะวันเกิด (กันข้อมูลหาย)
  • ช่อง AGE ไม่มี `name` → ไม่ถูกส่งเข้า DB
**ไฟล์:** docs/js/modules/book3.js (ageNum/birthdayFromAge + type 'age' + wiring) · docs/css/app.css (.fld-hint) · config.js+sw.js (v0.34.3)
**ทดสอบ:** age-test 10/10 ผ่าน (1980-06-15→46 · พิมพ์ 40→1986-01-01 · เปลี่ยนวันเกิด→อายุตาม · DB เก็บแค่ birthday ไม่มี age)

## 2026-07-25 · ยังไม่ commit · prompt AI import กรอกได้กว้างขึ้น (ไม่มั่ว) + ทีมผู้ดูแลบนสุดใน Book3 — v0.34.2
**step:** 3.5 (AI) / 2.2 (Book3) | **ประเภท:** ปรับปรุง/ฟีเจอร์
- **prompt AI import (Pending + Book 3 สี):** เดิมกรอกได้ไม่กี่ช่อง → ปรับใหม่
  • เพิ่ม `PROMPT_HINTS` คำอธิบายรายช่อง → AI แมปเนื้อหาลงช่องได้กว้าง (สรุปโน้ต → customer_needs/our_strengths/project_detail/win_plan/next_action)
  • สั่งให้ "สรุป/เรียบเรียง" ไม่ใช่ก๊อปคำตรง ๆ · ช่องที่อนุมานให้ confidence ต่ำ (ไฮไลต์เหลืองให้ตรวจ)
  • 🚫 ห้ามมั่ว/แต่งข้อมูลที่ไม่มี — ไม่มีข้อมูลให้เว้นว่าง
  • ชื่อบริษัทเอกชนไม่ครบรูป → จัดเป็น "บริษัท … จำกัด" · ⚠️ ยกเว้นหน่วยงานราชการ (เทศบาล/กรม/รพ. ฯลฯ) คงเดิม
- **ย้าย dropdown ทีมผู้ดูแลไปบนสุด** ของฟอร์ม Book 3 สี (กลุ่ม "ข้อมูลลูกค้า" ก่อนช่องชื่อ) — ให้ตรงกับ Pending
**ไฟล์:** docs/js/modules/ai-intake.js (PROMPT_HINTS+promptFor) · docs/js/modules/book3.js · config.js+sw.js (v0.34.2)
**ทดสอบ:** prompt-team-test 13/13 ผ่าน (prompt มีกติกาครบ · ทีมบนสุด+เริ่มต้นตาม account GOV.4)

## 2026-07-25 · ยังไม่ commit · ตารางสินค้า: เพิ่มมูลค่ารวมท้ายตาราง + ปุ่มใส่เป็นมูลค่างาน — v0.34.1
**step:** 3.9 (PRODUCT) | **ประเภท:** ฟีเจอร์
- เจ้าของขอ "เพิ่มมูลค่ารวม" ในตารางสินค้าฟอร์ม Pending
- เพิ่ม `<tfoot>` โชว์ยอดรวม = ผลบวก NET รายแถว (ถ้าไม่มี NET ใช้ TOTAL) · อัปเดตสดตอนพิมพ์/เพิ่ม/ลบแถว
- ปุ่ม "→ ใส่เป็นมูลค่างาน" ก๊อปยอดรวมลงช่อง value_baht (ลดกรอกซ้ำ · แก้ทับได้) · value_baht ยังเป็นตัวเลขจริงที่นับเข้าเป้า
**ไฟล์:** docs/js/modules/pending.js · docs/css/app.css (.prodfoot) · config.js+sw.js (v0.34.1)
**ทดสอบ:** prodtotal-test 7/7 ผ่าน (8.3M→7.8M เมื่อใส่ NET→5.3M เมื่อลบแถว · ปุ่มใส่ค่า value_baht ถูก)

## 2026-07-25 · ยังไม่ commit · #1 บัญชีทดสอบต่อกลุ่ม — db/test-accounts.sql (เจ้าของเลือก "test account จริง")
**step:** เครื่องมือทดสอบ | **ประเภท:** เอกสาร/SQL
- เจ้าของเลือกวิธี "สร้าง test account จริงใน Supabase" (เจอปัญหา RLS จริง) จากที่ผมเสนอ 2 ทาง
- `db/test-accounts.sql`: คู่มือ 2 ขั้น (สร้าง Auth user ใน Dashboard → รัน SQL ตั้ง role/ทีม/team_access)
  6 บัญชี: admin · manager สายราชการ (GOV.1 + access GOV.1/3/4) · manager สายเอกชน (TE-IMP → เห็น IMP1/2)
  · sale GOV.1 · sale IMP1 (ทีมลูก) · sale ไม่มีทีม (เคสกับดัก team_id ว่าง)
- guard_profile_privilege ปล่อยผ่านเมื่อ auth.uid()=null (รันจาก SQL Editor) → ตั้ง role/ทีมได้ตรง ไม่ต้องปิด trigger
**ไฟล์:** db/test-accounts.sql (ใหม่)
**ทดสอบ:** libpg-query parse ผ่าน 9 statements · เจ้าของต้องสร้าง Auth user + รันเองใน Supabase

## 2026-07-25 · ยังไม่ commit · AI import สลับ API/ฟรี · ทีมผู้ดูแลขึ้นบนสุด + เริ่มต้นตาม account — v0.34.0
**step:** 3.5 (AI) / 1.4 (Pending) / 2.2 (Book3) | **ประเภท:** ฟีเจอร์/ปรับ UX
- **#2 AI import แถบสลับวิธี:** segmented "📋 ก๊อปไปวางเอง — ฟรี" / "🔑 ใช้ API key — อัตโนมัติ"
  แยกสองส่วนชัด (เดิมกองรวมยาว) · จำโหมดใน localStorage (`ai-mode`) · มี key อยู่แล้วเริ่มที่ API
- **#3 ย้าย dropdown ทีมผู้ดูแลไปบนสุด** ของฟอร์ม Pending (กลุ่ม "หัวฟอร์ม" ก่อน PENDING NO.)
- **#4 ทีมเริ่มต้นอัตโนมัติ = ทีมของ account ที่ล็อกอิน** (`formRow.team_id = me.team_id` เมื่อสร้างใหม่) · เลือกเปลี่ยนได้
  · ใช้ทั้ง Pending + Book 3 สี · admin ที่ไม่มีทีม → "— ยังไม่ระบุ —" ตามเดิม
- **#1 (คำถามวางแผน) user login จำลองทดสอบแต่ละกลุ่ม:** ยังไม่ลงมือ — ตอบเป็นคำแนะนำวิธีการให้เจ้าของเลือกก่อน
  (แนะนำ: สร้าง test account จริงใน Supabase ต่อกลุ่ม/ทีม = เจอปัญหา RLS จริง · หรือทำ persona switcher ในโหมด local สำหรับพรีวิว UI เร็ว ๆ)
**ไฟล์:** ai-intake.js · pending.js · book3.js · app.css · config.js+sw.js (v0.34.0)
**ทดสอบ:** batch7-test 11/11 ผ่าน (สลับโหมด+จำค่า · ทีมบนสุด+มาก่อน PENDING NO. · เริ่มต้น GOV.1 + เปลี่ยนได้)

## 2026-07-25 · ยังไม่ commit · ชุด 6 งาน (เจ้าของสั่ง): กรองเดือนซ่อนงาน · แก้เซ็น · พิมพ์คอมเมนต์สีน้ำเงิน · ลิงก์กลยุทธ์ · โมเดล AI · ข้อความฟรี — v0.33.0
**step:** หลายส่วน | **ประเภท:** แก้บั๊ก/ฟีเจอร์
- **#6 (สำคัญ) "AI import แล้วข้อมูลหาย":** พิสูจน์แล้ว **ข้อมูลเข้า DB จริง** (intake→merged) แต่ถูก
  ตัวกรองช่วงเดือน (preset ที่ค้างใน localStorage) **ซ่อนงานที่ยังไม่ระบุ close_month เงียบ ๆ**
  → ย้ายกรองเดือนมาฝั่งเบราว์เซอร์ (`effMonth` = close_month ‖ เดือนของ decision_day) +
    แบนเนอร์นับงานที่ถูกซ่อน + ปุ่ม "ดูทั้งหมด (ล้างช่วงเดือน)" (กติกา "ห้ามซ่อนเงียบ ๆ")
- **#1 แก้ไขการเซ็นรับทราบ:** ปุ่ม "✏️ แก้ไข/เซ็นใหม่" + เติมคอมเมนต์เดิมให้แก้ต่อ →
  บันทึกเป็น signoff รอบใหม่ที่ทับของเดิม (append-only เดิมยังอยู่ในประวัติ) **ไม่แตะ policy DB** (ปลอดภัยตามสเปก)
- **#2 พิมพ์คอมเมนต์หัวหน้าเป็นสีน้ำเงิน:** `_signoff` flag → `.pf-signoff-row` → print.css `#1b53c0` (hardcode สีเพิ่มอีกจุด ตามที่ขอ)
- **#3 ลิงก์บนการ์ดกลยุทธ์:** เพิ่มลิงก์บน pbcard (helper `linksHtml` ใช้ร่วมกับแถบเส้นทาง)
- **#4 โมเดล AI หลากหลาย + โน้ต:** 9 รุ่น (OpenAI/Anthropic/Google/Meta) · **GPT-4o เป็นค่าเริ่มต้น = ทดสอบแล้วใช้ได้** + โน้ตบอก
- **#5 ทางฟรี:** ข้อความบอกวางใน "Claude / Gemini / ChatGPT" (เดิมบอกแค่ Claude)
**ไฟล์:** pending.js · signoff.js · formprint.js · print.css · sources.js · ai-intake.js · app.css · config.js+sw.js (v0.33.0)
**ทดสอบ:** batch6-test 18/18 ผ่าน (กรองซ่อน+ดูทั้งหมด · prefill เซ็น · สีน้ำเงินตอนพิมพ์ rgb(27,83,192) · ลิงก์กลยุทธ์ · 9 โมเดล · ข้อความฟรี)

## 2026-07-25 · ยังไม่ commit · แก้ "บันทึก API key เหมือนไม่ยอมเซฟ" — v0.32.1
**step:** 3.5/3.8 (AI Intake) | **ประเภท:** แก้บั๊ก/ปรับ UX
- อาการ: กดบันทึก OpenRouter key แล้ว "เหมือนไม่ยอมเซฟ"
- 2 สาเหตุ:
  ① พอเซฟสำเร็จ โค้ด **ล้างช่องกรอกทันที** + ยืนยันแค่ตัวเล็ก ๆ ใน summary → ดูเหมือนไม่ได้เซฟ
  ② ถ้า localStorage ถูกบล็อก (Safari โหมดส่วนตัว) `aiKey.set` **กลืน error เงียบ ๆ** → ผู้ใช้ไม่รู้ว่าพัง
- แก้:
  • `aiKey.set` คืน true/false + อ่านกลับมายืนยันว่าเขียนติดจริง · เซฟไม่ได้ → เด้งข้อความบอก "โหมดส่วนตัว…"
  • เพิ่มบรรทัดยืนยันสีเขียว `✅ บันทึก key ไว้แล้ว: sk-or-v1…XXXX` (คีย์ย่อ) — ค้างอยู่แม้เปิด modal ใหม่ = พิสูจน์ persist
  • ปุ่มเด้ง "✓ บันทึกแล้ว" · ปุ่มลบ disable ตอนไม่มี key · ไม่มี key → กางกล่องให้เห็นช่องกรอกเลย
**ไฟล์:** docs/js/modules/ai-intake.js · docs/css/app.css (.ai-keysaved) · config.js + sw.js (bump v0.32.1)
**ทดสอบ:** aikey-test 18/18 ผ่าน (เซฟ+ยืนยัน · persist ข้ามเปิดใหม่ · ลบ · เส้นทาง localStorage บล็อกมีข้อความบอก)

## 2026-07-25 · ยังไม่ commit · พิมพ์/PDF: เพิ่มพรีวิวในแอป (S24 เห็นตัวอย่างแล้ว) — v0.32.0
**step:** 3.9 (ปรับ) | **ประเภท:** แก้บั๊ก/ฟีเจอร์
- ปัญหา: เดสก์ท็อปกดพิมพ์เห็นตัวอย่าง แต่ **S24 (Chrome/Android) `window.print()` ไม่โชว์ตัวอย่างเลย**
- แก้: doPrint เปิด **พรีวิวในแอป** เป็นหน้ากระดาษ A4 บนจอ (ย่อพอดีจอมือถือ) + แถบปุ่ม 🖨 พิมพ์/บันทึก PDF + ปิด
  → ผู้ใช้เห็นฟอร์มจริงทุกเครื่อง แล้วกดสั่งพิมพ์เอง (ระบบพิมพ์ของเบราว์เซอร์เด้งตามปกติ)
- 🔴 ต้นเหตุลึก: `index.html` โหลด print.css แบบ `media="print"` → ทั้งไฟล์ทำงานเฉพาะตอนพิมพ์
  แก้เป็นโหลดทุก media แล้วให้ `@media screen`/`@media print` ภายในไฟล์แบ่งเอง (base = #printRoot ซ่อนอยู่ ไม่กระทบหน้าปกติ)
- print.css จัดโครงใหม่: ① base เค้าโครงฟอร์ม (จอ+พิมพ์ใช้ร่วม) ② @media screen เปลือกพรีวิว ③ @media print ซ่อนแอป
- ⚠️ **ผลพิมพ์จริงเหมือนเดิมเป๊ะ** — ย้ายกฎออกจาก @media print มาเป็น base (ซึ่ง apply ตอนพิมพ์ด้วย) · zoom พรีวิว print.css บังคับ zoom:1
**ไฟล์:** docs/css/print.css (จัดโครงใหม่) · docs/js/ui/formprint.js (doPrint) · docs/index.html (ตัด media="print")
        · docs/js/config.js + docs/sw.js (bump v0.32.0)
**ทดสอบ:** print-preview-test 15/15 ผ่าน (พรีวิวโผล่ z=300 · ฟอร์มเรนเดอร์บนจอ พื้นขาว/เส้นตาราง/มุมสี · ย่อพอดีจอ S24 zoom=0.48
           · ปุ่มพิมพ์เรียก window.print() · print media ซ่อนแถบ/แอป zoom รีเซ็ต · ปิดล้างสะอาด)
           · ยืนยันด้วยภาพ print-emul-pending.png = ฟอร์มพิมพ์ดำบนขาวเหมือนเดิม ไม่มีแถบเครื่องมือ

## 2026-07-25 · ยังไม่ commit · บันทึกติดตาม RESPONSE/NEXT DOING จัดบรรทัดได้ อ่านง่ายขึ้น — v0.31.1
**step:** 1.4 / 2.2 (ปรับ UI) | **ประเภท:** แก้บั๊ก/ปรับ UX
- ปัญหา: ข้อความ RESPONSE/NEXT DOING ในบันทึกติดตามแสดงติดกันเป็นพืด (บรรทัดที่พิมพ์ถูกยุบ) อ่านยาก
- เหตุ: div แสดงผลไม่มี `white-space` → newline ในข้อความถูกยุบเป็นช่องว่าง (เก็บใน DB ครบอยู่แล้ว)
- แก้: เพิ่มคลาส `.log-body` + CSS `white-space:pre-wrap; word-break:break-word; line-height:1.55`
- แก้ไขสะดวกขึ้น: textarea RESPONSE/NEXT DOING ใหญ่ขึ้น (rows 2→4/3) + auto-grow ยืดตามเนื้อหา
  (`.ta-grow` + delegated input listener ใน loglist.js ผูกครั้งเดียว ครอบทั้งฟอร์มเพิ่ม+กล่องแก้ไข)
- ใช้ร่วมทั้ง Pending (F4) และ Book 3 สี (F5) เพราะทั้งคู่เรียก loglist.js ตัวเดียว · popup (loghover) เก็บบรรทัดอยู่แล้ว
**ไฟล์:** docs/js/ui/loglist.js · docs/css/app.css (.log-body) · docs/js/config.js + docs/sw.js (bump v0.31.1)
**ทดสอบ:** logwrap-test 10/10 ผ่าน (display pre-wrap + เก็บ \n · textarea ta-grow rows=4 ยืด 114→162px ตอนพิมพ์)

## 2026-07-25 · ยังไม่ commit · คอลัมน์ "การติดตามล่าสุด" ตัดสั้น + hover popup เต็ม — v0.31.0
**step:** 1.4 / 2.2 (ปรับ UI) | **ประเภท:** ฟีเจอร์
- ข้อความในคอลัมน์ "การติดตามล่าสุด/ความคืบหน้า" ยาวล้นจอ → ตัดเหลือ ≤60 อักขระ เติม …
- ชี้เมาส์ที่ข้อความ → เด้ง popup แสดงความคืบหน้าเต็ม (RESPONSE + NEXT DOING + วันที่/ผู้บันทึก)
- ทำเป็นคอมโพเนนต์ร่วม `js/ui/loghover.js` — ใช้ทั้ง Pending (F4) และ Book 3 สี (F5) ตัวเดียว
- popup เป็น `position:fixed` (เลียน `.dp-pop` datepicker) กันโดน `.tbl-wrap` overflow:auto ตัดหาย
  + `pointer-events:none` ห้ามกินคลิกปุ่ม (กติกาแถบ PWA · ทดสอบ hit-test จริง)
- เลิกใช้ native `title` tooltip เดิม (ช้า/สไตล์ไม่ได้) → data-loghover เก็บของเต็ม
**ไฟล์:** docs/js/ui/loghover.js (ใหม่) · docs/js/modules/pending.js · docs/js/modules/book3.js
        · docs/css/app.css (.loghover) · docs/sw.js + docs/js/config.js (bump v0.31.0 + SHELL)
**ทดสอบ:** loghover-test 12/12 ผ่าน (mouse.move จริง + scrollIntoView · ไม่มี JS error/rejection)
           · ดูภาพ loghover-book3.png / loghover-pending.png ยืนยัน popup แสดงเต็มถูกตำแหน่ง

## 2026-07-25 · ยังไม่ commit · ตัวกรองทีม + AI OpenRouter/วางข้อความ + หัวบันทึกเน้นสี — v0.30.0
**step:** — (เจ้าของสั่ง 5 ข้อ) | **ประเภท:** ฟีเจอร์ (หลายหน้า)
- **แถบเลือกทีม (ใหม่ `docs/js/ui/teamscope.js`)** ใช้ร่วม Pending + Book 3 สี
  - "กำลังแสดง: <ทีม>" + ชิปเลือก (รวมทุกทีม / รายทีม) · โผล่เมื่อเห็นหลายทีม (admin/หัวหน้า)
  - กรองฝั่งเบราว์เซอร์จาก rawRows (RLS คัดมาแล้ว) · ให้สิทธิ์ทีมแม่ = เห็นทีมลูก (subtree)
  - `view.team` จำใน localStorage · เลือกแล้วไม่ต้องโหลดใหม่
- **AI Import: เปลี่ยน BYO key → OpenRouter** (`ai-intake.js`) [[byo-api-key-decision]]
  - `callOpenRouter` (OpenAI-compatible) · key `te-dashboard:openrouter-key` (เครื่องนี้เท่านั้น)
  - **dropdown เลือก model** (`AI_MODELS` 5 ตัว vision · จำ `te-dashboard:openrouter-model`) · แต่ละคนหา key เอง
- **AI Import: กล่องวางข้อความยาว** (`#aiNote` + ปุ่ม 🧠) — วางโน้ต/สรุปประชุม → AI สรุปเลือกส่วนที่เกี่ยว → กรอกฟอร์ม → พักในรายการรอตรวจ (ตรวจ/แก้ก่อนบันทึกจริง · ใช้ staging เดิม)
- **หัวโมดัลบันทึก (log) เป็น heading + สีเน้น** (`.q-sub` ใน app.css) — ชื่อโครงการ/ลูกค้า 18px หนา สี accent · มีผลทั้ง Pending + Book 3 สี (ใช้คลาสเดียวกัน)
- ทดสอบ: batch2 19/19 (team scope filter · log heading · OpenRouter key+model+note) · batch 16/16 · dash-filter 15/15
- เรนเดอร์ภาพยืนยัน: log heading (accent) + AI OpenRouter modal (note box + model dropdown)
- bump v0.29.0 → v0.30.0 · +teamscope.js ใน sw precache · DATA_MODE=supabase · ไม่มี key/PII หลุด

## 2026-07-24 · ยังไม่ commit · งานชุดกลางคืน 7 อย่าง (เจ้าของสั่งก่อนนอน) — v0.29.0
**step:** — (เจ้าของสั่งรวด 7 ข้อ) | **ประเภท:** ฟีเจอร์ + แก้บั๊ก (หลายหน้า)
1. **Dashboard: ตาราง "Pending Project ล่าสุด"** (`dashboard.js` `recentPendingSection`) — 8 งานที่อัปเดตล่าสุด + stage pill
   - admin เห็นทุกทีม · sale เห็นเฉพาะทีมตัวเอง — **RLS คัดให้แล้วใน rows** (ใช้ scoped = ผ่านตัวกรองทีมอีกชั้น)
2. **ฟอนต์: เพิ่ม IBM Plex Sans Thai + Noto Sans Thai** (bundle subset ไทย 400+700 · ~9-12KB/ไฟล์ · OFL)
   - ตัวเลือกในหน้า 🎨 เป็น 5 ฟอนต์: Inter · Sarabun · IBM Plex · Noto · ระบบ
   - 🐛 กันบั๊กเดิมซ้ำ: ลบ "Noto Sans Thai" ออกจากสแตก --font เริ่มต้น/inter/system ด้วย (bundle แล้วจะกลายเป็นค่าเริ่มต้นบน iPhone + ตัวเลือกซ้ำ)
3. **AI Import: ตัด Notion + Obsidian** — เหลือแค่ นามบัตร→ลูกค้า · ฟอร์มกระดาษ→Pending (`ai-intake.js`)
4. **AI: เชื่อม API key ของผู้ใช้เอง (BYO key)** — กล่อง 🔑 ในโมดัล AI Import
   - 🔒 เก็บ localStorage `te-dashboard:anthropic-key` **เครื่องนี้เท่านั้น** · ไม่ลง repo/ไม่ส่ง Supabase · ยิงตรงหา Anthropic (header dangerous-direct-browser-access) · เตือน "อย่าใส่บนเครื่องสาธารณะ"
   - มี key → `aiExtract` ยิงตรง · ไม่มี → fallback Edge Function เดิม · ใช้ได้ทั้ง pending + book3
5. **Pending: preset "ครึ่งปีหลัง (เป้า 80 ล้าน)" → "ครึ่งปีหลัง" + เพิ่มปุ่ม "ทั้งปี"** (`pending.js` presetRange case 'year')
6. **Pending form: ย้ายแถบ Success/Miss เข้า `.modal-body`** — เดิมอยู่นอก body ถูก pin ล่างจอ บังฟิลด์บน S24
   - ย้ายเป็นลูกตัวสุดท้ายของ body (เลื่อนตามเนื้อหา) · CSS margin ชิดขอบล่าง body · บทเรียนเดียวกับ PWA bar
7. **PDF print (Pending) หัวฟอร์ม** (`formprint.js` + `print.css`) — เดิม**ไม่แสดงชื่อโครงการเลย** (มีแต่ spacer ว่าง)
   - เพิ่มช่องชื่อโครงการ (pf-v-title กว้าง) · ขยับ "NO.(Sale code count)" ไปขวา (pf-v-no คงที่ · flex-wrap:nowrap) ไม่ตกบรรทัด
- ทดสอบ: font-test 17/17 · dash-filter 15/15 · batch-test 16/16 · เรนเดอร์ภาพยืนยัน หัว print + AI keybox + dashboard + pending form
- bump v0.28.0 → v0.29.0 · DATA_MODE=supabase · ไม่มี key/PII หลุด (BYO key อยู่ localStorage เท่านั้น)

## 2026-07-24 · ยังไม่ commit · เลือกฟอนต์ได้ (Inter/Sarabun/ระบบ) — v0.28.0
**step:** — (เจ้าของขอ "อยากให้เลือก font ได้") | **ประเภท:** ฟีเจอร์ (ธีม/ฟอนต์)
- เพิ่มตัวเลือกฟอนต์ในหน้าต่าง 🎨 (ต่อจากธีม+สีเน้น) 3 ตัว: **Inter** (ค่าเริ่มต้น) · **Sarabun** (เอกสารไทย) · **ระบบ**
  - เจ้าของเลือกชุด "Inter · Sarabun · ระบบ" (ถาม AskUserQuestion เพราะกระทบน้ำหนัก repo)
- 🔤 **bundle Sarabun (subset ไทย) 400+700 ลง `docs/fonts/`** — ~9.8KB/ไฟล์ (ไทยมีกลิฟน้อย) · OFL · โหลดจาก fontsource
  - `@font-face` จำกัด `unicode-range: U+0E00-0E7F` → ไทย=Sarabun · ตัวเลข/อังกฤษ=Inter (per-glyph fallback)
  - offline ครบ ไม่พึ่ง CDN (เพิ่มลง sw.js SHELL precache) · ขึ้นครบทุกเครื่องรวม iPhone/iPad ที่ไม่มี Sarabun ในระบบ
- สลับด้วย `data-font` บน `<html>` (ชุดเดียวกับ data-theme/data-accent) · จำใน localStorage `te-dashboard:font`
  - `html[data-font=X]` specificity 0,1,1 → ชนะ `--font` ใน :root และ [data-theme] (0,1,0)
  - เพิ่ม data-font ในสคริปต์ inline กันจอกระพริบ (index.html) + `applyTheme()` ตั้งให้
- 🐛 **กันบั๊กจากการ bundle**: ลบ "Sarabun" ออกจากสแตก --font เริ่มต้น/Inter (`:root`, noir, data-font=inter)
  → ไม่งั้น bundle Sarabun แล้ว ค่าเริ่มต้นจะกลายเป็น Sarabun บน iPhone ทันที + ตัวเลือก Inter กับ Sarabun เหมือนกัน
  (จับได้ตอนเทสต์วัดความกว้าง: inter=sarabun=329px · แก้แล้ว sarabun=329 ≠ ระบบ=338.8)
- ทดสอบ font-test 13/13 (โหลด/ครอบคลุมไทย/สลับ/จำค่า/no-flash/ไม่มี error) · เรนเดอร์ภาพยืนยันพิกเกอร์ + Sarabun บนหน้าจริง
- bump v0.27.0 → v0.28.0 · DATA_MODE=supabase · ไม่มี key/PII หลุด

## 2026-07-24 · ยังไม่ commit · ปรับ UI ตามดีไซน์ Claude Design (TeDashboard mockup) — v0.27.0
**step:** — (เจ้าของแนบ mockup "เรียนรู้แนวทาง html เพื่อปรับ UI") | **ประเภท:** แก้บั๊ก + ปรับดีไซน์ (dashboard)
- เทียบ mockup กับ UI จริง → **UI เราตรงกับดีไซน์อยู่แล้วเกือบทั้งหมด** (ตัวแปร CSS ชุดเดียวกัน · การ์ด 14px · `.stat-value` 24px/-.4px · `.tag` = pill color-mix 18/40% เหมือน stage pill ของ mockup เป๊ะ)
  → สรุป: mockup ถูกสร้างให้เข้ากับ app เรา ไม่มีงานรื้อโครง · หยิบมาแค่ "ส่วนต่างจริง" 2 จุด
- 🐛 **แก้บั๊ก Top 3 งานใหญ่** (`.top3 b` ใน app.css) — `<b>` มี `grid-row:1` แต่ไม่ล็อกคอลัมน์
  → auto-placement ของ grid วางไอเท็มล็อกแถวก่อนไอเท็ม auto → `<b>` แย่งคอลัมน์ 1 (ช่องอันดับ 22px)
  → "12.4 ล้าน" ตกบรรทัดไปอยู่ซ้าย ชื่องานถูกดันไปขวา · แก้: ปัก `grid-column:3; text-align:right`
  → เห็นบั๊กนี้เพราะเรนเดอร์ภาพจริงเทียบ mockup (เทสต์ตัวเลขไม่จับ layout)
- ✨ **ห่อแถบความคืบหน้าเป็นการ์ด** (`dashboard.js`) — เดิมแถบ prog ลอยเปล่าบนพื้นหลัง
  → mockup ทำเป็นการ์ดหัวข้อ "ยอดขายเทียบเป้า" · ทำตาม = การ์ด "ความคืบหน้าเทียบเป้า" (สอดคล้องกับทุก section ที่เป็นการ์ด)
- bump v0.26.0 → v0.27.0 (config.js + sw.js) · เรนเดอร์ภาพยืนยันทั้ง 2 จุด · dash-filter 15/15 ผ่าน · ไม่มี JS error
- ⚠️ ตรวจแล้ว: DATA_MODE กลับเป็น 'supabase' · ไม่มี key/PII หลุด

## 2026-07-24 11:24 · ยังไม่ commit · Dashboard: ตัวกรองทีมทั้งหน้า (รวม/แยก) + ลูกค้า Book 3 สี รายทีม
**step:** — (WishtoHave · เจ้าของเลือก + "go on") | **ประเภท:** ฟีเจอร์ (dashboard)
- WishtoHave: "admin filter dashboard ดูได้ทุกทีม ทั้งรวมและแยก จาก book3+pending"
- เดิม team scope มีเฉพาะส่วนเป้ายอดขาย → **ยกขึ้นเป็นตัวกรองทั้งหน้า**:
  - แถบ chip "ดูทีม: ทั้งองค์กร(รวม) / GOV.1 / … " บนสุด · กดทีม → KPI/กราฟ/funnel/top3/เลยกำหนด/ลูกค้า Book 3 สี นับเฉพาะทีมนั้น (มุมมอง "รวม") · ป้าย "กำลังดูเฉพาะ …"
  - เป้า KPI เปลี่ยนตามขอบเขต: ทั้งองค์กร=เป้ารวม(settings) · เลือกทีม=ผลรวมเป้าทีม (team_targets)
  - ตาราง "เป้าหมายตามทีม (แยก)" โชว์ทุกทีมเสมอ = มุมมอง "แยก"
  - **การ์ดใหม่ "ลูกค้า Book 3 สี"** นับตามสี 🟢🟡🔴 กรองตามทีม (ให้ตัวกรองครอบ Book 3 สี ตามที่ขอ)
- refactor render เป็น shell + `paintBody(scope)` · ใช้ `expandTeams`/`summarize`/`teamBreakdown` เดิม (ทดสอบแล้ว) · ตัด `bindTeamScope`/chips ในส่วนเป้า (ย้ายขึ้นบน)
- bump v0.26.0
**ไฟล์:** docs/js/modules/dashboard.js · docs/css/app.css · docs/js/config.js · docs/sw.js · WishtoHave.md
**ทดสอบ:** dashboard filter **15/15** (puppeteer local: รวม 25M/5ราย · GOV.1 20M+เป้า30M/3ราย · TE-IMP 5M/2ราย · แยกโชว์ทุกทีม · ไม่มี JS error) · **ดูภาพจริงแล้ว** (noir+Inter) layout ครบสวย

## 2026-07-24 08:09 · ยังไม่ commit · ตั้ง Noir เป็นธีมเริ่มต้น + bundle ฟอนต์ Inter จริง
**step:** — (เจ้าของขอ) | **ประเภท:** ฟีเจอร์ (ธีม/ฟอนต์)
- **ธีมเริ่มต้น = Noir** (ดีไซน์จาก Claude) — คนเปิดใหม่/ยังไม่เคยเลือกธีมเห็นดีไซน์นี้ก่อน
  - `index.html` `<html data-theme="noir">` · `theme.js currentTheme()` fallback → 'noir' · จัดลำดับ THEMES ใหม่ (noir/brown ขึ้นก่อน)
  - คนที่เคยเลือกธีมเองยังได้ธีมเดิม (localStorage ทับ) · สลับได้ที่ปุ่ม 🎨
- **ฟอนต์ Inter ของจริง (bundle ไม่พึ่ง CDN)** — `docs/fonts/inter-latin.woff2` (Latin variable 100–900 · 48KB · OFL) จาก @fontsource
  - `@font-face` + `--font: "Inter","Noto Sans Thai",...` → ตัวอังกฤษใช้ Inter · ตัวไทยตกไป Noto/ระบบ (per-glyph fallback)
  - เพิ่มใน sw SHELL → PWA ออฟไลน์โหลดฟอนต์ได้
- bump v0.25.0
**ไฟล์:** docs/fonts/inter-latin.woff2 (ใหม่) · docs/css/app.css · docs/index.html · docs/js/ui/theme.js · docs/sw.js · docs/js/config.js
**ทดสอบ:** ธีม **19/19** (default=noir · Inter โหลดได้จริง (document.fonts.check) · สลับ 5 ธีมได้ · reload จำได้) · **ดูภาพ default noir+Inter แล้ว** ตัวอังกฤษเป็น Inter ชัด ธีมม่วงสวย · intake-ui 27/27 ไม่ regression

## 2026-07-24 08:00 · ยังไม่ commit · จัดหน้าพิมพ์ Book 3 สี ไม่ให้บรรทัดหน้า 1 ทะลุ
**step:** — (เจ้าของขอ) | **ประเภท:** แก้บั๊ก (พิมพ์)
- ปัญหา: ข้อมูลจริง (ที่อยู่/ครอบครัวยาว) ตกบรรทัด → ตาราง log แถวท้ายทะลุไปหน้า 2
- **วัดจริงด้วย puppeteer print-media**: ข้อมูลยาว → เนื้อหาเหนือตาราง 193mm · แถวละ 6.6mm · 12 แถวเต็มพอดี 297mm (ไม่เหลือ headroom)
- แก้: `CUST_LOG_ROWS_P1` 12 → **10** (section 283.7mm เหลือ headroom 13mm ~2 แถว) · ที่เหลือขึ้นหน้า 2 เป็นตาราง activities เต็มหน้า (34 แถว) เหมือนเดิม
- bump v0.24.0
**ไฟล์:** docs/js/ui/formprint.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** render PDF ยาวจริง = 2 หน้า · **ดูทั้ง 2 หน้าแล้ว**: หน้า 1 พอดีไม่ทะลุ (8 log + 2 ว่าง) · หน้า 2 ตาราง 34 แถวเต็มหน้า · book3-pdf 7/7
**เรื่อง design theme (เจ้าของถามให้ deploy):** noir/brown deploy แล้วตั้งแต่ v0.22.0 (3b1f93b) — อยู่ในปุ่ม 🎨 บนแถบบน กด → เลือก 5 ธีมได้

## 2026-07-24 07:43 · ยังไม่ commit · Book 3 สี พิมพ์ = สามเหลี่ยมมุมสีตามระดับ (แทนแถว "สีในสมุด")
**step:** — (เจ้าของขอ) | **ประเภท:** ฟีเจอร์ (พิมพ์ฟอร์ม)
- ฟอร์ม Potential (Book 3 สี) เพิ่ม **สามเหลี่ยมมุมขวาบนสีตามระดับ** (green #1f9d55 · yellow #e3b000 · red #e23b3b) แทนแถว "สีในสมุด" ที่ตัดออก
  - SVG `<polygon points="0,0 100,0 100,100">` 42mm (20% ของ A4) · สีอยู่ใน print.css (ไฟล์ข้อยกเว้น) · `print-color-adjust:exact`
- **`@page{margin:0}`** (เดิม 12mm 10mm) → ย้ายระยะขอบไป padding บน `.pf-page` (12mm 10mm) · `.pf-page-potential` = 14mm 13mm ตามสเปก → มุมสีชิดขอบกระดาษจริงได้
  - รูป/หัว/เนื้อหาจัดใหม่แบบ absolute: `.pf-corner` (top:0,right:0) · `.pf-photo-abs` (top:34mm) · `.pf-frm{margin-top:46mm}` → ไม่ทับกัน
- ปุ่มพิมพ์ Book 3 เพิ่ม tooltip เตือน "ตั้ง Margins: None + Background graphics"
- bump v0.23.0
**ไฟล์:** docs/js/ui/formprint.js · docs/css/print.css · docs/js/modules/book3.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Book3 PDF **7/7** + **render PDF จริงดูแล้ว** ตรงกับรูปเป้าหมายเป๊ะ (สามเหลี่ยมเขียวชิดมุม · รูปไม่ทับ · ตัดแถวสีออก · ฟิลด์ครบ) · **Pending PDF render ดูแล้ว margin:0 ไม่พัง** (ทุกช่องตรง) · regression success-miss 14 · feat 14 (sign-off PDF) ผ่าน
**หมายเหตุ:** มุมสีชิดขอบต้องตั้ง Margins: None ตอนพิมพ์ (browser default margin จะทับ @page)

## 2026-07-24 07:11 · ยังไม่ commit · เพิ่มธีมจาก Claude design — noir + brown
**step:** — (เจ้าของส่ง design มา) | **ประเภท:** ฟีเจอร์ (ธีม)
- เจ้าของส่งไฟล์จาก Claude design 3 ไฟล์ · ตัวที่ใช้ได้จริง = `te-theme.css` (สกินสำหรับแอปนี้โดยตรง 2 ธีม noir/brown · ใช้ชื่อตัวแปร CSS ตรงกับระบบเดิมทุกตัว)
  - support.js/ds-base.js = runtime ของ Design Component ไม่เกี่ยวกับแอปเรา → ไม่ใช้
- ผนวก `[data-theme="noir"]` (ม่วงเข้ม accent #9184d9) + `[data-theme="brown"]` (น้ำตาลกระดาษ) เข้า app.css + เพิ่มในปุ่ม 🎨 (theme.js THEMES)
  - ⚠️ **ตัด `@import` Google Fonts ออก** (CLAUDE.md ห้าม CDN — PWA ออฟไลน์พัง) · `--font` ตั้งชื่อฟอนต์ไว้เป็นตัวเลือก มี system fallback
  - ตัด `.te-nav/.te-seg` (คลาสของ design เอง ใช้ data-on ที่แอปไม่มี) — nav active ของแอปใช้ --accent-soft/--accent-text ตามธีมอยู่แล้ว
  - สีเน้นที่ผู้ใช้เลือกเอง (data-accent) ทับ accent ของธีมได้ · ผู้ใช้ค่าตั้งต้น (indigo) จะได้สีของธีม (noir=ม่วง)
- bump v0.22.0
**ไฟล์:** docs/css/app.css · docs/js/ui/theme.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** ธีม **18/18** (puppeteer local: 5 ธีม · สลับ noir/brown ได้ · noir accent ม่วง · reload จำได้) · ดูภาพ noir จริงแล้ว สวยตามดีไซน์ layout ไม่แตก
**หมายเหตุ:** ถ้าอยากได้ฟอนต์ Inter จริง (ไม่ใช่ fallback) ต้อง bundle .woff2 ลง repo ทีหลัง (กัน CDN)

## 2026-07-24 07:01 · ยังไม่ commit · ลบถาวร + เป้ารวมทีม + ประวัติการเซ็น (timeline+PDF) + 🔴กู้ sw.js
**step:** 3.11 (เจ้าของขอ 4 เรื่อง) | **ประเภท:** ฟีเจอร์ + แก้บั๊ก
- **🔴 กู้ `docs/sw.js` ที่ถูก commit เป็นไฟล์ว่างมาตั้งแต่ 3.8** — ต้นเหตุ python one-liner `open(x,'w').write(open(x).read()...)` (truncate ก่อน read) · SW ว่าง 4 commit → PWA offline/แถบเวอร์ชันพัง (แอปยังเปิดได้ เพราะ register SW ล้มแบบ catch) · กู้จาก ffb8e83 (116 บรรทัด) + bump v0.21.0 · **ต่อไปใช้ sed เท่านั้น ห้าม python inline write**
- **#1 ลบถาวร**: `db/phase3-11.sql` เปลี่ยน policy pending_delete/cust_delete = `is_admin() or (not is_active and can_edit_team(team_id))` → ลบถาวรได้เฉพาะที่ archive แล้ว (2 ขั้น: เก็บคลัง→ลบ) · งาน active ลบไม่ได้ยกเว้น admin
  - adapter +deleteCustomer · ปุ่ม "🗑 ลบถาวร" ในโมดัล Pending+Book3 (โผล่เฉพาะ archived · กด 2 ครั้งยืนยัน)
- **#3+#4 เป้ารายทีม**: ทีมแม่ (TE-IMP) แสดงผลรวมทีมย่อยอัตโนมัติ + กล่อง "รวมทั้งองค์กร" · คิดสด ๆ ตอนพิมพ์ (recomputeTT)
- **#5 ประวัติการเซ็น timeline**: adapter +listSignoffHistory · signoff.js +signoffHistoryHtml/bindSignoffHistory (🔖 วันที่+ผู้ตรวจ ขยายดูคอมเมนต์ได้) แสดงในโมดัล Pending+Book3 ใกล้บันทึกกิจกรรม · **PDF แทรก sign-off ในไทม์ไลน์** (formprint mergeLogsWithSignoffs — เห็นคอมเมนต์ต่อท้ายวันที่)
- **#2 (คำถาม design)** ตอบในแชต ไม่แตะโค้ด
**ไฟล์:** db/phase3-11.sql · docs/js/data/{adapter,supabase-adapter,local-adapter}.js · docs/js/ui/{signoff,formprint}.js · docs/js/modules/{pending,book3,admin}.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** ฟีเจอร์ใหม่ **14/14** (puppeteer local: ลบถาวร 2 ขั้น/เฉพาะ archived · TE-IMP=60 org=100 · ประวัติเซ็น+ขยายคอมเมนต์ · PDF มี sign-off) · delete RLS **7/7** (Postgres จริง: sale ลบ archived ทีมตัวเองได้/active+ทีมอื่นไม่ได้/admin ได้หมด) · regression: success-miss 14 · fix2 13 · intake-ui 27 · bk 12 ผ่านหมด · parity 58 · SQL parse 14/14
**ค้าง:** **เจ้าของต้องรัน `db/phase3-11.sql`** ก่อน ปุ่มลบถาวรถึงจะทำงานบน Supabase

## 2026-07-24 04:53 · ยังไม่ commit · แก้ 2 เรื่องที่เจ้าของแจ้ง — เมนูตั้งค่า(manager) + Archive กรองเดือน
**step:** — (แก้ตามที่เจ้าของแจ้ง) | **ประเภท:** แก้บั๊ก/ปรับ UX
- เจ้าของแจ้ง: รัน `db/phase3-5.sql` แล้ว (ผ่าน 5/5) → AI Intake staging พร้อม
- **เมนู "ตั้งค่าระบบ" ให้ admin + หัวหน้างานเห็น** (เดิม admin เท่านั้น):
  - app.js paintUser: `[data-view="admin"]` โชว์เมื่อ admin หรือ manager
  - admin.js: manager เห็นเฉพาะ "เป้ารายทีม" (แก้ทีมตัวเองได้ตาม can_edit_team) · ซ่อน เป้ายอดขายรวม/ผู้ใช้/ทีม/สำรอง (admin เท่านั้น) · handler admin-only ใส่ `?.` กันพังตอน element ไม่มี
- **Archive: badge=1 แต่ลิสต์ว่าง** — ต้นเหตุ: งาน archived จริง 1 งาน (ไม่มี close_month) ถูก "ตัวกรองเดือน" ที่ค้างจาก view active ซ่อน
  - แก้: `status='archived'` → ไม่ส่ง from/to (งานจบแล้ว เดือนคาดปิดไม่มีความหมาย) · ปิด(disabled)ดรอปดาวน์เดือน+ปุ่ม preset ตอนดู Archive
  - `refreshArcBadge()` เรียกทุก reload (เดิมนับครั้งเดียวตอน render → กดเก็บ/ปลุกกลับเลขไม่ตาม)
- bump v0.20.0
**ไฟล์:** docs/js/app.js · docs/js/modules/admin.js · docs/js/modules/pending.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** เมนู+Archive **13/13** (puppeteer local: admin/manager/sale เห็นเมนูถูก · manager เห็นแค่เป้ารายทีม · sale โดนบล็อก · Archive แสดงงานแม้ตั้งกรองเดือน · badge ตรงลิสต์ · ดรอปดาวน์เดือนปิดตอน Archive) · success-miss ซ้ำ 14/14 ไม่ regression · parity 56

## 2026-07-23 22:27 · ยังไม่ commit · 3.8 AI Intake อัตโนมัติ — Edge Function + อ่านรูปด้วย Claude vision
**step:** 3.8 (จบ roadmap!) | **ประเภท:** ฟีเจอร์ (Edge Function + frontend)
- `supabase/functions/ai-intake/index.ts` (ใหม่ · Deno): ถือ `ANTHROPIC_API_KEY` ฝั่งเซิร์ฟเวอร์ →
  รับรูป/ข้อความ → เรียก Claude vision (อ่านลายมือไทยได้) → คืนข้อความ JSON · ตรวจ JWT ก่อน (กันคนนอกใช้ key ฟรี) · CORS ครบ
  - 🔒 ไม่มีค่า key ในไฟล์เลย — อ่านจาก Deno.env · deploy: `supabase functions deploy ai-intake --no-verify-jwt` + `supabase secrets set ANTHROPIC_API_KEY=...`
  - README คู่มือ deploy ครบ · โมเดลตั้งต้น claude-sonnet-5 (เปลี่ยนได้ด้วย secret AI_INTAKE_MODEL)
- adapter +1 เมธอด `aiExtract(payload)`: supabase = POST ไป Edge Function (token อยู่ใน adapter UI ไม่แตะ) · local = คืน demo stub ให้ทดสอบ flow
- `ai-intake.js`: ปุ่ม "📷 ให้ AI อ่านรูป" ในโมดัล → ย่อรูป(≤1600px)→base64→aiExtract→แกะด้วย parsePasted เดิม→พัก staging
  - ⭐ 3.8 เปลี่ยนแค่ "JSON มาจากไหน" · staging/preview/merge/confidence ใช้ของ 3.5 ทั้งหมด (refactor เป็น stageRecords ใช้ร่วม)
  - ไม่ deploy ก็ยังใช้ได้ — ตกไปทางก๊อปคำสั่งวางเอง (3.5) ฟรี · ถ้า Edge Function ไม่มีขึ้น 404 บอกให้ใช้ทางสำรอง
- CSS auto-read (var ล้วน) · bump v0.19.0
**ไฟล์:** supabase/functions/ai-intake/{index.ts,README.md} · docs/js/data/{adapter,supabase-adapter,local-adapter}.js · docs/js/modules/ai-intake.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** auto-read **9/9** (puppeteer local: อัปโหลดรูป→demo→staging→บันทึกเข้า pending จริง · ไฮไลต์ confidence · ไม่มี JS error) · parity 56 ครบ · intake-ui ซ้ำ 27/27 ไม่ regression · ไม่มี key/hex รั่ว · Edge Function ตรวจสายตา (ไม่มี deno ในเครื่อง)
**ค้าง:** **เจ้าของต้อง deploy Edge Function + ตั้ง `ANTHROPIC_API_KEY`** (ดู README) ปุ่มอ่านรูปถึงจะใช้ของจริงได้ · ยังไม่ทดสอบเรียก Claude จริง

## 2026-07-23 22:18 · ยังไม่ commit · 3.7 ธีม/สี — Dark / สว่าง / คอนทราสต์สูง + สีเน้น 5 สี
**step:** 3.7 | **ประเภท:** ฟีเจอร์ (ธีม)
- `docs/js/ui/theme.js` (ใหม่): เลือกธีม 3 แบบ + สีเน้น 5 สี · จำใน localStorage · สลับด้วย `data-theme`/`data-accent` บน `<html>`
  - ⭐ ไม่มี hex ในไฟล์นี้เลย — แค่สลับ attribute · ค่าสีจริงอยู่ใน app.css ที่เดียว (ตามกติกา)
- app.css: `[data-theme="light"]` · `[data-theme="contrast"]` (ดำสนิท) + `[data-accent="blue/teal/amber/rose"]`
  - `--accent-soft`/`--accent-text` เปลี่ยนมา derive จาก `--accent` + `--text` (color-mix) → เปลี่ยนสีเน้น/ธีมทีเดียว ตามหมด
  - swatch ในหน้าเลือกธีม preview ด้วย data-theme/data-accent + var() (ไม่ hardcode สีตัวอย่าง)
- index.html: สคริปต์ inline ใน `<head>` อ่าน localStorage ตั้ง data-theme ก่อน CSS วาด → กันจอกระพริบ dark→light + ปุ่ม 🎨 ในแถบบน
- app.js: import theme.js · applyTheme() ตอน boot · ผูกปุ่ม 🎨
- เพิ่ม theme.js ใน sw SHELL · bump v0.18.0
**ไฟล์:** docs/js/ui/theme.js · docs/css/app.css · docs/index.html · docs/js/app.js · docs/sw.js · docs/js/config.js
**ทดสอบ:** ธีม **15/15** (puppeteer โหมด local: สลับ 3 ธีม + 5 สีเน้น · พื้นเปลี่ยนจริง (light=rgb(245..) · contrast=ดำสนิท) · reload แล้วจำได้ (ไม่กระพริบ) · ไม่มี JS error) · ดูภาพธีมสว่างแล้ว คอนทราสต์ดี ไม่มีอะไรแตก · parity 55 · ไม่มี hex ใน JS

## 2026-07-23 22:09 · ยังไม่ commit · 3.6 Export / Backup รวมทุกตาราง + กู้คืน
**step:** 3.6 | **ประเภท:** ฟีเจอร์ (backup ครบระบบ + วงจรกู้คืน)
- adapter (3 ไฟล์) +2 เมธอด: `exportAll()` (ดึงทุกตาราง) · `restoreBackup(tables)` (เขียนกลับ upsert ตาม id)
  - supabase: export = select=* ทุกตาราง (RLS ทำงาน · admin ได้ทั้งระบบ) · restore = upsert ตามลำดับ FK · ข้าม profiles/team_access/signoffs (auth/append-only)
  - local: dump/replace db arrays ครบ
- หน้า Admin: ส่วน "สำรอง & กู้คืน" — ปุ่มดาวน์โหลด `te-backup-YYYY-MM-DD.json` (ผ่าน `buildBackup` = BACKUP_FORMAT ที่ 1.6 อ่านได้) + อัปโหลดกู้คืน (ยืนยัน 2 ขั้น) + รูทีนรายสัปดาห์
- รูปแบบไฟล์ล็อกไว้ที่ `import-map.js` (`_format:'te-sales-dashboard-backup', _version:1, tables:{}`)
**ไฟล์:** docs/js/data/{adapter,supabase-adapter,local-adapter}.js · docs/js/modules/admin.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** วงจร backup **12/12** (puppeteer โหมด local: export ทุกตาราง → ล้าง → restore → pending/customer/ผู้ติดต่อ/บันทึกกลับครบ · summary ถูก · UI admin มีปุ่ม) · parity 55 ครบ · ไม่มี secret/hex · bump v0.17.0
**ค้าง:** supabase restore ออกแบบสำหรับกู้ "โปรเจกต์เดิม" (teams/profiles ยังอยู่) — ยังไม่ทดสอบบน Supabase จริง

## 2026-07-23 21:56 · ยังไม่ commit · ปุ่ม Success/Miss + ติ๊ก PDF + เสริม error ลิงก์ลืมรหัสผ่าน
**step:** — (เจ้าของขอเพิ่ม จาก WishtoHave) | **ประเภท:** ฟีเจอร์ + แก้บั๊ก (UX)
- เจ้าของแจ้ง: **รัน `db/phase3-5.sql` แล้ว** (ผ่าน 5/5 · intake_items + RLS + anon ปิด) → AI Intake staging พร้อมใช้
- **ปุ่ม Success / Miss** ในฟอร์ม Pending (ด้านล่าง เหนือปุ่มบันทึก):
  - กด Success = ตั้ง stage=won + **เติม purchased_day=วันนี้** (todayISO) ถ้ายังว่าง → นับเข้าเป้า 80 ล้านได้จริง
  - กด Miss = ตั้ง stage=lost · ทั้งคู่บันทึกทั้งฟอร์ม (คงค่าที่แก้อื่น + ช่อง "เพราะ" result_because) แล้วปิด+reload
  - ปุ่มไฮไลต์ตาม stage ปัจจุบันตอนเปิดฟอร์ม · ช่อง result_because เพิ่มในฟอร์ม (เดิม PDF มีช่องนี้แต่กรอกไม่ได้)
- **ติ๊กบน PDF**: RESULT row เดิม (S ✓ / M ✓ ตาม stage) → ทำเป็น checkbox ชัด `[✓] Success (ได้งาน)` · `[ ] Miss` + BECAUSE · `.pf-box` ใน print.css (#000 ตามกติกา)
- **ลืมรหัสผ่านเด้ง 404**: จากภาพ ลิงก์ในเมลเด้งไป `theerasaku.github.io/` (root) แทน `/Sales-dashboard-TE/`
  → **ต้นเหตุคือ config Supabase** (Redirect URL/Site URL) ไม่ใช่บั๊กโค้ด · redirect_to ในโค้ดถูกแล้ว (`origin+pathname`)
  → เสริมโค้ด: `readHashError()` ใน app.js อ่าน `#error=...` ที่ Supabase แนบมาตอนลิงก์หมดอายุ → ขึ้นข้อความไทยชัด ๆ แทนหน้า login เงียบ ๆ
- bump v0.16.0 (config + sw)
**ไฟล์:** docs/js/modules/pending.js · docs/js/ui/formprint.js · docs/css/print.css · docs/css/app.css · docs/js/app.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** Success/Miss + PDF **14/14** (puppeteer คลิกจริง: won เติม purchased_day/lost ไม่เติม · PDF ติ๊กถูก · result_because บันทึก · ไม่มี JS error) · intake-ui ซ้ำ 27/27 ไม่ regression
**ค้าง:** **เจ้าของต้องแก้ Supabase → Authentication → URL Configuration:** Site URL = `https://theerasaku.github.io/Sales-dashboard-TE/` + Redirect URLs เพิ่ม `https://theerasaku.github.io/Sales-dashboard-TE/**` (มี `/**`) ไม่งั้นลิงก์ลืมรหัสผ่านยังเด้ง 404

## 2026-07-23 21:38 · ยังไม่ commit · 3.5 AI Intake — staging + preview + merge (งานใหญ่ L)
**step:** 3.5 | **ประเภท:** ฟีเจอร์ (โมดูลใหม่ + ตารางใหม่ + ปุ่ม 2 แถบ)
- **DB `db/phase3-5.sql`** — ตาราง `intake_items` (staging): source · target_type · parsed/edited/confidence (jsonb) · status(draft/approved/merged/rejected) · target_table/target_id/merge_mode · approved_by
  - RLS: อ่าน `can_access_team` · เขียน/ลบ `can_edit_team` (sale เห็น/แก้เฉพาะทีมตัวเอง · หัวหน้าตามสิทธิ์ · anon ปิด)
  - ⭐ ตารางนี้เป็น "ล็อกการนำเข้า" ในตัว — แถว merged + target_id + approved_by = หลักฐานว่าอะไรมาจากเอกสารไหน ใครอนุมัติ
- **adapter (3 ไฟล์)** +6 เมธอด: listIntake/getIntake/saveIntake/deleteIntake/approveIntake/rejectIntake (parity 53 ครบทั้งคู่)
- **`docs/js/modules/ai-intake.js`** (จากสตับ → เต็ม) — modal 2 แท็บ:
  - นำเข้าใหม่: เลือกแหล่ง (นามบัตร/ฟอร์ม/Obsidian/Notion) → คำสั่งสำเร็จรูป(ก๊อป) → วาง JSON → พักเข้า staging
  - รอตรวจ: การ์ดต่อรายการ · ไฮไลต์เหลืองเฉพาะช่องที่ AI มั่นใจ <80% · dedup กันซ้ำ (เลือกอัปเดตทับ/สร้างใหม่) · บันทึกเข้าระบบจริง
  - แกะ JSON ทน code fence / ข้อความห่อ / object แบน · แปลงปี พ.ศ.→ค.ศ. อัตโนมัติ · value_baht ตัดคอมมา
- **ปุ่ม 🤖 AI Import** เพิ่มในแถบ Pending + Book 3 สี · **CSS** บล็อกใหม่ (var() ล้วน) · **bump v0.15.0** (config + sw)
**ไฟล์:** db/phase3-5.sql · docs/js/data/{adapter,supabase-adapter,local-adapter}.js · docs/js/modules/{ai-intake,pending,book3}.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** SQL parse 13/13 (libpg-query) · intake RLS 24/24 (PGlite = Postgres จริง) · UI 27/27 (puppeteer คลิกจริง โหมด local · dedup/ปี พ.ศ./staging ข้ามครั้ง/แยกผู้ติดต่อ · ไม่มี JS error + unhandled rejection) · parity 53 ครบ · grep secret/hex/PII ผ่าน
**เจอบั๊กระหว่างทำ (แก้แล้ว):** ① dedup เดิมใช้ `search` ilike → เบอร์มีขีดไม่ match เบอร์ไม่มีขีด · เปลี่ยนเป็นดึงทั้งชุดเทียบเลขล้วน  ② regex/DB constraint ปล่อยปี พ.ศ. 2569 ผ่าน → เพิ่มแปลง พ.ศ.→ค.ศ. ใน buildPayload
**ค้าง:** ยังไม่ทดสอบบน Supabase จริง — **เจ้าของต้องรัน `db/phase3-5.sql` ก่อน** แล้วลองปุ่ม 🤖 AI Import (วาง JSON จาก Claude) · 3.8 จะเปลี่ยนที่มา JSON เป็น Edge Function (staging/preview/merge ใช้ของนี้ต่อ)

## 2026-07-23 · ยังไม่ commit · 🔴 แก้บั๊ก login พังทั้งระบบ — "more than one relationship" profiles↔teams
**step:** — (hotfix) | **ประเภท:** แก้บั๊ก 🔴 login ใช้ไม่ได้ทั้งระบบ
- **อาการ:** login แล้วเด้ง error `Could not embed because more than one relationship was found for 'profiles' and 'teams'`
- **ต้นเหตุ:** `fetchProfile()` ดึง profile ด้วย embed `teams(code,name)` แบบไม่ระบุ FK
  ตั้งแต่มีตาราง **`team_access`** (2.4, profile_id×team_id) และ **`team_targets`** (3.10, team_id→teams + updated_by→profiles)
  PostgREST เห็นความสัมพันธ์ profiles↔teams **มากกว่า 1 เส้น** (เส้นตรง `profiles.team_id` + เส้นผ่าน junction) → embed ไม่ถูก
- **แก้:** ระบุ FK ให้ชัด `teams!team_id(code,name)` ทั้ง 2 จุด (`fetchProfile` + `listProfiles`)
  — junction ไม่คั่น `pending_projects`/`customers` → teams เลย 2 จุดนั้นไม่ต้องแก้

**ไฟล์:** `docs/js/data/supabase-adapter.js` (บรรทัด ~167 + ~948)
**ทดสอบ:** `node --check` ผ่าน · grep ยืนยันไม่เหลือ `profiles…teams(` แบบไม่ระบุ FK ที่อื่น ·
⚠️ **ยังไม่ได้ทดสอบ login จริงบน Supabase** (ผู้ช่วยไม่มีรหัสผ่าน) — เจ้าของต้องลอง login ยืนยัน
**ค้าง:** 🔴 **ยังไม่ commit โดยตั้งใจ** — ไฟล์นี้มีงาน B9 AI Intake (step 3.5) ของอีก session ค้างอยู่ +90 บรรทัด
ในไฟล์เดียวกัน + มี `db/phase3-5.sql` ยัง untracked · commit ตอนนี้จะกวาดงาน 3.5 ที่ยังไม่เสร็จติดไปด้วย
→ ปล่อยให้ไหลไปกับ commit ปกติของ session ที่ทำ 3.5 · **การแก้อยู่บนดิสก์แล้ว มีผลทันทีเมื่อ reload**

## 2026-07-23 07:40 · 60aee7b · ลืมรหัสผ่าน (รีเซ็ตทางอีเมล) + วินิจฉัย login เครื่องอื่น
**step:** 3.11 (ใหม่ · เจ้าของขอ) | **ประเภท:** ฟีเจอร์ + ความปลอดภัย
- เจ้าของแจ้ง: รัน phase3-9 + phase3-10 แล้ว (ผ่านครบ) · admin login จากแล็ปท็อปอื่นไม่ได้แม้รหัสถูก
- **เพิ่มฟังก์ชันลืมรหัสผ่าน** ในหน้า login:
  - ลิงก์ "ลืมรหัสผ่าน?" → ฟอร์มกรอกอีเมล → `POST /auth/v1/recover` (Supabase ส่งเมล)
  - กดลิงก์ในเมลกลับมา (มี `#type=recovery&access_token=…` ใน URL) → ฟอร์มตั้งรหัสใหม่ →
    `PUT /auth/v1/user` ด้วย recovery token → ลบ token ออกจาก URL หลังตั้งเสร็จ
  - 🔒 ไม่บอกว่า "อีเมลนี้ไม่มีในระบบ" — กันไล่เดาบัญชี (Supabase คืน 200 เสมอ เราแสดงข้อความเดียวกันหมด)
- adapter: +requestPasswordReset · readRecoveryToken · updatePassword (ทั้ง supabase + local stub)
- bump v0.14.0
**เรื่อง login เครื่องอื่น (วินิจฉัย):** โค้ดแปล error ของ Supabase เป็นไทยอยู่แล้ว
  ("อีเมลหรือรหัสผ่านไม่ถูกต้อง" / "ยังไม่ได้ยืนยันอีเมล") → เดาว่ารหัสที่ตั้งไว้ไม่ตรง
  (แล็ปท็อปเครื่องแรกอาจล็อกอินผ่านลิงก์เชิญ ไม่เคยพิมพ์รหัสจริง) — ปุ่มลืมรหัสรีเซ็ตให้รู้แน่นอน
  ⚠️ ต้องตั้ง Redirect URL ใน Supabase → Authentication → URL Configuration (ใส่ URL GitHub Pages)
**ไฟล์:** docs/index.html · docs/js/app.js · docs/js/data/{supabase,local,}adapter.js · docs/css/app.css · docs/sw.js · docs/js/config.js
**ทดสอบ:** flow ลืมรหัส **15/15** (ลิงก์→ฟอร์ม · ส่งแล้วไม่บอกว่าอีเมลมีจริง · พาร์ส hash recovery ·
validation รหัสสั้น/ไม่ตรงกัน · ตั้งเสร็จเด้งกลับ · มือถือไม่ล้น) · supabase readRecoveryToken พาร์ส token จริงถูก ·
login เดิมยังทำงาน (ทุกชุดที่ต้องล็อกอินก่อนผ่านหมด) — regression รวม **626 ข้อ**
**ค้าง:** เจ้าของต้องตั้ง Redirect URL ใน Supabase ก่อน ลิงก์ในเมลถึงจะเด้งกลับแอปได้

## 2026-07-23 06:40 · 2ddd002 · step 3.10 ช่วง B — เป้ารายทีม + ตัวเลือกใน dashboard
**step:** 3.10 (ช่วง B) | **ประเภท:** ฟีเจอร์
- ตั้งเป้ารายทีมที่หน้า "ตั้งค่าระบบ" (กรอกล้านบาท เก็บเป็นบาท) — ช่องเป้าทีมแม่ล็อกไว้ = ผลรวมทีมย่อย
- หน้าภาพรวมเพิ่มส่วน **"เป้าหมายตามทีม"**:
  - ตารางรายทีมแบบลำดับชั้น (ทีมย่อยเยื้อง · ทีมแม่โชว์ยอดรวมลูก)
  - ชิปเลือกขอบเขต (ทั้งองค์กร / รายทีม / เลือกหลายทีมเป็นกลุ่ม)
  - กล่องสรุปรวม: เป้า · ปิดได้ · % · ยังขาด ของกลุ่มที่เลือก — อัปเดตทันทีที่คลิก
- ⭐ `expandTeams()` ขยายทีมที่เลือก → รวมทีมลูก · งาน 1 ชิ้นมี team_id เดียว **นับครั้งเดียว** แม้เลือกทั้งแม่และลูก
- ⭐ `sumScope()` เป้า = ผลรวมเป้าทุกทีมในขอบเขต · ปิดได้รวมงานที่ผูกทีมแม่ตรง ๆ ด้วย (ไม่ตกหล่น)
- adapter: +listTeamTargets/saveTeamTarget (ทำไว้แล้วตอนช่วง A)
- bump v0.13.1
**ไฟล์:** docs/js/modules/dashboard.js · docs/js/modules/admin.js · docs/css/app.css · docs/js/config.js · docs/sw.js
**ทดสอบ:** ตรรกะเป้ารายทีม **15/15** (รวม "เลือกกลุ่มหลายทีม" · "งานผูกทีมแม่ไม่ตกหล่น" ·
"นอกช่วงเป้าไม่นับ") · UI จริง **20/20** (ชิปเปลี่ยนกล่องสรุปทันที · บันทึกเป้าทีม · มือถือไม่ล้น) ·
regression เดิมครบทุกชุด — **รวม 596 ข้อ**
**หมายเหตุ:** ปิด step 3.10 ครบทั้ง 2 ช่วงแล้ว · หน้าทีมขาย (แถบแหล่งงาน) การ์ดทีมแม่ยังไม่รวมยอดลูก
— เป็นของแถม ทำทีหลังได้ (dashboard เป็นที่หลักที่รวมให้แล้ว)

## 2026-07-23 05:30 · 5d07588 · step 3.10 ช่วง A — โครงสร้างทีมตาม org chart + สิทธิ์
**step:** 3.10 (ใหม่ · เจ้าของขอเอง พร้อม org chart) | **ประเภท:** ฟีเจอร์ + ความปลอดภัย
- เจ้าของเคาะ 23 ก.ค. 2569: IMP1/IMP2 เป็นทีมจริง · TE-IMP เป็นกลุ่มแม่ · เป้าตั้งระดับทีม
- `db/phase3-10.sql` — `teams.parent_team_id` (self-ref) · seed IMP1/IMP2 ใต้ TE-IMP ·
  `profiles.title` (ตำแหน่งตาม org chart) · ตาราง `team_targets` (ใช้ช่วง B)
- ⭐ **can_access_team() เพิ่มการไล่ขึ้นทีมแม่ (recursive) — จุดเดียวที่แก้ ทั้งระบบตามหมด**
  ให้สิทธิ์ TE-IMP = เห็น IMP1+IMP2 อัตโนมัติ · หัวหน้าแผนกอื่น/นันทวันเห็น IMP ได้
- 🔴 **ปิดช่องโหว่ can_edit ที่ค้างมาตั้งแต่ 2.4** — team_access มีคอลัมน์ can_edit แต่ไม่เคยมี policy ใช้
  → เพิ่ม `can_edit_team()` + เปลี่ยน policy ฝั่งเขียนทั้งหมดให้ใช้ (pending/customers/activities/
  logs/contacts/products) · แยก for-all ของ contacts/products เป็น select(view) + write(edit)
  ผล: หัวหน้าที่ได้สิทธิ์ "ดูอย่างเดียว" IMP เห็นงานได้ แต่แก้ไม่ได้
- adapter: setTeamAccess รับ can_edit รายทีม · listTeams คืน parent_team_id · +team_targets methods
- หน้า Admin: ทีมแสดงลำดับชั้น (ทีมย่อยเยื้อง) · เพิ่มทีมเลือกทีมแม่ได้ ·
  แผงสิทธิ์แยกคอลัมน์ "ดู"/"แก้" + ปุ่ม "เห็นทั้งองค์กร" · ช่องกรอกตำแหน่งรายคน
- bump v0.13.0
**ไฟล์:** db/phase3-10.sql · docs/js/modules/admin.js · docs/js/data/{supabase,local,}adapter.js ·
docs/css/app.css · docs/sw.js · docs/js/config.js
**ทดสอบ:** RLS จริงบน PGlite **96/96** (เดิม 80 — เพิ่ม 16 เคส: ไล่ทีมแม่ · can_edit gate ·
sale ทีมตัวเองไม่กระทบ · view แยกจาก edit · team_targets) · หน้า Admin จริง **17/17** ·
regression เดิมครบ (adm 40 · pdf 43 · pwa 38 · src 38 · tm 32 · b3 31 · act 42 · sign 35 ·
arc 25 · unit 26 · imp 23 · team 22 · nosup 17 · fix 17 · ui3 17 · reg 12 · parity) — **รวม ~560**
**ค้าง:** ช่วง B — เป้ารายทีม + ตัวเลือกดูเป้าในหน้า dashboard (รวมขึ้นเป็นทีม/องค์กร) ·
หน้าทีมขายควรให้การ์ดทีมแม่รวมยอดทีมย่อย (ทำในช่วง B) ·
เจ้าของต้องรัน `db/phase3-10.sql` + ตั้งค่าใน Admin: นันทวัน→เห็นทั้งองค์กร · IMP1/IMP2 managers→ทีมย่อยตัวเอง

## 2026-07-23 04:30 · b6a1a24 · ปรับ UI 3 จุด + ช่องรูปลูกค้า (ตามที่เจ้าของสั่ง)
**step:** 3.9 (ตามเก็บ) | **ประเภท:** ฟีเจอร์ + ปรับ UI
- **ย้ายตาราง PRODUCT ขึ้นเหนือหมวด "เงิน & เวลา"** — รายการสินค้าคือที่มาของยอดเงิน ควรกรอกก่อน
  (แทรกผ่าน FORM.map ตรงตำแหน่ง 'เงิน & เวลา' ไม่ได้ย้ายบล็อกมือ)
- **sidebar iPad โชว์ชื่อเมนูใต้ไอคอน** — เดิม ≤1024px ซ่อนชื่อเหลือแต่ไอคอน 68px
  ขยายเป็น 92px + วางไอคอน/ชื่อแนวตั้ง + ชื่อยาวตัด 2 บรรทัด
- **เพิ่มช่องรูปลูกค้าในฟอร์ม Book 3** (`docs/js/ui/photofield.js` ใหม่) แสดงบน PDF ตอนพิมพ์
  ⭐ **ย่อรูปผ่าน canvas ก่อนเก็บเสมอ** (ด้านยาว 512px · JPEG 0.72 → ~30–60KB)
  ไม่งั้นรูปมือถือดิบ 3–8MB จะทำแถว DB บวม + backup JSON บานตาม
  🔒 รับเฉพาะ image/* · แสดงเฉพาะ data:image/ หรือ http(s): (safePhoto ปัด javascript: ทิ้ง)
  รูปบุคคล = ข้อมูลส่วนบุคคล เก็บใน DB ที่มี RLS เท่านั้น (photo_url มีอยู่ในตารางตั้งแต่ 2.1 แล้ว)
- bump v0.12.2
**ไฟล์:** docs/js/ui/photofield.js (ใหม่) · docs/js/modules/pending.js · docs/js/modules/book3.js ·
docs/css/app.css · docs/sw.js · docs/js/config.js
**ทดสอบ:** ชุดใหม่ **17/17** — ตำแหน่ง PRODUCT วัดจากลำดับ section จริง · sidebar วัด flex-direction จริง ·
ย่อรูปผ่าน canvas จริงแล้วเช็กว่า < 60KB · รูปโผล่บน PDF · safePhoto กัน javascript: ·
regression เดิมครบ (pdf 43 · fix 17 · b3 31 · reg 12 · parity) — รวมทั้งหมดผ่าน
**หมายเหตุ:** อัปเดตเลขคาดหวังใน b3.mjs (กลุ่มฟอร์ม 5→6 เพราะเพิ่มรูป) พร้อมเหตุผลกำกับ

## 2026-07-23 03:20 · ยังไม่ commit · ปรับ 3 จุดในฟอร์มตามที่เจ้าของสั่ง
**step:** 3.9 (ตามเก็บ) | **ประเภท:** ปรับ UI
- เจ้าของรัน `db/phase3-9.sql` แล้ว ผ่านครบ 6/6 ✓
- **ย้ายปุ่ม "พิมพ์ / PDF" ไปอยู่ฝั่งขวา ติดกับ ยกเลิก/บันทึก** (เดิมอยู่ซ้ายปนกับปุ่มเก็บเข้าคลัง)
  ทำทั้ง Pending และ Book 3 สี ให้เหมือนกัน
- **ซ่อนช่อง "ผลิตภัณฑ์/ระบบ"** — ให้ไปกรอกที่ตาราง PRODUCT แทน
  ⚠️ **ไม่ได้ลบคอลัมน์ `product` ใน DB** งานเก่าที่กรอกไว้ยังอยู่ครบ
  ช่องที่ถูกซ่อนจะไม่อยู่ใน FormData → ไม่ถูกส่งไป PATCH → ค่าเดิมไม่ถูกเขียนทับ
  (มีเทสต์ยืนยันตรง ๆ: บันทึกฟอร์มแล้วค่า product เดิมยังอยู่)
- **ตารางสินค้าขึ้นแถวแรกให้เลย** ไม่ต้องกด "+ เพิ่มแถว" ก่อนถึงจะกรอกได้
  แถวว่างไม่ถูกบันทึกอยู่แล้ว (savePendingProducts ทิ้งแถวที่ทุกช่องว่าง) จึงไม่เกิดขยะใน DB
- bump v0.12.1
**ไฟล์:** docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/config.js · docs/sw.js
**ทดสอบ:** ชุดใหม่ **17/17** — รวมเคส "ค่า product เดิมไม่ถูกล้างทั้งที่ซ่อนช่องไป" ·
ตำแหน่งปุ่มวัดจากพิกัดจริงบนจอ · เปิดฟอร์มใหม่ไม่มีแถวว่างซ้อนเกินมา ·
regression เดิมครบ (pdf 43 · rls 80 · act 42 · adm 40 · pwa 38 · src 38 · sign 35 · tm 32 · b3 31 ·
unit 26 · arc 25 · imp 23 · team 22 · nosup 17 · reg 12 · parity) — **รวม 521 ข้อ**
**หมายเหตุ:** เทสต์ `reg.mjs` เดิมนับช่องในฟอร์มไว้ 42 → แก้เป็น 41 พร้อมเขียนเหตุผลกำกับ
ไม่งั้น session หน้าจะนึกว่าฟอร์มพังเอง

## 2026-07-23 02:10 · 5fc0050 · step 3.9 พิมพ์ฟอร์ม PDF ตามต้นฉบับ
**step:** 3.9 (ใหม่ · เจ้าของขอเอง พร้อมแนบ PDF ฟอร์มกระดาษ 2 ชุด) | **ประเภท:** ฟีเจอร์
- พิมพ์ **Pending Project 2 หน้า** + **Book 3 สี "Potential" 2 หน้า** ตำแหน่งข้อมูลตรงกับกระดาษต้นฉบับ
- **ใช้ print stylesheet ของเบราว์เซอร์ ไม่ใช้ library ทำ PDF** — ภาษาไทยไม่เพี้ยน ไม่ต้องฝังฟอนต์
  ไม่พึ่ง CDN (PWA ออฟไลน์ใช้ไม่ได้อยู่แล้ว) · iPhone/iPad กดแชร์ → พิมพ์ → บันทึกเป็น PDF
- 🔴 **เจอช่องว่างในฐานข้อมูลตอนไล่เทียบทีละช่อง** — ฟอร์ม Pending มีตาราง PRODUCT 9 แถว × 7 คอลัมน์
  แต่ระบบเก็บแค่ `product` (ข้อความช่องเดียว) + `value_baht` (ยอดรวมก้อนเดียว)
  ถ้า export ตอนนั้นตารางจะว่างทั้งบล็อก (~⅓ ของหน้า) → รายงานเจ้าของก่อนลงมือ
- `db/phase3-9.sql` — `pending_products` + `pending_projects.result_because` + `customers.nickname`
  ⭐ **เพดาน 9 แถวบังคับที่ DB** ด้วย `check (line_no between 1 and 9)` + `unique(pending_id, line_no)`
  ไม่ต้องเขียน trigger · ยิง API ตรงก็เกินไม่ได้ · เกิน 9 แล้วตารางทะลุหน้า ฟอร์มเพี้ยนทั้งหน้า
- ฟอร์ม Pending: ตัวกรอกรายการสินค้า (เพิ่ม/ลบแถว · คิด TOTAL/NET อัตโนมัติแต่พิมพ์ทับได้)
- ฟอร์ม Book 3: เพิ่มช่อง **ชื่อเล่น** + แสดง **หน่วยงาน/บริษัท** ในฟอร์มพิมพ์ (เจ้าของสั่ง — กระดาษเดิมไม่มี)
- **ฟอร์ม Book 3 สี ครบ 100% อยู่แล้ว** ทุกช่องบนกระดาษมีที่เก็บตั้งแต่ step 2.1 รวมถึงกรอบรูป (`photo_url`)
- ยอดรวมท้ายตารางใช้ `value_baht` ไม่ได้บวกจากรายการเอง — เลขในกระดาษจะได้ไม่ขัดกับ dashboard
**ไฟล์:** db/phase3-9.sql · docs/js/ui/formprint.js (ใหม่) · docs/css/print.css (ใหม่) ·
docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/data/{supabase,local}-adapter.js ·
docs/js/data/adapter.js · docs/css/app.css · docs/index.html · docs/sw.js · docs/js/config.js (v0.12.0)
**ทดสอบ:** ชุดใหม่ **43/43** — รวม **สร้างไฟล์ PDF ออกมาจริงแล้วเปิดดูเทียบกับต้นฉบับ** ·
ตารางสินค้าพิมพ์ครบ 9 แถวเสมอแม้กรอกแค่ 3 · ครบ 9 แถวแล้วปุ่มเพิ่มถูกปิด · คิด TOTAL/NET ถูก ·
RLS จริงบน PGlite **80/80** (เดิม 69 — เพิ่ม 11 เคสของตารางสินค้า รวม "ใส่แถวที่ 10 ไม่ได้") ·
regression เดิมครบ (pwa 38 · src 38 · tm 32 · act 42 · adm 40 · sign 35 · b3 31 · arc 25 ·
unit 26 · imp 23 · team 22 · nosup 17 · reg 12 · parity ผ่าน) — **รวม 504 ข้อ**
**ค้าง:** เจ้าของต้องรัน `db/phase3-9.sql` ก่อน ไม่งั้นตารางสินค้ากับชื่อเล่นยังบันทึกไม่ได้
(หน้าจอไม่พัง — ดักไว้แล้วว่าถ้ายังไม่มีตารางให้ข้ามไป)

## 2026-07-23 00:40 · 34f5928 · ถอดแถบ Supplier ออกจากแผน (เจ้าของสั่ง)
**step:** 3.4 (ยกเลิก) | **ประเภท:** ปรับแผน
- เจ้าของสั่ง 23 ก.ค. 2569: **"ยังไม่ต้องใช้ฟังก์ชันนี้ ซ่อนออกไปก่อน ข้าม 3.4 ไปทำในอนาคต"**
  และ **ตัดปุ่มหา supplier จากหน้า Pending ออกถาวร**
- ถอดออกจากหน้าจอครบ: ปุ่มในแถบข้าง + แถบล่างมือถือ · router (`VIEWS`) · precache ใน `sw.js`
- **ลบ `docs/js/modules/suppliers.js` ทิ้ง ไม่เก็บไฟล์ placeholder ไว้**
  (บทเรียนจาก `tools/import-json.html` ที่เคยค้างจนเจ้าของเปิดผิดไฟล์แล้วเข้าใจว่างานยังไม่เสร็จ)
- roadmap 23 → **22 step** · สเปคย้ายไปหัวข้อใหม่ "📦 แผนอัปเดตอนาคต" ใน CLAUDE.md
  พร้อมเขียนกำกับว่า **ห้ามดึงกลับเข้า roadmap เองโดยไม่ถามเจ้าของ**
- ยังไม่เคยแตะฐานข้อมูลเรื่อง supplier เลย → ไม่มีตารางค้าง ไม่มีหนี้ migration
- bump เป็น v0.11.0 (ต้อง bump ทุกครั้งที่แก้ `SHELL` ของ service worker ไม่งั้นเครื่องที่ติดตั้งแล้วยังใช้ของเก่า)
**ไฟล์:** ลบ docs/js/modules/suppliers.js · docs/index.html · docs/js/app.js · docs/sw.js ·
docs/js/config.js · db/schema.sql (หมายเหตุ) · CLAUDE.md · PROGRESS.md
**ทดสอบ:** ชุดใหม่ 17/17 — **เปิดด้วยลิงก์เก่า `#suppliers` แล้วเด้งกลับหน้าภาพรวม ไม่ค้างหน้าเปล่า** ·
เดินครบ 7 หน้าที่เหลือไม่มีหน้าไหนพัง · ไม่มีไฟล์ไหน 404 · แถบล่างมือถือเหลือ 7 ปุ่มยังไม่ล้นจอ ·
regression เดิมครบ (pwa 38 · src 38 · tm 32 · act 42 · adm 40 · sign 35 · b3 31 · arc 25 · unit 26 ·
imp 23 · team 22 · reg 12 · parity ผ่าน)
**หมายเหตุ:** แก้เทสต์ PWA ให้อ่านเลขเวอร์ชันจาก `config.js` แทนการฝังเลขไว้ — bump ทีไรเทสต์แดงทุกที

## 2026-07-22 23:30 · 141daf1 · step 3.3 PWA — ติดตั้งเป็นแอปได้จริงทั้ง iPhone/iPad/S24
**step:** 3.3 | **ประเภท:** ฟีเจอร์ + แก้บั๊ก
- **ไอคอนครบชุดแล้ว** (404 ที่ค้างมาตั้งแต่ 1.2 จบ) — 192 · 512 · maskable 512 · apple-touch 180 · favicon 32
  สร้างจาก HTML แล้วให้ Chrome ถ่ายภาพ ไม่ต้องใช้โปรแกรมกราฟิก
  **maskable แยกไฟล์** เพราะ Android ครอบเป็นวงกลมแล้วตัดขอบ ~20% ใช้ไฟล์เดียวกันตัวอักษรจะโดนตัด
- **iOS ต้องมี meta ของตัวเอง** — Safari ไม่อ่านไอคอนใน manifest.json เลย ถ้าไม่มี `apple-touch-icon`
  จะไปจับภาพหน้าจอมาทำไอคอนแทน · เพิ่ม `apple-mobile-web-app-*` ครบ
- **sw.js เขียนใหม่** — precache จาก 6 → 25 ไฟล์ (ของเดิมต้องเคยเปิดหน้านั้นก่อนถึงใช้ออฟไลน์ได้)
  ⚠️ เลิกใช้ `addAll()` เปลี่ยนเป็น `add()` ทีละไฟล์ + catch — ถ้ามีไฟล์เดียว 404 `addAll` จะพังทั้งชุด
  แล้ว service worker ติดตั้งไม่สำเร็จเลย (ไอคอน 404 ที่ค้างอยู่ก่อนหน้านี้จะทำให้ PWA พังทั้งระบบ)
  ยังเป็น network-first เหมือนเดิม · ยังห้ามแตะ `/rest/v1/` `/auth/v1/` (ข้อมูลลูกค้าห้ามลง cache)
- **`js/ui/pwa.js` ใหม่** — แถบ ออฟไลน์ / มีเวอร์ชันใหม่ / ติดตั้งเป็นแอป
  ออฟไลน์สำคัญที่สุด: SW ทำให้ "เปิดแอปได้" แต่ "บันทึกไม่ได้" ถ้าไม่เตือน ทีมขายจะกรอกฟอร์มยาว ๆ เสียเปล่า
- **safe area บนสุด** — ใช้ `black-translucent` คู่กับ `--safe-t` ไม่งั้นหัวข้อหน้าโดนรอยบาก iPhone ทับ

**🔴 บั๊ก 3 ตัวที่เทสต์จับได้ (ทั้งหมดเกิดจากของที่เขียนรอบนี้เอง):**
1. **คำชวนติดตั้งไปทับคำเตือนออฟไลน์** — Chrome ยิง `beforeinstallprompt` ตอนไหนก็ได้
   คนอยู่หน้างานเลยเห็นแต่ "ติดตั้งเป็นแอปได้" ไม่รู้ว่าบันทึกไม่ได้
   → ใส่ลำดับความสำคัญ: คำเตือนที่ทำให้เสียงาน > คำชวนเสมอ
2. **แถบลอยทับปุ่มจนกดไม่โดน** — แถบเป็น `position:fixed` มุมล่าง ไปบังปุ่ม "แก้ไข" ในหน้าแหล่งงาน
   `p.click()` ไปโดนแถบแทน · **เทสต์ที่ใช้ `dispatchEvent` จะไม่มีวันเจอ** เพราะไม่ได้ hit-test
   ลองเผื่อ padding ท้ายหน้าก่อน → ยังบังปุ่มกลางหน้าได้อยู่ดี
   → **ย้ายแถบขึ้นบนสุดใน flow ปกติ** มันดันเนื้อหาลงเอง ไม่มีทางบังอะไรได้อีก
3. **แถบไปปิดตัวแปรที่ตัวเองใช้** — JS ตั้ง `--safe-t: 0` กันเว้นรอยบากซ้ำสองชั้น
   แต่แถบก็อ่านตัวแปรเดียวกัน → หัวแถบโดนนาฬิกาทับ
   → แยกเป็น `--safe-t-env` (ค่าดิบ ห้ามทับ) กับ `--safe-t` (ช่องสั่งงานของ JS)
**ไฟล์:** docs/js/ui/pwa.js (ใหม่) · docs/sw.js · docs/manifest.json · docs/index.html ·
docs/css/app.css · docs/js/app.js · docs/icons/*.png (5 ไฟล์ใหม่) · docs/icons/README.md · docs/js/config.js
**ทดสอบ:** PWA จริงบนเบราว์เซอร์ **38/38** — service worker ติดตั้งถึงสถานะ activated ·
precache ครบทั้ง 25 ไฟล์ (จับ path พิมพ์ผิด) · ตัดเน็ตแล้วเปิดแอปขึ้นจริง CSS+JS มาจาก cache ·
ไอคอนทุกตัวโหลดได้และขนาดตรงกับที่ประกาศ · **ไม่มี request ของ API ค้างใน cache** ·
รอยบาก 47px กันระยะถูก · แถบไม่บังปุ่มใด ๆ · regression เดิมครบ 395 ข้อ (รวมทั้งหมด **433**)
**ค้าง:** ยังไม่ได้ลองติดตั้งบนเครื่องจริง (iPhone/S24/iPad) — ต้องรอเจ้าของทดสอบ
เป็นงานเดียวกับที่ 1.7 ค้างอยู่

## 2026-07-22 21:40 · 06157bf · step 3.2 ทีมขาย + playbook + เช็กลิสต์ชนะงาน 7 ข้อ
**step:** 3.2 | **ประเภท:** ฟีเจอร์
- แถบ "แหล่งงาน" เพิ่มจาก 2 เป็น **4 แถบย่อย** (ตรงกับที่ CLAUDE.md วางไว้ว่า F7 = แหล่งงาน+ทีม+กลยุทธ์)
  ไม่เพิ่มปุ่มในแถบนำทาง — bottom bar มือถือมี 8 ปุ่มอยู่แล้ว ใส่เพิ่มจะแน่นเกิน
- **แถบทีมขาย** — 5 ทีม ตัวเลขจริงรายทีม (ปิดได้แล้ว / ยังเดินอยู่ / จำนวนงาน / สมาชิก)
  ใช้ `monthOf()` ที่ export จาก dashboard.js ตัวเดียวกัน ไม่ได้ก๊อปกติกา "อะไรนับว่าปิดแล้ว" มาเขียนซ้ำ
- **แถบกลยุทธ์** — เช็กลิสต์ชนะงาน 7 ข้อ + playbook 8 เส้นทาง (หัวหน้าแก้ได้จากหน้าจอ)
  เช็กลิสต์ทุกข้อผูกกับช่องจริงในฟอร์ม Pending → ระบบนับให้เองว่าแต่ละข้อยังขาดกี่งาน คิดเป็นเงินเท่าไหร่
- `db/phase3-2.sql` — คอลัมน์ `playbook` + เนื้อหาตั้งต้น 8 เส้นทาง (update เฉพาะแถวที่ยังว่าง รันซ้ำไม่ทับของหัวหน้า)
- 🔴 **แก้ช่องโหว่ที่ 2.4 ทิ้งไว้:** `profiles_select` เขียน `team_id = my_team_id()` ตรง ๆ ไม่ผ่าน `can_access_team()`
  → หัวหน้าที่ได้สิทธิ์ดู GOV.1/3/4 เห็น "งาน" ครบ 3 ทีม แต่เห็น "คน" แค่ทีมตัวเอง
  หน้าทีมขายเลยจะขึ้นว่าทีมอื่นมีสมาชิก 0 คน ทั้งที่จริงมี — แก้ให้ผ่าน `can_access_team()` เหมือนตารางอื่น
  ทดสอบยืนยันแล้วว่า **sale ไม่ได้เห็นกว้างขึ้นแม้แต่คนเดียว**
- ทีมที่ผู้ใช้ไม่มีสิทธิ์ดู ขึ้น "🔒 ดูข้อมูลทีมนี้ไม่ได้" **ไม่ใช่เลข 0** — เลข 0 ทำให้เข้าใจผิดว่าทีมนั้นไม่มีงาน
- งานที่ยังไม่ระบุทีมขึ้นการ์ดเตือน ไม่ปล่อยหายเงียบ ๆ (ยอดรวมรายทีมจะได้ตรงกับหน้าภาพรวม)
**ไฟล์:** db/phase3-2.sql · docs/js/modules/sources.js · docs/js/modules/dashboard.js (export monthOf) ·
docs/js/data/local-adapter.js · docs/css/app.css · docs/js/config.js · docs/sw.js (v0.9.0)
**ทดสอบ:** RLS จริงบน PGlite **69/69** (เดิม 59 — เพิ่มชุด profiles/playbook 10 ข้อ) ·
ตรรกะบริสุทธิ์ **22/22** · เบราว์เซอร์จริง (คลิกผ่าน CDP) **32/32** · ไม่มี JS error / unhandled rejection ·
มือถือ 390px ทั้ง 4 แถบไม่ล้นขอบจอ · regression เดิมครบ: src 38 · act 42 · adm 40 · sign 35 · b3 31 ·
arc 25 · unit 26 · imp 23 · reg 12 · adapter parity ผ่าน
**ค้าง:** เจ้าของต้องรัน `db/phase3-2.sql` ใน Supabase ก่อน ไม่งั้นแถบกลยุทธ์จะขึ้นว่ายังไม่มีเนื้อหา
และหน้าทีมขายจะยังเห็นสมาชิกแค่ทีมตัวเอง

## 2026-07-23 00:15 · b8f38a1 · แก้ 2 เรื่องที่เจ้าของเจอหลัง 3.1
**step:** 3.1 (ตามเก็บ) | **ประเภท:** แก้บั๊ก + ฟีเจอร์
- 🔴 **ซากไฟล์ placeholder ค้างที่ `tools/import-json.html`** (992 bytes จาก commit แรก)
  ของจริงอยู่ที่ `docs/tools/import-json.html` (13 KB) — เจ้าของเปิดอันเก่าแล้วเห็นว่า "Phase 1.6 ยังไม่ทำ"
  ทั้งที่ทำเสร็จตั้งแต่ 1.6 แล้ว · **ลบซากทิ้งแล้ว** + จดกติกาใน CLAUDE.md ว่าย้ายไฟล์ต้องลบของเก่า
  (URL บนเว็บ `/tools/import-json.html` เสิร์ฟของจริงมาตลอด — ปัญหาอยู่ที่ไฟล์ในเครื่อง)
- 🔴 **ผมบอกผิดว่านำเข้ารายชื่อ 90 ราย ผ่านเครื่องมือนี้ได้** — ของเดิมรองรับแค่งานขาย
  → เพิ่มการรองรับจริง: `detectFormat` รู้จักรูปแบบรายชื่องานแสดงสินค้า ·
  `mapExpoCustomer()` แปลง `{sales,name,org,interest,contact,result,p}` → `expo_customers` ·
  หน้า import มีเส้นทาง preview/run แยก กันซ้ำด้วยชื่อบริษัท
- แก้บั๊กที่มีมาตั้งแต่ 1.6: ถ้าซ้ำหมดทุกแถว ลูปไม่ทำงาน → ช่องสรุปว่างเปล่า กดแล้วเหมือนไม่มีอะไรเกิดขึ้น
  ตอนนี้ขึ้น "สำเร็จ 0 · ข้าม 3" + บอกว่าให้ติ๊ก "อัปเดตทับ" ถ้าต้องการเขียนทับ
- bump เป็น v0.8.1
**ไฟล์:** ลบ tools/import-json.html · docs/tools/import-json.html · docs/js/data/import-map.js ·
docs/js/config.js · docs/sw.js · CLAUDE.md
**ทดสอบ:** 23/23 นำเข้า (รวมนำเข้าซ้ำ + ไฟล์งานขายเดิมต้องไม่พัง) · regression src 38 · reg 12 · unit 26
**ค้าง:**
- 🔴 เจ้าของยังต้องนำเข้ารายชื่อ Thai Water 90 ราย + เพิ่มลิงก์ Google Sheet เองในแถบแหล่งงาน
- ยังไม่ได้ทดสอบด้วยบัญชี sale/manager จริงบน Supabase
- ไอคอน PWA ยัง 404 — รอ step 3.3


## 2026-07-22 22:30 · c7b20ff · 3.1 เสร็จ — แหล่งงาน 8 เส้นทาง + Thai Water Expo
**step:** 3.1 | **ประเภท:** ฟีเจอร์ + ความปลอดภัย
- `db/phase3-1.sql` ใหม่ — `lead_sources` (8 เส้นทาง + ลิงก์ jsonb) · `expo_customers` (กองลีดกลาง)
- `modules/sources.js` เขียนใหม่ทั้งไฟล์ — 2 แถบ: เส้นทางหางาน · Thai Water Expo
  ★ prospect ขึ้นก่อนเสมอ · กรอง/ค้นหา · ยกขึ้นเป็น Pending แล้วโยง `pending_id` กันยกซ้ำ
- 🔴 **จงใจไม่ commit ลิงก์ Google Sheet รายชื่อลูกค้า 90 ราย** — URL ของ Sheet คือกุญแจเข้าถึง
  ข้อมูลลูกค้าจริง ถ้าชีตเปิดแบบ "ใครมีลิงก์ก็เข้าได้" การใส่ลง public repo = ปล่อยข้อมูลออกทั้งชุด
  → เจ้าของเพิ่มเองจากหน้าจอ (ลิงก์แก้ได้อยู่แล้ว) · มีเทสต์คุมว่า seed ต้องไม่มีลิงก์แบบนี้
- 🔒 กัน `javascript:` URL 2 ชั้น (ตอนบันทึก + ตอนแสดงผล) + `rel="noopener noreferrer"` ทุกลิงก์
- **สิทธิ์ `expo_customers` ตั้งใจไม่ผูกทีม** — เป็นกองลีดกลางที่ยังไม่มีเจ้าของ
  ถ้าผูกทีมแบบตารางอื่น แถวที่ยังไม่ระบุทีมจะเห็นได้แต่ admin แล้วฟีเจอร์จะไร้ประโยชน์
**บั๊กที่เทสต์จับได้:**
- `.ex-right` กว้าง 100% อยู่ในแถวที่ไม่มี `flex-wrap` → ล้นจอมือถือ 5px
  (ก๊อป pattern จาก `.rvrow` แต่ลืมเอา flex-wrap มาด้วย)
- ผมตั้งเลขคาดหวังผิดเอง 2 จุด: ลิงก์ 17 (จริง 16 เพราะตัดออก 1) · ลำดับตัวอักษรไทย
  (ซ มาก่อน บ · "เอ" เรียงตาม อ ไปท้ายสุด — ตรวจกับ localeCompare แล้ว)
- bump เป็น v0.8.0
**ไฟล์:** db/phase3-1.sql · docs/js/modules/sources.js · docs/js/data/supabase-adapter.js ·
docs/js/data/local-adapter.js · docs/js/data/adapter.js · docs/css/app.css ·
docs/js/config.js · docs/sw.js · PROGRESS.md · CLAUDE.md
**ทดสอบ:** 274/274 ผ่าน (59 RLS จริง + 38 แหล่งงาน + 42+40+35+31+25+26+12 regression)
**ค้าง:**
- 🔴 ต้องเอา `db/phase3-1.sql` ไปรันใน Supabase
- 🔴 **รายชื่อลูกค้า Thai Water 90 ราย ยังไม่ได้นำเข้า** — ใช้ `docs/tools/import-json.html`
  หรือกรอกจากหน้าจอ · และเจ้าของต้องเพิ่มลิงก์ Google Sheet เองในแถบแหล่งงาน
- ยังไม่ได้ทดสอบด้วยบัญชี sale/manager จริงบน Supabase
- ไอคอน PWA ยัง 404 — รอ step 3.3
- 1.7 ยังเหลือทดสอบบนเครื่องจริง iPhone/S24/iPad


## 2026-07-22 19:40 · 7062daf · 2.6 เสร็จ — หัวหน้าเซ็นรับทราบ (จบ Phase 2)
**step:** 2.6 | **ประเภท:** ฟีเจอร์ + ความปลอดภัย + แก้บั๊ก
- `db/signoffs.sql` ใหม่ — ตาราง append-only + `is_reviewer()` + trigger `set_signoff_meta()`
  กัน 3 ชั้น: GRANT ให้แค่ select/insert · ไม่มี policy update/delete · trigger เขียนทับค่าจาก client
- `ui/signoff.js` ใหม่ (คอมโพเนนต์ร่วม) — `signoffState()` ตัดสิน "ลายเซ็นค้าง" จุดเดียวทั้งระบบ
- `modules/review.js` ใหม่ — หน้า "รอตรวจ" รวมงาน+ลูกค้าที่ยังไม่เซ็น/ถูกแก้หลังเซ็น
  เรียง "แก้ไขหลังเซ็น" ขึ้นก่อน · กดแล้วพาไปเปิดฟอร์มจริงในแถบต้นทาง (ไม่ทำฟอร์มซ้ำ)
- แถบลายเซ็นในฟอร์ม Pending + Book 3 สี · sale เห็นผลตรวจแต่ไม่มีปุ่มเซ็น
**บั๊กที่เทสต์จับได้ 3 ตัว:**
- โค้ดไปแทรกผิดฟังก์ชัน (`openQuickLog` แทน `openDetail`) — รวมของ 2.5 ที่หลุดไปด้วย
- import หาย → `signoffBarHtml` undefined → ฟอร์มไม่เปิด **แต่เงียบสนิท**
  เพราะเป็น unhandled rejection ที่ `pageerror` ไม่จับ → **เพิ่มตัวดักในเทสต์ทุกชุดแล้ว**
- `local-adapter` ไม่ใส่ `updated_at` ตอนสร้าง (ต่างจาก `default now()` ของ Postgres)
  → เซ็นเสร็จปุ๊บกลายเป็น "แก้ไขหลังเซ็น" ทันที · แก้แล้วลำดับการเรียงตรงกับ Supabase ด้วย
- แก้ layout: ย่อจอ desktop → มือถือ แถบบนล้น 3px (`.topbar-left` ไม่มี `min-width:0`)
- bump เป็น v0.7.0
**ไฟล์:** db/signoffs.sql · docs/js/ui/signoff.js · docs/js/modules/review.js ·
docs/js/modules/pending.js · docs/js/modules/book3.js · docs/js/data/supabase-adapter.js ·
docs/js/data/local-adapter.js · docs/js/data/adapter.js · docs/js/app.js · docs/index.html ·
docs/css/app.css · docs/js/config.js · docs/sw.js · PROGRESS.md · CLAUDE.md
**ทดสอบ:** 218/218 ผ่าน (49 RLS จริง + 35 ลายเซ็น + 42 + 40 + 31 + 25 + 26 + 12 regression)
**ค้าง:**
- 🔴 **ต้องเอา `db/signoffs.sql` ไปรันใน Supabase** ไม่งั้นแถบลายเซ็นกับหน้ารอตรวจยังใช้ไม่ได้
- ยังไม่ได้ทดสอบด้วยบัญชี sale/manager จริงบน Supabase (ตรรกะพิสูจน์บน Postgres จริงแล้ว)
- ไอคอน PWA ยัง 404 — รอ step 3.3
- 1.7 ยังเหลือทดสอบบนเครื่องจริง iPhone/S24/iPad


## 2026-07-22 16:05 · b0622bc · 2.5 เสร็จ — Archive: อุดรูงานปิดแล้วยังตามหลอน
**step:** 2.5 | **ประเภท:** แก้บั๊ก + ฟีเจอร์เล็ก
- ตรวจของเดิมก่อน → โครงสร้าง archive ครบตั้งแต่ 1.4/2.2 แล้ว **แต่มีรูรั่ว 1 จุด**
- 🔴 **รูรั่ว:** เก็บงานเข้าคลังแล้ว กิจกรรมที่ผูกไว้ยังเตือน "เลยกำหนด" ทุกวัน
  ทั้งหน้าแผนติดต่อและ dashboard → ยิ่งปิดงานเยอะ เสียงเตือนยิ่งมั่วจนไม่มีใครเชื่อตัวเลข
- แก้: `listActivities` ดึง `is_active` ของงานแม่มาด้วย · `bucketize()` ข้ามรายการที่งานแม่ถูกเก็บแล้ว
  เลือกวิธี "ไม่แสดง" แทนแก้ข้อมูล → ปลุกงานกลับมา กิจกรรมกลับมาเองครบ
- **ไม่ซ่อนเงียบ ๆ** — หน้าจอบอกเสมอว่าซ่อนไว้กี่รายการ เพราะอะไร
- กรณีที่ระวังไว้: RLS ซ่อนงานแม่จนได้ `null` → ต้องยังนับกิจกรรมนั้น ไม่ใช่เหมาว่า archive
- เก็บเพิ่ม: แสดงวันที่เก็บเข้าคลัง (พ.ศ.) · เตือนให้เก็บเข้าคลังเมื่อเลือกขั้นตอน "ปิดได้"/"แพ้"
  (ไม่เก็บอัตโนมัติ เพราะปิดการขายแล้วมักยังต้องตามส่งของ/วางบิลอีกหลายเดือน)
- แก้ข้อความที่ขัดกันเอง: "ยังไม่มีกิจกรรม" + "ซ่อนไว้ 1 รายการ" พร้อมกัน
- bump เป็น v0.6.0
**ไฟล์:** docs/js/modules/activities.js · docs/js/modules/pending.js · docs/js/modules/book3.js ·
docs/js/data/supabase-adapter.js · docs/js/data/local-adapter.js · docs/css/app.css ·
docs/js/config.js · docs/sw.js · PROGRESS.md · CLAUDE.md
**ทดสอบ:** 176/176 ผ่าน (24 archive + 26 unit + 34 RLS + 39 Admin + 41 + 30 + 12 regression)
**ค้าง:**
- 🔴 `db/phase2-4.sql` ยังต้องเอาไปรันใน Supabase (ค้างมาจาก 2.4)
- ยังไม่ได้ทดสอบด้วยบัญชี sale/manager จริงบน Supabase
- ไอคอน PWA ยัง 404 — รอ step 3.3
- 1.7 ยังเหลือทดสอบบนเครื่องจริง iPhone/S24/iPad


## 2026-07-22 14:20 · c9a9676 · 2.4 เสร็จ — role manager + team_access + หน้า Admin
**step:** 2.4 | **ประเภท:** ฟีเจอร์ + ความปลอดภัย + เครื่องมือทดสอบ
- `db/phase2-4.sql` ใหม่: role `manager` · ตาราง `team_access` · `app_settings` (เป้ายอดขาย)
  + แก้ `can_access_team()` เป็น security definer และให้อ่าน `team_access`
- `modules/admin.js` ใหม่: จัดการผู้ใช้ (role/ทีม/เปิด-ปิดบัญชี) · ติ๊กทีมที่หัวหน้าดูข้ามได้ ·
  เพิ่มทีม · ตั้งเป้ายอดขาย (dashboard ดึงไปใช้ทันที ไม่ต้องแก้ config.js อีก)
- ⭐ **ทดสอบ RLS ด้วย PostgreSQL จริงได้แล้ว** — ติดตั้ง PGlite (PG16 เป็น WASM)
  จำลอง auth ของ Supabase แล้วรันไฟล์ SQL ทั้ง 4 ตามลำดับจริง + สลับ role ยิง query
  พิสูจน์ได้ว่าหัวหน้าเห็น 3 ทีมที่ติ๊กให้ และไม่เห็นทีมที่ไม่ได้ติ๊ก (34/34)
- **สิ่งที่การทดสอบจริงเจอ:** การถูกปฏิเสธมี 2 หน้าตา — ละเมิด `using` = 0 แถวเงียบ ๆ ·
  ละเมิด `with check` = error 42501 → ต้องดักทั้งสองแบบ
- เพิ่ม `restError()` แปลง error ของ Postgres (42501/P0001/42P01/23505/23514) เป็นภาษาไทย
- **เก็บของค้างจาก 2.3:** `savePending`/`saveCustomer` เติม team_id ให้อัตโนมัติแล้ว (`fillTeam()`)
- app.js: ป้ายสิทธิ์รองรับ "หัวหน้างาน" + ซ่อนแถบตั้งค่าจากคนที่ไม่ใช่ admin
- bump เป็น v0.5.0
**ไฟล์:** db/phase2-4.sql · docs/js/modules/admin.js · docs/js/modules/dashboard.js ·
docs/js/data/supabase-adapter.js · docs/js/data/local-adapter.js · docs/js/data/adapter.js ·
docs/js/app.js · docs/index.html · docs/css/app.css · docs/js/config.js · docs/sw.js ·
PROGRESS.md · CLAUDE.md
**ทดสอบ:** 174/174 ผ่าน (34 RLS บน Postgres จริง + 39 หน้า Admin + 41 + 30 + 18 + 12 regression)
**ค้าง:**
- 🔴 **ต้องเอา `db/phase2-4.sql` ไปรันใน Supabase ก่อน** ไม่งั้นหน้าตั้งค่าจะขึ้นว่ายังไม่มีตาราง
- ยังไม่ได้ทดสอบด้วยบัญชี sale/manager จริงบน Supabase (ยังไม่มีบัญชีพวกนั้น)
  แต่ตรรกะ RLS พิสูจน์บน Postgres จริงแล้ว — เหลือแค่ยืนยันว่า Supabase ให้ผลเดียวกัน
- ไอคอน PWA (`icons/icon-192.png`) ยัง 404 — รอ step 3.3
- 1.7 ยังเหลือทดสอบบนเครื่องจริง iPhone/S24/iPad


## 2026-07-22 10:40 · 8716a05 · 2.3 เสร็จ — F6 แผนติดต่อลูกค้า + เตือนงานค้างบน dashboard
**step:** 2.3 | **ประเภท:** ฟีเจอร์ + แก้บั๊ก
- เขียน `modules/activities.js` ใหม่ทั้งไฟล์ (จากเดิมเป็น placeholder) — จัดกลุ่มตามกำหนดเวลา ไม่ใช่ตารางเรียง
- ช่องเพิ่มเร็วบรรทัดเดียว + ปุ่มติ๊กเสร็จกดครั้งเดียวจบ (ไม่เปิด modal)
- ฟอร์มเต็มผูกกิจกรรมกับงาน Pending / ลูกค้า Book 3 สี ได้
- dashboard เพิ่มแถบ "สิ่งที่ต้องทำวันนี้" — เรียก `bucketize()` ตัวเดียวกับหน้าแผน เลขจะไม่มีทางขัดกัน
- **แก้บั๊กวันที่:** `toISOString()` คืน "เมื่อวาน" ก่อน 07:00 น. เวลาไทย →
  เพิ่ม `todayISO()` / `shiftDay()` ใน `ui/datepicker.js` แล้วเปลี่ยนทุกที่ที่ใช้แบบเดิม
  (พิสูจน์ด้วยการล็อกนาฬิกาไว้ 22 ก.ค. 03:00 น. → ของเดิมได้ 2026-07-21)
- **แก้กับดัก RLS:** adapter เติม `team_id` ของผู้ใช้ให้อัตโนมัติตอนสร้างกิจกรรม
  (ปล่อยว่างแล้ว sale จะบันทึกไม่ผ่านโดยไม่มี error บอก) + ดัก PATCH ที่ RLS ปฏิเสธเงียบ ๆ
- bump เวอร์ชันเป็น v0.4.0 ทั้ง config.js และ sw.js
**ไฟล์:** docs/js/modules/activities.js · docs/js/modules/dashboard.js · docs/js/ui/datepicker.js ·
docs/js/ui/loglist.js · docs/js/data/supabase-adapter.js · docs/js/data/local-adapter.js ·
docs/css/app.css · docs/js/config.js · docs/sw.js · PROGRESS.md · CLAUDE.md
**ทดสอบ:** 83/83 ผ่าน (41 หน้าแผน + 18 unit + 12 regression Pending + 30 regression Book 3) · ไม่มี JS error
**ค้าง:**
- 🔴 `customers` / `pending_projects` **ยังไม่ได้เติม team_id อัตโนมัติ** — ฟอร์มมีตัวเลือก "— ยังไม่ระบุ —"
  ซึ่ง sale เลือกแล้วจะบันทึกไม่ผ่าน ตอนนี้ยังไม่เจอเพราะมีแต่บัญชี admin → **ต้องแก้ตอน 2.4**
- ยังไม่ได้ทดสอบด้วยบัญชี `sale` จริง (ยังไม่มีบัญชีนั้น รอ 2.4)
- ไอคอน PWA (`icons/icon-192.png`) ยัง 404 อยู่ — รอ step 3.3
- 1.7 ยังเหลือทดสอบบนเครื่องจริง iPhone/S24/iPad


## 2026-07-22 08:05 · (commit ตัวมันเอง) · จด wish ข้อแรก — layer การแสดงผลตามตำแหน่ง
**step:** — | **ประเภท:** เอกสาร
- จดลง `WishtoHave.md` กล่องรับ: MD/admin/director เห็นทุกส่วน+แก้ในหน้าได้ ·
  Manager กลุ่ม IMP / TA Sales เห็นแค่กลุ่มตัวเอง · เปลี่ยนสิทธิ์ได้ภายหลัง
- แนบหมายเหตุก่อนประเมิน: ข้อนี้**ส่วนใหญ่มีในแผน 2.4 อยู่แล้ว** (`role` + `team_access`)
  ส่วนที่ยังไม่มีคือชั้น `director`/MD ที่สูงกว่า manager และ "สลับมุมมอง" ถ้าหมายถึงกดดูแบบที่คนอื่นเห็น

**ไฟล์:** `WishtoHave.md`
**ทดสอบ:** ไม่ต้องทดสอบ (เอกสารล้วน)
**ค้าง:** ❓ ยังไม่รู้ว่า "TA Sales" คือทีมไหน — ระบบมี GOV.1 / GOV.3 / GOV.4 / TE-IMP / System Project
เท่านั้น ถ้าเป็นทีมใหม่ต้องเพิ่มใน `seed.sql` · **ต้องถามเจ้าของก่อนประเมินเต็ม**

## 2026-07-22 07:40 · `1908e3e` · สร้าง WishtoHave.md
**step:** — | **ประเภท:** เอกสาร
- สร้าง `WishtoHave.md` — ที่จดฟังก์ชันที่เจ้าของอยากได้ระหว่างพัฒนา แต่ยังไม่อยู่ใน roadmap
- แบ่ง 3 โซน: 📥 กล่องรับ (เจ้าของจดดิบ ๆ) → ✅ ประเมินแล้ว (Claude เติมผล) → ❌ ตัดสินใจไม่ทำ (กันเสนอซ้ำ)
- ล็อกรูปแบบผลประเมิน 5 ข้อ: step ไหน · กระทบโครงสร้างไหม · ต้อง migration ไหม · **ราคาถ้าเลื่อน** · ติดอะไรก่อน
- เติมตัวอย่างจริง 2 ข้อ ไม่ใช่ตัวอย่างสมมุติ: "ปุ่มลบบันทึกติดตาม" (ของค้างจาก 1.4c) และ
  "rollback รายแถว" ที่ตัดออกไปแล้วในสเปค v3 — ให้เห็นทั้งโซนที่ประเมินแล้วและโซนที่ตัดทิ้ง
- เพิ่มรายการไฟล์เอกสารระดับ repo ใน `CLAUDE.md` (CLAUDE / PROGRESS / autolog / WishtoHave / Workflow)
  พร้อมกำกับหน้าที่แต่ละไฟล์ — session ใหม่จะได้ไม่เขียนซ้ำกันเอง

**ไฟล์:** `WishtoHave.md` (ใหม่) · `CLAUDE.md`
**ทดสอบ:** ไม่ต้องทดสอบ (เอกสารล้วน)
**ค้าง:** กล่องรับยังว่าง — รอเจ้าของเริ่มจด
> ⚠️ ไฟล์ 3 ตัวนี้ไปติดอยู่ใน commit `1908e3e` ("แก้บั๊กปฏิทิน") เพราะอีก session ทำงานคู่ขนานแล้ว
> `git add` แบบเหมาทั้งโฟลเดอร์ — เนื้อไฟล์ครบถูกต้อง แต่ข้อความ commit ไม่ตรงกับของที่อยู่ข้างใน
> **ไม่แก้ประวัติ** (push ไปแล้ว + อีก session ยังทำงานอยู่ rewrite แล้วเสี่ยงงานเขาหาย)
> บทเรียน: ตอนมีหลาย session ให้ `git add <ไฟล์ที่ตัวเองแตะ>` ระบุชื่อเสมอ อย่าใช้ `-A` / `-a`

## 2026-07-22 07:24 · `86ed52e` · 1.6 เสร็จ — นำเข้า / กู้คืนข้อมูล
**step:** 1.6 | **ประเภท:** ฟีเจอร์ (ปิด step)
> 📌 รายการนี้เก็บย้อนหลังให้ — session ที่ทำงานนี้เริ่มก่อนกติกาข้อ 7 มีผล จึงยังไม่ได้เขียนเอง

- ย้าย `tools/import-json.html` → **`docs/tools/`** เพราะ GitHub Pages เสิร์ฟแค่ `docs/` ไม่งั้นเปิดจากเว็บไม่ได้
- รับ 3 รูปแบบ: ไฟล์สำรองของระบบ / prototype v3 / array งานล้วน — **ไฟล์ที่ไม่รู้จักโยน error ไม่เดาแล้วนำเข้ามั่ว**
- ล็อกรูปแบบไฟล์สำรองไว้ที่ `BACKUP_FORMAT` ใน `import-map.js` → **step 3.6 ต้อง export ตามนี้** (ไม่งั้นได้ไฟล์ backup ที่เอากลับเข้าไม่ได้)
- การแปลงสำคัญ: `ownerId` (m1–m4) ของ prototype คือ**ทีมไม่ใช่คน** → map เข้า `team_id` ·
  `closeMonth` พ.ศ. `2569-10` → ค.ศ. `2026-10` (ไม่งั้นเรียงพังทั้งระบบ) ·
  มูลค่ามีคอมมา → ตัวเลข · วันที่ว่าง → `null` · stage ไม่รู้จัก → `lead` ·
  `c1n/c1s/c1a..c3*` → `project_contacts` slot 1–3 · `sample: true` = ข้อมูลตัวอย่าง ไม่นำเข้า
- กันซ้ำด้วย PENDING NO. ก่อน ไม่มีค่อยดูชื่องาน+ลูกค้า · ค่าเริ่มต้นข้ามงานซ้ำ · **ไม่ลบอะไรเลย**
- 🐛 บั๊กที่เทสต์จับได้: `local-adapter` ใช้ `{ ...EMPTY }` ซึ่ง spread คัดลอกแค่ชั้นนอก
  อาร์เรย์ข้างในเป็นตัวเดียวกัน → `push` ไปเปื้อนค่าตั้งต้น ล้างข้อมูลแล้วของเก่าไม่หาย · แก้เป็นฟังก์ชัน `emptyDb()`
- เปลี่ยนข้อความปุ่ม → "Project จบแล้ว — เก็บเข้าคลัง Archives"

**ไฟล์:** `docs/tools/import-json.html` (+309 · ย้ายที่) · `docs/js/data/import-map.js` (ใหม่ +240) · `local-adapter.js` · `pending.js` · `CLAUDE.md` · `PROGRESS.md`
**ทดสอบ:** 78/78 ผ่าน — รวมวงจรจริง export → ล้าง DB → import กลับ → ข้อมูลครบ

## 2026-07-22 07:20 · (commit ตัวมันเอง) · สร้างระบบ autolog
**step:** — | **ประเภท:** เอกสาร
- สร้าง `autolog.md` + ย้อนบันทึก 25 commit ตั้งแต่ต้นโปรเจกต์
- เพิ่มกติกาข้อ 7 ใน `CLAUDE.md` — จบงานทุกครั้งต้องเขียน autolog ก่อนส่งคืน

**ไฟล์:** `autolog.md` (ใหม่) · `CLAUDE.md`
**ทดสอบ:** ไม่ต้องทดสอบ (เอกสารล้วน ไม่มีโค้ดรัน)
**ค้าง:** รายการย้อนหลังสรุปจาก commit message + `PROGRESS.md` — รายละเอียดลึกของแต่ละ step ยังอยู่ที่ `PROGRESS.md` เหมือนเดิม

---

## 2026-07-22 07:09 · `487ba81` · 1.4e แถบ Archive + ปุ่มกันกดพลาด
**step:** 1.4e | **ประเภท:** ฟีเจอร์ + UX
- แถบสถานะ 3 ปุ่ม (กำลังทำ / Archive / ทั้งหมด) แทน checkbox เดิม
- เปลี่ยน adapter param `activeOnly` (bool) → `status` — bool รองรับได้แค่ 2 สถานะ แต่ต้องการ 3
- เพิ่ม `countPending(status)` ทั้ง 2 adapter (supabase ใช้ `Prefer: count=exact` ไม่ต้องโหลดข้อมูลลงมือถือ)
- ปุ่มเก็บเข้า Archive ต้องกด 2 ครั้ง · ไม่ยืนยันใน 4 วิ คืนสภาพเอง · ทางปลุกกลับไม่อันตราย กดครั้งเดียว

**ไฟล์:** `pending.js` · `adapter.js` · `local-adapter.js` · `supabase-adapter.js` · `dashboard.js` · `app.css` · `PROGRESS.md` · `Workflow/index.html`
**ทดสอบ:** 35/35 ผ่าน — รวมเช็กที่ DB ว่ากดครั้งแรกข้อมูลยังไม่ถูกแตะจริง + เลย์เอาต์ 390/820/1440 ปุ่มมือถือสูง 44px

---

## 2026-07-22 07:00 · (ไม่มี commit แยก) · แผนผังภาพรวม Workflow
**step:** — | **ประเภท:** เอกสาร
- สร้าง `Workflow/index.html` — แผนผังว่าโมดูลไหนสร้างถึงไหน (สถาปัตยกรรม 4 ชั้น · B1–B9 · F1–F10 · roadmap 23 step · ของค้าง)
- อ่านสถานะจาก repo จริง ไม่ได้ลอกจากเอกสาร

**ไฟล์:** `Workflow/index.html` (ใหม่ · เข้า repo พร้อม `487ba81`)
**ทดสอบ:** ตรวจ tag ครบคู่ · self-contained ไม่มี external dependency

---

## 2026-07-22 06:55 · `4f5d3e5` · 1.4d แก้ข้อมูลหายตอนบันทึก (ปัญหาเดียวกัน 2 ทิศทาง)
**step:** 1.4d | **ประเภท:** แก้บั๊ก 🔴 ข้อมูลหาย
- **ทิศ 1 (เจ้าของรายงาน):** พิมพ์บันทึกติดตามแล้วกดปุ่มบันทึกใหญ่โดยไม่กด "+ เพิ่มบันทึก" → ข้อความหายเงียบ ๆ
  แก้: ปุ่มบันทึกอ่าน `draftLog()` ให้ด้วย กดปุ่มไหนก็ได้ผลเหมือนกัน
- **ทิศ 2 (เจอระหว่างแก้ ร้ายกว่า):** แก้ 42 ช่องค้างไว้แล้วกด "+ เพิ่มบันทึก" → ที่แก้ทั้งหมดหาย
  เพราะ `lgAdd` เรียก `openDetail()` ใหม่ทั้งแผง ดึง DB มาทับ
  แก้: วาดใหม่เฉพาะรายการบันทึก (`reloadLogs` / `reloadQLogs`) ไม่แตะฟอร์ม

**ไฟล์:** `pending.js` · `app.css` · `PROGRESS.md`
**ทดสอบ:** 18/18 ผ่าน ครอบคลุมทั้งสองทิศ + เคสกดบันทึกใหญ่ตอนช่องว่างต้องไม่เพิ่มบันทึกซ้ำ

---

## 2026-07-22 06:37 · `2bbd802` · 1.5 เสร็จ — F3 Dashboard ภาพรวม + กราฟ
**step:** 1.5 | **ประเภท:** ฟีเจอร์ (ปิด step)
- KPI 4 การ์ด: เป้า · ปิดได้แล้ว · pipeline ถ่วงน้ำหนัก · coverage
- กราฟแท่งรายเดือน แผน vs ปิดจริง vs คาดปิด · funnel 6 ขั้น · top 3 · งานเลยกำหนด — SVG ล้วน ไม่มี library
- ⚠️ **เบี่ยงจากแผนโดยตั้งใจ:** ไม่ได้ทำ `views.sql` — คำนวณฝั่งเบราว์เซอร์แทน
  (ข้อมูลหลักร้อยแถวเร็วกว่า + ใช้ได้ทันทีไม่ต้องรอเจ้าของรัน SQL + ผู้ช่วยทดสอบเองได้) เหตุผลเต็มใน `PROGRESS.md`
- 🐛 บั๊กที่เทสต์จับได้ 2 ตัว: ตัวเลขขัดกันเองในหน้าเดียว (การ์ดกรองช่วงเป้า แต่ funnel นับทั้งหมด) ·
  ตัวหนังสือในกราฟเหลือ 4.4px บนมือถือ เพราะ `viewBox` คงที่ย่อตัวหนังสือไปด้วย → สร้าง SVG ตามความกว้างจริง

**ไฟล์:** `dashboard.js` (+287) · `app.css` · `config.js` · `CLAUDE.md` · `PROGRESS.md`
**ทดสอบ:** 47/47 ผ่าน (คณิตศาสตร์ 30 · การแสดงผล 17 · เลย์เอาต์ 390/820/1440)
**ค้าง:** ทดสอบโหมด local เท่านั้น — ตัวเลขบน Supabase จริงยังไม่มีใครตรวจ

---

## 2026-07-22 04:37 · `d2117ba` · 1.4c ปุ่มแก้ไขบันทึกที่เขียนไปแล้ว
**step:** 1.4c | **ประเภท:** ฟีเจอร์
- แก้ไขในที่ ไม่เปิด modal ซ้อน modal (บนมือถือ backdrop ทับกันจนกดปิดยาก)
- ปุ่มแก้ไขโผล่เฉพาะบันทึกที่ตัวเองเขียน (หรือ admin) — ให้ตรงกับ policy `follow_update` ฝั่ง DB
- adapter ตัด `pending_id` / `created_by` ออกก่อน PATCH — กันย้ายบันทึกข้ามงาน / สวมชื่อคนเขียน
- **RLS ปฏิเสธเงียบ ๆ = ได้ 200 แต่ไม่มีแถวกลับมา** → ดักเองแล้วโยน error ไม่งั้นผู้ใช้นึกว่าบันทึกสำเร็จ
- 🐛 แก้เอง: เดิมแคช `ME` ระดับ module → ออกจากระบบแล้วคนอื่นล็อกอินเครื่องเดียวกัน ค่าเก่าค้าง โชว์ปุ่มผิดคน

**ไฟล์:** `pending.js` · `adapter.js` · `supabase-adapter.js` · `local-adapter.js` · `app.css` · `PROGRESS.md`
**ทดสอบ:** 32/32 ผ่าน (แก้ไข 18 + regression 14)
**ค้าง:** ปุ่มลบบันทึก — ตั้งใจไม่ทำ รอ step 2.6 ที่ล็อกไม่ให้ลบหลังหัวหน้าเซ็นแล้ว

---

## 2026-07-22 04:23 · `9f27826` · 1.4b บันทึกความคืบหน้ารายวันให้เห็นและใช้ง่าย
**step:** 1.4b | **ประเภท:** UX
- บันทึกติดตามเดิมซ่อนอยู่ในฟอร์มเต็ม ต้องเปิด 42 ช่องเพื่อจดบรรทัดเดียว → เพิ่มแผงบันทึกด่วน

**ไฟล์:** `pending.js` · `app.css` · `PROGRESS.md` และอื่น ๆ รวม 6 ไฟล์
**ทดสอบ:** ผ่าน (รายละเอียดใน `PROGRESS.md`)

---

## 2026-07-21 22:06 · `7820b78` · 1.4 เสร็จ — F4 Pending Project UI เต็มระบบ
**step:** 1.4 (L) | **ประเภท:** ฟีเจอร์ (ปิด step)
- ฟอร์ม 42 ช่อง ครบฟอร์มกระดาษ 2 หน้า · ตาราง sort/ซ่อนคอลัมน์ · การ์ดบนมือถือ
- กรอง/เรียงตามเดือนคาดปิด — **dropdown ไม่ให้พิมพ์เอง** (ถ้าพิมพ์เองทีมจะกรอก `2569-07` ผ่าน constraint แต่เรียงผิดทั้งระบบ)
- preset: เดือนนี้ · ไตรมาสนี้ · ครึ่งปีหลัง 69 · กำหนดเอง · export CSV

**ไฟล์:** `pending.js` (+600) · `app.css` (+164) · `supabase-adapter.js` · `local-adapter.js` · `adapter.js` · `CLAUDE.md` · `PROGRESS.md`
**ทดสอบ:** 29/29 ผ่าน
**ค้าง:** ทดสอบโหมด local เท่านั้น — ยังไม่เคยมีใครเพิ่มงานจริงบน Supabase

---

## 2026-07-21 21:51 · `bd87108` · แก้ป้ายเป้ายอดขาย "80 MB" → "80 ล้านบาท"
**step:** — | **ประเภท:** แก้บั๊ก (สื่อสารผิด)
- `CONFIG.TARGET_MB` ย่อจาก Million Baht แต่ทีมขายอ่านเป็นเมกะไบต์
- แก้ช่วงเป้าเป็น ก.ค.–ธ.ค. 2569 (ครึ่งปีหลัง ไม่ใช่ทั้งปี) + เพิ่ม `CONFIG.TARGET_PERIOD`
- บันทึกกติกาลง `CLAUDE.md`: หน้าจอเขียน "ล้านบาท" เสมอ ห้ามเขียน "MB"

**ไฟล์:** `config.js` · `dashboard.js` · `CLAUDE.md`

---

## 2026-07-21 21:47 · `2dcce7e` · แก้ 2 บั๊กที่เจอหลังล็อกอินจริง
**step:** — | **ประเภท:** แก้บั๊ก
- **เมนูตกบรรทัดบน iPad:** CSS ซ่อนป้ายด้วย `.nav-item span:not(.ico)` แต่ป้ายไม่ได้อยู่ใน span → ซ่อนไม่ได้ ตัวหนังสือตกบรรทัดในแถบกว้าง 68px
  แก้: ครอบป้ายด้วย `<span class="lbl">` ทุกปุ่ม
- **หน้าภาพรวมพัง:** `getDashboardStats()` โยน `notReady()` → ทั้งหน้าขาว
  แก้: ครอบ try/catch + คืน `null` สำหรับตัวที่ยังนับไม่ได้ → แสดง "—" (0 แปลว่า "นับแล้วไม่มี" คนละความหมายกับ "ยังนับไม่ได้")
- เพิ่ม `countRows()` ใช้ `Prefer: count=exact` นับโดยไม่โหลดข้อมูลจริงลงมือถือ

**ไฟล์:** `index.html` · `app.css` · `supabase-adapter.js` · `local-adapter.js` · `dashboard.js`

---

## 2026-07-21 21:32 · `81e28b1` · 1.3 เสร็จ — F2 Data Adapter เติม query จริง
**step:** 1.3 | **ประเภท:** ฟีเจอร์ (ปิด step)
- `listTeams` · `listPending(opt)` · `getPending` · `savePending` · `archivePending` · `deletePending` · `listFollowLogs` · `addFollowLog`
- **`archivePending` = ทางลบปกติของ sale** (set `is_active=false`) · `deletePending` ลบถาวร RLS ปล่อยเฉพาะ admin
- กันไว้ในโค้ด: `SORTABLE` whitelist (ไม่เอาชื่อคอลัมน์จาก UI ต่อ URL ตรง ๆ) · `READONLY` ตัดก่อน PATCH ·
  `safeSearch()` ล้างอักขระพิเศษ PostgREST · ช่องว่าง → `null` · `nullslast` ทุก order

**ไฟล์:** `supabase-adapter.js` (+165) · `local-adapter.js` (+75) · `adapter.js` · `CLAUDE.md` · `PROGRESS.md`
**ทดสอบ:** `node --check` ผ่าน 4 ไฟล์ · parity 17 เมธอดครบทั้ง 2 adapter ·
ยิง query จริง → `401/42501 permission denied for anon` พิสูจน์ว่า anon อ่านไม่ได้จริง **และ** PostgREST แปล query ผ่าน
**ค้าง:** ยังไม่ได้ทดสอบด้วยบัญชีที่ล็อกอินจริง (ผู้ช่วยไม่มีรหัสผ่าน) + ตารางยังว่าง

---

## 2026-07-21 21:28 · `1074eb0` · สเปค v3
**step:** — | **ประเภท:** เอกสาร (สเปคเปลี่ยน)
- **Backup: ทำแค่ backup ไม่ทำ rollback รายแถว** — ตัด `record_history` + trigger ออกจากแผนถาวร
- เพิ่ม role `manager` + ตาราง `team_access` (แยก "ทำอะไรได้" ออกจาก "ที่ไหน")
- เพิ่ม step **2.6** หัวหน้าเซ็นรับทราบ (`signoffs` append-only) + step **3.8** AI Edge Function
- roadmap ขยาย 21 → **23 step**

**ไฟล์:** `CLAUDE.md` · `PROGRESS.md`
**ค้าง:** ⚠️ ตารางใน `PROGRESS.md` ยังไม่ได้เพิ่มแถว 2.6 กับ 3.8 → ตัวเลขความคืบหน้า 2 ไฟล์ไม่ตรงกัน

---

## 2026-07-21 20:41 · `de84378` · แก้บั๊ก service worker ทำให้ติดโค้ดเก่าถาวร
**step:** — | **ประเภท:** แก้บั๊ก 🔴 ร้ายแรง
- sw.js แคชแบบ cache-first → ผู้ใช้ที่เคยเปิดเว็บจะติดโค้ดเวอร์ชันเก่าตลอดไป แม้ deploy ใหม่แล้ว

**ไฟล์:** `sw.js`

---

## 2026-07-21 20:06 · `ace6ce8` · 1.2 เสร็จ — F1 App Shell + Login
**step:** 1.2 | **ประเภท:** ฟีเจอร์ (ปิด step)
- auth ครบวงจร: login / logout / จำ session ใน localStorage / ต่ออายุ token อัตโนมัติก่อนหมด 60 วิ / ดึง profile ผ่าน RLS จริง
- `app.js` เป็นประตูตรวจสิทธิ์: ไม่มี session = เห็นแค่หน้า login เปลี่ยน hash ก็เข้าไม่ได้
- รหัสผิด/อีเมลไม่มีในระบบ → ข้อความเดียวกัน (ไม่บอกใบ้ว่าอีเมลมีจริงไหม)
- 🐛 `.sidebar-foot` ซ่อนตั้งแต่ ≤1024px แต่ปุ่มออกจากระบบสำรองตั้งที่ ≤430px → **บน iPad ไม่มีปุ่มออกจากระบบเลย**

**ไฟล์:** `app.js` (+121) · `supabase-adapter.js` (+213) · `index.html` · `app.css` · `config.js` · `local-adapter.js` · `CLAUDE.md` · `PROGRESS.md`
**ทดสอบ:** ผ่านทุกข้อ · 390/820/1440 ไม่ล้นแนวนอน · ไม่มี JS error
> บทเรียน: `--window-size=390` ของ Chrome headless ไม่ได้ให้ viewport 390px (ขั้นต่ำ ~500px) — ต้องวัดผ่าน iframe

---

## 2026-07-21 08:07 · `f5320c3` · เตรียมโครงธีม/สี (step 3.7 ใหม่)
**step:** — | **ประเภท:** รีแฟกเตอร์เตรียมทาง
- ย้ายสีทั้งหมดไปเป็นตัวแปรใน `:root` · สวิตช์ที่ `<html data-theme="dark">` · เพิ่ม step 3.7 เข้า roadmap
- เหตุผล: ถ้าปล่อยให้ hardcode hex ไว้ ตอนทำธีมจะต้องไล่แก้ทั้งระบบ

**ไฟล์:** `app.css` · `index.html` · `CLAUDE.md` · `PROGRESS.md`

---

## 2026-07-21 07:51 · `367faa9` · ปิด step 1.1 + เติมขอบเขตงานทีม GOV.3
**step:** 1.1 | **ประเภท:** เอกสาร (ปิด step)
**ไฟล์:** `CLAUDE.md` · `PROGRESS.md` · `seed.sql`

---

## 2026-07-21 07:44 · `87d57ce` · 🐛 ข้อมูลไทยใน DB พัง + กันไม่ให้เกิดซ้ำ
**step:** 1.1 | **ประเภท:** แก้บั๊ก 🔴 ข้อมูลเสีย
- `LANG`/`LC_CTYPE` ในเครื่องว่าง → `pbcopy` แปลง UTF-8 เป็น MacRoman → ไทยเพี้ยนตั้งแต่ clipboard
- **ตรวจไม่เจอตอนแรกเพราะใช้ `pbcopy | pbpaste` ซึ่งแปลงกลับด้วยวิธีเดียวกัน**
- เคยวินิจฉัยผิดว่าเป็นปัญหาฟอนต์ แล้วปล่อยข้อมูลพังค้างใน DB หลายรอบ
- กติกาใหม่: ใช้ `LC_CTYPE=UTF-8 pbcopy` เสมอ · ตรวจด้วย `osascript -e 'the clipboard as text'`

**ไฟล์:** `CLAUDE.md` · `db/check.sql`
> บทเรียนที่บันทึกถาวร: **เครื่องมือที่ใช้ตรวจ ต้องไม่ใช่ตัวเดียวกับที่อาจเป็นต้นเหตุ**

---

## 2026-07-21 07:36 · `d82b8d7` · 🐛 ตั้ง admin คนแรกไม่ได้เพราะ trigger บล็อก
**step:** 1.1 | **ประเภท:** แก้บั๊ก (ไก่กับไข่)
- `guard_profile_privilege` เช็ก `is_admin()` แต่ใน SQL Editor `auth.uid()` เป็น null → false → บล็อกตัวเอง
- แก้เป็น `if auth.uid() is null or is_admin()` — null = มาจาก SQL Editor/service key ซึ่งเชื่อถือได้
  ส่วนคนยิงผ่าน REST API มี `auth.uid()` เสมอ จึงยังบล็อกอยู่

**ไฟล์:** `db/policies.sql`

---

## 2026-07-21 07:10–07:47 · `731226e` `710d297` `df90cbb` `5b6cb99` `22362dd` · ซ่อมหลังรัน SQL จริง
**step:** 1.1 | **ประเภท:** แก้บั๊ก + เครื่องมือ
- 🐛 **`731226e` GRANT ที่ขาด:** หลังรัน `schema.sql` ทั้ง 5 ตารางตอบ `42501 permission denied` ไม่ใช่ `[]`
  → Supabase รุ่นใหม่ไม่ GRANT ให้ `authenticated` อัตโนมัติแบบรุ่นเก่า
  **RLS คุม "เห็นแถวไหน" · GRANT คุม "แตะตารางได้ไหม"** ขาดตัวใดตัวหนึ่งก็ใช้ไม่ได้
  ถ้าไม่เจอตรงนี้ อาการที่จะเกิดคือ step 1.2 ล็อกอินผ่านแต่หน้าจอว่างเปล่า
- `710d297` เพิ่มทีม GOV.3 รวมเป็น 5 ทีม
- `df90cbb` + `5b6cb99` + `22362dd` สร้าง `db/check.sql` สคริปต์ตรวจสุขภาพระบบ (เปลี่ยนเป็น ASCII ล้วนกันปัญหา encoding)

**ไฟล์:** `db/policies.sql` · `db/check.sql` · `db/seed.sql` · `CLAUDE.md` · `PROGRESS.md`

---

## 2026-07-21 07:00 · `bb8b896` · 0.2 เสร็จ — ใส่ค่า Supabase ใน config.js
**step:** 0.2 | **ประเภท:** ตั้งค่า (ปิด step)
- project `Sales TE` (Singapore) · ใส่ URL + anon key (key สาธารณะ ใส่ใน public repo ได้)
- `DATA_MODE: 'supabase'`

**ไฟล์:** `config.js` · `README.md` · `PROGRESS.md`

---

## 2026-07-20 21:46 · `1d60892` · 1.1 — schema + RLS + seed (B1, B2)
**step:** 1.1 | **ประเภท:** ฟีเจอร์ (backend)
- `schema.sql` — `teams` `profiles` `pending_projects` `follow_logs` `project_contacts`
  ครบ 37 ช่องที่ prototype v3 บันทึก · ใส่ `is_active`/`archived_at` ไว้ตั้งแต่แรก → **step 2.5 ไม่ต้อง migration**
- `policies.sql` — RLS ครบ 5 ตาราง · `is_admin()`/`my_team_id()` เป็น SECURITY DEFINER
  (ถ้าไม่ใส่ policy ของ `profiles` จะวนไม่รู้จบ) · trigger กัน sale ตั้ง `role='admin'` ให้ตัวเอง
- `seed.sql` — 5 ทีม + คำสั่งตั้ง admin คนแรก

**ไฟล์:** `db/schema.sql` (+222) · `db/policies.sql` (+214) · `db/seed.sql` · `CLAUDE.md` · `PROGRESS.md` · `README.md`
**ทดสอบ:** ยังไม่รัน — รันจริงบน Supabase วันถัดมา (ผลตรวจ: RLS 5 ตาราง · 15 policy · anon แตะได้ 0)

---

## 2026-07-20 21:06 · `f91ce78` · Sync requirement v2
**step:** — | **ประเภท:** เอกสาร (สเปคเปลี่ยน)
- เพิ่ม AI Intake (F10) · Archive แสดง/ซ่อนงานจบแล้ว (2.5) · แถบ Supplier (F9/B7) → roadmap 18 → 20 step
- `CLAUDE.md` เข้า repo (เดิมไฟล์หายไป README ลิงก์ไปหาไม่เจอ)
- `_local/` เก็บ prototype v3 ไว้อ้างอิง — **gitignore แล้ว ห้าม commit** (มีข้อมูลลูกค้าจริง 90 ราย + อีเมล 102 + เบอร์มือถือ/ที่อยู่บ้าน)

**ไฟล์:** `CLAUDE.md` (ใหม่ +118) · `plan/te-sales-dashboard-build-plan.html` (+771) · `plan/form-book3-si-fields.md` · `ai-intake.js` · `suppliers.js` · `app.js` · `.gitignore`

---

## 2026-07-20 07:45 · `f9a8825` · Initial commit — โครงโปรเจกต์
**step:** 0.1 | **ประเภท:** ตั้งต้น
- โครง `docs/` ครบตามแผน (shell + css + adapter 3 ไฟล์ + module + PWA) · `db/` 4 ไฟล์ SQL เปล่า · `tools/import-json.html`
- `docs/.nojekyll` เพื่อให้ GitHub Pages ไม่กรองไฟล์ที่ขึ้นต้นด้วย `_`
- `.gitignore` กัน key/ข้อมูลลูกค้าหลุดขึ้น public repo

**ไฟล์:** 25 ไฟล์ · 894 บรรทัด
**ทดสอบ:** เปิดเว็บด้วย headless Chrome — โหลดผ่าน ไม่มี JS error
**ค้าง:** `manifest.json` ชี้ไป `icons/icon-192.png` / `icon-512.png` ที่ยังไม่มีไฟล์ → PWA warning (แก้ใน step 3.3)
