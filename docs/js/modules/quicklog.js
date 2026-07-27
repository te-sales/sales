// P11 — Quick-log (⚡ บันทึกเร็ว) · ปุ่มบนแถบหัว ใช้ได้ทุกเครื่อง (มือถือ/iPad/laptop)
//
// ประตูบันทึกเร็วจุดเดียว: เลือกปลายทาง (Book 3 สี / Pending) → ค้นหาของเดิมหรือสร้างใหม่ → ลงบันทึกจบในหน้าเดียว
//
// ⭐ ใช้โค้ดเดิมซ้ำหมด ไม่สร้างซ้ำ:
//   ค้นหา = adapter.listCustomers/listPending · ฟอร์มบันทึก = loglist (logFormHtml/readLogForm)
//   บันทึก = addCustomerLog/addFollowLog · สร้างใหม่ = saveCustomer/savePending · AI = openAILog (ai-intake)
//   สี Book 3 = COLORS (book3) · ขั้นตอน = STAGES (pending) · เปิดฟอร์มเต็ม = jump ผ่าน sessionStorage 'te:openRecord'
//
// ขอบเขตรอบนี้ (MVP): ออนไลน์อย่างเดียว · โหมดออฟไลน์-คิว-sync = เฟส 2 (ดู UPDATE-PLAN.md)

import { adapter } from '../data/adapter.js';
import { logFormHtml, readLogForm } from '../ui/loglist.js';
import { todayISO, shiftDay, thaiDate, initDatePicker } from '../ui/datepicker.js';
import { openAILog } from './ai-intake.js';
import { COLORS } from './book3.js';
import { STAGES } from './pending.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const norm   = (s) => String(s ?? '').trim().toLowerCase();
const digits = (s) => String(s ?? '').replace(/\D/g, '');

const CHANNELS = ['โทร', 'เข้าพบ', 'ไลน์', 'อีเมล', 'ส่งใบเสนอราคา', 'ประชุมออนไลน์'];
const LS_TAB = 'te-dashboard:quicklog-tab';   // จำแท็บล่าสุด

// ── ตั้งค่าต่อปลายทาง (customer = Book 3 สี · pending = Pending Project) ──
const TAB = {
  customer: {
    label: '🎨 Book 3 สี', view: 'book3', ownerField: 'sale_id',
    searchPh: 'ค้นหาชื่อลูกค้า / หน่วยงาน / เบอร์…',
    newLabel: '+ เพิ่มลูกค้าใหม่',
    list:  () => adapter.listCustomers({ status: 'active', limit: 2000 }),
    match: (r, qq) => norm(r.name).includes(qq) || norm(r.org).includes(qq)
                   || (digits(qq) && digits(r.tel).includes(digits(qq))),
    show:  (r) => ({ name: r.name || '(ไม่มีชื่อ)', sub: [r.org, r.tel].filter(Boolean).join(' · ') }),
    addLog: (id, d) => adapter.addCustomerLog({ ...d, customer_id: id }),
  },
  pending: {
    label: '▤ Pending', view: 'pending', ownerField: 'owner_id',
    searchPh: 'ค้นหาชื่องาน / ลูกค้า / PENDING NO.…',
    newLabel: '+ เพิ่มงานใหม่',
    list:  () => adapter.listPending({ status: 'active', limit: 2000 }),
    match: (r, qq) => norm(r.project_name).includes(qq) || norm(r.customer_name).includes(qq)
                   || norm(r.pending_no).includes(qq),
    show:  (r) => ({ name: r.project_name || '(ไม่มีชื่องาน)', sub: [r.customer_name, r.pending_no].filter(Boolean).join(' · ') }),
    addLog: (id, d) => adapter.addFollowLog({ ...d, pending_id: id }),
  },
};

/**
 * เปิด Quick-log
 * @param opts.onSaved   () => เรียกหลังบันทึก (ให้หน้าเบื้องหลัง refresh)
 * @param opts.navigate  (view) => ไปหน้านั้น + วาดใหม่ (ใช้ตอน "เปิดฟอร์มเต็ม") · ไม่ส่งมาก็ fallback location.hash
 * @param opts.tab       'customer' | 'pending' (บังคับแท็บเริ่มต้น)
 */
export async function openQuickLog(opts = {}) {
  const onSaved  = typeof opts.onSaved  === 'function' ? opts.onSaved  : () => {};
  const navigate = typeof opts.navigate === 'function' ? opts.navigate : (v) => { location.hash = v; };
  initDatePicker();

  const me = (await adapter.getSession().catch(() => null))?.user || null;
  let teams = [];
  try { teams = await adapter.listTeams(); } catch { /* ไม่มีทีมก็ยังใช้ได้ */ }

  let tab = 'customer';
  try { const t = localStorage.getItem(LS_TAB); if (t === 'customer' || t === 'pending') tab = t; } catch {}
  if (opts.tab === 'customer' || opts.tab === 'pending') tab = opts.tab;

  document.getElementById('qlModal')?.remove();
  const host = document.createElement('div');
  host.className = 'modal';
  host.id = 'qlModal';
  document.body.appendChild(host);

  const cache = { customer: null, pending: null };   // แคชรายชื่อ (ดึงครั้งเดียวต่อแท็บ)
  let picked = null;                                  // { id, name, sub } ของ record ที่เลือก/สร้าง

  host.innerHTML = `
    <form class="modal-box modal-sm ql-box" id="qlForm" autocomplete="off">
      <div class="modal-head">
        <strong>⚡ บันทึกเร็ว</strong>
        <button type="button" class="btn btn-ghost btn-sm" data-close>ปิด</button>
      </div>
      <div class="modal-body" data-body></div>
    </form>`;

  const q = (s) => host.querySelector(s);
  const body = q('[data-body]');
  const close = () => host.remove();
  const setErr = (m) => { const e = q('[data-err]'); if (!e) return; if (!m) { e.hidden = true; return; } e.textContent = m; e.hidden = false; };

  q('[data-close]').addEventListener('click', close);
  host.addEventListener('mousedown', (e) => { if (e.target === host) close(); });

  // sale เห็น/เลือกได้เฉพาะงาน/ลูกค้า "ของตัวเอง" · หัวหน้า+admin เห็นทั้งหมด (เจ้าของขอ 27 ก.ค. 2569)
  const ownOnly = me?.role === 'sale' && !!me?.id;
  async function records() {
    if (!cache[tab]) {
      let list;
      try { list = await TAB[tab].list(); } catch { list = []; }
      if (ownOnly) list = list.filter(r => r[TAB[tab].ownerField] === me.id);
      cache[tab] = list;
    }
    return cache[tab];
  }

  // ══════════ สเต็ป 1 — เลือกปลายทาง + ค้นหา/สร้าง ══════════
  function renderPick() {
    picked = null;
    const cfg = TAB[tab];
    body.innerHTML = `
      <div class="segmented ql-tabs" data-tabs role="tablist">
        <button type="button" data-tab="customer" class="${tab === 'customer' ? 'on' : ''}">${esc(TAB.customer.label)}</button>
        <button type="button" data-tab="pending"  class="${tab === 'pending'  ? 'on' : ''}">${esc(TAB.pending.label)}</button>
      </div>
      <input class="inp ql-search" data-search type="search" placeholder="${esc(cfg.searchPh)}" autocapitalize="off" spellcheck="false">
      <div class="ql-results" data-results><div class="skeleton">กำลังโหลด…</div></div>
      <div class="ql-newwrap" data-newwrap></div>
      <p class="login-err" data-err hidden></p>`;

    q('[data-tabs]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      tab = b.dataset.tab; try { localStorage.setItem(LS_TAB, tab); } catch {}
      renderPick();
    });
    const search = q('[data-search]');
    search.addEventListener('input', () => { clearTimeout(search._t); search._t = setTimeout(runSearch, 220); });
    renderNewButton();
    runSearch();
    search.focus();
  }

  async function runSearch() {
    const cfg = TAB[tab];
    const box = q('[data-results]'); if (!box) return;
    const raw = q('[data-search]')?.value.trim() || '';
    const all = await records();
    let list = all;
    if (raw) { const qq = norm(raw); list = all.filter(r => cfg.match(r, qq)); }
    list = list.slice(0, 30);

    if (!all.length) { box.innerHTML = `<div class="ql-empty">ยังไม่มีข้อมูล — กด "${esc(cfg.newLabel)}" ด้านล่าง</div>`; return; }
    if (!list.length) { box.innerHTML = `<div class="ql-empty">ไม่พบ "${esc(raw)}" — กด "${esc(cfg.newLabel)}" เพื่อสร้างใหม่</div>`; return; }

    box.innerHTML = list.map(r => {
      const d = cfg.show(r);
      const upd = r.updated_at ? ` · อัปเดต ${esc(thaiDate(String(r.updated_at).slice(0, 10)))}` : '';
      return `<button type="button" class="ql-item" data-pick="${esc(r.id)}">
        <span class="ql-item-name">${esc(d.name)}</span>
        <span class="ql-item-sub">${esc(d.sub)}${upd}</span>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-pick]').forEach(btn => btn.addEventListener('click', async () => {
      const r = (await records()).find(x => String(x.id) === btn.dataset.pick);
      if (!r) return;
      const d = cfg.show(r);
      picked = { id: r.id, name: d.name, sub: d.sub };
      renderLog();
    }));
  }

  function renderNewButton() {
    const wrap = q('[data-newwrap]');
    wrap.innerHTML = `<button type="button" class="btn btn-primary btn-sm ql-newbtn" data-new>${esc(TAB[tab].newLabel)}</button>`;
    wrap.querySelector('[data-new]').addEventListener('click', renderNewForm);
  }

  // ── มินิฟอร์มสร้างใหม่ (ฟอร์มสั้น) ──
  function teamSelectHtml() {
    const mine = me?.team && teams.find(t => t.id === me.team || t.code === me.team);
    return `<select class="inp" data-f="team_id">
      <option value="">— ทีมของฉัน (อัตโนมัติ) —</option>
      ${teams.map(t => `<option value="${esc(t.id)}" ${mine && mine.id === t.id ? 'selected' : ''}>${esc(t.code)}</option>`).join('')}
    </select>`;
  }

  function renderNewForm() {
    const wrap = q('[data-newwrap]');
    const isCust = tab === 'customer';
    wrap.innerHTML = `
      <div class="ql-newform">
        <p class="ql-newh">${isCust ? 'เพิ่มลูกค้าใหม่' : 'เพิ่มงานใหม่'} (กรอกสั้น ๆ · รายละเอียดเพิ่มทีหลังได้)</p>
        ${isCust ? `
          <label class="fld"><span>ชื่อ *</span><input class="inp" data-f="name"></label>
          <label class="fld"><span>หน่วยงาน / บริษัท</span><input class="inp" data-f="org"></label>
          <label class="fld"><span>ทีม</span>${teamSelectHtml()}</label>
          <label class="fld"><span>ระดับความสัมพันธ์</span><select class="inp" data-f="color">
            ${COLORS.map(c => `<option value="${c.id}" ${c.id === 'red' ? 'selected' : ''}>${c.dot} ${esc(c.label)}</option>`).join('')}
          </select></label>`
        : `
          <label class="fld"><span>ชื่องาน *</span><input class="inp" data-f="project_name"></label>
          <label class="fld"><span>ลูกค้า / หน่วยงาน</span><input class="inp" data-f="customer_name"></label>
          <label class="fld"><span>มูลค่างาน (บาท)</span><input class="inp" data-f="value_baht" type="number" min="0" step="1"></label>
          <label class="fld"><span>ทีม</span>${teamSelectHtml()}</label>
          <label class="fld"><span>ขั้นตอน</span><select class="inp" data-f="stage">
            ${STAGES.map(s => `<option value="${s.id}" ${s.id === 'lead' ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select></label>`}
        <p class="login-err" data-err hidden></p>
        <div class="ql-newfoot">
          <button type="button" class="btn btn-ghost btn-sm" data-cancelnew>ยกเลิก</button>
          <button type="button" class="btn btn-primary btn-sm" data-savenew>สร้าง + ลงบันทึก →</button>
        </div>
      </div>`;
    q('[data-results]').innerHTML = '';   // ซ่อนผลค้นหาระหว่างกรอกฟอร์มใหม่
    wrap.querySelector('[data-cancelnew]').addEventListener('click', () => { renderNewButton(); runSearch(); });
    wrap.querySelector('[data-savenew]').addEventListener('click', saveNew);
    wrap.querySelector('[data-f]')?.focus();
  }

  async function saveNew() {
    setErr('');
    const wrap = q('[data-newwrap]');
    const val = (k) => wrap.querySelector(`[data-f="${k}"]`)?.value.trim() || '';
    const teamId = wrap.querySelector('[data-f="team_id"]')?.value || undefined;
    const btn = wrap.querySelector('[data-savenew]');
    try {
      if (tab === 'customer') {
        const name = val('name');
        if (!name) return setErr('กรอกชื่อลูกค้าก่อน');
        btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
        const saved = await adapter.saveCustomer({ name, org: val('org') || undefined, team_id: teamId, color: val('color') || 'red' });
        picked = { id: saved?.id, name, sub: val('org') };
      } else {
        const pn = val('project_name');
        if (!pn) return setErr('กรอกชื่องานก่อน');
        btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
        const vb = Number(val('value_baht') || 0);
        const saved = await adapter.savePending({
          project_name: pn, customer_name: val('customer_name') || undefined,
          value_baht: Number.isFinite(vb) && vb >= 0 ? vb : 0, team_id: teamId, stage: val('stage') || 'lead',
        });
        picked = { id: saved?.id, name: pn, sub: val('customer_name') };
      }
      if (!picked.id) throw new Error('สร้างไม่สำเร็จ');
      cache[tab] = null;      // มีของใหม่ ล้างแคชค้นหา
      await onSaved();        // อัปเดตหน้าเบื้องหลัง
      renderLog(true);
    } catch (e) {
      setErr(e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'สร้าง + ลงบันทึก →'; }
    }
  }

  // ══════════ สเต็ป 2 — ลงบันทึก ══════════
  function renderLog(isNew = false) {
    const cfg = TAB[tab];
    body.innerHTML = `
      <div class="ql-picked">
        <button type="button" class="btn btn-ghost btn-sm ql-back" data-back title="กลับไปเลือกใหม่">←</button>
        <div class="ql-picked-txt">
          <strong>${esc(picked.name)}</strong>
          <span>${esc(picked.sub || '')}${isNew ? ' · <b>สร้างใหม่แล้ว</b>' : ''}</span>
        </div>
        <a class="ql-full" data-full href="#">✎ เปิดฟอร์มเต็ม</a>
      </div>
      ${logFormHtml('ql')}
      <div class="ql-chips" data-chips>
        <span class="ql-chips-l">ช่องทาง:</span>
        ${CHANNELS.map(c => `<button type="button" class="ql-chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <label class="ql-actrow">
        <input type="checkbox" data-mkact>
        <span>สร้างงานติดตามในปฏิทิน จาก NEXT DOING (กำหนด <b>+7 วัน</b>)</span>
      </label>
      <p class="login-err" data-err hidden></p>
      <div class="ql-logfoot">
        <button type="button" class="btn btn-ai btn-sm" data-ai>🤖 AI บันทึก</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-save>บันทึก</button>
      </div>`;

    const byInp = body.querySelector('#qlBy');
    if (byInp && me && !byInp.value) byInp.value = me.full_name || me.email || '';

    q('[data-back]').addEventListener('click', renderPick);

    // ชิปช่องทาง → เติมช่อง BY
    q('[data-chips]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-chip]'); if (!b) return;
      if (byInp) byInp.value = b.dataset.chip;
      q('[data-chips]').querySelectorAll('.ql-chip').forEach(x => x.classList.toggle('on', x === b));
    });

    // เปิดฟอร์มเต็ม → jump ผ่าน sessionStorage แล้วไปหน้านั้น (วาดใหม่เสมอ ผ่าน navigate)
    q('[data-full]').addEventListener('click', (e) => {
      e.preventDefault();
      try { sessionStorage.setItem('te:openRecord', picked.id); } catch {}
      close();
      navigate(cfg.view);
    });

    // 🤖 AI บันทึก → ใช้ openAILog เขียนเข้า record เดียวกัน (ความสามารถเท่าทุกจุด)
    q('[data-ai]').addEventListener('click', () => openAILog(tab, {
      recordName: picked.name,
      defaultBy:  me?.full_name || me?.email || '',
      addLogFn:   (d) => cfg.addLog(picked.id, d),
      onSaved,
    }));

    q('[data-save]').addEventListener('click', saveLog);
  }

  async function saveLog() {
    setErr('');
    const d = readLogForm(body, 'ql');
    if (!d) return setErr('กรอก RESPONSE หรือ NEXT DOING อย่างน้อยหนึ่งช่อง');
    const btn = q('[data-save]');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await TAB[tab].addLog(picked.id, d);

      // ติ๊ก "สร้างงานติดตาม" + มี NEXT DOING → สร้าง activity (B4) กำหนด +7 วัน
      const mkact = body.querySelector('[data-mkact]')?.checked;
      let madeAct = false;
      if (mkact && d.next_doing) {
        try {
          await adapter.saveActivity({
            title: d.next_doing,
            act_type: (body.querySelector('#qlBy')?.value || '').trim() || undefined,
            due_date: shiftDay(todayISO(), 7),
            status: 'plan',
            ...(tab === 'customer' ? { customer_id: picked.id } : { pending_id: picked.id }),
          });
          madeAct = true;
        } catch (e) { console.warn('สร้างงานติดตามไม่สำเร็จ:', e.message); }
      }
      await onSaved();

      body.innerHTML = `
        <div class="ql-done">
          <div class="ql-done-ic">✓</div>
          <strong>บันทึกแล้ว</strong>
          <span>${esc(picked.name)}${madeAct ? ' · ตั้งงานติดตาม +7 วันแล้ว' : ''}</span>
          <div class="ql-done-foot">
            <button type="button" class="btn btn-ghost btn-sm" data-again>+ บันทึกอีกรายการ</button>
            <button type="button" class="btn btn-primary btn-sm" data-doneclose>เสร็จ</button>
          </div>
        </div>`;
      q('[data-again]').addEventListener('click', renderPick);
      q('[data-doneclose]').addEventListener('click', close);
    } catch (e) {
      setErr(e.message);
      btn.disabled = false; btn.textContent = 'บันทึก';
    }
  }

  renderPick();
}

export default { openQuickLog };
