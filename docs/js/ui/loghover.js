// ui/loghover.js — คอลัมน์ "การติดตามล่าสุด / ความคืบหน้าล่าสุด"
//
// ปัญหาเดิม: ข้อความยาวล้นออกนอกจอ (ตารางกว้างเกิน) + native title tooltip ช้า/สไตล์ไม่ได้
// วิธีแก้: ตัดข้อความในเซลล์เหลือ ~60 อักขระ · ชี้เมาส์แล้วเด้ง popup ความคืบหน้าเต็ม
//
// ⚠️ popup ต้อง position:fixed (เหมือน .dp-pop ของ datepicker) —
//    ตารางอยู่ใน .tbl-wrap ที่ overflow:auto ถ้าใช้ absolute จะโดน clip หายครึ่งอัน
// ⚠️ pointer-events:none — ห้ามให้ popup กินคลิกปุ่ม (กติกาเดียวกับแถบ PWA ใน CLAUDE.md)

import { thaiDate } from './datepicker.js';
import { richToText } from './richtext.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export const CLAMP = 60;

/** ตัดตามจำนวน "อักขระ" ไม่พึ่งความกว้างคอลัมน์อย่างเดียว — ยาวเกิน CLAMP เติม … */
export function truncate(s, n = CLAMP) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

/**
 * สร้าง <span class="lastlog-t"> ที่ตัดสั้น + ฝังข้อมูลบันทึกเต็มไว้ให้ tooltip อ่าน
 * l = { log_date, by_name, response, next_doing }
 */
export function lastLogSpan(l) {
  // RESPONSE/NEXT DOING อาจเป็น rich text (HTML) — ตัดแท็กเหลือข้อความล้วนก่อนโชว์/ตัดสั้น
  const res  = richToText(l.response || '');
  const next = richToText(l.next_doing || '');
  const preview = res || next || '';
  // เก็บของเต็มใน data-* (encode กัน quote/บรรทัดใหม่พังโครง HTML)
  const payload = encodeURIComponent(JSON.stringify({
    date: thaiDate(l.log_date) || l.log_date || '',
    by:   l.by_name || '',
    response: res,
    next:     next,
  }));
  return `<span class="lastlog-t" data-loghover="${payload}">${esc(truncate(preview))}</span>`;
}

function popHtml(d) {
  const sec = (label, val) => val
    ? `<div class="loghover-sec"><b>${label}</b><div>${esc(val)}</div></div>` : '';
  return `${d.date || d.by
      ? `<div class="loghover-h">${esc(d.date)}${d.by ? ' · ' + esc(d.by) : ''}</div>` : ''}
    ${sec('RESPONSE', d.response)}
    ${sec('NEXT DOING', d.next)}`;
}

let tip = null;
function ensureTip() {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.className = 'loghover';
  tip.hidden = true;
  document.body.appendChild(tip);
  return tip;
}

function place(el, anchor) {
  const r = anchor.getBoundingClientRect();
  const pad = 8;
  el.hidden = false;                    // ต้องโชว์ก่อนถึงจะวัดขนาดจริงได้
  const w = el.offsetWidth, h = el.offsetHeight;

  let left = r.left;
  if (left + w > innerWidth - pad) left = innerWidth - w - pad;
  if (left < pad) left = pad;

  let top = r.bottom + 6;               // ปกติอยู่ใต้เซลล์
  if (top + h > innerHeight - pad) top = r.top - h - 6;   // ล่างไม่พอ → ไปบน
  if (top < pad) top = pad;

  el.style.left = left + 'px';
  el.style.top  = top + 'px';
}

/**
 * ผูก hover popup ให้ container (ตาราง/การ์ด) — เรียกครั้งเดียวพอ ใช้ event delegation
 * ทนต่อการ re-render innerHTML เพราะ listener อยู่ที่ container ไม่ใช่ที่เซลล์
 */
export function mountLogHover(container) {
  if (!container || container.__loghover) return;   // กันผูกซ้ำ
  container.__loghover = true;

  const hide = () => { if (tip) tip.hidden = true; };

  const show = (span) => {
    let d;
    try { d = JSON.parse(decodeURIComponent(span.dataset.loghover || '')); } catch { return; }
    if (!d || (!d.response && !d.next)) return;
    const el = ensureTip();
    el.innerHTML = popHtml(d);
    place(el, span);
  };

  container.addEventListener('mouseover', (e) => {
    const span = e.target.closest?.('[data-loghover]');
    if (span) show(span);
  });
  container.addEventListener('mouseout', (e) => {
    const span = e.target.closest?.('[data-loghover]');
    if (span && !span.contains(e.relatedTarget)) hide();
  });
  // เลื่อนตาราง/หน้าจอ → popup แบบ fixed จะค้างผิดที่ ต้องซ่อน
  container.addEventListener('scroll', hide, true);
  window.addEventListener('scroll', hide, true);
}
