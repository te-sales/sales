// ui/reminders.js — ลิงค์ "แจ้งเตือน" ฝั่งผู้ใช้ (ไม่มี server · ไม่มีค่าใช้จ่าย)
//
// เจ้าของเลือกแนวทางนี้ (31 ก.ค. 2569): ทำลิงค์ให้ผู้ใช้กดเอง แทนระบบ push อัตโนมัติ
//   📅 Google Calendar — เปิดหน้าเพิ่มอีเวนต์ · ปฏิทินเตือนเอง (แจ้งเตือน/อีเมลตามที่ตั้งไว้)
//   📥 ไฟล์ .ics       — ดาวน์โหลดเข้าปฏิทินมือถือ (มี VALARM → เด้งเตือนวันนั้น)
//   💬 แชร์เข้าไลน์     — เปิดไลน์พร้อมข้อความเตือน เลือกแชตส่งเอง
//
// 🔒 ลิงค์ออกนอกเว็บใส่ rel="noopener noreferrer" เสมอ (กติกาใน CLAUDE.md)

import { thaiDate, shiftDay } from './datepicker.js';

const enc = encodeURIComponent;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** 'YYYY-MM-DD' → 'YYYYMMDD' (รูปแบบวันที่ของ Google Calendar/ICS) */
const compact = (iso) => String(iso || '').replace(/-/g, '');
const isDate = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''));

/** ลิงค์เพิ่มอีเวนต์แบบ "ทั้งวัน" ลง Google Calendar */
export function gcalUrl(title, dueISO, details = '') {
  const s = compact(dueISO), e = compact(shiftDay(dueISO, 1));   // อีเวนต์ทั้งวัน: end = วันถัดไป
  return `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${enc(title)}&dates=${s}/${e}&details=${enc(details)}`;
}

// ICS ต้อง escape , ; \ และขึ้นบรรทัดใหม่เป็น \n
const icsEsc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

/** data: URL ของไฟล์ .ics (อีเวนต์ทั้งวัน + VALARM เตือน 9:00 ของวันนั้น) */
export function icsDataUrl(title, dueISO, details = '') {
  const s = compact(dueISO), e = compact(shiftDay(dueISO, 1));
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TE Sales//TH', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:te-${s}-${String(title).length}@te-sales`,
    `DTSTART;VALUE=DATE:${s}`, `DTEND;VALUE=DATE:${e}`,
    `SUMMARY:${icsEsc(title)}`, details ? `DESCRIPTION:${icsEsc(details)}` : '',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + enc(ics);
}

/** ลิงค์แชร์ข้อความเข้าไลน์ (เปิดไลน์ให้เลือกแชตแล้วมีข้อความเตือนรออยู่) */
export function lineShareUrl(text) {
  return `https://line.me/R/msg/text/?${enc(text)}`;
}

/**
 * ชุดลิงค์แจ้งเตือนสำหรับ 1 รายการที่มีวันครบกำหนด — คืน '' ถ้าไม่มีวันกำหนด
 * @param title    ชื่อสิ่งที่ต้องทำ
 * @param dueISO   วันครบกำหนด 'YYYY-MM-DD'
 * @param details  รายละเอียด (เช่น ผูกกับงาน/ลูกค้าอะไร) — ใส่ในอีเวนต์ปฏิทิน + ข้อความไลน์
 */
export function reminderLinksHtml(title, dueISO, details = '') {
  if (!isDate(dueISO)) return '';
  const shareText = `⏰ ทำภายใน ${thaiDate(dueISO)}: ${title}${details ? '\n' + details : ''}`;
  const fname = (String(title).replace(/[^\wก-๙ ]+/g, '').trim().slice(0, 40) || 'reminder') + '.ics';
  return `<span class="a-remind" data-remind>
    <a class="a-rbtn" href="${esc(gcalUrl(title, dueISO, details))}" target="_blank" rel="noopener noreferrer"
       title="เพิ่มลง Google Calendar (เตือนทางแจ้งเตือน/อีเมลตามที่ตั้งไว้)">📅</a>
    <a class="a-rbtn" href="${icsDataUrl(title, dueISO, details)}" download="${esc(fname)}"
       title="ดาวน์โหลดไฟล์ปฏิทิน (.ics) — ปฏิทินมือถือเด้งเตือนวันนั้นเอง">📥</a>
    <a class="a-rbtn" href="${esc(lineShareUrl(shareText))}" target="_blank" rel="noopener noreferrer"
       title="แชร์เตือนเข้าไลน์">💬</a>
  </span>`;
}

export default { gcalUrl, icsDataUrl, lineShareUrl, reminderLinksHtml };
