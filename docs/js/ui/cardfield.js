// ช่องแนบรูป "นามบัตร" (สูงสุด 2 รูป: ด้านหน้า / ด้านหลัง) — ใช้ในฟอร์ม Book 3 สี
// เก็บเป็น data URL ใน card_front_url / card_back_url (คนละคอลัมน์) เหมือน photo_url
//   • ย่อก่อนเก็บด้านยาว 1280px คุณภาพ 0.8 — ใหญ่กว่ารูปบุคคล (512) เพื่อให้อ่านตัวหนังสือ/ซูมได้
//   • กดที่รูป → เปิด lightbox ซูมเข้า-ออก (ui/lightbox.js)
// 🔒 นามบัตร = ข้อมูลลูกค้า เก็บใน DB ที่มี RLS เท่านั้น ไม่ commit ลง repo

import { fileToDataUrl, safePhoto } from './photofield.js';
import { openLightbox } from './lightbox.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const SIDES = [
  { key: 'front', label: 'ด้านหน้า' },
  { key: 'back',  label: 'ด้านหลัง' },
];

function slotHtml(side, label, current) {
  const u = safePhoto(current);
  return `<div class="card-slot" data-side="${side}">
    <div class="card-slot-h">นามบัตร ${esc(label)}</div>
    <div class="card-thumb ${u ? 'has-img' : ''}" data-cthumb
         ${u ? 'role="button" tabindex="0" title="กดเพื่อดูรูปเต็ม + ซูม"' : ''}>
      ${u ? `<img src="${u}" alt="นามบัตร ${esc(label)}">` : '<span class="pf-thumb-x">ยังไม่มีรูป</span>'}
    </div>
    <div class="card-slot-actions">
      <input type="file" accept="image/*" data-cfile hidden>
      <button type="button" class="btn btn-ghost btn-sm" data-cpick>${u ? '✎ แก้ไข' : '📷 เพิ่ม'}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-cclear ${u ? '' : 'hidden'}>🗑 ลบ</button>
    </div>
    <input type="hidden" name="card_${side}_url" data-curl value="${u}">
  </div>`;
}

/** HTML ช่องนามบัตร 2 รูป (ใส่ค่าเดิมถ้ามี) */
export function cardFieldHtml(front, back) {
  const cur = { front, back };
  return `<div class="cardfield">
    ${SIDES.map(s => slotHtml(s.key, s.label, cur[s.key])).join('')}
  </div>`;
}

/** ต่อ event ให้ทุกช่องนามบัตรใน root */
export function bindCardField(root, { onError } = {}) {
  root.querySelectorAll('.card-slot').forEach(slot => {
    const thumb  = slot.querySelector('[data-cthumb]');
    const file   = slot.querySelector('[data-cfile]');
    const hidden = slot.querySelector('[data-curl]');
    const pick   = slot.querySelector('[data-cpick]');
    const clear  = slot.querySelector('[data-cclear]');
    const label  = slot.querySelector('.card-slot-h')?.textContent || 'นามบัตร';

    const paint = () => {
      const u = safePhoto(hidden.value);
      thumb.classList.toggle('has-img', !!u);
      thumb.innerHTML = u ? `<img src="${u}" alt="${esc(label)}">` : '<span class="pf-thumb-x">ยังไม่มีรูป</span>';
      if (clear) clear.hidden = !u;
      if (pick)  pick.textContent = u ? '✎ แก้ไข' : '📷 เพิ่ม';
      if (u) { thumb.setAttribute('role', 'button'); thumb.setAttribute('tabindex', '0'); thumb.title = 'กดเพื่อดูรูปเต็ม + ซูม'; }
      else   { thumb.removeAttribute('role'); thumb.removeAttribute('tabindex'); thumb.removeAttribute('title'); }
    };
    paint();

    pick?.addEventListener('click', () => file.click());
    file?.addEventListener('change', async () => {
      const f = file.files?.[0];
      file.value = '';                                   // ให้เลือกไฟล์เดิมซ้ำได้
      if (!f) return;
      try { hidden.value = await fileToDataUrl(f, { maxSide: 1280, quality: 0.8 }); paint(); }
      catch (e) { onError?.(e.message); }
    });
    clear?.addEventListener('click', () => { hidden.value = ''; paint(); });

    // กดที่รูป (มีรูปแล้ว) → เปิด lightbox ซูมได้
    const view = () => { const u = safePhoto(hidden.value); if (u) openLightbox(u, 'นามบัตร ' + label); };
    thumb.addEventListener('click', view);
    thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); view(); } });
  });
}
