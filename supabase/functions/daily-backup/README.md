# daily-backup — สำรองฐานข้อมูลขึ้น Google Drive อัตโนมัติทุกวัน (task 5)

ดึงทุกตารางด้วย `service_role` (ข้าม RLS) → ประกอบไฟล์ `te-backup-YYYY-MM-DD.json`
(รูปแบบเดียวกับปุ่มดาวน์โหลด · กู้คืนได้ที่ `docs/tools/import-json.html`) →
อัปขึ้น **Google Drive** ด้วย **service account** → บันทึกผลลงตาราง `backup_log`
(หน้า Admin โชว์สถานะ/กำหนดครั้งถัดไป + ปุ่ม "สำรองเดี๋ยวนี้")

> 🔒 คีย์ทั้งหมดอยู่ใน Supabase secrets ฝั่งเซิร์ฟเวอร์ — **ไม่มีอยู่ใน repo (public)**

---

## ตั้งค่าครั้งเดียว (ทำตามลำดับ)

### 1) สร้าง Google service account + เปิด Drive API
1. เข้า <https://console.cloud.google.com> → สร้าง/เลือก Project
2. **APIs & Services → Library →** เปิด **Google Drive API**
3. **APIs & Services → Credentials → Create credentials → Service account** → ตั้งชื่อ → Done
4. คลิก service account ที่สร้าง → แท็บ **Keys → Add key → Create new key → JSON** → ได้ไฟล์ JSON
   (มี `client_email` และ `private_key` — ใช้ 2 ค่านี้)

### 2) สร้างโฟลเดอร์ปลายทางใน Google Drive แล้วแชร์ให้ service account
1. สร้างโฟลเดอร์ใน Google Drive (เช่น `TE Backups`)
2. คลิกขวา → **Share** → ใส่อีเมล `client_email` ของ service account → สิทธิ์ **Editor**
3. คัดลอก **Folder ID** จาก URL: `https://drive.google.com/drive/folders/`**`<FOLDER_ID>`**

> ⚠️ Gmail ส่วนตัว (ไม่ใช่ Google Workspace): ไฟล์ที่ service account อัปจะ "เป็นของ" service account
> ไฟล์ JSON เล็กมาก (ไม่กี่ MB) จึงใช้ได้นานหลายปี — แต่ถ้าเจอ error โควตา ให้ใช้ **Shared Drive**
> (ต้องมี Workspace) แล้วเอา Folder ID ของ Shared Drive มาใส่แทน

### 3) ตั้ง secrets ใน Supabase
```bash
supabase secrets set GOOGLE_SA_EMAIL="xxx@yyy.iam.gserviceaccount.com"
supabase secrets set GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...หลายบรรทัด...
-----END PRIVATE KEY-----"
supabase secrets set GDRIVE_FOLDER_ID="<FOLDER_ID>"
supabase secrets set BACKUP_CRON_SECRET="<สุ่มข้อความยาว ๆ เก็บไว้ใช้ตอนตั้ง cron>"
```
(`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase ใส่ให้อัตโนมัติ ไม่ต้องตั้ง)

### 4) deploy Edge Function
```bash
supabase functions deploy daily-backup --no-verify-jwt
```
(`--no-verify-jwt` ให้ CORS/preflight ผ่าน → ฟังก์ชันตรวจสิทธิ์เอง: admin JWT หรือ cron secret)

### 5) สร้างตาราง backup_log
รัน `db/phase3-15.sql` ใน Supabase → SQL Editor

### 6) ตั้งเวลาอัตโนมัติ (pg_cron)
1. เปิด extension: Supabase → Database → Extensions → เปิด **pg_cron** และ **pg_net**
2. รัน SQL (แก้ `<PROJECT_REF>` + `<BACKUP_CRON_SECRET>` ให้ตรง) — เทมเพลตอยู่ท้าย `db/phase3-15.sql`
   ค่าเริ่มต้น `0 19 * * *` (UTC) = **ตี 2 ทุกวัน (เวลาไทย)**

---

## ทดสอบ
- หน้า **ตั้งค่าระบบ → ☁️ สำรองขึ้น Google Drive → "สำรองขึ้น Drive เดี๋ยวนี้"**
  ควรได้ไฟล์ใหม่ในโฟลเดอร์ Drive + แถวใหม่ในรายการด้านล่าง
- ถ้าพลาด: ข้อความ error จะบอกสาเหตุ (เช่น ยังไม่ deploy / secrets ไม่ครบ / โควตา Drive)

## เรียกเอง (debug)
```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-backup' \
  -H 'x-backup-secret: <BACKUP_CRON_SECRET>' -H 'Content-Type: application/json' -d '{}'
```

## หมายเหตุ
- ไม่ deploy ก็ไม่พัง — หน้า Admin โชว์ "ยังไม่มีประวัติ" และปุ่มจะแจ้งว่ายังไม่ได้ deploy
- รูปแบบไฟล์ = `te-sales-dashboard-backup` v1 (เหมือนปุ่ม Export) → กู้คืนที่ `docs/tools/import-json.html` ได้ทันที
