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

/** HTML ของช่อง rich text 1 ช่อง (แทน <textarea> ของ type 'area') */
export function richFieldHtml(name, value, { label, wide = true } = {}) {
  const html = sanitizeHtml(value);
  const swatches = (kind, colors) => colors.map(c =>
    `<button type="button" class="rt-sw" data-rt="${kind}" data-color="${c}"
             style="background:${kind === 'hilite' ? c : 'transparent'};${kind === 'color' ? 'color:' + c : ''}"
             title="${kind === 'hilite' ? 'ไฮไลต์' : 'สีตัวอักษร'}">${kind === 'color' ? 'A' : ''}</button>`).join('');
  return `<label class="fld ${wide ? 'fld-wide' : ''} richfield" data-rich>
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
    <div class="rt-edit" contenteditable="true" data-rt-edit role="textbox" aria-multiline="true">${html}</div>
    <input type="hidden" name="${esc(name)}" data-rt-val value="${esc(html)}">
  </label>`;
}

/** ผูก event ให้ทุกช่อง rich text ใน root (เรียกครั้งเดียวหลัง render) */
export function bindRichFields(root) {
  if (!root) return;
  root.querySelectorAll('[data-rich]').forEach(fld => {
    const edit   = fld.querySelector('[data-rt-edit]');
    const hidden = fld.querySelector('[data-rt-val]');
    if (!edit || !hidden) return;

    const sync = () => { hidden.value = sanitizeHtml(edit.innerHTML); };
    // ให้คำสั่งจัดรูปแบบทำงานกับข้อความที่เลือกในช่องนี้
    const exec = (cmd, val) => {
      edit.focus();
      // styleWithCSS = ให้ foreColor/hiliteColor คืน <span style> (ไม่ใช่ <font>) → ผ่าน sanitize ได้ตรง ๆ
      try { document.execCommand('styleWithCSS', false, true); } catch {}
      try { document.execCommand(cmd, false, val); } catch {}
      sync();
    };

    fld.querySelector('.rt-toolbar')?.addEventListener('mousedown', (e) => {
      // mousedown + preventDefault = ไม่ให้ช่องแก้ไขเสีย selection ตอนกดปุ่ม
      const b = e.target.closest('[data-rt]');
      if (!b) return;
      e.preventDefault();
      const kind = b.dataset.rt;
      if (kind === 'cmd')   return exec(b.dataset.cmd);
      if (kind === 'hilite') return exec('hiliteColor', b.dataset.color);
      if (kind === 'color')  return exec('foreColor',   b.dataset.color);
      if (kind === 'clear')  return exec('removeFormat');
    });

    edit.addEventListener('input', sync);
    edit.addEventListener('blur', sync);
    // วางข้อความ = วางเป็น "ข้อความล้วน" กัน HTML แปลกปลอมจากคลิปบอร์ด
    edit.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
      try { document.execCommand('insertText', false, text); } catch {}
      sync();
    });
    sync();
  });
}

export default { richFieldHtml, bindRichFields, sanitizeHtml, richToText, isRich };
