// F5 — Book 3 สี (Phase 2.2)
//
// สมุดลูกค้ารายบุคคล แบ่ง 3 สีตามความสนิท — ยกโครงจากฟอร์มกระดาษ BOOK 3 สี 2 หน้า
// ใช้คอมโพเนนต์ร่วมกับ Pending Project: ปฏิทิน (ui/datepicker) · รายการบันทึก (ui/loglist)

import { adapter } from '../data/adapter.js';
import { dateField, thaiDate, initDatePicker } from '../ui/datepicker.js';
import { logListHtml, bindLogEditing, logFormHtml, readLogForm, clearLogForm } from '../ui/loglist.js';
import { signoffState, signoffBarHtml, bindSignoff, canSign,
         signoffHistoryHtml, bindSignoffHistory } from '../ui/signoff.js';
import { printCustomer, printCustomerBatch } from '../ui/formprint.js';
import { photoFieldHtml, bindPhotoField } from '../ui/photofield.js';
import { cardFieldHtml, bindCardField } from '../ui/cardfield.js';
import { openAIImport, openAILog } from './ai-intake.js';
import { mountTeamScope } from '../ui/teamscope.js';
import { mountPersonScope, ownerSelectHtml } from '../ui/personscope.js';
import { lastLogSpan, mountLogHover } from '../ui/loghover.js';
import { listViewHtml, bindListView, applyListView } from '../ui/listview.js';
import { richFieldHtml, bindRichFields } from '../ui/richtext.js';

// ── สี 3 ระดับ ── (ความหมายจากฟอร์มกระดาษ)
export const COLORS = [
  { id: 'green',  dot: '🟢', label: 'สนิท / ซื้อประจำ',      short: 'เขียว' },
  { id: 'yellow', dot: '🟡', label: 'ซื้อบ้าง / มีโอกาส',     short: 'เหลือง' },
  { id: 'red',    dot: '🔴', label: 'เพิ่งเริ่ม / โอกาสน้อย', short: 'แดง' },
];
const colorOf = (id) => COLORS.find(c => c.id === id) || COLORS[2];

// ── DOCC — ประเภทลูกค้าในงานก่อสร้าง (D-O-C-C · เจ้าของขอ 27 ก.ค. 2569) ──
// ตัว C ซ้ำ 2 แบบ (Contractor/Consult) → เก็บ "คำเต็ม" ในฐานข้อมูล · หน้าจอโชว์ตัวย่อ
export const DOCC = [
  { id: 'designer',   letter: 'D', label: 'Designer (ผู้ออกแบบ)' },
  { id: 'owner',      letter: 'O', label: 'Owner (เจ้าของงาน)' },
  { id: 'contractor', letter: 'C', label: 'Contractor (ผู้รับเหมา)' },
  { id: 'consult',    letter: 'C', label: 'Consult (ที่ปรึกษา)' },
];
const doccOf = (id) => DOCC.find(d => d.id === id) || null;

const LS_VIEW = 'te-dashboard:book3-view';
const DEFAULT_VIEW = { color: '', docc: '', search: '', status: 'active', sort: 'updated_at', dir: 'desc', team: '', person: '' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function loadView() {
  try { return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(LS_VIEW) || '{}') }; }
  catch { return { ...DEFAULT_VIEW }; }
}
const saveView = (v) => { try { localStorage.setItem(LS_VIEW, JSON.stringify(v)); } catch {} };

/** อายุ (ตัวเลข) จากวันเกิด — ไม่เก็บอายุลง DB (เปลี่ยนทุกปีจะเพี้ยน) คำนวณจาก birthday เสมอ */
function ageNum(birthday) {
  if (!birthday) return '';
  const b = new Date(birthday);
  if (isNaN(b)) return '';
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a >= 0 && a < 130 ? a : '';
}
/** อายุแบบมีหน่วยไว้โชว์ เช่น "45 ปี" */
function ageOf(birthday) {
  const n = ageNum(birthday);
  return n === '' ? '' : `${n} ปี`;
}
/**
 * ข้อความอายุไว้โชว์ในตาราง/พิมพ์
 * มีวันเกิดจริง → คำนวณจากวันเกิด (แม่นเสมอ) · ไม่มีวันเกิด → ใช้ age ที่กรอกเก็บไว้
 * (90% ไม่รู้วันเกิดลูกค้า จึงเก็บ "อายุ" แยกไว้ · ไม่สร้างวันเกิดปลอมมาแสดง)
 */
function ageText(row) {
  if (row?.birthday) return ageOf(row.birthday);
  const a = row?.age;
  return (a != null && String(a).trim() !== '') ? `${a} ปี` : '';
}

const lastLogCell = (r) => {
  const l = r.last_log;
  const btn = `<button type="button" class="btn-log" data-log="${esc(r.id)}"
                 title="บันทึกการติดตามวันนี้">＋ บันทึก</button>`;
  if (!l) return `<div class="lastlog"><span class="nolog">— ยังไม่มีบันทึก —</span>${btn}</div>`;
  return `<div class="lastlog">
    <div class="lastlog-txt">
      <span class="lastlog-h">${esc(thaiDate(l.log_date) || l.log_date || '')}${l.by_name ? ' · ' + esc(l.by_name) : ''}</span>
      ${lastLogSpan(l)}
    </div>${btn}
  </div>`;
};

export default {
  title: 'Book 3 สี',
  subtitle: '🟢 สนิท/ซื้อประจำ · 🟡 มีโอกาส · 🔴 เพิ่งเริ่ม',

  async render(root) {
    initDatePicker();
    const view = loadView();
    let teams = [];
    try { teams = await adapter.listTeams(); } catch { /* ไม่มีทีมก็ยังใช้ได้ */ }
    // รายชื่อคน (สำหรับดรอปดาวน์เลือกดูรายบุคคล) + ผู้ใช้ปัจจุบัน — RLS คัดมาให้แล้วว่าเห็นใครได้บ้าง
    let people = [], meId = null;
    try { people = await adapter.listProfiles(); } catch { /* listProfiles ล้มเหลว = ยังมีตัวเราจาก session อยู่ดี */ }
    try {
      const su = (await adapter.getSession())?.user || null;
      meId = su?.id || null;
      // ให้แน่ใจว่ามี "ตัวเรา" ในลิสต์เสมอ (เผื่อ listProfiles คืนไม่ครบ/ล้มเหลว) → ดรอปดาวน์ "ดูของ" โผล่แน่นอน
      if (su && meId && !people.some(p => p.id === meId))
        people = [{ id: su.id, full_name: su.full_name, email: su.email, team_id: su.team_id, is_active: true }, ...people];
    } catch { /* ไม่รู้ว่าเป็นใครก็ยังใช้ได้ */ }
    // แก้ sale_id (บัญชี) → ชื่อจากโปรไฟล์ปัจจุบัน · เปลี่ยนชื่อในตั้งค่าระบบแล้วอัปเดตตามทันที (ไม่ก๊อปชื่อลงแถว)
    const peopleById = new Map((people || []).map(p => [p.id, p]));
    const ownerName  = (id) => { const p = peopleById.get(id); return p ? (p.full_name || p.email || '') : ''; };

    root.innerHTML = `
      <div class="toolbar">
        <input class="inp inp-search" id="bSearch" type="search"
               placeholder="ค้นหาชื่อ / หน่วยงาน / เบอร์โทร…"
               value="${esc(view.search)}" autocapitalize="off" spellcheck="false">
        <button class="btn btn-ai btn-sm" id="bAI" title="แปลงรูปนามบัตร/โน้ต เป็นลูกค้าด้วย AI">🤖 AI Import</button>
        <button class="btn btn-primary btn-sm" id="bNew">+ เพิ่มลูกค้า</button>
      </div>

      <div class="toolbar toolbar-sub">
        <div class="segmented" id="bColor" role="tablist" aria-label="สีความสัมพันธ์">
          <button type="button" data-color="" class="${!view.color ? 'on' : ''}">ทุกสี</button>
          ${COLORS.map(c => `
            <button type="button" data-color="${c.id}" class="${view.color === c.id ? 'on' : ''}"
                    title="${esc(c.label)}">${c.dot} ${esc(c.short)}
              <span class="seg-badge" data-count="${c.id}" hidden></span>
            </button>`).join('')}
        </div>

        <select class="inp inp-sm" id="bDocc" title="กรองตามประเภทลูกค้า (DOCC)">
          <option value="">ทุกประเภท (DOCC)</option>
          ${DOCC.map(d => `<option value="${d.id}" ${view.docc === d.id ? 'selected' : ''}>${d.letter} · ${esc(d.label)}</option>`).join('')}
        </select>

        <div class="segmented" id="bStatus" role="tablist" aria-label="สถานะ">
          <button type="button" data-status="active"   class="${view.status === 'active'   ? 'on' : ''}">ที่ติดต่ออยู่</button>
          <button type="button" data-status="archived" class="${view.status === 'archived' ? 'on' : ''}">
            Archive <span class="seg-badge" id="bArcCount" hidden></span>
          </button>
          <button type="button" data-status="all"      class="${view.status === 'all'      ? 'on' : ''}">ทั้งหมด</button>
        </div>

        ${listViewHtml()}
        <button class="btn btn-ghost btn-sm" id="bCsv">⭳ CSV</button>
        <button class="btn btn-ghost btn-sm" id="bPrintAll"
                title="พิมพ์ลูกค้าที่กรองอยู่ตอนนี้ รวมเป็น PDF ไฟล์เดียว (ตามฟอร์ม Potential)">🖨 พิมพ์ทั้งหมด</button>
      </div>

      <div id="bScope"></div>
      <div id="bPersonScope"></div>
      <div class="sum" id="bSum"></div>
      <div id="bList"><div class="skeleton">กำลังโหลด…</div></div>
      <div id="bPanel"></div>`;

    const $ = (id) => root.querySelector('#' + id);
    const listEl = $('bList');
    mountLogHover(listEl);   // ชี้เมาส์ที่ความคืบหน้า → เด้ง popup เต็ม
    bindListView(root, listEl);   // ปุ่มสลับ ตาราง/การ์ด (laptop/iPad)
    let rawRows = [];   // ทั้งหมดที่ RLS ให้เห็น
    let rows = [];      // หลังกรองทีม + คน + DOCC
    let scope = null, pscope = null;
    let allActive = [], arcRows = [], arcHidden = 0;   // ป้ายจำนวน (สี/Archive) — นับตามขอบเขต ทีม/คน (#11)

    // กรองทีม → เจาะรายบุคคล (ต่อกัน) — ใช้ทั้งการนับป้ายและการแสดงรายการ
    const scopeTP = (list) => {
      let r = scope ? scope.filter(list) : list;
      r = pscope ? pscope.filter(r) : r;
      return r;
    };

    // กรองทีม → คน → DOCC — ใช้ที่เดียวทั้งตอนโหลดใหม่และตอนสลับตัวกรอง
    const applyScopes = () => {
      let r = scopeTP(rawRows);
      if (view.docc) r = r.filter(x => x.docc === view.docc);   // กรองประเภทลูกค้า (ฝั่งเบราว์เซอร์)
      rows = r;
      updateBadges();
    };

    // ป้ายจำนวน 🟢🟡🔴 + Archive — นับเฉพาะ "ของตัวเอง/ทีมที่เลือก" (เจ้าของขอ 27 ก.ค. 2569)
    function updateBadges() {
      const scopedActive = scopeTP(allActive);
      for (const c of COLORS) {
        const el = root.querySelector(`[data-count="${c.id}"]`);
        const n = scopedActive.filter(r => r.color === c.id).length;
        if (el) { el.textContent = n; el.hidden = n === 0; }
      }
      const arc = scopeTP(arcRows).length;
      arcHidden = Math.max(0, arcRows.length - arc);   // งานในคลังนอกทีม/คนที่เลือก (บอกผู้ใช้ ห้ามซ่อนเงียบ)
      const ae = $('bArcCount');
      if (ae) { ae.textContent = arc; ae.hidden = arc === 0; }
    }

    // แถบเลือกทีม (admin/หัวหน้าที่เห็นหลายทีม) — กรองฝั่งเบราว์เซอร์ ไม่โหลดใหม่
    scope = mountTeamScope($('bScope'), teams, view.team || '', (id) => {
      view.team = id;
      // เปลี่ยนทีม → รายชื่อในดรอปดาวน์ "ดูของ" ตามสมาชิกทีมนั้น
      if (pscope) { pscope.setTeam(id); view.person = pscope.selected(); }
      saveView(view);
      applyScopes();
      paint();
    });

    // ดรอปดาวน์เลือกดูรายบุคคล — รายชื่อ = สมาชิกของทีมที่เลือก · กรองต่อจากทีม
    // ⚠️ Book 3 สี ใช้ sale_id เป็นเจ้าของแถว (ไม่ใช่ owner_id เหมือน Pending)
    pscope = mountPersonScope($('bPersonScope'),
      { people, teams, meId, ownerField: 'sale_id', teamId: view.team || '', initial: view.person || '', defaultSelf: true }, (id) => {
      view.person = id; saveView(view);
      applyScopes();
      paint();
    });

    async function reload() {
      saveView(view);
      listEl.innerHTML = '<div class="skeleton">กำลังโหลด…</div>';
      try {
        rawRows = await adapter.listCustomers({
          status: view.status,
          color:  view.color  || undefined,
          search: view.search || undefined,
          sort: view.sort, dir: view.dir,
        });
      } catch (e) {
        // ยังไม่ได้รัน db/phase2.sql → ตารางยังไม่มี ต้องบอกให้ชัดว่าต้องทำอะไร
        const missing = /does not exist|42P01|relation/i.test(e.message);
        listEl.innerHTML = `<div class="empty">
            <strong>${missing ? 'ยังไม่ได้สร้างตารางลูกค้า' : 'โหลดข้อมูลไม่สำเร็จ'}</strong>
            ${missing ? 'เอาไฟล์ <code>db/phase2.sql</code> ไปรันใน Supabase → SQL Editor ก่อน'
                      : esc(e.message)}
          </div>`;
        $('bSum').textContent = '';
        return;
      }
      // ข้อมูลสำหรับป้ายจำนวน (สี + Archive) — นับตามขอบเขตทีม/คน (เจ้าของขอ 27 ก.ค. 2569)
      try { allActive = await adapter.listCustomers({ status: 'active',   limit: 2000 }); } catch { allActive = []; }
      try { arcRows   = await adapter.listCustomers({ status: 'archived', limit: 2000 }); } catch { arcRows = []; }
      applyScopes();   // กรองตามทีม + คน + DOCC + อัปเดตป้ายจำนวน
      paint();
    }

    function paint() {
      $('bSum').innerHTML = rows.length
        ? `พบ <b>${rows.length}</b> ราย` +
          COLORS.map(c => {
            const n = rows.filter(r => r.color === c.id).length;
            return n ? ` · ${c.dot} <b>${n}</b>` : '';
          }).join('')
        : '';

      // อยู่แท็บ Archive แต่มีลูกค้าในคลังนอกทีม/คนที่เลือก → บอกให้ชัด (เหมือนหน้า Pending)
      const arcNote = (view.status === 'archived' && arcHidden) ? `
        <div class="filter-hidden-note">
          🔒 มีลูกค้าในคลังอีก <b>${arcHidden}</b> รายที่อยู่นอกทีม/คนที่เลือก จึงไม่แสดงตอนนี้
          — กด <b>รวมทุกทีม</b> หรือเลือก <b>— ทุกคน —</b> ในตัวกรองด้านบนเพื่อดู
        </div>` : '';

      if (!rows.length) {
        const filtered = view.search || view.color || view.docc;
        listEl.innerHTML = arcNote + `<div class="empty">
            <strong>ยังไม่มีลูกค้าที่ตรงกับเงื่อนไข</strong>
            ${filtered ? 'ลองล้างตัวกรอง หรือกด "+ เพิ่มลูกค้า"'
                       : 'กด "+ เพิ่มลูกค้า" เพื่อเริ่มบันทึกรายแรก'}
          </div>`;
        return;
      }

      listEl.innerHTML = arcNote + `
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr>
              <th style="min-width:60px">สี</th>
              <th data-sort="name" style="min-width:200px">ชื่อ${view.sort === 'name' ? (view.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              <th data-sort="org" style="min-width:170px">หน่วยงาน${view.sort === 'org' ? (view.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
              <th style="min-width:150px">ตำแหน่ง</th>
              <th style="min-width:140px">ติดต่อ</th>
              <th style="min-width:110px">ผู้ดูแล</th>
              <th style="min-width:240px" class="nosort">การติดตามล่าสุด</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr data-id="${esc(r.id)}" class="${r.is_active === false ? 'is-archived' : ''}">
                  <td><span class="b3dot" title="${esc(colorOf(r.color).label)}">${colorOf(r.color).dot}</span></td>
                  <td>${esc(r.name)}${ageText(r) ? `<div class="t2">${esc(ageText(r))}</div>` : ''}</td>
                  <td>${esc(r.org || '')}</td>
                  <td>${esc(r.position || '')}</td>
                  <td>${esc(r.tel || '')}${r.email ? `<div class="t2">${esc(r.email)}</div>` : ''}</td>
                  <td>${esc(ownerName(r.sale_id) || r.sale_name || r.teams?.code || '')
                        || '<span class="nolog">— ยังไม่ระบุ —</span>'}</td>
                  <td>${lastLogCell(r)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="cards">
          ${rows.map(r => `
            <div class="pcard" data-id="${esc(r.id)}" role="button" tabindex="0">
              <div class="pcard-top">
                <strong>${colorOf(r.color).dot} ${esc(r.name)}</strong>
              </div>
              <div class="pcard-mid">${esc(r.position || '')}${r.org ? ' · ' + esc(r.org) : ''}</div>
              <div class="pcard-bot">
                <span>${esc(r.tel || '—')}</span>
                <span>${esc(ownerName(r.sale_id) || r.sale_name || r.teams?.code || '')}</span>
              </div>
              <div class="pcard-log">${lastLogCell(r)}</div>
            </div>`).join('')}
        </div>`;
      applyListView(listEl);   // คงมุมมองที่เลือกไว้หลัง render ใหม่
    }

    // ── เหตุการณ์ ──
    let t = null;
    $('bSearch').addEventListener('input', (e) => {
      clearTimeout(t);
      view.search = e.target.value;
      t = setTimeout(reload, 300);
    });

    root.querySelectorAll('#bColor [data-color]').forEach(b => {
      b.addEventListener('click', () => {
        view.color = b.dataset.color;
        root.querySelectorAll('#bColor [data-color]').forEach(x => x.classList.toggle('on', x === b));
        reload();
      });
    });

    // กรอง DOCC (ประเภทลูกค้า) — ฝั่งเบราว์เซอร์ ไม่ต้องโหลดใหม่
    $('bDocc').addEventListener('change', (e) => {
      view.docc = e.target.value; saveView(view);
      applyScopes();
      paint();
    });

    root.querySelectorAll('#bStatus [data-status]').forEach(b => {
      b.addEventListener('click', () => {
        view.status = b.dataset.status;
        root.querySelectorAll('#bStatus [data-status]').forEach(x => x.classList.toggle('on', x === b));
        reload();
      });
    });

    listEl.addEventListener('click', (e) => {
      const lg = e.target.closest('[data-log]');
      if (lg) { e.stopPropagation(); return openQuickLog(root.querySelector('#bPanel'), lg.dataset.log, reload); }

      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.dataset.sort;
        if (view.sort === k) view.dir = view.dir === 'asc' ? 'desc' : 'asc';
        else { view.sort = k; view.dir = 'asc'; }
        return reload();
      }

      const hit = e.target.closest('[data-id]');
      if (hit) openDetail(root.querySelector('#bPanel'), hit.dataset.id, reload, teams, people);
    });

    listEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.pcard');
      if (!card) return;
      e.preventDefault();
      openDetail(root.querySelector('#bPanel'), card.dataset.id, reload, teams, people);
    });

    $('bNew').addEventListener('click', () => openDetail(root.querySelector('#bPanel'), null, reload, teams, people));
    $('bAI').addEventListener('click', () => openAIImport('customer', { onSaved: reload }));
    $('bCsv').addEventListener('click', () => exportCsv(rows, ownerName));

    // พิมพ์รวมลูกค้าหลายรายเป็น PDF เดียว (ตามฟอร์ม Potential) — ใช้ชุดที่กรองอยู่ตอนนี้
    $('bPrintAll').addEventListener('click', async () => {
      const btn = $('bPrintAll');
      const orig = '🖨 พิมพ์ทั้งหมด';
      if (!rows.length) { btn.textContent = 'ไม่มีรายการให้พิมพ์'; setTimeout(() => { btn.textContent = orig; }, 1600); return; }
      btn.disabled = true;
      try {
        await printCustomerBatch(rows.map(r => r.id), (i, n) => { btn.textContent = `กำลังเตรียม ${i}/${n}…`; });
      } catch (e) {
        btn.textContent = 'พิมพ์ไม่สำเร็จ'; setTimeout(() => { btn.textContent = orig; }, 2000);
        console.warn('พิมพ์รวมไม่สำเร็จ:', e.message);
      } finally {
        btn.disabled = false; if (btn.textContent.startsWith('กำลัง')) btn.textContent = orig;
      }
    });

    await reload();

    // มาจากหน้า "รอตรวจ" — เปิดรายการที่หัวหน้าเลือกให้เลย
    // ใช้ sessionStorage ไม่ใช่ hash เพราะ id ไม่ควรไปโผล่บน URL ที่แชร์กันได้
    const jump = sessionStorage.getItem('te:openRecord');
    if (jump) {
      sessionStorage.removeItem('te:openRecord');
      openDetail(root.querySelector('#bPanel'), jump, reload, teams, people);
    }

  },
};

// ══════════════════════════════════════════════════════════
// บันทึกการติดตามเร็ว
// ══════════════════════════════════════════════════════════

async function openQuickLog(host, customerId, onSaved) {
  let row = null;
  try { row = await adapter.getCustomer(customerId); } catch { /* ยังบันทึกได้ */ }
  const logs = row?.customer_logs || [];
  const me = await whoAmI();

  host.innerHTML = `
    <div class="modal" id="bqModal">
      <form class="modal-box modal-sm" id="bqForm">
        <div class="modal-head">
          <strong>บันทึกการติดตาม</strong>
          <button type="button" class="btn btn-ghost btn-sm" id="bqClose">ปิด</button>
        </div>
        <div class="modal-body">
          <p class="q-sub">${esc(row?.name || '')}${row?.org ? ' · ' + esc(row.org) : ''}</p>
          ${logFormHtml('bq')}
          ${logs.length ? `<h3 class="q-h3">ประวัติที่ผ่านมา (${logs.length})</h3>
            <ul class="loglist" id="bqLogList">${logListHtml(logs, me)}</ul>` : ''}
        </div>
        <p class="login-err" id="bqErr" role="alert" hidden></p>
        <div class="modal-foot">
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" id="bqCancel">ยกเลิก</button>
          <button type="submit" class="btn btn-primary" id="bqSave">บันทึก</button>
        </div>
      </form>
    </div>`;

  const q = (s) => host.querySelector(s);
  const close = () => { host.innerHTML = ''; };
  const fail = (m) => { q('#bqErr').textContent = m; q('#bqErr').hidden = false; };

  q('#bqClose').addEventListener('click', close);
  q('#bqCancel').addEventListener('click', close);
  q('#bqModal').addEventListener('mousedown', (e) => { if (e.target.id === 'bqModal') close(); });

  // วาดใหม่เฉพาะรายการประวัติ ไม่แตะสิ่งที่พิมพ์ค้างไว้ด้านบน
  async function reloadLogs() {
    let fresh = [];
    try { fresh = await adapter.listCustomerLogs(customerId); } catch { return; }
    const ul = q('#bqLogList');
    if (!ul) return;
    ul.innerHTML = logListHtml(fresh, me);
    bindLogEditing(ul, fresh, adapter.updateCustomerLog, reloadLogs, adapter.deleteCustomerLog);
    await onSaved();
  }
  if (logs.length) bindLogEditing(q('#bqLogList'), logs, adapter.updateCustomerLog, reloadLogs, adapter.deleteCustomerLog);

  q('#bqForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    q('#bqErr').hidden = true;
    const d = readLogForm(host, 'bq');
    if (!d) return fail('กรอก RESPONSE หรือ NEXT DOING อย่างน้อยหนึ่งช่อง');

    const btn = q('#bqSave');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await adapter.addCustomerLog({ ...d, customer_id: customerId });
      close();
      await onSaved();
    } catch (e) {
      fail(e.message);
      btn.disabled = false; btn.textContent = 'บันทึก';
    }
  });
}

async function whoAmI() {
  try { return (await adapter.getSession())?.user || null; } catch { return null; }
}

// ══════════════════════════════════════════════════════════
// ฟอร์มเต็ม — ตามฟอร์มกระดาษ BOOK 3 สี
// ══════════════════════════════════════════════════════════

const FORM = [
  { group: 'ข้อมูลลูกค้า', fields: [
    // ทีม + ผู้ดูแล + สีความสัมพันธ์ ไว้บนสุด (เจ้าของสั่งย้ายมาใกล้ทีม 27 ก.ค. 2569)
    // ค่าเริ่มต้น: ทีม/ผู้ดูแล = ของคนที่ล็อกอิน (แก้ได้)
    ['team_id',  'ทีมผู้ดูแล',              'team'],
    // SALE ผู้ดูแล = บัญชีผู้ใช้ (dropdown) · ค่าเริ่มต้น = คนที่ล็อกอิน · เก็บ sale_id ไม่ใช่ข้อความ
    // (เดิมเป็นช่องพิมพ์ sale_name — คงคอลัมน์ไว้ใน DB สำหรับข้อมูลเก่าที่ยังจับคู่บัญชีไม่ได้)
    ['sale_id',  'SALE NAME (sale ผู้ดูแล)', 'owner'],
    ['color',    'สีความสัมพันธ์',          'color'],
    ['docc',     'DOCC (ประเภทลูกค้า)',     'docc'],
    ['no',       'No. (รหัสในสมุด)', 'text'],
    ['name',     'ชื่อ-สกุล *',       'text'],
    ['nickname', 'ชื่อเล่น',           'text'],
    ['position', 'POSITION (ตำแหน่ง)', 'text'],
    ['org',      'หน่วยงาน / บริษัท',  'text'],
    ['birthday', 'BIRTHDAY (วันเกิด)', 'date'],
    ['age',      'AGE (อายุ)',         'age'],
    ['tel',      'TELEPHONE',         'tel'],
    ['email',    'EMAIL',             'email'],
  ]},
  { group: 'ที่อยู่', fields: [
    ['addr_office',   'ADDRESS (ที่ทำงาน)', 'area'],
    ['addr_home',     'ADDRESS (บ้าน)',     'area'],
    ['addr_hometown', 'ภูมิลำเนา',          'area'],
  ]},
  { group: 'ข้อมูลส่วนตัว (ใช้สร้างความสัมพันธ์)', fields: [
    ['education', 'EDUCATION (การศึกษา)',            'area'],
    ['family',    'FAMILY (คู่สมรส / บุตร / อื่น ๆ)', 'area'],
    ['hobby',     'HOBBY (งานอดิเรก)',               'text'],
    ['favorite',  'FAVORITE (ของชอบ)',               'text'],
  ]},
  // (กลุ่ม "การจัดกลุ่ม & ผู้ดูแล" ถอดออกแล้ว — ย้าย สีความสัมพันธ์ + SALE ผู้ดูแล ขึ้นไปบนสุด)
];

function fieldHtml([key, label, type], row, teams, people, meId) {
  const v = row?.[key] ?? '';

  if (type === 'owner')
    return ownerSelectHtml(key, label, v, people, meId);

  // ช่องข้อความยาว = rich text (ไฮไลต์/หนา/เอียง/ขีดเส้น/สีเข้ม) — เจ้าของขอ 27 ก.ค. 2569
  if (type === 'area')
    return richFieldHtml(key, v, { label });

  if (type === 'docc')
    return `<label class="fld"><span>${esc(label)}</span><select name="${key}">
      <option value="">— ยังไม่ระบุ —</option>
      ${DOCC.map(d => `<option value="${d.id}" ${v === d.id ? 'selected' : ''}>${d.letter} · ${esc(d.label)}</option>`).join('')}
    </select></label>`;

  if (type === 'date')
    return `<label class="fld"><span>${esc(label)}</span>${dateField(key, v, { label })}</label>`;

  // AGE — เก็บเป็น field อายุแยกต่างหาก (ไม่สร้างวันเกิดปลอม)
  //   • มีวันเกิดจริง → คำนวณอายุจากวันเกิดให้ (readonly · ไม่เก็บ age ดิบ)
  //   • ไม่รู้วันเกิด (90% ของลูกค้า) → กรอกอายุได้ เก็บลงคอลัมน์ age
  if (type === 'age') {
    const hasBday = !!row?.birthday;
    const ageV = hasBday ? ageNum(row.birthday) : (row?.age ?? '');
    return `<label class="fld"><span>${esc(label)}</span>
      <input type="number" name="age" data-age min="0" max="130" inputmode="numeric"
             value="${esc(ageV)}" placeholder="เช่น 45"${hasBday ? ' readonly' : ''}>
      <small class="fld-hint" data-age-hint>${hasBday
        ? 'คำนวณจากวันเกิดให้อัตโนมัติ'
        : 'ไม่ทราบวันเกิด — กรอกอายุโดยประมาณได้ (เก็บเป็นอายุ ไม่สร้างวันเกิดปลอม)'}</small></label>`;
  }

  if (type === 'color')
    return `<label class="fld"><span>${esc(label)}</span><select name="${key}">
      ${COLORS.map(c => `<option value="${c.id}" ${v === c.id ? 'selected' : ''}>${c.dot} ${esc(c.label)}</option>`).join('')}
    </select></label>`;

  if (type === 'team')
    return `<label class="fld"><span>${esc(label)}</span><select name="${key}">
      <option value="">— ยังไม่ระบุ —</option>
      ${teams.map(t => `<option value="${esc(t.id)}" ${v === t.id ? 'selected' : ''}>${esc(t.code)}</option>`).join('')}
    </select></label>`;

  const t = type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text';
  const extra = type === 'email' ? ' autocapitalize="off" spellcheck="false"'
              : type === 'tel'   ? ' inputmode="tel"' : '';
  return `<label class="fld"><span>${esc(label)}</span>
    <input type="${t}" name="${key}" value="${esc(v)}"${extra}></label>`;
}

async function openDetail(host, id, onSaved, teams, people) {
  let row = null;
  if (id) {
    host.innerHTML = '<div class="modal"><div class="modal-box"><div class="skeleton">กำลังโหลด…</div></div></div>';
    try { row = await adapter.getCustomer(id); }
    catch (e) {
      host.innerHTML = `<div class="modal"><div class="modal-box">
        <div class="empty">เปิดข้อมูลลูกค้าไม่ได้ — ${esc(e.message)}</div></div></div>`;
      return;
    }
  }

  const logs = row?.customer_logs || [];
  const me = await whoAmI();
  const archived = row?.is_active === false;

  // ลูกค้าใหม่: ตั้งทีม + SALE ผู้ดูแลเริ่มต้น = ทีม/บัญชีของคนที่ล็อกอิน (เลือกเปลี่ยนได้)
  const formRow = row || { team_id: me?.team_id || '', sale_id: me?.id || '' };

  let soState = { kind: 'none' };
  let soHist  = [];
  if (id) {
    try {
      const list = await adapter.listSignoffs('customers', [id]);
      soState = signoffState(row, list?.[0]);
    } catch { soState = null; }
    try { soHist = await adapter.listSignoffHistory('customers', id); } catch { soHist = []; }
  }

  host.innerHTML = `
    <div class="modal" id="bModal">
      <form class="modal-box" id="bForm">
        <div class="modal-head">
          <strong>${id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</strong>
          ${archived ? `<span class="tag" style="--tag-c:var(--text-mute)">เก็บเข้าคลังแล้ว${
              row?.archived_at ? ' · ' + esc(thaiDate(String(row.archived_at).slice(0, 10))) : ''}</span>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" id="bClose">ปิด</button>
        </div>

        <div class="modal-body">
          ${id && soState ? signoffBarHtml(soState, canSign(me)) : ''}
          <section class="fgroup">
            <h3>รูปลูกค้า & นามบัตร</h3>
            <div class="photo-card-row">
              <div class="pc-photo">
                <div class="pf-label">รูปลูกค้า</div>
                ${photoFieldHtml(row?.photo_url)}
              </div>
              <div class="pc-cards">
                <div class="pf-label">นามบัตร <span class="pf-hint" style="font-weight:400">สูงสุด 2 รูป · กดที่รูปเพื่อดูเต็ม/ซูม</span></div>
                ${cardFieldHtml(row?.card_front_url, row?.card_back_url)}
              </div>
            </div>
          </section>
          ${FORM.map(g => `
            <section class="fgroup">
              <h3>${esc(g.group)}</h3>
              <div class="fgrid">${g.fields.map(f => fieldHtml(f, formRow, teams, people, me?.id)).join('')}</div>
            </section>`).join('')}

          <section class="fgroup">
            <h3>บันทึกการติดตาม ${id ? `(<span id="bLogCount">${logs.length}</span>)` : ''}</h3>
            ${id ? `
              ${logFormHtml('bl')}
              <div class="lg-add-row">
                <button type="button" class="btn btn-ghost btn-sm" id="blAdd">+ เพิ่มบันทึก</button>
                <button type="button" class="btn btn-ai btn-sm" id="blAILog" title="ให้ AI ช่วยสรุปความก้าวหน้าจากข้อความ/เสียง/รูป เป็นบันทึกติดตาม">🤖 AI บันทึก</button>
                <span class="lg-hint">หรือกด "บันทึก" ด้านล่างก็เก็บให้เหมือนกัน</span>
              </div>
              ${soHist.length ? `<div class="so-hist-wrap">
                <div class="so-hist-h">🔖 การตรวจของหัวหน้า (${soHist.length})</div>
                ${signoffHistoryHtml(soHist)}
              </div>` : ''}
              <ul class="loglist" id="bLogList">${logListHtml(logs, me)}</ul>`
            : `<div class="empty" style="padding:20px">
                 บันทึกการติดตามเพิ่มได้หลังกด "บันทึก" ลูกค้ารายนี้แล้ว
               </div>`}
          </section>
        </div>

        <p class="login-err" id="bErr" role="alert" hidden></p>

        <div class="modal-foot">
          ${id ? `
            <button type="button" class="btn btn-ghost btn-sm" id="bToPending"
                    title="สร้างงานใหม่ในแถบ Pending Project จากลูกค้ารายนี้">↗ ยกขึ้นเป็น Pending Project</button>
            <button type="button" id="bArch"
                    class="btn btn-sm ${archived ? 'btn-ghost' : 'btn-danger'}">
              ${archived ? '↩ ดึงกลับมาติดต่อต่อ' : 'ไม่ติดต่อแล้ว — เก็บเข้าคลัง'}
            </button>
            ${archived ? `<button type="button" id="bDelete" class="btn btn-sm btn-danger"
                    title="ลบออกจากฐานข้อมูลถาวร — กู้กลับไม่ได้">🗑 ลบถาวร</button>` : ''}` : ''}
          <span class="spacer"></span>
          ${id ? `<button type="button" class="btn btn-ghost" id="bPrint"
                    title="ดูลูกค้ารายนี้เป็นมุมมองฟอร์ม Potential ต้นฉบับบนจอ · พิมพ์/บันทึก PDF ได้ในตัว (ตั้ง Margins: None + เปิด Background graphics ให้มุมสีชิดขอบ)">📄 ดูแบบฟอร์ม / พิมพ์</button>` : ''}
          <button type="button" class="btn btn-ghost" id="bCancel">ยกเลิก</button>
          <button type="submit" class="btn btn-primary" id="bSave">บันทึก</button>
        </div>
      </form>
    </div>`;

  const q = (s) => host.querySelector(s);
  const close = () => { host.innerHTML = ''; };
  const fail = (m) => { q('#bErr').textContent = m; q('#bErr').hidden = false; };

  // ลบรูปได้เฉพาะ admin หรือ "เจ้าของลูกค้า" (sale_id ตรงกับเรา) · ลูกค้าใหม่/ยังไม่ระบุผู้ดูแล = ลบได้
  const canDeleteImg = !id || me?.role === 'admin' || !row?.sale_id || row.sale_id === me?.id;
  // ช่องรูปลูกค้า (step 3.9+) — bindPhotoField จัดการเลือก/ย่อ/ลบ + เก็บลง input[name=photo_url]
  const photoEl = host.querySelector('.photofield');
  if (photoEl) bindPhotoField(photoEl, { onError: fail, canDelete: canDeleteImg });
  // ช่องนามบัตร 2 รูป (ด้านหน้า/ด้านหลัง) → เก็บลง input[name=card_front_url|card_back_url] · กดดูซูมได้
  const cardEl = host.querySelector('.cardfield');
  if (cardEl) bindCardField(cardEl, { onError: fail, canDelete: canDeleteImg });
  // ช่องข้อความมีรูปแบบ (rich text) — ผูกแถบเครื่องมือ + sync HTML ที่ล้างแล้วลง hidden input
  bindRichFields(host);

  // ── มีวันเกิดจริง → คำนวณอายุให้ (ล็อกช่อง) · ไม่มีวันเกิด → กรอกอายุเองได้ (ไม่สร้างวันเกิดปลอม) ──
  const bdayHidden = host.querySelector('[name="birthday"]');
  const ageInput   = host.querySelector('[data-age]');
  const ageHint    = host.querySelector('[data-age-hint]');
  if (bdayHidden && ageInput) {
    bdayHidden.addEventListener('change', () => {
      const b = bdayHidden.value;
      if (b) {
        ageInput.value = ageNum(b);       // เลือกวันเกิด → คำนวณอายุ + ล็อกไม่ให้พิมพ์
        ageInput.readOnly = true;
        if (ageHint) ageHint.textContent = 'คำนวณจากวันเกิดให้อัตโนมัติ';
      } else {
        ageInput.readOnly = false;        // ล้างวันเกิด → กรอกอายุเองได้อีกครั้ง
        if (ageHint) ageHint.textContent = 'ไม่ทราบวันเกิด — กรอกอายุโดยประมาณได้ (เก็บเป็นอายุ ไม่สร้างวันเกิดปลอม)';
      }
    });
  }

  q('#bClose').addEventListener('click', close);
  q('#bCancel').addEventListener('click', close);

  if (id && soState && canSign(me)) {
    bindSignoff(host, 'customers', id, adapter.addSignoff, async () => {
      close();
      await onSaved();
    });
  }
  bindSignoffHistory(host);   // ปุ่มขยายดูคอมเมนต์ในประวัติการตรวจ

  async function reloadLogs() {
    let fresh = [];
    try { fresh = await adapter.listCustomerLogs(id); } catch { return; }
    const ul = q('#bLogList');
    if (!ul) return;
    ul.innerHTML = logListHtml(fresh, me);
    const cnt = q('#bLogCount');
    if (cnt) cnt.textContent = fresh.length;
    bindLogEditing(ul, fresh, adapter.updateCustomerLog, reloadLogs, adapter.deleteCustomerLog);
    await onSaved();
  }
  if (id) bindLogEditing(q('#bLogList'), logs, adapter.updateCustomerLog, reloadLogs, adapter.deleteCustomerLog);

  q('#blAdd')?.addEventListener('click', async () => {
    const d = readLogForm(host, 'bl');
    if (!d) return fail('กรอก RESPONSE หรือ NEXT DOING อย่างน้อยหนึ่งช่อง');
    try {
      await adapter.addCustomerLog({ ...d, customer_id: id });
      clearLogForm(host, 'bl');
      await reloadLogs();
    } catch (e) { fail(e.message); }
  });

  // 🤖 AI บันทึก — ให้ AI สรุปความก้าวหน้าเป็นบันทึกติดตาม (เขียนผ่าน addCustomerLog เดิม + RLS ปกติ)
  q('#blAILog')?.addEventListener('click', () => openAILog('customer', {
    recordName: q('[name="name"]')?.value || row?.name || '',
    defaultBy:  me?.full_name || me?.email || '',
    addLogFn:   (d) => adapter.addCustomerLog({ ...d, customer_id: id }),
    onSaved:    reloadLogs,
  }));

  q('#bForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    q('#bErr').hidden = true;

    const payload = Object.fromEntries(new FormData(ev.target).entries());
    if (id) payload.id = id;
    if (!String(payload.name || '').trim()) return fail('กรอกชื่อลูกค้าก่อน');

    // AGE: มีวันเกิดจริง → คำนวณเอา ไม่เก็บอายุดิบ (null) · ไม่มีวันเกิด → เก็บอายุที่กรอก
    payload.age = String(payload.birthday || '').trim()
      ? null
      : (String(payload.age ?? '').trim() === '' ? null : Number(payload.age));

    const btn = q('#bSave');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      const saved = await adapter.saveCustomer(payload);
      // บันทึกที่พิมพ์ค้างไว้แต่ยังไม่กด "+ เพิ่มบันทึก" ต้องถูกเก็บด้วย
      const cid = id || saved?.id;
      const d = readLogForm(host, 'bl');
      if (d && cid) await adapter.addCustomerLog({ ...d, customer_id: cid });
      close();
      await onSaved();
    } catch (e) {
      fail(e.message);
      btn.disabled = false; btn.textContent = 'บันทึก';
    }
  });

  // เก็บเข้าคลัง — ต้องกด 2 ครั้ง (กติกาเดียวกับ Pending Project)
  let armed = false;
  const arch = q('#bArch');
  arch?.addEventListener('click', async () => {
    if (!archived && !armed) {
      armed = true;
      arch.textContent = 'กดอีกครั้งเพื่อยืนยัน';
      arch.classList.add('is-armed');
      setTimeout(() => {
        if (!armed) return;
        armed = false;
        arch.textContent = 'ไม่ติดต่อแล้ว — เก็บเข้าคลัง';
        arch.classList.remove('is-armed');
      }, 4000);
      return;
    }
    try {
      await adapter.archiveCustomer(id, !archived);
      close();
      await onSaved();
    } catch (e) { fail(e.message); }
  });

  // ── ลบถาวร (เฉพาะลูกค้าที่ archive แล้ว · step 3.11) — กด 2 ครั้งยืนยัน ──
  let delArmed = false;
  const delBtn = q('#bDelete');
  delBtn?.addEventListener('click', async () => {
    if (!delArmed) {
      delArmed = true;
      delBtn.textContent = 'ลบถาวร? กดอีกครั้ง (กู้กลับไม่ได้)';
      delBtn.classList.add('is-armed');
      setTimeout(() => {
        if (!delArmed) return;
        delArmed = false;
        delBtn.textContent = '🗑 ลบถาวร';
        delBtn.classList.remove('is-armed');
      }, 4000);
      return;
    }
    delBtn.disabled = true; delBtn.textContent = 'กำลังลบ…';
    try {
      await adapter.deleteCustomer(id);
      close();
      await onSaved();
    } catch (e) {
      delBtn.disabled = false; delBtn.textContent = '🗑 ลบถาวร'; delArmed = false;
      delBtn.classList.remove('is-armed');
      fail(e.message);
    }
  });

  // ── ยกลูกค้าขึ้นเป็น Pending Project ──
  // พิมพ์ตามฟอร์ม Potential ต้นฉบับ / บันทึกเป็น PDF (step 3.9)
  q('#bPrint')?.addEventListener('click', async () => {
    const b = q('#bPrint');
    b.disabled = true; b.textContent = 'กำลังเตรียม…';
    try {
      await printCustomer(id);
    } catch (e) {
      fail('พิมพ์ไม่สำเร็จ: ' + e.message);
    } finally {
      b.disabled = false; b.textContent = '📄 ดูแบบฟอร์ม / พิมพ์';
    }
  });

  q('#bToPending')?.addEventListener('click', async () => {
    const name = q('[name="name"]').value.trim();
    const org  = q('[name="org"]').value.trim();
    const btn  = q('#bToPending');
    btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
    try {
      const p = await adapter.savePending({
        project_name:  `งานของ ${org || name}`,
        customer_name: org || name,
        stage:         'lead',
        value_baht:    0,
        team_id:       q('[name="team_id"]').value || null,
        // โยงกลับมาที่ลูกค้ารายนี้ให้รู้ว่างานมาจากไหน
        lead_source:   'Book 3 สี',
        customer_needs: `ผู้ติดต่อ: ${name}${q('[name="position"]').value ? ' (' + q('[name="position"]').value + ')' : ''}`,
      });
      // ยกผู้ติดต่อไปเป็น CONTACT TO 1 ของงานนั้นด้วย
      if (p?.id) {
        await adapter.saveContacts(p.id, [{
          slot: 1,
          name,
          status: q('[name="position"]').value.trim() || null,
          phone:  q('[name="tel"]').value.trim() || null,
          email:  q('[name="email"]').value.trim() || null,
        }, { slot: 2 }, { slot: 3 }]);
      }
      btn.textContent = '✓ สร้างแล้ว — ดูในแถบ Pending Project';
      btn.classList.add('is-done');
    } catch (e) {
      fail('สร้างงานไม่สำเร็จ: ' + e.message);
      btn.disabled = false; btn.textContent = '↗ ยกขึ้นเป็น Pending Project';
    }
  });
}

// ══════════════════════════════════════════════════════════

function exportCsv(rows, ownerName) {
  const cols = [
    ['no', 'No.'], ['name', 'ชื่อ-สกุล'], ['position', 'ตำแหน่ง'], ['org', 'หน่วยงาน'],
    ['color', 'สี'], ['tel', 'โทรศัพท์'], ['email', 'อีเมล'],
    ['hobby', 'งานอดิเรก'], ['favorite', 'ของชอบ'], ['sale', 'ผู้ดูแล'],
  ];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r => cols.map(([k]) =>
    cell(k === 'color' ? colorOf(r.color).short
       : k === 'sale'  ? ((ownerName && ownerName(r.sale_id)) || r.sale_name || '')
       : r[k])).join(',')).join('\r\n');

  // ﻿ = BOM · ไม่ใส่แล้ว Excel บน Windows อ่านไทยเป็นตัวยึกยือ
  const blob = new Blob(['﻿' + cols.map(c => cell(c[1])).join(',') + '\r\n' + body],
                        { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `book3-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
