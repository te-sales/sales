// F7 — แหล่งงาน: ข่าวประจำสัปดาห์ + เส้นทางหางาน + playbook กลยุทธ์ (Phase 3.1 → 3.2 → 3.14)
//
// 3 แถบในหน้าเดียว:
//   "ข่าวประจำสัปดาห์" — รายงานข่าวโอกาสงาน (HTML จาก Claude Code) ใหม่สุดขึ้นก่อน · เก็บใน Supabase (phase 3.14)
//   "เส้นทางหางาน"    — 8 เส้นทาง พร้อมลิงก์ที่กดเข้าไปทำงานได้เลย (หัวหน้าแก้ลิงก์ได้)
//   "กลยุทธ์"         — playbook รายเส้นทาง + เช็กลิสต์ชนะงาน 7 ข้อ (step 3.2)
// (แถบ "Thai Water Expo" + "ทีมขาย" ถอดออก 26 ก.ค. 2569 ตามที่เจ้าของสั่ง)
//
// ⚠️ รายชื่อลูกค้าจริงไม่ได้อยู่ในโค้ดหรือใน repo — ข้อมูลอยู่ใน Supabase เท่านั้น (repo เป็น public)

import { adapter } from '../data/adapter.js';
import { canSign } from '../ui/signoff.js';
import { todayISO } from '../ui/datepicker.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const LS_TAB = 'te-dashboard:sources-tab';

/**
 * ลิงก์ต้องเป็น http/https เท่านั้น
 * ⚠️ ถ้าปล่อยผ่าน คนที่แก้ลิงก์ได้จะใส่ javascript:… แล้วกลายเป็นช่องรันสคริปต์
 *    ใส่ rel="noopener" ด้วย ไม่งั้นหน้าที่เปิดใหม่แก้ location ของหน้าเราได้
 */
const safeUrl = (u) => {
  try {
    const x = new URL(String(u));
    return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : '';
  } catch { return ''; }
};

/** รายการลิงก์ที่กดได้ (กรอง javascript: ออกด้วย safeUrl) — ใช้ร่วมทั้งแถบเส้นทางและกลยุทธ์ */
function linksHtml(links) {
  const items = (links || []).map(l => {
    const u = safeUrl(l.url);
    return u
      ? `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(l.label || u)} ↗</a></li>`
      : `<li><span class="src-badlink">${esc(l.label || '')} — ลิงก์ไม่ถูกต้อง</span></li>`;
  });
  return items.length ? `<ul class="src-links">${items.join('')}</ul>` : '';
}

const MB = (v) => Number(v || 0) / 1e6;
const fmtMB = (v) => MB(v).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const has = (v) => String(v ?? '').trim() !== '';

// ══════════════════════════════════════════════════════════
// เช็กลิสต์ชนะงาน 7 ข้อ — ตรรกะบริสุทธิ์ แยกไว้ให้ทดสอบได้
//
// ทุกข้อต้องผูกกับ "ช่องที่มีอยู่จริงในฟอร์ม Pending" เท่านั้น
// ถ้าตั้งข้อที่ระบบตรวจเองไม่ได้ มันจะกลายเป็นโปสเตอร์ติดผนัง ไม่ใช่เครื่องมือ
// ══════════════════════════════════════════════════════════

export const WIN_CHECKS = [
  { id: 'owner',  label: 'รู้ว่าใครเป็นเจ้าของงานตัวจริง',
    hint: 'ช่อง OWNER เจ้าของโครงการ — คนที่เซ็นอนุมัติ ไม่ใช่คนที่เราคุยด้วย',
    ok: (r) => has(r.project_owner) },

  { id: 'spec',   label: 'เข้าถึงผู้ออกแบบหรือที่ปรึกษาแล้ว',
    hint: 'ช่อง DESIGNER หรือ CONSULT — ว่างทั้งคู่แปลว่าเรามาทีหลังสเปกถูกล็อกไปแล้ว',
    ok: (r) => has(r.designer) || has(r.consultant) },

  { id: 'compet', label: 'รู้ว่าแข่งกับใคร',
    hint: 'ช่อง COMPETITOR คู่แข่ง — ไม่รู้ว่าแข่งกับใคร แปลว่าตั้งราคาโดยเดา',
    ok: (r) => has(r.competitors) },

  { id: 'need',   label: 'รู้ความต้องการจริง และรู้จุดแข็งของเรา',
    hint: 'ต้องมีครบทั้งช่อง "ความต้องการจริงของลูกค้า" และ "จุดแข็งของเราในงานนี้"',
    ok: (r) => has(r.customer_needs) && has(r.our_strengths) },

  { id: 'plan',   label: 'มีแผนชนะงานเขียนไว้',
    hint: 'ช่อง Win plan — เขียนไว้แล้วคนอื่นรับช่วงต่อได้ตอนเราลาหรือย้ายงาน',
    ok: (r) => has(r.win_plan) },

  { id: 'when',   label: 'รู้ว่าตัดสินใจเมื่อไหร่',
    hint: 'ช่อง DECISION DAY หรือเดือนที่คาดปิด — ไม่มีวัน งานจะค้างข้ามไตรมาสโดยไม่มีใครเร่ง',
    ok: (r) => has(r.decision_day) || has(r.close_month) },

  // ข้อเดียวที่ "เคยผ่านแล้วกลับมาไม่ผ่านได้" — นัดที่เลยกำหนดถือว่าไม่มีนัด
  { id: 'next',   label: 'มีนัดถัดไปที่ยังไม่เลยกำหนด',
    hint: 'ช่อง "งานถัดไปที่ต้องทำ" + "กำหนดทำภายใน" ที่ยังไม่เลยวันนี้',
    ok: (r, today) => has(r.next_action) && has(r.next_date) && String(r.next_date) >= today },
];

/** งานเดี่ยว ๆ ผ่านกี่ข้อจาก 7 */
export function winScore(row, today = todayISO()) {
  const missing = WIN_CHECKS.filter(c => !c.ok(row, today)).map(c => c.id);
  return { passed: WIN_CHECKS.length - missing.length, total: WIN_CHECKS.length, missing };
}

/**
 * นับทั้งกอง: แต่ละข้อมีงานที่ยัง "ขาด" อยู่กี่งาน คิดเป็นเงินเท่าไหร่
 *
 * นับเฉพาะงานที่ยังเดินอยู่ — งานที่ปิดหรือแพ้ไปแล้วไม่ต้องมี Win plan อีกแล้ว
 * ถ้าเอามานับด้วย ตัวเลข "ยังขาด" จะพองจนไม่มีใครอยากแตะ
 */
export function checkGaps(rows, today = todayISO()) {
  const open = (rows || []).filter(r =>
    r.is_active !== false && r.stage !== 'won' && r.stage !== 'lost');

  return WIN_CHECKS.map(c => {
    const miss = open.filter(r => !c.ok(r, today));
    return {
      id: c.id, label: c.label, hint: c.hint,
      total: open.length,
      done:  open.length - miss.length,
      miss:  miss.length,
      missValue: miss.reduce((a, r) => a + Number(r.value_baht || 0), 0),
    };
  });
}

export default {
  title: 'แหล่งงาน',
  subtitle: 'ข่าวประจำสัปดาห์ · เส้นทางหาโครงการ · กลยุทธ์ชนะงาน',
  render: (root) => renderSources(root),
};

const TABS = ['news', 'paths', 'play'];

async function renderSources(root) {
  const me = (await adapter.getSession())?.user || null;
  let tab = 'news';   // ค่าเริ่มต้น = ข่าวประจำสัปดาห์ (ให้ข่าวใหม่เด่นสุด)
  try { const s = localStorage.getItem(LS_TAB); if (TABS.includes(s)) tab = s; } catch {}

  root.innerHTML = `
    <div class="toolbar toolbar-sub">
      <div class="segmented" id="sTab" role="tablist" aria-label="มุมมอง">
        <button type="button" data-tab="news"  class="${tab === 'news'  ? 'on' : ''}">📰 ข่าวประจำสัปดาห์
          <span class="seg-badge" id="sNewsN" hidden></span></button>
        <button type="button" data-tab="paths" class="${tab === 'paths' ? 'on' : ''}">เส้นทางหางาน</button>
        <button type="button" data-tab="play"  class="${tab === 'play'  ? 'on' : ''}">กลยุทธ์</button>
      </div>
    </div>
    <div id="sBody"><div class="skeleton">กำลังโหลด…</div></div>
    <div id="sPanel"></div>`;

  const body = root.querySelector('#sBody');

  root.querySelectorAll('#sTab [data-tab]').forEach(b => {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      try { localStorage.setItem(LS_TAB, tab); } catch {}
      root.querySelectorAll('#sTab [data-tab]').forEach(x => x.classList.toggle('on', x === b));
      draw();
    });
  });

  // ป้ายนับจำนวนข่าว — เห็นตั้งแต่ยังไม่กดเข้าแถบ
  (async () => {
    try {
      const rows = await adapter.listNews();
      const el = root.querySelector('#sNewsN');
      if (el) { el.textContent = rows.length; el.hidden = rows.length === 0; }
    } catch { /* ยังไม่ได้รัน phase3-14 ก็ไม่ต้องโชว์ */ }
  })();

  async function draw() {
    body.innerHTML = '<div class="skeleton">กำลังโหลด…</div>';
    if (tab === 'paths') return drawPaths(body, root, me, draw);
    if (tab === 'play')  return drawPlaybook(body, root, me, draw);
    return drawNews(body, root, me, draw);
  }
  await draw();
}

// ══════════════════════════════════════════════════════════
// แถบ 1 — เส้นทางหางาน
// ══════════════════════════════════════════════════════════

async function drawPaths(body, root, me, redraw) {
  let rows = [], srcHtml = '';
  try {
    rows = await adapter.listLeadSources();
    const editable = canSign(me);
    srcHtml = `
      <p class="sec-foot" style="margin:0 0 12px">
        ${rows.length} เส้นทางที่ทีมใช้หางาน — กดลิงก์เข้าไปทำงานได้เลย
        ${editable ? '· แก้ลิงก์/ผู้รับผิดชอบได้ที่ปุ่ม "แก้ไข"'
                   : '· ลิงก์เป็นของกลาง แก้ได้เฉพาะหัวหน้างาน'}
      </p>
      <div class="srcgrid">
        ${rows.map(s => `
          <div class="card srccard">
            <div class="src-h">
              <span class="src-ico">${esc(s.icon || '•')}</span>
              <div class="src-title">
                <strong>${esc(s.name)}</strong>
                ${s.cadence ? `<span class="src-cad">⏱ ${esc(s.cadence)}</span>` : ''}
              </div>
              ${editable ? `<button type="button" class="btn btn-ghost btn-sm"
                              data-edit-src="${esc(s.id)}">แก้ไข</button>` : ''}
            </div>
            ${s.descr ? `<p class="src-desc">${esc(s.descr)}</p>` : ''}
            ${s.owner_name ? `<p class="src-owner">ผู้รับผิดชอบ: <b>${esc(s.owner_name)}</b></p>` : ''}
            ${(s.subs || []).length ? `<div class="src-subs">
              ${s.subs.map(x => `<span class="ateam">${esc(x)}</span>`).join('')}</div>` : ''}
            ${linksHtml(s.links) || '<p class="src-nolink">— ยังไม่มีลิงก์ —</p>'}
          </div>`).join('')}
      </div>`;
  } catch (e) {
    const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(e.message);
    srcHtml = `<div class="empty">
        <strong>${missing ? 'ยังไม่ได้สร้างตารางแหล่งงาน' : 'โหลดข้อมูลไม่สำเร็จ'}</strong>
        ${missing ? 'เอาไฟล์ <code>db/phase3-1.sql</code> ไปรันใน Supabase → SQL Editor ก่อน'
                  : esc(e.message)}
      </div>`;
  }

  body.innerHTML = srcHtml;

  body.querySelectorAll('[data-edit-src]').forEach(b => {
    b.addEventListener('click', () =>
      openSourceEdit(root.querySelector('#sPanel'), rows.find(r => r.id === b.dataset.editSrc), redraw));
  });
}

// ══════════════════════════════════════════════════════════
// แถบ — ข่าวสารโอกาสงานประจำสัปดาห์ (phase 3.14)
//   ทุกคนที่ล็อกอินอ่านได้ · admin เพิ่ม/ลบได้ · ใหม่สุดขึ้นก่อน (ไฮไลต์ "ใหม่สัปดาห์นี้")
// ══════════════════════════════════════════════════════════

async function drawNews(body, root, me, redraw) {
  let news = [];
  try { news = await adapter.listNews(); }
  catch (e) {
    const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(e.message);
    body.innerHTML = `<div class="empty">
        <strong>${missing ? 'ยังไม่ได้สร้างตารางข่าว' : 'โหลดข่าวไม่สำเร็จ'}</strong>
        ${missing ? 'เอาไฟล์ <code>db/phase3-14.sql</code> ไปรันใน Supabase → SQL Editor ก่อน'
                  : esc(e.message)}
      </div>`;
    return;
  }

  const isAdmin = me?.role === 'admin';
  const dateOf = (r) => esc(r.week_label || r.report_date || '');
  const delBtn = (id) => isAdmin
    ? `<button type="button" class="btn btn-ghost btn-sm nw-del" data-news-del="${esc(id)}">🗑 ลบ</button>` : '';

  const adminBar = isAdmin ? `
    <div class="toolbar" style="margin-bottom:12px">
      <button class="btn btn-primary btn-sm" id="nwAdd">+ เพิ่มข่าวประจำสัปดาห์</button>
      <span class="sec-foot" style="margin:0">เลือก/วางไฟล์ HTML ที่สร้างจาก Claude Code — เก็บใน Supabase เห็นเฉพาะทีม</span>
    </div>
    <p class="login-err" id="nwErr" role="alert" hidden></p>` : '';

  if (!news.length) {
    body.innerHTML = adminBar + `<div class="empty">
        <strong>ยังไม่มีข่าวประจำสัปดาห์</strong>
        ${isAdmin ? 'กด "+ เพิ่มข่าวประจำสัปดาห์" เพื่อเลือกไฟล์หรือวางโค้ด HTML'
                  : 'หัวหน้าจะเพิ่มข่าวโอกาสงานให้เร็ว ๆ นี้'}
      </div>`;
  } else {
    const [latest, ...older] = news;
    body.innerHTML = adminBar + `
      <div class="newswrap">
        <div class="newscard-wrap">
          <button type="button" class="newscard newscard-hot" data-news="${esc(latest.id)}"
                  aria-label="อ่านข่าวโอกาสงานใหม่สัปดาห์นี้">
            <span class="news-ico">📰</span>
            <span class="news-main">
              <span class="news-badge">🆕 ข่าวโอกาสงานใหม่สัปดาห์นี้</span>
              <strong>${esc(latest.title)}</strong>
              <span class="news-date">${dateOf(latest)}</span>
            </span>
            <span class="news-go">อ่านรายงาน →</span>
          </button>
          ${delBtn(latest.id)}
        </div>
        ${older.length ? `<div class="news-old">
          <span class="news-old-h">ข่าวย้อนหลัง</span>
          ${older.map(r => `<div class="newscard-wrap">
            <button type="button" class="news-oldrow" data-news="${esc(r.id)}">
              <span class="news-ico">📄</span>
              <span class="news-main"><strong>${esc(r.title)}</strong><span class="news-date">${dateOf(r)}</span></span>
              <span class="news-go">อ่าน →</span>
            </button>
            ${delBtn(r.id)}
          </div>`).join('')}
        </div>` : ''}
      </div>`;
  }

  // เปิดอ่านเต็มจอ (ทุกคนที่ล็อกอิน)
  body.querySelectorAll('[data-news]').forEach(b => {
    b.addEventListener('click', () => openNewsReader(root.querySelector('#sPanel'), b.dataset.news));
  });

  // admin: เพิ่มข่าว
  body.querySelector('#nwAdd')?.addEventListener('click', () =>
    openNewsAdd(root.querySelector('#sPanel'), redraw));

  // admin: ลบข่าว (กด 2 ครั้งยืนยัน — ลบแล้วกู้ไม่ได้)
  body.querySelectorAll('[data-news-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.dataset.armed !== '1') {
        btn.dataset.armed = '1'; btn.textContent = '⚠️ กดยืนยันลบ';
        setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = '🗑 ลบ'; } }, 3000);
        return;
      }
      try { await adapter.deleteNews(btn.dataset.newsDel); await redraw(); }
      catch (err) {
        const el = body.querySelector('#nwErr');
        if (el) { el.textContent = err.message; el.hidden = false; }
      }
    });
  });
}

/**
 * เปิดอ่านรายงานข่าวเต็มจอ
 * แสดงผ่าน <iframe srcdoc> sandbox — เนื้อหาข่าว (แท็บ/กราฟ/สไตล์ในไฟล์) ทำงานได้ครบ
 * แต่แยก origin จากแอป: แตะ DOM/คุกกี้/localStorage ของแอปไม่ได้ (กันสคริปต์หลุด แม้เป็นของ admin เอง)
 */
async function openNewsReader(host, id) {
  host.innerHTML = `
    <div class="modal modal-full" id="nwModal">
      <div class="modal-box modal-full-box">
        <div class="modal-head">
          <strong id="nwTitle">กำลังโหลดข่าว…</strong>
          <button type="button" class="btn btn-ghost btn-sm" id="nwClose">ปิด</button>
        </div>
        <div class="nw-body" id="nwBody"><div class="skeleton">กำลังโหลด…</div></div>
      </div>
    </div>`;

  const q = (s) => host.querySelector(s);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() { document.removeEventListener('keydown', onKey); host.innerHTML = ''; }
  q('#nwClose').addEventListener('click', close);
  q('#nwModal').addEventListener('mousedown', (e) => { if (e.target.id === 'nwModal') close(); });
  document.addEventListener('keydown', onKey);

  try {
    const rec = await adapter.getNews(id);
    if (!rec) throw new Error('ไม่พบข่าวนี้ (อาจถูกลบไปแล้ว)');
    q('#nwTitle').textContent = rec.title || 'ข่าวสาร';

    const frame = document.createElement('iframe');
    frame.className = 'nw-frame';
    frame.setAttribute('title', rec.title || 'ข่าวสาร');
    // allow-scripts = ให้แท็บ/กราฟในไฟล์ทำงาน · allow-popups(+escape) = ลิงก์ข่าว target=_blank เปิดได้
    // ไม่ใส่ allow-same-origin → เนื้อหาแยก origin แตะแอปไม่ได้
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.srcdoc = String(rec.html || '');

    const bodyEl = q('#nwBody');
    bodyEl.innerHTML = '';
    bodyEl.appendChild(frame);
  } catch (e) {
    const bodyEl = q('#nwBody');
    if (bodyEl) bodyEl.innerHTML = `<div class="empty" style="padding:30px">${esc(e.message)}</div>`;
  }
}

/** ดึงชื่อจาก <title> ของ HTML ที่วาง/อัพโหลด */
function titleFromHtml(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// เพิ่มข่าว (admin) — เลือกไฟล์ .html หรือวางโค้ด · อ่านไฟล์เป็น UTF-8 กันไทยเพี้ยน
function openNewsAdd(host, onSaved) {
  host.innerHTML = `
    <div class="modal" id="nwaModal">
      <form class="modal-box" id="nwaForm">
        <div class="modal-head">
          <strong>เพิ่มข่าวประจำสัปดาห์</strong>
          <button type="button" class="btn btn-ghost btn-sm" id="nwaClose">ปิด</button>
        </div>
        <div class="modal-body">
          <p class="sec-foot" style="margin:0 0 10px">
            เลือกไฟล์ HTML ที่สร้างจาก Claude Code หรือวางโค้ดทั้งไฟล์ — ระบบดึงชื่อจาก &lt;title&gt; ให้อัตโนมัติ
            · อ่านไฟล์เป็น UTF-8 ให้แล้ว ไทยไม่เพี้ยน
          </p>
          <div class="bk-actions" style="margin-bottom:12px">
            <label class="btn btn-ghost btn-sm bk-file">
              📁 เลือกไฟล์ HTML
              <input type="file" id="nwaFile" accept=".html,.htm,text/html" hidden>
            </label>
            <span class="lg-hint" id="nwaFileName"></span>
          </div>
          <div class="fgrid">
            <label class="fld"><span>ป้ายสัปดาห์ (อ่านง่าย)</span>
              <input type="text" name="week_label" placeholder="เช่น 26 ก.ค. 2569"></label>
            <label class="fld"><span>ชื่อรายงาน</span>
              <input type="text" name="title" placeholder="เว้นว่างได้ — ดึงจาก <title>"></label>
            <label class="fld fld-wide"><span>โค้ด HTML ทั้งไฟล์ *</span>
              <textarea name="html" rows="9" required
                placeholder="เลือกไฟล์ด้านบน หรือวาง <!doctype html> … </html> ที่นี่"></textarea></label>
          </div>
          <p class="sec-foot" id="nwaHint"></p>
        </div>
        <p class="login-err" id="nwaErr" role="alert" hidden></p>
        <div class="modal-foot">
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" id="nwaCancel">ยกเลิก</button>
          <button type="submit" class="btn btn-primary" id="nwaSave">บันทึก</button>
        </div>
      </form>
    </div>`;

  const q = (s) => host.querySelector(s);
  const close = () => { host.innerHTML = ''; };
  const fail = (m) => { q('#nwaErr').textContent = m; q('#nwaErr').hidden = false; };
  q('#nwaClose').addEventListener('click', close);
  q('#nwaCancel').addEventListener('click', close);
  q('#nwaModal').addEventListener('mousedown', (e) => { if (e.target.id === 'nwaModal') close(); });

  const showTitle = (html) => {
    const t = titleFromHtml(html);
    q('#nwaHint').textContent = t ? `ดึงชื่อได้: "${t}"` : '';
  };

  // อัพโหลดไฟล์ → อ่านเป็นข้อความ UTF-8 → เติมลงช่อง + ดึงชื่อ
  q('#nwaFile').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      q('[name="html"]').value = html;
      q('#nwaFileName').textContent = `เลือกไฟล์: ${file.name}`;
      const tEl = q('[name="title"]');
      if (!tEl.value.trim()) { const t = titleFromHtml(html); if (t) tEl.value = t; }
      showTitle(html);
    };
    reader.onerror = () => fail('อ่านไฟล์ไม่สำเร็จ');
    reader.readAsText(file, 'UTF-8');
  });

  q('[name="html"]').addEventListener('input', (e) => showTitle(e.target.value));

  q('#nwaForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    q('#nwaErr').hidden = true;
    const f = Object.fromEntries(new FormData(ev.target).entries());
    const html = String(f.html || '').trim();
    if (!html) return fail('เลือกไฟล์ หรือวางโค้ด HTML ของข่าวก่อน');
    const title = String(f.title || '').trim() || titleFromHtml(html) || 'ข่าวสารประจำสัปดาห์';

    const btn = q('#nwaSave');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await adapter.saveNews({
        title,
        week_label: String(f.week_label || '').trim() || null,
        report_date: todayISO(),
        html,
      });
      close();
      await onSaved();
    } catch (e) {
      fail(e.message);
      btn.disabled = false; btn.textContent = 'บันทึก';
    }
  });
}

function openSourceEdit(host, src, onSaved) {
  if (!src) return;
  const linkRow = (l = {}, i) => `
    <div class="lnkrow" data-lnk="${i}">
      <input type="text" class="inp inp-sm" data-f="label" placeholder="ชื่อลิงก์" value="${esc(l.label || '')}">
      <input type="url"  class="inp inp-sm" data-f="url"   placeholder="https://…" value="${esc(l.url || '')}">
      <button type="button" class="btn btn-ghost btn-sm" data-rm-lnk>ลบ</button>
    </div>`;

  host.innerHTML = `
    <div class="modal" id="srcModal">
      <form class="modal-box modal-sm" id="srcForm">
        <div class="modal-head">
          <strong>${esc(src.icon || '')} ${esc(src.name)}</strong>
          <button type="button" class="btn btn-ghost btn-sm" id="srcClose">ปิด</button>
        </div>
        <div class="modal-body">
          <div class="fgrid">
            <label class="fld fld-wide"><span>คำอธิบายวิธีทำงาน</span>
              <textarea name="descr" rows="2">${esc(src.descr || '')}</textarea></label>
            <label class="fld"><span>ต้องตรวจถี่แค่ไหน</span>
              <input type="text" name="cadence" value="${esc(src.cadence || '')}"></label>
            <label class="fld"><span>ผู้รับผิดชอบ</span>
              <input type="text" name="owner_name" value="${esc(src.owner_name || '')}"></label>
            <label class="fld fld-wide"><span>กลยุทธ์ชนะงานเส้นทางนี้ (playbook)</span>
              <textarea name="playbook" rows="7"
                placeholder="ขึ้นต้นบรรทัดด้วย • เพื่อให้แสดงเป็นข้อ ๆ">${esc(src.playbook || '')}</textarea></label>
          </div>

          <h3 class="q-h3">ลิงก์</h3>
          <div id="lnkList">${(src.links || []).map(linkRow).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="addLnk">+ เพิ่มลิงก์</button>
          <p class="sec-foot">รับเฉพาะ http:// และ https:// — ลิงก์แบบอื่นระบบจะไม่แสดงให้กด</p>
        </div>
        <p class="login-err" id="srcErr" role="alert" hidden></p>
        <div class="modal-foot">
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" id="srcCancel">ยกเลิก</button>
          <button type="submit" class="btn btn-primary" id="srcSave">บันทึก</button>
        </div>
      </form>
    </div>`;

  const q = (s) => host.querySelector(s);
  const close = () => { host.innerHTML = ''; };
  q('#srcClose').addEventListener('click', close);
  q('#srcCancel').addEventListener('click', close);
  q('#srcModal').addEventListener('mousedown', (e) => { if (e.target.id === 'srcModal') close(); });

  let n = (src.links || []).length;
  q('#addLnk').addEventListener('click', () => {
    q('#lnkList').insertAdjacentHTML('beforeend', linkRow({}, n++));
  });
  q('#lnkList').addEventListener('click', (e) => {
    if (e.target.closest('[data-rm-lnk]')) e.target.closest('.lnkrow').remove();
  });

  q('#srcForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    q('#srcErr').hidden = true;

    const links = [...host.querySelectorAll('.lnkrow')].map(r => ({
      label: r.querySelector('[data-f="label"]').value.trim(),
      url:   r.querySelector('[data-f="url"]').value.trim(),
    })).filter(l => l.url);

    const bad = links.find(l => !safeUrl(l.url));
    if (bad) {
      q('#srcErr').textContent = `ลิงก์ "${bad.url}" ใช้ไม่ได้ — ต้องขึ้นต้นด้วย http:// หรือ https://`;
      q('#srcErr').hidden = false;
      return;
    }

    const f = Object.fromEntries(new FormData(ev.target).entries());
    const btn = q('#srcSave');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await adapter.saveLeadSource(src.id, { ...f, links });
      close();
      await onSaved();
    } catch (e) {
      q('#srcErr').textContent = e.message;
      q('#srcErr').hidden = false;
      btn.disabled = false; btn.textContent = 'บันทึก';
    }
  });
}

// ══════════════════════════════════════════════════════════
// แถบ 4 — กลยุทธ์: เช็กลิสต์ชนะงาน 7 ข้อ + playbook รายเส้นทาง (step 3.2)
// ══════════════════════════════════════════════════════════

async function drawPlaybook(body, root, me, redraw) {
  let sources = [], rows = [];
  try {
    [sources, rows] = await Promise.all([
      adapter.listLeadSources(),
      adapter.listPending({ status: 'active', limit: 1000 }),
    ]);
  } catch (e) {
    const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(e.message);
    body.innerHTML = `<div class="empty">
        <strong>${missing ? 'ยังไม่ได้สร้างตารางแหล่งงาน' : 'โหลดข้อมูลไม่สำเร็จ'}</strong>
        ${missing ? 'เอาไฟล์ <code>db/phase3-1.sql</code> และ <code>db/phase3-2.sql</code> ไปรันใน Supabase ก่อน'
                  : esc(e.message)}
      </div>`;
    return;
  }

  const editable = canGaps(me);
  const gaps = checkGaps(rows);
  const openN = gaps[0]?.total || 0;

  // playbook ยังไม่มีเลยสักเส้นทาง = ยังไม่ได้รัน phase3-2.sql
  const noPlaybook = sources.length > 0 && sources.every(s => !has(s.playbook));

  body.innerHTML = `
    <div class="card wincard">
      <div class="win-h">
        <strong>เช็กลิสต์ชนะงาน 7 ข้อ</strong>
        <span class="win-sub">นับจาก ${openN} งานที่ยังเดินอยู่และคุณมีสิทธิ์เห็น</span>
      </div>
      ${openN === 0
        ? '<p class="tm-nomem" style="padding:8px 0">ยังไม่มีงานที่เดินอยู่ — เพิ่มงานในแถบ Pending Project ก่อน แล้วตัวเลขตรงนี้จะขึ้นเอง</p>'
        : `<ol class="winlist">
        ${gaps.map((g, i) => {
          const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
          const tone = pct >= 80 ? 'ok' : pct >= 40 ? 'warn' : 'bad';
          return `<li class="winrow">
            <span class="win-no">${i + 1}</span>
            <div class="win-main">
              <div class="win-label">${esc(g.label)}</div>
              <div class="win-hint">${esc(g.hint)}</div>
              <div class="win-bar tone-${tone}"><span style="width:${pct}%"></span></div>
            </div>
            <div class="win-right">
              <span class="win-pct tone-${tone}">${pct}%</span>
              <span class="win-miss">${g.miss ? `ยังขาด ${g.miss} งาน · ${fmtMB(g.missValue)} ล้านบาท` : 'ครบทุกงาน ✓'}</span>
            </div>
          </li>`;
        }).join('')}
      </ol>`}
      <p class="sec-foot">ทั้ง 7 ข้อตรวจจากช่องในฟอร์ม Pending Project โดยตรง — กรอกช่องให้ครบ ตัวเลขตรงนี้ขึ้นเอง</p>
    </div>

    ${noPlaybook ? `<div class="empty" style="margin-top:16px">
        <strong>ยังไม่มีเนื้อหากลยุทธ์</strong>
        เอาไฟล์ <code>db/phase3-2.sql</code> ไปรันใน Supabase → SQL Editor
        เพื่อเพิ่มคอลัมน์ <code>playbook</code> พร้อมเนื้อหาตั้งต้น 8 เส้นทาง
      </div>` : `
      <h3 class="q-h3" style="margin-top:22px">กลยุทธ์รายเส้นทาง</h3>
      <p class="sec-foot" style="margin:0 0 12px">
        ${editable ? 'แก้ได้ที่ปุ่ม "แก้ไข" — เป็นของกลางทั้งทีม แก้แล้วทุกคนเห็นทันที'
                   : 'เป็นของกลางทั้งทีม แก้ได้เฉพาะหัวหน้างานและผู้ดูแลระบบ'}
      </p>
      <div class="srcgrid">
        ${sources.map(s => `
          <div class="card pbcard">
            <div class="src-h">
              <span class="src-ico">${esc(s.icon || '•')}</span>
              <div class="src-title"><strong>${esc(s.name)}</strong></div>
              ${editable ? `<button type="button" class="btn btn-ghost btn-sm"
                              data-edit-pb="${esc(s.id)}">แก้ไข</button>` : ''}
            </div>
            ${has(s.playbook)
              ? `<ul class="pblist">${bullets(s.playbook).map(b => `<li>${esc(b)}</li>`).join('')}</ul>`
              : '<p class="src-nolink">— ยังไม่ได้เขียนกลยุทธ์เส้นทางนี้ —</p>'}
            ${(s.links || []).length ? `<div class="pb-links">
              <span class="pb-links-h">🔗 ลิงก์เข้าทำงาน</span>
              ${linksHtml(s.links)}
            </div>` : ''}
          </div>`).join('')}
      </div>`}`;

  body.querySelectorAll('[data-edit-pb]').forEach(b => {
    b.addEventListener('click', () =>
      openSourceEdit(root.querySelector('#sPanel'), sources.find(r => r.id === b.dataset.editPb), redraw));
  });
}

/** ตัด playbook เป็นข้อ ๆ — ตัด • หรือ - นำหน้าออก บรรทัดว่างข้าม */
function bullets(text) {
  return String(text || '')
    .split('\n')
    .map(l => l.trim().replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

/** แก้ playbook ได้เท่ากับแก้แหล่งงาน — ใช้เกณฑ์เดียวกับ policy ls_write */
const canGaps = (me) => canSign(me);
