// F10 — AI Intake · Phase 3.5
//
// ไม่ใช่หน้าใน router — เป็น modal ที่แถบ Pending และ Book 3 สี เรียกผ่านปุ่ม 🤖 AI Import
//
// วิธีทำงาน (3.5 = คัดลอกคำสั่งไปวางใน Claude เอง ฟรี ไม่มีค่า API · 3.8 จะเปลี่ยนเป็น Edge Function):
//   1. เลือกแหล่ง (นามบัตร / ฟอร์มกระดาษ / ข้อความที่คัดลอก / ข้อความจากเสียงพูด)
//      ← ตัด Obsidian/Notion ออกแล้ว (24 ก.ค. 2569) · เพิ่มข้อความคัดลอก/เสียงพูด (25 ก.ค. 2569)
//   2. ก๊อปคำสั่งสำเร็จรูป → วางใน Claude พร้อมรูป/โน้ต → Claude คืน JSON
//   3. วาง JSON กลับมา → ระบบพักไว้ใน staging (intake_items) ก่อนเสมอ
//   4. ตรวจ/แก้ (ไฮไลต์เหลืองเฉพาะช่องที่ AI ไม่มั่นใจ) + เช็กว่าซ้ำกับของเดิมไหม
//      → กด "บันทึกเข้าระบบ" จึงเขียนเข้าตารางจริง (ผ่าน savePending/saveCustomer + RLS ปกติ)
//
// ⭐ ข้อมูลลง staging ก่อนเสมอ ห้ามเขียนเข้าตารางจริงตรง ๆ —
//    ถ่ายรูปหน้างานด้วยมือถือ แต่มานั่งตรวจแก้บนคอมที่ออฟฟิศ ต้องข้ามเครื่องได้ + มีหลักฐานว่าใครอนุมัติ

import { adapter } from '../data/adapter.js';

export const SOURCES = ['namecard', 'form', 'text', 'voice'];

// ══════════════════════════════════════════════════════════
// BYO API key (ทางเลือก) — เจ้าของขอ "เชื่อม API key ให้ AI เป็นสมองกรอกฟอร์ม" (24 ก.ค. 2569)
//
// 🔒 กติกาความปลอดภัย (สำคัญมาก):
//   • เป็น key ของ "ผู้ใช้เอง" (OpenRouter · แต่ละคนหามาเอง) เก็บใน localStorage "เครื่องนี้เท่านั้น"
//   • ไม่เคยเขียนลง repo / ไม่ส่งเข้า Supabase / ยิงตรงหา OpenRouter เท่านั้น
//     (CLAUDE.md ห้าม hardcode key ใน repo — ข้อนี้ไม่ละเมิด เพราะ key ไม่อยู่ในโค้ด · [[byo-api-key-decision]])
//   • ไม่ตั้ง key → fallback ไปใช้ Edge Function (adapter.aiExtract) เหมือนเดิม (key อยู่ฝั่งเซิร์ฟเวอร์)
//   • เตือนผู้ใช้ในหน้าจอ: อย่าใส่บนเครื่องสาธารณะ/เครื่องที่ใช้ร่วมกัน · เลือก model ได้ (dropdown)
// ══════════════════════════════════════════════════════════

const AI_KEY_LS   = 'te-dashboard:openrouter-key';
const AI_MODEL_LS = 'te-dashboard:openrouter-model';
const AI_MODE_LS  = 'te-dashboard:ai-mode';   // 'free' (ก๊อปวางเอง) | 'api' (ใช้ key อัตโนมัติ)

// โมเดลแนะนำ (ทั้งหมดรองรับอ่านรูป vision · เป็น model id ของ OpenRouter) — ผู้ใช้เลือกจาก dropdown
// ⭐ GPT-4o อยู่บนสุด = ตัวที่ "ทดสอบแล้วใช้ได้จริง" → เป็นค่าเริ่มต้น กันเจอรุ่นที่ผู้ให้บริการปิด/ไม่รองรับ
// (บางรุ่นบน OpenRouter อาจถูกปิดชั่วคราว/ไม่รับรูป → ให้ผู้ใช้สลับได้หลากหลาย ตามที่เจ้าของขอ)
export const AI_MODELS = [
  { id: 'openai/gpt-4o',                    label: 'OpenAI · GPT-4o — ✅ ทดสอบแล้วใช้ได้ (แนะนำ)' },
  { id: 'openai/gpt-4o-mini',               label: 'OpenAI · GPT-4o mini — เร็ว/ถูกกว่า' },
  { id: 'openai/gpt-4.1',                   label: 'OpenAI · GPT-4.1' },
  { id: 'anthropic/claude-3.5-sonnet',      label: 'Anthropic · Claude 3.5 Sonnet — อ่านลายมือไทยแม่น' },
  { id: 'anthropic/claude-3.7-sonnet',      label: 'Anthropic · Claude 3.7 Sonnet' },
  { id: 'google/gemini-2.0-flash-001',      label: 'Google · Gemini 2.0 Flash — เร็ว/ถูก' },
  { id: 'google/gemini-2.5-flash',          label: 'Google · Gemini 2.5 Flash' },
  { id: 'google/gemini-2.0-flash-lite-001', label: 'Google · Gemini 2.0 Flash Lite — ถูกสุด' },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct', label: 'Meta · Llama 3.2 90B Vision' },
];
const AI_MODEL_IDS = new Set(AI_MODELS.map(m => m.id));
const DEFAULT_MODEL = AI_MODELS[0].id;

export const aiKey = {
  get:      () => { try { return localStorage.getItem(AI_KEY_LS) || ''; } catch { return ''; } },
  // ⭐ คืน true/false ว่าบันทึกสำเร็จจริงไหม — localStorage ใน Safari โหมดส่วนตัว/incognito จะ throw
  //    ถ้ากลืน error เงียบ ๆ ผู้ใช้จะเห็น "เหมือนไม่ยอมเซฟ" โดยไม่รู้สาเหตุ → ต้องบอกให้ชัด
  set:      (v) => {
    const val = String(v || '').trim();
    try {
      localStorage.setItem(AI_KEY_LS, val);
      return localStorage.getItem(AI_KEY_LS) === val;   // ยืนยันว่าเขียนติดจริง
    } catch { return false; }
  },
  clear:    () => { try { localStorage.removeItem(AI_KEY_LS); } catch {} },
  has:      () => !!aiKey.get(),
  model:    () => { try { const m = localStorage.getItem(AI_MODEL_LS); return AI_MODEL_IDS.has(m) ? m : DEFAULT_MODEL; } catch { return DEFAULT_MODEL; } },
  setModel: (m) => { try { if (AI_MODEL_IDS.has(m)) localStorage.setItem(AI_MODEL_LS, m); } catch {} },
};

/** ปิดบัง key ให้เหลือหัว-ท้ายพอให้ผู้ใช้รู้ว่าเก็บอันไหนไว้ (ไม่โชว์ทั้งเส้น) */
const maskKey = (k) => {
  k = String(k || '');
  return k.length <= 12 ? k : `${k.slice(0, 8)}…${k.slice(-4)}`;
};

/** ยิงตรงหา OpenRouter (OpenAI-compatible) ด้วย key ของผู้ใช้ · payload {prompt, image?, text?} → { text } */
async function callOpenRouter(key, model, payload) {
  const content = [{ type: 'text', text: payload.prompt || '' }];
  if (payload.text) content.push({ type: 'text', text: String(payload.text) });
  if (payload.image)
    content.push({ type: 'image_url', image_url: {
      url: `data:${payload.image.media_type};base64,${payload.image.data}` } });

  let res, data;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,   // OpenRouter แนะนำให้ใส่ (ระบุที่มา)
        'X-Title': 'TE Sales Dashboard',
      },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content }] }),
    });
    data = await res.json().catch(() => null);
  } catch {
    throw new Error('เรียก AI ไม่สำเร็จ — ตรวจอินเทอร์เน็ต / API key');
  }
  if (res.status === 401) throw new Error('API key ไม่ถูกต้องหรือหมดสิทธิ์ — ตรวจ OpenRouter key');
  if (!res.ok) throw new Error(data?.error?.message || `AI ตอบ error (${res.status})`);
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('AI ไม่ได้ส่งข้อความกลับมา');
  return { text };
}

/** เรียก AI: มี key ของผู้ใช้ → OpenRouter · ไม่มี → Edge Function (adapter) */
async function aiExtract(payload) {
  const key = aiKey.get();
  return key ? callOpenRouter(key, aiKey.model(), payload) : adapter.aiExtract(payload);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const hasVal = (v) => v != null && String(v).trim() !== '';
const normDigits = (s) => String(s || '').replace(/\D/g, '');

// ── ค่าที่ DB ยอมรับ (ต้องตรงกับ check constraint · ยกมาไว้ที่นี่กัน import วนกับ pending/book3) ──
const STAGE_OPTS = [
  ['lead', 'Lead ใหม่'], ['qualify', 'คัดกรอง/สำรวจ'], ['present', 'นำเสนอ/ออกแบบ'],
  ['quote', 'เสนอราคา/ยื่นประมูล'], ['nego', 'ต่อรอง/รอผล'], ['won', 'ปิดได้'], ['lost', 'แพ้/ยกเลิก'],
];
const COLOR_OPTS = [['green', '🟢 สนิท/ซื้อประจำ'], ['yellow', '🟡 มีโอกาส'], ['red', '🔴 เพิ่งเริ่ม']];
const STAGE_IDS = STAGE_OPTS.map(s => s[0]);
const COLOR_IDS = COLOR_OPTS.map(c => c[0]);

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE  = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * แปลงปี พ.ศ. → ค.ศ. ให้อัตโนมัติ + ทิ้งถ้าปียังเพี้ยน
 *
 * ⚠️ กับดักที่ CLAUDE.md เตือน: regex `\d{4}-\d{2}` ปล่อยปี พ.ศ. (2569) ผ่านหมด
 *    แม้แต่ check constraint ของ DB ก็ผ่าน — เก็บ 2569 เข้าไปแล้วเรียงเดือนพังทั้งระบบ
 *    AI อ่านฟอร์มไทยมักได้ปี พ.ศ. → ต้องดักแปลงตรงนี้ก่อนบันทึกจริง
 *    (ช่วง 2400–2600 เป็นปี ค.ศ. ที่เป็นไปไม่ได้ในบริบทนี้ = พ.ศ. แน่ ๆ → ลบ 543)
 */
function fixYearYM(v) {
  const m = MONTH_RE.exec(String(v || ''));
  if (!m) return null;
  let y = Number(m[1]);
  if (y >= 2400 && y <= 2600) y -= 543;          // พ.ศ. → ค.ศ.
  if (y < 2000 || y > 2100) return null;         // ยังเพี้ยน = ทิ้ง ให้คนกรอกเอง
  return `${y}-${m[2]}`;
}
function fixYearDate(v) {
  const m = DATE_RE.exec(String(v || ''));
  if (!m) return null;
  let y = Number(m[1]);
  if (y >= 2400 && y <= 2600) y -= 543;
  if (y < 1900 || y > 2100) return null;
  return `${y}-${m[2]}-${m[3]}`;
}

// ── ช่องข้อมูลของแต่ละปลายทาง — [key, label, type] ── (type: text|number|area|color|stage)
const FIELDS = {
  customer: [
    ['name',          'ชื่อ-สกุล',              'text'],
    ['nickname',      'ชื่อเล่น',                'text'],
    ['position',      'ตำแหน่ง',                 'text'],
    ['org',           'หน่วยงาน / บริษัท',        'text'],
    ['tel',           'โทรศัพท์',                'text'],
    ['email',         'อีเมล',                   'text'],
    ['birthday',      'วันเกิด (YYYY-MM-DD)',     'text'],
    ['color',         'สีความสัมพันธ์',           'color'],
    ['addr_office',   'ที่อยู่ (ที่ทำงาน)',        'area'],
    ['addr_home',     'ที่อยู่ (บ้าน)',           'area'],
    ['addr_hometown', 'ภูมิลำเนา',               'area'],
    ['education',     'การศึกษา',                'area'],
    ['family',        'ครอบครัว',                'area'],
    ['hobby',         'งานอดิเรก',               'text'],
    ['favorite',      'ของชอบ',                  'text'],
  ],
  pending: [
    ['project_name',     'ชื่องาน/โครงการ',        'text'],
    ['pending_no',       'PENDING NO.',            'text'],
    ['customer_name',    'ลูกค้า / หน่วยงาน',       'text'],
    ['site',             'SITE (สถานที่)',          'text'],
    ['value_baht',       'มูลค่างาน (บาท)',         'number'],
    ['close_month',      'เดือนคาดปิด (YYYY-MM)',    'text'],
    ['quotation_no',     'QUOTATION NO',           'text'],
    ['project_detail',   'รายละเอียดโครงการ',       'area'],
    ['project_owner',    'OWNER',                  'text'],
    ['contractor',       'CONTRACTOR',             'text'],
    ['designer',         'DESIGNER',               'text'],
    ['consultant',       'CONSULT',                'text'],
    ['competitors',      'คู่แข่ง / ความเสี่ยง',     'area'],
    ['customer_needs',   'ความต้องการลูกค้า',       'area'],
    ['our_strengths',    'จุดแข็งของเรา',           'area'],
    ['win_plan',         'Win plan',               'area'],
    ['stage',            'ขั้นตอนงานขาย',           'stage'],
    ['lead_source',      'แหล่งที่มา',              'text'],
    ['next_action',      'Next action ถัดไป',       'text'],
    ['contact_name',     'ผู้ติดต่อ 1 — ชื่อ',       'text'],
    ['contact_position', 'ผู้ติดต่อ 1 — ตำแหน่ง',    'text'],
    ['contact_phone',    'ผู้ติดต่อ 1 — โทร',        'text'],
    ['contact_email',    'ผู้ติดต่อ 1 — อีเมล',      'text'],
  ],
};
const REQUIRED = { customer: 'name', pending: 'project_name' };
const DEST_LABEL = { customer: 'ลูกค้าใน Book 3 สี', pending: 'งานใน Pending Project' };
const SOURCE_LABEL = {
  namecard: '📇 รูปนามบัตร', form: '📄 ฟอร์มกระดาษ / ลายมือ',
  text: '📋 ข้อความที่คัดลอก', voice: '🎤 ข้อความจากเสียงพูด',
};
// แหล่งที่เหมาะกับแต่ละปลายทาง — รูปเฉพาะทาง (ฟอร์ม → Pending · นามบัตร → ลูกค้า)
// + "ข้อความที่คัดลอก / ข้อความจากเสียงพูด" ใช้ได้ทั้งสองปลายทาง (เจ้าของขอ 25 ก.ค. 2569)
// (ตัด Obsidian / Notion ออกตามคำสั่งเจ้าของ 24 ก.ค. 2569)
const SOURCES_FOR = {
  customer: ['namecard', 'text', 'voice'],
  pending:  ['form', 'text', 'voice'],
};

// ══════════════════════════════════════════════════════════
// คำสั่งสำเร็จรูปสำหรับวางใน Claude/Gemini/ChatGPT — สร้างจาก FIELDS ให้ตรงกันเสมอ
//
// ⭐ คำอธิบายรายช่อง (PROMPT_HINTS) — บอก AI ว่าแต่ละช่องควรใส่อะไร + ช่องไหน "สรุป/อนุมาน" ได้
//    ช่วยให้ AI กรอกได้กว้างขึ้น (จากโน้ตยาว ๆ สรุปลงหลายช่อง) ไม่ใช่ก๊อปเฉพาะคำที่เห็นตรง ๆ
// ══════════════════════════════════════════════════════════

const PROMPT_HINTS = {
  pending: {
    project_name:   'ชื่อโครงการ/งาน',
    pending_no:     'เลขที่อ้างอิงงาน (ถ้ามี)',
    customer_name:  'ชื่อลูกค้า/หน่วยงานเจ้าของงาน',
    site:           'สถานที่/พื้นที่ติดตั้งของโครงการ',
    value_baht:     'มูลค่างานโดยประมาณ — ตัวเลขล้วน ไม่มีคอมมา',
    close_month:    'เดือนที่คาดว่าจะปิดการขาย — รูปแบบ YYYY-MM',
    quotation_no:   'เลขที่ใบเสนอราคา (ถ้ามี)',
    project_detail: 'สรุปขอบเขต/รายละเอียดงาน — เรียบเรียงจากเนื้อหาได้',
    project_owner:  'เจ้าของโครงการ/ผู้มีอำนาจอนุมัติ',
    contractor:     'ผู้รับเหมา',
    designer:       'ผู้ออกแบบ',
    consultant:     'ที่ปรึกษา/ผู้ควบคุมงาน',
    competitors:    'คู่แข่ง หรือความเสี่ยงที่ถูกกล่าวถึง — สรุปได้',
    customer_needs: 'ความต้องการ/ปัญหาที่ลูกค้าอยากแก้ — สรุปจากบทสนทนา/โน้ต',
    our_strengths:  'จุดแข็ง/ข้อเสนอของเราที่ตรงกับความต้องการ — สรุปได้',
    win_plan:       'แผน/ขั้นตอนที่จะทำให้ชนะงาน — สรุปได้',
    stage:          'ขั้นตอนงานขายปัจจุบัน — เลือก lead/qualify/present/quote/nego/won/lost (อนุมานจากบริบท)',
    lead_source:    'แหล่งที่มาของงาน (เช่น e-GP, ลูกค้าแนะนำ, งานแสดงสินค้า)',
    next_action:    'สิ่งที่ต้องทำต่อ / นัดถัดไป — สรุปได้',
  },
  customer: {
    name:          'ชื่อ-สกุลผู้ติดต่อ',
    nickname:      'ชื่อเล่น',
    position:      'ตำแหน่งงาน',
    org:           'หน่วยงาน/บริษัทที่สังกัด',
    tel:           'เบอร์โทร',
    email:         'อีเมล',
    birthday:      'วันเกิด — รูปแบบ YYYY-MM-DD',
    color:         'ระดับความสัมพันธ์: green=สนิท/ซื้อประจำ · yellow=มีโอกาส · red=เพิ่งเริ่ม (อนุมานจากบริบท เดาไม่ได้ให้ข้าม)',
    addr_office:   'ที่อยู่ที่ทำงาน',
    addr_home:     'ที่อยู่บ้าน',
    addr_hometown: 'ภูมิลำเนา',
    education:     'ประวัติการศึกษา — สรุปจากบทสนทนาได้',
    family:        'ครอบครัว (คู่สมรส/บุตร/อื่น ๆ) — สรุปได้',
    hobby:         'งานอดิเรก',
    favorite:      'ของชอบ/สิ่งที่สนใจ',
  },
};

function promptFor(targetType, source) {
  const hints = PROMPT_HINTS[targetType] || {};
  const lines = FIELDS[targetType]
    .filter(([k]) => !k.startsWith('contact_'))
    .map(([k, label]) => `  "${k}": ${hints[k] || label}`);
  const contactLine = targetType === 'pending'
    ? '\n  ผู้ติดต่อหลัก: "contact_name" (ชื่อ), "contact_position" (ตำแหน่ง), "contact_phone" (โทร), "contact_email" (อีเมล)' : '';
  const srcHint = {
    namecard: 'ฉันจะแนบรูปนามบัตร',
    form:     'ฉันจะแนบรูปฟอร์มกระดาษ/ลายมือ',
    text:     'ฉันจะวางข้อความที่คัดลอกมา (เช่น จากแชท/ไลน์/อีเมล/โน้ต)',
    voice:    'ฉันจะวางข้อความที่ถอดจากเสียงพูด — อาจมีคำสะกดผิด เว้นวรรคเพี้ยน หรือเป็นภาษาพูดจากการถอดเสียง ช่วยตีความให้ด้วย',
    note:     'ฉันจะวางข้อความบันทึก/โน้ตยาว ๆ',
  }[source] || 'ฉันจะแนบข้อมูล';

  return `${srcHint} ช่วยอ่านทั้งหมดแล้ว "สรุป/เรียบเรียง" เป็นข้อมูล${DEST_LABEL[targetType]} ให้ครบที่สุดเท่าที่เนื้อหารองรับ
ตอบกลับเป็น JSON array อย่างเดียว ห้ามมีข้อความอื่นนอก JSON

รูปแบบแต่ละรายการ:
{ "fields": { …ค่าที่สรุปได้… }, "confidence": { "ชื่อคีย์": ความมั่นใจ 0-1 } }

คีย์ที่ใช้ได้ (พยายามกรอกให้ครบหลายช่องที่สุดเท่าที่เนื้อหารองรับ):
${lines.join('\n')}${contactLine}

หลักการกรอก:
• อ่านทั้งหมดแล้ว "สรุป/เรียบเรียง" ลงแต่ละช่อง ไม่ใช่ก๊อปเฉพาะคำที่เห็นตรง ๆ
  เช่น จากโน้ต/บทสนทนา ให้ถอดเป็น customer_needs, our_strengths, project_detail, next_action, competitors, win_plan ได้
• 🚫 ห้ามมั่วหรือแต่งข้อมูลที่ไม่มีในเนื้อหาเด็ดขาด — ช่องไหนไม่มีข้อมูลรองรับ ให้ "เว้นว่าง" ไม่ต้องใส่คีย์นั้น
• ช่องที่ได้จากการ "อนุมาน/สรุป" (ไม่ได้เขียนตรง ๆ) → ใส่ confidence ต่ำ (~0.4–0.6) ระบบจะไฮไลต์เหลืองให้คนตรวจ
  ส่วนช่องที่อ่านได้ตรง ๆ ใส่ confidence สูง (~0.9)
• ชื่อบริษัทเอกชนที่ให้มาไม่ครบรูป (ขาดคำว่า "บริษัท"/"จำกัด") ให้จัดเป็น "บริษัท … จำกัด"
  ⚠️ แต่หน่วยงานราชการ/รัฐ (เทศบาล, อบต., อบจ., กรม, สำนักงาน, โรงพยาบาล, โรงเรียน, มหาวิทยาลัย ฯลฯ) คงชื่อเดิม ห้ามเติม บริษัท/จำกัด
• คงภาษาไทยตามต้นฉบับ ห้ามแปลเป็นภาษาอื่น
• ถ้ามีหลายคน/หลายงานในเนื้อหาเดียว ให้แยกเป็นหลาย object ใน array เดียว`;
}

// ══════════════════════════════════════════════════════════
// แกะ JSON ที่วางกลับมา — ทนต่อ code fence / ข้อความห่อ / object แบน
// ══════════════════════════════════════════════════════════

function parsePasted(text) {
  let t = String(text || '').trim();
  if (!t) throw new Error('ยังไม่ได้วางผล JSON ที่ได้จาก Claude');

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  let data;
  try {
    data = JSON.parse(t);
  } catch {
    // Claude บางทีห่อ JSON ด้วยคำอธิบาย — คว้าก้อน [...] หรือ {...} ก้อนใหญ่สุด
    const arr = t.match(/\[[\s\S]*\]/);
    const obj = t.match(/\{[\s\S]*\}/);
    const cand = arr?.[0] || obj?.[0];
    if (!cand) throw new Error('อ่าน JSON ไม่ออก — คัดลอกเฉพาะส่วน JSON มาวางใหม่');
    data = JSON.parse(cand);   // ผิดอีกให้ error เด้งจริง
  }

  let list;
  if (Array.isArray(data))              list = data;
  else if (Array.isArray(data?.records)) list = data.records;
  else if (Array.isArray(data?.items))   list = data.items;
  else                                   list = [data];

  const out = list.map(normRecord).filter(r => Object.keys(r.fields).length);
  if (!out.length) throw new Error('ไม่พบข้อมูลใน JSON ที่วางมา');
  return out;
}

function normRecord(r) {
  if (r && typeof r === 'object' && (r.fields || r.confidence)) {
    return { fields: r.fields || {}, confidence: r.confidence || {} };
  }
  const { _confidence, confidence, ...rest } = r || {};
  return { fields: rest, confidence: _confidence || confidence || {} };
}

/** เก็บเฉพาะคีย์ที่รู้จัก + แปลง/ตรวจค่าที่มีเงื่อนไข (กัน DB ปฏิเสธ 23514) */
function buildPayload(targetType, fields) {
  const keys = FIELDS[targetType].map(f => f[0]);
  const out = {};
  for (const k of keys) {
    let v = fields[k];
    if (v == null) continue;
    if (typeof v === 'string') v = v.trim();
    if (v === '') continue;

    if (k === 'value_baht') {
      const n = Number(String(v).replace(/[,\s]/g, ''));
      if (Number.isFinite(n) && n >= 0) out[k] = n;
      continue;
    }
    if (k === 'close_month') { const f = fixYearYM(v);   if (f) out[k] = f; continue; }  // พ.ศ.→ค.ศ. · ผิด = ทิ้ง
    if (k === 'birthday')    { const f = fixYearDate(v); if (f) out[k] = f; continue; }
    if (k === 'color')       { out[k] = COLOR_IDS.includes(v) ? v : 'red';  continue; }
    if (k === 'stage')       { out[k] = STAGE_IDS.includes(v) ? v : 'lead';  continue; }
    out[k] = v;
  }
  return out;
}

// ══════════════════════════════════════════════════════════
// เช็กซ้ำกับของเดิม (dedup) — คืน { row, why } หรือ null
//
// ⚠️ เทียบกับ "รายชื่อทั้งชุด" ไม่ใช่ค้นด้วย search
//    เบอร์ที่เก็บมีขีด (081-234-5678) · เบอร์ที่ AI อ่านมาไม่มีขีด (0812345678)
//    ถ้าใช้ search แบบ ilike จะไม่เจอกัน → ต้องดึงมาเทียบ "เลขล้วน" ใน JS
//    (matchDuplicate เป็น pure function · caller เป็นคนดึง candidates แบบ cache)
// ══════════════════════════════════════════════════════════

function matchDuplicate(targetType, fields, candidates) {
  const all = candidates || [];
  if (targetType === 'customer') {
    const tel  = normDigits(fields.tel);
    const name = String(fields.name || '').trim();
    const org  = String(fields.org || '').trim();
    if (tel) {
      const hit = all.find(c => normDigits(c.tel) && normDigits(c.tel) === tel);
      if (hit) return { row: hit, why: 'เบอร์โทรตรงกัน' };
    }
    if (name) {
      const hit = all.find(c => String(c.name || '').trim() === name
                             && (!org || String(c.org || '').trim() === org));
      if (hit) return { row: hit, why: 'ชื่อ + หน่วยงานตรงกัน' };
    }
    return null;
  }
  const pno   = String(fields.pending_no || '').trim();
  const pname = String(fields.project_name || '').trim();
  const cname = String(fields.customer_name || '').trim();
  if (pno) {
    const hit = all.find(c => String(c.pending_no || '').trim() === pno);
    if (hit) return { row: hit, why: 'PENDING NO. ตรงกัน' };
  }
  if (pname) {
    const hit = all.find(c => String(c.project_name || '').trim() === pname
                           && (!cname || String(c.customer_name || '').trim() === cname));
    if (hit) return { row: hit, why: 'ชื่องาน + ลูกค้าตรงกัน' };
  }
  return null;
}

// ══════════════════════════════════════════════════════════
// อ่านรูป → base64 (ย่อก่อนส่ง กันไฟล์ใหญ่/เปลืองเน็ต · OCR ไม่ต้องความละเอียดเต็ม)
// คืน { media_type, data } พร้อมส่งเข้า Claude vision
// ══════════════════════════════════════════════════════════

function fileToImagePart(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) > MAX) { const s = MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/jpeg', 0.85);
      const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      if (!m) return reject(new Error('แปลงรูปไม่สำเร็จ'));
      resolve({ media_type: m[1], data: m[2] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดรูปไม่ได้ — ไฟล์อาจเสียหาย')); };
    img.src = url;
  });
}

// ══════════════════════════════════════════════════════════
// เปิด modal
// ══════════════════════════════════════════════════════════

/** targetType: 'customer' | 'pending' · opts.onSaved() = ให้แถบเบื้องหลัง reload หลังบันทึก */
export function openAIImport(targetType = 'customer', opts = {}) {
  if (!FIELDS[targetType]) targetType = 'customer';
  const onSaved = typeof opts.onSaved === 'function' ? opts.onSaved : () => {};

  document.getElementById('aiModal')?.remove();
  const host = document.createElement('div');
  host.className = 'modal';
  host.id = 'aiModal';
  document.body.appendChild(host);

  let source = SOURCES_FOR[targetType][0];
  const work = new Map();   // itemId → { fields } ฉบับที่กำลังแก้

  // แคชรายชื่อของเดิมไว้เทียบซ้ำ (ดึงครั้งเดียวใช้ทุกการ์ด) — ล้างทิ้งหลังบันทึกของใหม่
  let candCache = null;
  async function candidates() {
    if (candCache) return candCache;
    try {
      candCache = targetType === 'customer'
        ? await adapter.listCustomers({ status: 'all', limit: 2000 })
        : await adapter.listPending({ status: 'all', limit: 2000 });
    } catch { candCache = []; }
    return candCache;
  }

  host.innerHTML = `
    <form class="modal-box ai-box" id="aiForm" autocomplete="off">
      <div class="modal-head">
        <strong>🤖 AI Import — ${esc(DEST_LABEL[targetType])}</strong>
        <button type="button" class="btn btn-ghost btn-sm" id="aiClose">ปิด</button>
      </div>

      <div class="ai-tabs" role="tablist">
        <button type="button" class="ai-tab on" data-tab="new">นำเข้าใหม่</button>
        <button type="button" class="ai-tab" data-tab="stage">รายการรอตรวจ <span class="seg-badge" id="aiCount" hidden></span></button>
      </div>

      <div class="modal-body">
        <!-- ── นำเข้าใหม่ ── -->
        <section class="ai-pane" id="paneNew">
          <p class="ai-step">1 · เลือกแหล่งข้อมูล</p>
          <div class="ai-src" id="aiSrc">
            ${SOURCES_FOR[targetType].map(s =>
              `<button type="button" class="ai-srcbtn ${s === source ? 'on' : ''}" data-src="${s}">${esc(SOURCE_LABEL[s])}</button>`).join('')}
          </div>

          <p class="ai-step">2 · เลือกวิธีให้ AI อ่าน</p>
          <div class="segmented ai-modeseg" id="aiModeSeg" role="tablist" aria-label="วิธีให้ AI อ่าน">
            <button type="button" data-mode="free">📋 ก๊อปไปวางเอง — ฟรี</button>
            <button type="button" data-mode="api">🔑 ใช้ API key — อัตโนมัติ</button>
          </div>

          <!-- โหมดฟรี: ก๊อปคำสั่งไปวางใน Claude / Gemini / ChatGPT ของ user เอง -->
          <div class="ai-mode" id="aiModeFree">
            <p class="ai-hint2">ไม่ต้องตั้งค่าอะไร — ก๊อปคำสั่งด้านล่างไปวางใน <b>Claude / Gemini / ChatGPT</b> ของคุณ (แนบรูป/ข้อความไปด้วย) แล้วเอา JSON ที่ได้มาวางกลับ</p>
            <div class="ai-prompt-wrap">
              <textarea class="ai-prompt" id="aiPrompt" readonly rows="8"></textarea>
              <button type="button" class="btn btn-ghost btn-sm ai-copy" id="aiCopy">⧉ คัดลอกคำสั่ง</button>
            </div>
            <p class="ai-step">วางผล JSON ที่ AI ตอบกลับมา</p>
            <textarea class="ai-paste inp" id="aiPaste" rows="6"
                      placeholder='วางที่นี่ เช่น [{"fields":{"name":"…"},"confidence":{"name":0.9}}]'></textarea>
            <div class="lg-add-row">
              <button type="button" class="btn btn-primary" id="aiParse">ตรวจ + เพิ่มเข้ารายการรอตรวจ →</button>
              <span class="lg-hint">ข้อมูลจะพักในรายการรอตรวจก่อน ยังไม่เข้าระบบจนกว่าจะกดยืนยันทีละรายการ</span>
            </div>
          </div>

          <!-- โหมด API: แนบรูป/วางข้อความ → AI อ่านให้อัตโนมัติ (ต้องตั้ง key) -->
          <div class="ai-mode" id="aiModeApi" hidden>
            <div class="ai-auto" id="aiAutoRow">
              <div class="ai-auto-l">
                <strong>🧠 ให้ AI อ่าน & กรอกฟอร์มให้อัตโนมัติ</strong>
                <span>แนบรูป (นามบัตร/ฟอร์ม/ลายมือ) หรือวางข้อความบันทึกยาว ๆ ด้านล่าง → AI สรุปแล้วเลือกส่วนที่เกี่ยวข้องไปกรอกแต่ละช่อง แล้วพักในรายการรอตรวจให้ตรวจ/แก้ก่อนบันทึก (ต้องต่อเน็ต + ตั้ง API key ด้านล่าง)</span>
              </div>
              <label class="btn btn-primary ai-autobtn" id="aiImgBtn">
                📷 เลือกรูป
                <input type="file" id="aiImg" accept="image/*" hidden>
              </label>
            </div>

            <p class="ai-hint2" id="aiTextHint" hidden></p>
            <textarea class="ai-paste inp" id="aiNote" rows="5"
                      placeholder="…หรือวางข้อความบันทึกยาว ๆ ที่นี่ เช่น สรุปการประชุม / โน้ตจากการโทร / ข้อความแชท → AI จะเลือกเฉพาะส่วนที่เกี่ยวข้องไปกรอกแต่ละช่องให้"></textarea>
            <div class="lg-add-row">
              <button type="button" class="btn btn-primary" id="aiNoteBtn">🧠 ให้ AI อ่านข้อความนี้ →</button>
              <span class="lg-hint">AI กรอกลงฟอร์มในรายการรอตรวจ ให้คุณตรวจ/แก้ก่อนบันทึกจริง</span>
            </div>

            <details class="ai-keybox" id="aiKeyBox">
              <summary>🔑 OpenRouter API key ของคุณเอง <span class="ai-keystate" id="aiKeyState"></span></summary>
              <div class="ai-keybody">
                <p class="ai-keynote">🔒 เก็บบน<b>เครื่องนี้เท่านั้น</b> · ไม่ส่งเข้าระบบ ไม่ขึ้น repo · ยิงตรงหา OpenRouter เพื่อให้ AI อ่าน/สรุปแล้วกรอกฟอร์มให้ (ทั้ง Pending และ Book 3 สี) · แต่ละคนหา key มาเอง<br><b>⚠️ อย่าใส่บนเครื่องสาธารณะ/เครื่องที่ใช้ร่วมกัน</b></p>
                <p class="ai-keysaved" id="aiKeySaved" hidden></p>
                <div class="ai-keyrow">
                  <input type="password" class="inp" id="aiKeyInput" placeholder="sk-or-v1-…" autocomplete="off" autocapitalize="off" spellcheck="false">
                  <button type="button" class="btn btn-primary btn-sm" id="aiKeySave">บันทึก key</button>
                  <button type="button" class="btn btn-ghost btn-sm" id="aiKeyClear">ลบ key</button>
                </div>
                <label class="ai-modelrow"><span>โมเดล AI</span>
                  <select class="inp" id="aiModel">
                    ${AI_MODELS.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('')}
                  </select>
                </label>
                <p class="ai-modelnote">✅ ทดสอบแล้วใช้ได้จริง: <b>GPT-4o</b> · บางรุ่นผู้ให้บริการอาจปิดชั่วคราว/ไม่รองรับรูป — ถ้าเจอ error ให้สลับไปรุ่นอื่น</p>
                <a class="ai-keylink" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">ขอ API key ที่ openrouter.ai/keys →</a>
              </div>
            </details>
          </div>

          <p class="login-err" id="aiErr" role="alert" hidden></p>
        </section>

        <!-- ── รายการรอตรวจ (staging) ── -->
        <section class="ai-pane" id="paneStage" hidden>
          <div id="aiStageList"><div class="skeleton">กำลังโหลด…</div></div>
        </section>
      </div>

      <div class="modal-foot">
        <span class="ai-note">ช่อง <span class="ai-low-chip">ไฮไลต์เหลือง</span> = AI ไม่มั่นใจ ควรตรวจก่อนบันทึก</span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" id="aiDone">ปิดหน้าต่าง</button>
      </div>
    </form>`;

  const q = (s) => host.querySelector(s);
  const close = () => { host.remove(); };
  const setErr = (m) => { const e = q('#aiErr'); if (!m) { e.hidden = true; return; } e.textContent = m; e.hidden = false; };

  // แหล่งที่เป็น "ข้อความ" (คัดลอก/เสียงพูด) → ไม่มีรูปให้แนบ ใช้ช่องข้อความเป็นหลัก
  const isTextSrc = (s) => s === 'text' || s === 'voice';

  // อัปเดตทุกอย่างที่ผูกกับ "แหล่งข้อมูล": คำสั่ง (โหมดฟรี) + หน้าตาโหมด API
  const syncSource = () => {
    q('#aiPrompt').value = promptFor(targetType, source);      // คำสั่งเปลี่ยนตามแหล่งที่เลือก

    // โหมด API: แหล่งข้อความไม่ต้องแนบรูป → ซ่อนปุ่มเลือกรูป + ปรับ placeholder ช่องข้อความให้ตรงแหล่ง
    const auto = q('#aiAutoRow');
    if (auto) auto.hidden = isTextSrc(source);
    const note = q('#aiNote');
    if (note) note.placeholder = source === 'voice'
      ? 'วางข้อความที่ถอดจากเสียงพูดที่นี่ → AI จะตีความ (เผื่อคำสะกดผิด/ภาษาพูด) แล้วกรอกลงแต่ละช่องให้'
      : source === 'text'
        ? 'วางข้อความที่คัดลอกมาที่นี่ (แชท/ไลน์/อีเมล/โน้ต) → AI จะสรุปแล้วกรอกลงแต่ละช่องให้'
        : '…หรือวางข้อความบันทึกยาว ๆ ที่นี่ เช่น สรุปการประชุม / โน้ตจากการโทร / ข้อความแชท → AI จะเลือกเฉพาะส่วนที่เกี่ยวข้องไปกรอกแต่ละช่องให้';
    const hint = q('#aiTextHint');
    if (hint) {
      if (source === 'voice') {
        hint.innerHTML = '🎤 <b>พิมพ์ด้วยเสียงได้</b> — แตะไอคอนไมค์บนแป้นพิมพ์มือถือแล้วพูด ระบบจะถอดเป็นข้อความให้ จากนั้นค่อยให้ AI อ่าน';
        hint.hidden = false;
      } else hint.hidden = true;
    }
  };
  syncSource();

  // ── เลือกวิธี: ฟรี (ก๊อปวางเอง) หรือ API key (อัตโนมัติ) ── จำค่าไว้ · มี key อยู่แล้วเริ่มที่ API
  let aiMode = '';
  try { aiMode = localStorage.getItem(AI_MODE_LS) || ''; } catch {}
  if (aiMode !== 'api' && aiMode !== 'free') aiMode = aiKey.has() ? 'api' : 'free';
  const setMode = (m) => {
    aiMode = m;
    try { localStorage.setItem(AI_MODE_LS, m); } catch {}
    host.querySelectorAll('#aiModeSeg [data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    q('#aiModeApi').hidden  = m !== 'api';
    q('#aiModeFree').hidden = m !== 'free';
    setErr('');
  };
  host.querySelectorAll('#aiModeSeg [data-mode]').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode(aiMode);

  // ── BYO API key (เก็บ localStorage เครื่องนี้เท่านั้น) ──
  const syncKeyState = () => {
    const has = aiKey.has();
    const st = q('#aiKeyState');
    if (st) st.textContent = has ? '· ตั้งไว้แล้ว ✓' : '· ยังไม่ได้ตั้ง';
    // บรรทัดยืนยันชัด ๆ ว่าเก็บ key อันไหนไว้ (ค้างอยู่แม้เปิดใหม่ = พิสูจน์ว่าเซฟติดจริง)
    const saved = q('#aiKeySaved');
    if (saved) {
      if (has) { saved.innerHTML = `✅ บันทึก key ไว้แล้ว: <b>${esc(maskKey(aiKey.get()))}</b>`; saved.hidden = false; }
      else saved.hidden = true;
    }
    const clr = q('#aiKeyClear');
    if (clr) clr.disabled = !has;
  };
  syncKeyState();
  // มี key แล้ว → พับเก็บ · ยังไม่มี → กางไว้ให้เห็นช่องกรอกเลย (กันหาไม่เจอแล้วนึกว่าไม่มี)
  q('#aiKeyBox').open = !aiKey.has();
  q('#aiKeySave')?.addEventListener('click', () => {
    const v = q('#aiKeyInput').value.trim();
    if (!v) return setErr('ใส่ API key ก่อนบันทึก');
    if (!aiKey.set(v))
      return setErr('บันทึก key ไม่สำเร็จ — เบราว์เซอร์นี้อาจปิดที่เก็บข้อมูล (เช่นโหมดส่วนตัว/ไม่ระบุตัวตน) ลองปิดโหมดนั้นแล้วบันทึกใหม่');
    q('#aiKeyInput').value = '';
    syncKeyState();
    setErr('');
    const b = q('#aiKeySave'); const t = b.textContent;   // ยืนยันบนปุ่มให้เห็นชัด
    b.textContent = '✓ บันทึกแล้ว';
    setTimeout(() => { if (b.isConnected) b.textContent = t; }, 1600);
  });
  q('#aiKeyClear')?.addEventListener('click', () => { aiKey.clear(); q('#aiKeyInput').value = ''; syncKeyState(); setErr(''); });
  // เลือกโมเดล AI (จำใน localStorage)
  const modelSel = q('#aiModel');
  if (modelSel) {
    modelSel.value = aiKey.model();
    modelSel.addEventListener('change', () => aiKey.setModel(modelSel.value));
  }

  q('#aiClose').addEventListener('click', close);
  q('#aiDone').addEventListener('click', close);
  host.addEventListener('mousedown', (e) => { if (e.target === host) close(); });

  // เลือกแหล่ง → อัปเดตคำสั่ง
  q('#aiSrc').addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]');
    if (!b) return;
    source = b.dataset.src;
    host.querySelectorAll('#aiSrc [data-src]').forEach(x => x.classList.toggle('on', x === b));
    syncSource();
  });

  // คัดลอกคำสั่ง
  q('#aiCopy').addEventListener('click', async () => {
    const btn = q('#aiCopy');
    try {
      await navigator.clipboard.writeText(q('#aiPrompt').value);
    } catch {
      // เบราว์เซอร์เก่า/ไม่มีสิทธิ์ clipboard → เลือกข้อความให้กด Ctrl/⌘+C เอง
      q('#aiPrompt').focus(); q('#aiPrompt').select();
    }
    btn.textContent = '✓ คัดลอกแล้ว';
    setTimeout(() => { btn.textContent = '⧉ คัดลอกคำสั่ง'; }, 1500);
  });

  // ── สลับแท็บ ──
  function switchTab(tab) {
    host.querySelectorAll('.ai-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    q('#paneNew').hidden   = tab !== 'new';
    q('#paneStage').hidden = tab !== 'stage';
    if (tab === 'stage') loadStaging();
  }
  host.querySelectorAll('.ai-tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // พักผลลง staging แล้วเด้งไปแท็บรอตรวจ — ใช้ร่วมทั้งทางวางเอง (3.5) และ AI อ่านรูป (3.8)
  async function stageRecords(records, raw) {
    for (const r of records) {
      await adapter.saveIntake({
        source,
        target_type: targetType,
        parsed:     r.fields,
        confidence: r.confidence || {},
        raw_input:  String(raw || '').slice(0, 4000),
        status:     'draft',
      });
    }
    switchTab('stage');
  }

  // ── ตรวจ + เพิ่มเข้า staging (วาง JSON เอง · 3.5) ──
  q('#aiParse').addEventListener('click', async () => {
    setErr('');
    let records;
    try { records = parsePasted(q('#aiPaste').value); }
    catch (e) { return setErr(e.message); }

    const btn = q('#aiParse');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await stageRecords(records, q('#aiPaste').value);
      q('#aiPaste').value = '';
    } catch (e) {
      setErr(e.message);   // ตารางยังไม่ถูกสร้าง (ยังไม่รัน phase3-5.sql) จะเด้งตรงนี้
    } finally {
      btn.disabled = false; btn.textContent = 'ตรวจ + เพิ่มเข้ารายการรอตรวจ →';
    }
  });

  // ── AI อ่านข้อความยาว (วางโน้ต → สรุป → เลือกส่วนที่เกี่ยว → กรอกฟอร์ม) ──
  q('#aiNoteBtn')?.addEventListener('click', async () => {
    setErr('');
    const note = q('#aiNote').value.trim();
    if (!note) return setErr('วางข้อความก่อนให้ AI อ่าน');
    const btn = q('#aiNoteBtn');
    btn.disabled = true; const t0 = btn.textContent; btn.textContent = 'กำลังให้ AI อ่าน…';
    try {
      const res = await aiExtract({
        prompt: promptFor(targetType, isTextSrc(source) ? source : 'note'), text: note,
        source, target_type: targetType,
      });
      const records = parsePasted(res?.text || '');
      await stageRecords(records, note);       // → พักในรายการรอตรวจ (แก้ก่อนบันทึกจริง)
      q('#aiNote').value = '';
    } catch (e) {
      setErr(e.message);
    } finally {
      btn.disabled = false; btn.textContent = t0;
    }
  });

  // ── AI อ่านรูปอัตโนมัติ (Edge Function · 3.8 · หรือ OpenRouter ถ้าตั้ง key) ──
  q('#aiImg').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';                 // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    setErr('');
    const btn = q('#aiImgBtn');
    const label = btn.childNodes[0];
    btn.classList.add('is-loading');
    if (label) label.nodeValue = 'กำลังให้ AI อ่าน… ';
    try {
      const image = await fileToImagePart(file);
      const res = await aiExtract({
        prompt: promptFor(targetType, source),
        image, source, target_type: targetType,
      });
      const records = parsePasted(res?.text || '');
      await stageRecords(records, '[AI อ่านจากรูป]');
    } catch (e) {
      setErr(e.message);
    } finally {
      btn.classList.remove('is-loading');
      if (label) label.nodeValue = 'เลือกรูป';
    }
  });

  // ══════════════════════════════════════════════════════════
  // รายการรอตรวจ (staging)
  // ══════════════════════════════════════════════════════════

  async function refreshCount() {
    try {
      const list = await adapter.listIntake({ targetType, status: 'draft,approved', limit: 500 });
      const el = q('#aiCount');
      if (el) { el.textContent = list.length; el.hidden = list.length === 0; }
      return list;
    } catch { return null; }
  }

  async function loadStaging() {
    const box = q('#aiStageList');
    box.innerHTML = '<div class="skeleton">กำลังโหลด…</div>';
    let list;
    try {
      list = await adapter.listIntake({ targetType, status: 'draft,approved', limit: 500 });
    } catch (e) {
      const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(e.message);
      box.innerHTML = `<div class="empty"><strong>${missing ? 'ยังไม่ได้สร้างตาราง staging' : 'โหลดไม่สำเร็จ'}</strong>${
        missing ? 'เอาไฟล์ <code>db/phase3-5.sql</code> ไปรันใน Supabase → SQL Editor ก่อน' : esc(e.message)}</div>`;
      return;
    }
    const el = q('#aiCount');
    if (el) { el.textContent = list.length; el.hidden = list.length === 0; }

    if (!list.length) {
      box.innerHTML = `<div class="empty"><strong>ไม่มีรายการรอตรวจ</strong>
        ไปที่แท็บ "นำเข้าใหม่" เพื่อวางผล JSON จาก Claude</div>`;
      return;
    }

    box.innerHTML = list.map(cardHtml).join('');
    list.forEach(item => bindCard(box.querySelector(`[data-card="${item.id}"]`), item));
  }

  // ── การ์ด 1 รายการใน staging ──
  function cardHtml(item) {
    const fields = { ...(item.parsed || {}), ...(item.edited || {}) };
    work.set(item.id, { ...fields });
    const conf = item.confidence || {};
    const req  = REQUIRED[targetType];

    // แสดงเฉพาะช่องที่ AI กรอกมา + ช่องบังคับ (ให้การ์ดกระชับ ไม่ต้องเลื่อนผ่าน 23 ช่องว่าง)
    const shown = FIELDS[targetType].filter(([k]) => hasVal(fields[k]) || k === req);
    const hiddenCount = FIELDS[targetType].length - shown.length;

    return `
      <div class="ai-card" data-card="${esc(item.id)}">
        <div class="ai-card-head">
          <span class="ai-badge">${esc(SOURCE_LABEL[item.source] || item.source || '')}</span>
          <span class="ai-dup" data-dup></span>
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost btn-sm" data-act="reject" title="ทิ้งรายการนี้ ไม่เอาเข้าระบบ">🗑 ทิ้ง</button>
        </div>

        <div class="ai-fields">
          ${shown.map(f => fieldHtml(f, fields, conf)).join('')}
        </div>

        ${hiddenCount ? `<details class="ai-more">
          <summary>+ เพิ่มช่องอื่น (${hiddenCount})</summary>
          <div class="ai-fields">
            ${FIELDS[targetType].filter(([k]) => !hasVal(fields[k]) && k !== req).map(f => fieldHtml(f, fields, conf)).join('')}
          </div>
        </details>` : ''}

        <p class="login-err" data-cerr role="alert" hidden></p>
        <div class="ai-card-foot">
          <span class="ai-mergehint" data-mergehint></span>
          <span class="spacer"></span>
          <button type="button" class="btn btn-primary btn-sm" data-act="save">บันทึกเข้าระบบ</button>
        </div>
      </div>`;
  }

  function fieldHtml([key, label, type], fields, conf) {
    const v = fields[key] ?? '';
    const c = conf[key];
    const low = c != null && c < 0.8;
    const lowCls = low ? ' ai-low' : '';
    const lowTip = low ? ` title="AI มั่นใจ ${Math.round(c * 100)}% — ตรวจก่อนบันทึก"` : '';
    const reqMark = key === REQUIRED[targetType] ? ' *' : '';

    let control;
    if (type === 'area')
      control = `<textarea class="inp${lowCls}" data-f="${key}" rows="2"${lowTip}>${esc(v)}</textarea>`;
    else if (type === 'color')
      control = `<select class="inp${lowCls}" data-f="${key}"${lowTip}>
        ${COLOR_OPTS.map(([id, lb]) => `<option value="${id}" ${v === id ? 'selected' : ''}>${esc(lb)}</option>`).join('')}
      </select>`;
    else if (type === 'stage')
      control = `<select class="inp${lowCls}" data-f="${key}"${lowTip}>
        ${STAGE_OPTS.map(([id, lb]) => `<option value="${id}" ${v === id ? 'selected' : ''}>${esc(lb)}</option>`).join('')}
      </select>`;
    else
      control = `<input class="inp${lowCls}" data-f="${key}" type="${type === 'number' ? 'number' : 'text'}"
                   value="${esc(v)}"${type === 'number' ? ' min="0" step="1"' : ''}${lowTip}>`;

    return `<label class="ai-fld ${type === 'area' ? 'ai-wide' : ''}">
      <span>${esc(label)}${reqMark}${low ? ' <span class="ai-low-dot" title="AI ไม่มั่นใจ">●</span>' : ''}</span>
      ${control}
    </label>`;
  }

  function bindCard(card, item) {
    if (!card) return;
    const w = work.get(item.id);
    const cerr = (m) => { const e = card.querySelector('[data-cerr]'); if (!m) { e.hidden = true; return; } e.textContent = m; e.hidden = false; };
    let dup = null;          // { row, why } ถ้าเจอของซ้ำ
    let mergeMode = 'new';   // 'new' | 'update'

    // แก้ค่าในช่อง → เก็บลง working copy + ล้างไฮไลต์ (คนตรวจแล้ว)
    card.querySelectorAll('[data-f]').forEach(el => {
      el.addEventListener('input', () => {
        w[el.dataset.f] = el.value;
        el.classList.remove('ai-low');
        // แก้ช่องที่ใช้จับซ้ำ → ค้นซ้ำใหม่
        if (['tel', 'name', 'org', 'pending_no', 'project_name', 'customer_name'].includes(el.dataset.f)) {
          clearTimeout(el._t);
          el._t = setTimeout(runDedup, 500);
        }
      });
    });

    async function runDedup() {
      const box = card.querySelector('[data-dup]');
      const hint = card.querySelector('[data-mergehint]');
      dup = matchDuplicate(targetType, w, await candidates());
      if (!dup) {
        box.textContent = '';
        hint.innerHTML = 'จะบันทึกเป็น<b>รายการใหม่</b>';
        mergeMode = 'new';
        return;
      }
      const nm = targetType === 'customer'
        ? (dup.row.name || '') + (dup.row.org ? ' · ' + dup.row.org : '')
        : (dup.row.project_name || '') + (dup.row.pending_no ? ' · ' + dup.row.pending_no : '');
      box.innerHTML = `⚠️ คล้ายของเดิม (${esc(dup.why)})`;
      hint.innerHTML = `
        <span class="ai-merge-q">พบ: <b>${esc(nm)}</b></span>
        <label class="ai-radio"><input type="radio" name="mm-${esc(item.id)}" value="update" checked> อัปเดตทับของเดิม</label>
        <label class="ai-radio"><input type="radio" name="mm-${esc(item.id)}" value="new"> สร้างใหม่แยกอีกรายการ</label>`;
      mergeMode = 'update';
      hint.querySelectorAll(`input[name="mm-${item.id}"]`).forEach(r =>
        r.addEventListener('change', () => { mergeMode = r.value; }));
    }
    runDedup();

    // ทิ้งรายการ
    card.querySelector('[data-act="reject"]').addEventListener('click', async () => {
      try { await adapter.rejectIntake(item.id); } catch (e) { return cerr(e.message); }
      card.remove();
      await refreshCount();
      if (!host.querySelector('.ai-card')) loadStaging();   // ว่างแล้วโชว์ข้อความ "ไม่มีรายการ"
    });

    // บันทึกเข้าระบบจริง
    card.querySelector('[data-act="save"]').addEventListener('click', async () => {
      cerr('');
      const payload = buildPayload(targetType, w);
      const reqKey = REQUIRED[targetType];
      if (!hasVal(payload[reqKey]))
        return cerr(targetType === 'customer' ? 'ต้องมีชื่อลูกค้าก่อนบันทึก' : 'ต้องมีชื่องาน/โครงการก่อนบันทึก');

      const btn = card.querySelector('[data-act="save"]');
      btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
      try {
        let savedId, table;
        if (targetType === 'customer') {
          const body = { ...payload };
          if (dup && mergeMode === 'update') body.id = dup.row.id;
          const saved = await adapter.saveCustomer(body);
          savedId = saved?.id; table = 'customers';
        } else {
          const { contact_name, contact_position, contact_phone, contact_email, ...main } = payload;
          if (dup && mergeMode === 'update') main.id = dup.row.id;
          const saved = await adapter.savePending(main);
          savedId = saved?.id; table = 'pending_projects';
          if (savedId && (hasVal(contact_name) || hasVal(contact_phone) || hasVal(contact_email))) {
            try {
              await adapter.saveContacts(savedId, [
                { slot: 1, name: contact_name || null, status: contact_position || null,
                  phone: contact_phone || null, email: contact_email || null },
                { slot: 2 }, { slot: 3 },
              ]);
            } catch (e) { console.warn('บันทึกผู้ติดต่อไม่สำเร็จ:', e.message); }
          }
        }

        // ปิดสถานะ staging → merged (เป็นหลักฐานว่านำเข้าจากเอกสารไหน ใครอนุมัติ)
        await adapter.approveIntake(item.id, {
          target_table: table, target_id: savedId,
          merge_mode: dup && mergeMode === 'update' ? 'update' : 'new',
          edited: w,
        });
        candCache = null;   // มีของใหม่เข้าระบบแล้ว → การ์ดถัดไปต้องเทียบซ้ำกับชุดใหม่

        // แสดงผลสำเร็จบนการ์ดแล้วเอาออก
        card.classList.add('ai-saved');
        card.querySelector('.ai-card-foot').innerHTML =
          `<span class="ai-ok">✓ บันทึกเข้าระบบแล้ว (${dup && mergeMode === 'update' ? 'อัปเดตของเดิม' : 'รายการใหม่'})</span>`;
        setTimeout(async () => {
          card.remove();
          await refreshCount();
          if (!host.querySelector('.ai-card')) loadStaging();
        }, 900);
        await onSaved();
      } catch (e) {
        cerr(e.message);
        btn.disabled = false; btn.textContent = 'บันทึกเข้าระบบ';
      }
    });
  }

  // เปิดมาแล้วมี draft ค้างอยู่ → เด้งไปแท็บรายการรอตรวจเลย (มาต่อจากเครื่องอื่นได้)
  refreshCount().then(list => { if (list && list.length) switchTab('stage'); });
}

export default { SOURCES, openAIImport };
