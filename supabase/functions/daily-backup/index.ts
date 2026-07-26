// Supabase Edge Function — daily-backup (task 5 · สำรองขึ้น Google Drive อัตโนมัติ)
//
// หน้าที่: ดึงทุกตารางด้วย service_role (ข้าม RLS) → ประกอบไฟล์ backup รูปแบบเดียวกับ
//          ปุ่ม Export (te-sales-dashboard-backup) → อัปขึ้น Google Drive ด้วย service account
//          → บันทึกผลลง backup_log ให้หน้า Admin โชว์สถานะ/กำหนดครั้งถัดไป
//
// เรียกได้ 2 ทาง:
//   1) pg_cron รายวัน  — ส่ง header  x-backup-secret: <BACKUP_CRON_SECRET>
//   2) ปุ่ม "สำรองเดี๋ยวนี้" ในหน้า Admin — ส่ง Authorization: Bearer <user jwt> (ตรวจว่าเป็น admin)
//
// 🔒 ห้ามฝัง key/secret ในไฟล์นี้ — อ่านจาก Deno.env เท่านั้น
//    service_role key = Supabase ใส่ให้อัตโนมัติ · ส่วน Google + secret ตั้งด้วย `supabase secrets set`
//
// deploy + ตั้งค่า: ดู README.md ในโฟลเดอร์นี้

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-backup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SUPA_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON         = Deno.env.get("SUPABASE_ANON_KEY")!;
const SA_EMAIL     = Deno.env.get("GOOGLE_SA_EMAIL") || "";
const SA_KEY       = Deno.env.get("GOOGLE_SA_PRIVATE_KEY") || "";
const FOLDER       = Deno.env.get("GDRIVE_FOLDER_ID") || "";
const CRON_SECRET  = Deno.env.get("BACKUP_CRON_SECRET") || "";

// ทุกตารางที่ดึงลง backup — ตรงกับ BACKUP_TABLES ใน supabase-adapter.js + เพิ่มตารางใหม่ (sale_targets/news_reports)
// รูปแบบไฟล์ต้อง restore กลับได้ด้วย docs/tools/import-json.html (ข้าม profiles/team_access/signoffs ตอนกู้)
const BACKUP_TABLES = [
  "teams", "profiles", "team_access", "team_targets", "sale_targets",
  "pending_projects", "follow_logs", "project_contacts", "pending_products",
  "customers", "customer_logs", "activities",
  "lead_sources", "expo_customers", "signoffs", "intake_items", "news_reports", "app_settings",
];

const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

// ── ตรวจว่าเป็น admin จริง (สำหรับปุ่ม manual) ──
async function isAdmin(auth: string | null): Promise<boolean> {
  if (!auth) return false;
  try {
    const u = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: ANON } });
    if (!u.ok) return false;
    const uid = (await u.json())?.id;
    if (!uid) return false;
    const pr = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${uid}&select=role`, { headers: svc });
    const rows = await pr.json();
    return rows?.[0]?.role === "admin";
  } catch { return false; }
}

// ── ดึงทุกตารางด้วย service_role (ข้าม RLS) ──
async function dumpAll(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/${t}?select=*&limit=100000`, { headers: svc });
      out[t] = r.ok ? await r.json() : [];
    } catch { out[t] = []; }
  }
  return out;
}

// ── Google service account → access token (RS256 JWT → OAuth2) ──
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}
async function googleToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: SA_EMAIL,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })}`;
  const key = await importKey(SA_KEY);
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token failed: " + JSON.stringify(data));
  return data.access_token;
}

// ── อัปไฟล์ขึ้น Drive (multipart) เข้าโฟลเดอร์ที่แชร์ให้ service account ──
async function uploadToDrive(token: string, name: string, content: string) {
  const boundary = "te-" + crypto.randomUUID();
  const meta: Record<string, unknown> = { name, mimeType: "application/json" };
  if (FOLDER) meta.parents = [FOLDER];
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n` +
    `--${boundary}--`;
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body },
  );
  const data = await res.json();
  if (!res.ok) throw new Error("Drive upload failed: " + JSON.stringify(data));
  return data as { id: string; name: string; webViewLink?: string };
}

async function logBackup(row: Record<string, unknown>) {
  await fetch(`${SUPA_URL}/rest/v1/backup_log`, {
    method: "POST",
    headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  }).catch(() => {});
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "ใช้ POST เท่านั้น" }, 405);

  const viaCron = !!CRON_SECRET && req.headers.get("x-backup-secret") === CRON_SECRET;
  const triggered_by = viaCron ? "cron" : "manual";
  if (!viaCron && !(await isAdmin(req.headers.get("authorization")))) {
    return json({ error: "ต้องเป็นผู้ดูแลระบบ (หรือ cron ที่ตั้ง secret ถูกต้อง)" }, 401);
  }
  if (!SA_EMAIL || !SA_KEY) {
    return json({ error: "ยังไม่ได้ตั้ง GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY (ดู README)" }, 500);
  }

  try {
    const tables = await dumpAll();
    const content = JSON.stringify({
      _format: "te-sales-dashboard-backup", _version: 1,
      exported_at: new Date().toISOString(), tables,
    });
    // ชื่อไฟล์ตามวันไทย (UTC+7) ให้ตรงกับ te-backup-YYYY-MM-DD.json ของปุ่ม Export
    const day = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const name = `te-backup-${day}.json`;
    const token = await googleToken();
    const file = await uploadToDrive(token, name, content);
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(tables)) counts[k] = Array.isArray(v) ? v.length : 0;
    await logBackup({
      file_name: name, drive_file_id: file.id, drive_view_url: file.webViewLink || null,
      size_bytes: content.length, table_counts: counts, status: "ok", triggered_by,
    });
    return json({ ok: true, file: file.id, name, view: file.webViewLink || null, counts });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    await logBackup({ status: "error", error: msg, triggered_by });
    return json({ ok: false, error: msg }, 500);
  }
});
