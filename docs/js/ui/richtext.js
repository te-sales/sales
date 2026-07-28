// ช่องข้อความมีรูปแบบ (rich text) — ใช้กับช่อง "area" ในฟอร์ม Pending / Book 3 สี
// เจ้าของขอ 27 ก.ค. 2569: ไฮไลต์ · ตัวหนา · เปลี่ยนสีเข้ม · ขีดเส้นใต้ · ตัวเอียง
//
// 🔒 ความปลอดภัย (สำคัญมาก — repo เป็น public, ข้อมูลจริงอยู่หลัง RLS):
//   • เก็บเป็น HTML แต่ "ล้าง (sanitize) ทุกครั้ง" ทั้งตอนบันทึกและตอนแสดงผล
//   • allowlist แท็กเฉพาะ b/strong/i/em/u/mark/span/br/div/p เท่านั้น
//     - span/mark: อนุญาต style เฉพาะ color / background-color และรับเฉพาะสีในพาเลตที่กำหนด
//     - ตัด attribute อื่นทั้งหมด (on*, href, src, style อื่น ๆ, class ฯลฯ) กัน XSS
//   • ข้อความล้วน (legacy) ที่ยังไม่มีแท็ก → แสดงเป็น text ธรรมดา (escape ให้เอง)
//
// ⚠️ ห้ามเอา HTML จากที่นี่ไปใส่ innerHTML โดยไม่ผ่าน sanitizeHtml()
//    ตาราง/CSV ให้ใช้ richToText() (ตัดแท็กเหลือข้อความล้วน)

// ── พาเลตสีที่อนุญาต (คงที่ · กัน CVD + คอนทราสต์ · ไม่ให้จิ้มสีอิสระ) ──
// สีข้อความเข้ม (foreground) — เข้มพอให้อ่านออกทั้งบนจอมืดและตอนพิมพ์
const TEXT_COLORS = ['#c0392b', '#1b53c0', '#1f7a44', '#8a5a00', '#6d28d9'];
// สีไฮไลต์ (background) — อ่อนพอให้ตัวอักษรดำอ่านทับได้
const HILITE_COLORS = ['#fff3a3', '#b6f2c4', '#bcd6ff', '#ffc9c9', '#e6d3ff'];
const ALLOW_COLOR = new Set([...TEXT_COLORS, ...HILITE_COLORS].map(c => c.toLowerCase()));

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'SPAN', 'BR', 'DIV', 'P']);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** rgb(a) / #hex → #rrggbb ตัวเล็ก (ให้เทียบกับ allowlist ได้) · คืน '' ถ้าแปลงไม่ได้ */
function normColor(v) {
  const s = String(v || '').trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return `#${m[1]}`;
  m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return `#${m[1][0]}${m[1][0]}${m[1][1]}${m[1][1]}${m[1][2]}${m[1][2]}`;
  m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) {
    const hex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return '';
}

/** เก็บเฉพาะ color / background-color ที่อยู่ในพาเลต — คืน style string ที่ปลอดภัย ('' = ไม่มี) */
function safeStyle(styleText) {
  const out = [];
  for (const decl of String(styleText || '').split(';')) {
    const [rawProp, ...rest] = decl.split(':');
    const prop = rawProp.trim().toLowerCase();
    if (prop !== 'color' && prop !== 'background-color') continue;
    const c = normColor(rest.join(':'));
    if (c && ALLOW_COLOR.has(c)) out.push(`${prop}: ${c}`);
  }
  return out.join('; ');
}

/**
 * ล้าง HTML ให้เหลือเฉพาะแท็ก/สไตล์ที่อนุญาต — ปลอดภัยพอจะเอาไปใส่ innerHTML
 * ข้อความล้วน (ไม่มีแท็ก) ก็ผ่านได้ (จะถูก escape โดย DOMParser อยู่แล้ว)
 */
export function sanitizeHtml(html) {
  const raw = String(html ?? '');
  if (!raw) return '';
  // ไม่มีเครื่องหมาย < → เป็นข้อความล้วน escape ตรง ๆ (เร็ว + ปลอดภัย)
  if (!raw.includes('<')) return esc(raw);

  const doc = new DOMParser().parseFromString(raw, 'text/html');

  const clean = (node) => {
    const out = [];
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) {            // text
        out.push(esc(child.nodeValue));
        return;
      }
      if (child.nodeType !== 1) return;      // ทิ้ง comment/อื่น ๆ
      const tag = child.tagName;
      const inner = clean(child);
      if (!ALLOWED_TAGS.has(tag)) {          // แท็กไม่อนุญาต → เก็บแต่เนื้อข้างใน
        out.push(inner);
        return;
      }
      if (tag === 'BR') { out.push('<br>'); return; }
      // <font color> (บางเบราว์เซอร์ที่ execCommand คืนมา) → แปลงเป็น span style ที่ปลอดภัย
      if (tag === 'FONT') {
        const c = normColor(child.getAttribute('color'));
        out.push(c && ALLOW_COLOR.has(c) ? `<span style="color: ${c}">${inner}</span>` : inner);
        return;
      }
      let attr = '';
      if (tag === 'SPAN' || tag === 'MARK') {
        const st = safeStyle(child.getAttribute('style'));
        if (st) attr = ` style="${st}"`;
      }
      out.push(`<${tag.toLowerCase()}${attr}>${inner}</${tag.toLowerCase()}>`);
    });
    return out.join('');
  };
  return clean(doc.body);
}

/** HTML (มีรูปแบบ) → ข้อความล้วน สำหรับตาราง/CSV/จับซ้ำ */
export function richToText(html) {
  const raw = String(html ?? '');
  if (!raw.includes('<')) return raw;
  // <br> + ขอบเขต block (p/div เปิด-ปิด) → ขึ้นบรรทัดใหม่ (contenteditable ขึ้นบรรทัดด้วย <div>)
  const doc = new DOMParser().parseFromString(
    raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(p|div)\b[^>]*>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** มีรูปแบบจริงไหม (ไม่ใช่แค่ข้อความล้วน) — ใช้ตัดสินว่าจะ render เป็น HTML หรือ text */
export const isRich = (v) => /<(b|strong|i|em|u|mark|span|br|div|p)\b/i.test(String(v || ''));

// ── แถบเครื่องมือ ──
const TOOLS = [
  { cmd: 'bold',      ic: '<b>B</b>',        tip: 'ตัวหนา' },
  { cmd: 'italic',    ic: '<i>I</i>',        tip: 'ตัวเอียง' },
  { cmd: 'underline', ic: '<u>U</u>',        tip: 'ขีดเส้นใต้' },
];

/**
 * HTML ของช่อง rich text 1 ช่อง
 * 🔴 wrapper ต้องเป็น <div> ไม่ใช่ <label> — พิสูจน์ด้วย CDP แล้ว (28 ก.ค. 2569):
 *    คลิก contenteditable ที่อยู่ใน <label> → เบราว์เซอร์เด้ง focus ไปที่ปุ่มแรกในเลเบล (ปุ่ม B ในทูลบาร์)
 *    caret ไม่เคยลงในช่องแก้ไข → "พิมพ์ในบล็อกไม่ได้" · เปลี่ยนเป็น <div> แล้ว focus อยู่ที่ช่องแก้ไขปกติ
 * @param name  ชื่อ input (สำหรับ FormData) · ส่ง '' ได้ถ้าอ่านค่าเองด้วย id (กันไปปนกับ FormData ของฟอร์มแม่)
 * @param opts.id     id ของ hidden input (ให้ readLogForm/draftLog หาเจอ)
 * @param opts.ph     placeholder (โชว์ผ่าน CSS :empty::before)
 * @param opts.dataF  ใส่ data-f="..." บน hidden input (ให้ bindLogEditing เก็บค่าเข้ากล่อง patch)
 */
export function richFieldHtml(name, value, { label, wide = true, id, ph, dataF } = {}) {
  const html = sanitizeHtml(value);
  const swatches = (kind, colors) => colors.map(c =>
    `<button type="button" class="rt-sw" data-rt="${kind}" data-color="${c}"
             style="background:${kind === 'hilite' ? c : 'transparent'};${kind === 'color' ? 'color:' + c : ''}"
             title="${kind === 'hilite' ? 'ไฮไลต์' : 'สีตัวอักษร'}">${kind === 'color' ? 'A' : ''}</button>`).join('');
  const hid = `<input type="hidden"${name ? ` name="${esc(name)}"` : ''}${id ? ` id="${esc(id)}"` : ''}${dataF ? ` data-f="${esc(dataF)}"` : ''} data-rt-val value="${esc(html)}">`;
  return `<div class="fld ${wide ? 'fld-wide' : ''} richfield" data-rich>
    <span>${esc(label || '')}</span>
    <div class="rt-toolbar" role="toolbar" aria-label="รูปแบบข้อความ">
      ${TOOLS.map(t => `<button type="button" class="rt-btn" data-rt="cmd" data-cmd="${t.cmd}" title="${esc(t.tip)}" tabindex="-1">${t.ic}</button>`).join('')}
      <span class="rt-sep"></span>
      <span class="rt-swatches" title="ไฮไลต์">${swatches('hilite', HILITE_COLORS)}</span>
      <span class="rt-sep"></span>
      <span class="rt-swatches" title="สีตัวอักษรเข้ม">${swatches('color', TEXT_COLORS)}</span>
      <span class="rt-sep"></span>
      <button type="button" class="rt-btn rt-clear" data-rt="clear" title="ล้างรูปแบบ" tabindex="-1">⌫</button>
    </div>
    <div class="rt-edit" contenteditable="true" data-rt-edit${ph ? ` data-ph="${esc(ph)}"` : ''} role="textbox" aria-multiline="true">${html}</div>
    ${hid}
  </div>`;
}

// ── ผูก event แบบ delegation ที่ document ครั้งเดียว ──
// ช่อง rich text โผล่ได้ทั้งในฟอร์มหลักและในกล่องที่สร้างทีหลัง (add-log / edit-log ที่ innerHTML ใหม่)
// ผูกที่ document ทีเดียว → ทำงานกับทุกช่องที่มี/จะมี โดยผู้เรียกไม่ต้องรู้ว่าต้อง bind เมื่อไหร่
// (hidden ถูก sync ค่าเริ่มต้นตั้งแต่ตอน render แล้ว — ไม่ต้อง sync รอบแรกอีก)
function editOf(el)   { return el?.closest?.('[data-rt-edit]') || null; }
function hiddenFor(edit) { return edit?.closest('[data-rich]')?.querySelector('[data-rt-val]') || null; }
function syncEdit(edit) { const h = hiddenFor(edit); if (h) h.value = sanitizeHtml(edit.innerHTML); }

function installGlobalRich() {
  if (typeof document === 'undefined' || document.__richBound) return;
  document.__richBound = true;

  // ปุ่มในทูลบาร์ — mousedown + preventDefault = ไม่ให้ selection ในช่องแก้ไขหลุดตอนกด
  document.addEventListener('mousedown', (e) => {
    const b = e.target.closest?.('[data-rt]');
    if (!b || !b.closest('.rt-toolbar')) return;
    const edit = b.closest('[data-rich]')?.querySelector('[data-rt-edit]');
    if (!edit) return;
    e.preventDefault();
    edit.focus();
    // styleWithCSS = ให้ foreColor/hiliteColor คืน <span style> (ไม่ใช่ <font>) → ผ่าน sanitize ตรง ๆ
    try { document.execCommand('styleWithCSS', false, true); } catch {}
    const kind = b.dataset.rt;
    try {
      if (kind === 'cmd')         document.execCommand(b.dataset.cmd, false);
      else if (kind === 'hilite') document.execCommand('hiliteColor', false, b.dataset.color);
      else if (kind === 'color')  document.execCommand('foreColor',   false, b.dataset.color);
      else if (kind === 'clear')  document.execCommand('removeFormat', false);
    } catch {}
    syncEdit(edit);
  });

  document.addEventListener('input', (e) => { const ed = editOf(e.target); if (ed) syncEdit(ed); });
  document.addEventListener('blur',  (e) => { const ed = editOf(e.target); if (ed) syncEdit(ed); }, true);

  // วางข้อความ = วางเป็น "ข้อความล้วน" กัน HTML แปลกปลอมจากคลิปบอร์ด
  document.addEventListener('paste', (e) => {
    const edit = editOf(e.target);
    if (!edit) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
    try { document.execCommand('insertText', false, text); } catch {}
    syncEdit(edit);
  });
}
installGlobalRich();

/** คงไว้เพื่อความเข้ากันได้ — event ผูกที่ document แล้ว (installGlobalRich) แค่การันตีว่าติดตั้งครบ */
export function bindRichFields() { installGlobalRich(); }

/** ช่องว่างจริงไหม (ตัดแท็กแล้วไม่มีข้อความ) — contenteditable ที่ลบหมดมักเหลือ <br> ต้องไม่นับเป็นมีค่า */
export const richBlank = (html) => !richToText(html).trim();

export default { richFieldHtml, bindRichFields, sanitizeHtml, richToText, isRich, richBlank };
