// P13 — หน้า "รอบันทึก" (คิวรายชื่อ Book 3 สี / Pending ที่เตรียมไว้ · ทยอยเปิดมาบันทึกจริง)
//
// ⭐ ใช้ staging เดิม (intake_items · step 3.5) 100% — ไม่มีตารางใหม่ ไม่ก๊อปตรรกะบันทึก
//    จดชื่อเร็ว → saveIntake({ source:'manual', status:'draft' })   (ไม่ต้องพึ่ง AI)
//    เปิดบันทึก → openAIImport() เด้งเข้าแท็บ "รายการรอตรวจ" เดิม
//                 (แก้ค่า → เช็คซ้ำ matchDuplicate → บันทึกเข้าตารางจริง → ปิด draft→merged เอง)
//    ทิ้ง       → rejectIntake  (เก็บหลักฐาน · หลุดจากคิว)
//
// เห็นเฉพาะ status draft+approved (merged/rejected หลุดออกเอง)
// ค่าเริ่มต้นกรอง = ของฉัน (created_by) · สลับดูทีม/คนได้ (teamscope/personscope ตัวเดียวกับ Book 3 สี)

import { adapter } from '../data/adapter.js';
import { openAIImport } from './ai-intake.js';
import { mountTeamScope } from '../ui/teamscope.js';
import { mountPersonScope } from '../ui/personscope.js';
import { thaiDate } from '../ui/datepicker.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const KIND = {
  customer: { label: 'Book 3 สี', cls: 'k-cust', ico: '◍' },
  pending:  { label: 'Pending',   cls: 'k-pend', ico: '▤' },
};

// ชื่อหลัก + รายละเอียดรองของแต่ละ draft (รวม parsed + edited เหมือนการ์ดใน AI Import)
function summarize(item) {
  const f = { ...(item.parsed || {}), ...(item.edited || {}) };
  if (item.target_type === 'customer') {
    const name = String(f.name || '').trim() || '(ยังไม่ระบุชื่อ)';
    const sub = [f.org, f.tel].map(x => String(x || '').trim()).filter(Boolean).join(' · ');
    return { name, sub };
  }
  const name = String(f.project_name || '').trim() || '(ยังไม่ระบุชื่องาน)';
  const val = Number(f.value_baht) > 0
    ? (Number(f.value_baht) / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้านบาท'
    : '';
  const sub = [f.customer_name, val].map(x => String(x || '').trim()).filter(Boolean).join(' · ');
  return { name, sub };
}

export default {
  title: 'รอบันทึก',
  subtitle: 'รายชื่อที่เตรียมไว้ — เปิดมาบันทึกเข้าระบบเมื่อมีเวลา/มีอัพเดท',

  async render(root) {
    // ── ข้อมูลประกอบตัวกรอง (เหมือน Book 3 สี) ──
    let teams = [];
    try { teams = await adapter.listTeams(); } catch { /* ไม่มีทีมก็ยังใช้ได้ */ }

    let people = [], meId = null;
    try { people = await adapter.listProfiles(); } catch { /* ล้มเหลว = ยังมีตัวเราจาก session */ }
    try {
      const su = (await adapter.getSession())?.user || null;
      meId = su?.id || null;
      // การันตีมี "ตัวเรา" ในลิสต์เสมอ → ดรอปดาวน์ "ดูของ" โผล่แน่นอน
      if (su && meId && !people.some(p => p.id === meId))
        people = [{ id: su.id, full_name: su.full_name, email: su.email, team_id: su.team_id, is_active: true }, ...people];
    } catch { /* ไม่รู้ว่าเป็นใครก็ยังใช้ได้ */ }

    const peopleById = new Map((people || []).map(p => [p.id, p]));
    const ownerName = (id) => { const p = peopleById.get(id); return p ? (p.full_name || p.email || '') : ''; };

    const view = { team: '', person: '', q: '' };
    let rawRows = [];
    let scope, pscope;

    root.innerHTML = `
      <div class="toolbar prep-toolbar">
        <input class="inp inp-search" id="qpQ" type="search" placeholder="ค้นหาชื่อในคิว…" autocomplete="off">
        <span id="qpScope"></span>
        <span id="qpPerson"></span>
        <span class="prep-spacer"></span>
        <button class="btn btn-primary" id="qpAdd" type="button">+ จดชื่อใหม่</button>
      </div>
      <div class="prep-hint" id="qpHint"></div>
      <div id="qpList"><div class="skeleton">กำลังโหลด…</div></div>`;

    const $ = (id) => document.getElementById(id);
    const listEl = $('qpList');

    function scoped(rows) {
      let out = rows;
      if (scope)  out = scope.filter(out);
      if (pscope) out = pscope.filter(out);
      const q = view.q.trim().toLowerCase();
      if (q) out = out.filter(r => {
        const s = summarize(r);
        return `${s.name} ${s.sub} ${ownerName(r.created_by)}`.toLowerCase().includes(q);
      });
      return out;
    }

    function paint() {
      const rows = scoped(rawRows);
      // นับที่ RLS เห็นแต่อยู่นอกทีมที่เลือก — ห้ามซ่อนเงียบ (กติกาเดียวกับ Book 3 สี)
      const inTeam = scope ? scope.filter(rawRows).length : rawRows.length;
      const outside = Math.max(0, rawRows.length - inTeam);
      $('qpHint').textContent = outside > 0 ? `มีในคิวนอกทีมที่เลือกอีก ${outside} รายการ` : '';

      if (!rows.length) {
        listEl.innerHTML = `<div class="empty"><strong>ยังไม่มีรายการรอบันทึก</strong>
          กด “+ จดชื่อใหม่” เพื่อจดลูกค้า/งานที่ตั้งใจจะบันทึกไว้ก่อน แล้วค่อยเปิดมาเติมรายละเอียดแล้วบันทึกเข้าระบบทีหลัง</div>`;
        return;
      }
      listEl.innerHTML = `<div class="prep-list">${rows.map(rowHtml).join('')}</div>`;
    }

    function rowHtml(item) {
      const k = KIND[item.target_type] || KIND.customer;
      const s = summarize(item);
      const who = ownerName(item.created_by);
      const when = item.created_at ? thaiDate(String(item.created_at).slice(0, 10)) : '';
      const meta = [who && `จดโดย ${who}`, when].filter(Boolean).join(' · ');
      return `
        <div class="prep-row" data-id="${esc(item.id)}">
          <span class="prep-badge ${k.cls}">${k.ico} ${esc(k.label)}</span>
          <div class="prep-main">
            <div class="prep-name">${esc(s.name)}</div>
            ${s.sub ? `<div class="prep-sub">${esc(s.sub)}</div>` : ''}
            ${meta ? `<div class="prep-meta">${esc(meta)}</div>` : ''}
          </div>
          <div class="prep-actions">
            <button class="btn btn-primary btn-sm" data-act="open" type="button">เปิดบันทึก →</button>
            <button class="btn btn-ghost btn-sm" data-act="drop" type="button">ทิ้ง</button>
          </div>
        </div>`;
    }

    async function reload() {
      try {
        rawRows = await adapter.listIntake({ status: 'draft,approved', limit: 500 });
      } catch (e) {
        rawRows = [];
        const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(e.message);
        listEl.innerHTML = `<div class="empty"><strong>${missing ? 'ยังไม่ได้สร้างตาราง staging' : 'โหลดไม่สำเร็จ'}</strong>${
          missing
            ? 'เอาไฟล์ <code>db/phase3-5.sql</code> ไปรันใน Supabase → SQL Editor ก่อน แล้วรีเฟรช'
            : esc(e.message)}</div>`;
        $('qpHint').textContent = '';
        return;
      }
      paint();
    }

    // ── ตัวกรองทีม/คน (คอมโพเนนต์ร่วม · เจ้าของแถว = created_by) ──
    scope = mountTeamScope($('qpScope'), teams, view.team, (id) => {
      view.team = id;
      if (pscope) { pscope.setTeam(id); view.person = pscope.selected(); }
      paint();
    });
    pscope = mountPersonScope($('qpPerson'),
      { people, teams, meId, ownerField: 'created_by', teamId: view.team, initial: '', defaultSelf: true },
      (id) => { view.person = id; paint(); });
    view.person = pscope.selected();

    $('qpQ').addEventListener('input', (e) => { view.q = e.target.value; paint(); });
    $('qpAdd').addEventListener('click', () => openQuickAdd(reload));

    // event delegation รายการในคิว
    listEl.addEventListener('click', async (e) => {
      const row = e.target.closest('.prep-row');
      if (!row) return;
      const id = row.dataset.id;
      const item = rawRows.find(r => r.id === id);
      if (!item) return;

      if (e.target.closest('[data-act="open"]')) {
        // เปิดตัวแก้ staging เดิม — เด้งเข้าแท็บ "รายการรอตรวจ" อัตโนมัติเพราะมี draft ค้าง
        openAIImport(item.target_type, { onSaved: reload });
        return;
      }
      if (e.target.closest('[data-act="drop"]')) {
        const btn = e.target.closest('[data-act="drop"]');
        if (btn.dataset.confirm !== '1') {           // กด 2 ครั้งยืนยัน (ทิ้งแล้วหลุดจากคิว)
          btn.dataset.confirm = '1';
          btn.textContent = 'กดอีกครั้งเพื่อทิ้ง';
          setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ''; btn.textContent = 'ทิ้ง'; } }, 2500);
          return;
        }
        try { await adapter.rejectIntake(id); }
        catch (err) { btn.textContent = err.message; return; }
        await reload();
      }
    });

    await reload();
  },
};

// ══════════════════════════════════════════════════════════
// จดชื่อเร็ว — สร้าง draft ใน staging โดยไม่ต้องพึ่ง AI (กรอกแค่ชื่อก็พอ)
// ══════════════════════════════════════════════════════════
function openQuickAdd(onDone) {
  document.getElementById('qpAddModal')?.remove();
  const host = document.createElement('div');
  host.className = 'modal';
  host.id = 'qpAddModal';
  host.innerHTML = `
    <form class="modal-box qp-add-box" id="qpAddForm" autocomplete="off">
      <div class="modal-head">
        <strong>+ จดชื่อรอบันทึก</strong>
        <button type="button" class="btn btn-ghost btn-sm" data-close>ปิด</button>
      </div>
      <div class="modal-body">
        <div class="segmented qp-kind" role="tablist">
          <button type="button" class="on" data-kind="customer">◍ ลูกค้า (Book 3 สี)</button>
          <button type="button" data-kind="pending">▤ งาน (Pending)</button>
        </div>
        <label class="fld"><span id="qpNameLbl">ชื่อ-สกุลลูกค้า</span>
          <input class="inp" id="qpName" type="text" required></label>
        <label class="fld"><span id="qpF2Lbl">หน่วยงาน / บริษัท</span>
          <input class="inp" id="qpF2" type="text"></label>
        <label class="fld"><span id="qpF3Lbl">โทรศัพท์</span>
          <input class="inp" id="qpF3" type="text" inputmode="text"></label>
        <p class="qp-note">จดไว้ก่อนได้เลย — กรอกแค่ชื่อก็พอ ค่อยกด “เปิดบันทึก” มาเติมรายละเอียดแล้วบันทึกเข้าระบบทีหลัง</p>
        <div class="prep-err" id="qpErr" hidden></div>
      </div>
      <div class="modal-foot">
        <button type="submit" class="btn btn-primary" id="qpSave">บันทึกเข้าคิว</button>
      </div>
    </form>`;
  document.body.appendChild(host);

  const q = (s) => host.querySelector(s);
  let kind = 'customer';
  const relabel = () => {
    const cust = kind === 'customer';
    q('#qpNameLbl').textContent = cust ? 'ชื่อ-สกุลลูกค้า'  : 'ชื่องาน / โครงการ';
    q('#qpF2Lbl').textContent   = cust ? 'หน่วยงาน / บริษัท' : 'ลูกค้า / หน่วยงาน';
    q('#qpF3Lbl').textContent   = cust ? 'โทรศัพท์'          : 'มูลค่างาน (บาท)';
    q('#qpF3').inputMode        = cust ? 'text'              : 'numeric';
  };
  host.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    host.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b));
    relabel();
  }));

  const close = () => host.remove();
  q('[data-close]').addEventListener('click', close);
  host.addEventListener('mousedown', (e) => { if (e.target === host) close(); });

  q('#qpAddForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = q('#qpName').value.trim();
    const err = q('#qpErr');
    if (!name) { err.textContent = 'กรอกชื่อก่อน'; err.hidden = false; q('#qpName').focus(); return; }

    const f2 = q('#qpF2').value.trim();
    const f3 = q('#qpF3').value.trim();
    const parsed = kind === 'customer'
      ? { name, ...(f2 ? { org: f2 } : {}), ...(f3 ? { tel: f3 } : {}) }
      : { project_name: name, ...(f2 ? { customer_name: f2 } : {}),
          ...(f3 ? { value_baht: f3.replace(/[^\d.]/g, '') } : {}) };

    const btn = q('#qpSave');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await adapter.saveIntake({ source: 'manual', target_type: kind, parsed, status: 'draft' });
    } catch (err2) {
      const missing = /ยังไม่ได้สร้างตาราง|does not exist|42P01/i.test(err2.message);
      err.innerHTML = missing
        ? 'ยังไม่ได้สร้างตาราง staging — เอา <code>db/phase3-5.sql</code> ไปรันใน Supabase ก่อน'
        : esc(err2.message);
      err.hidden = false;
      btn.disabled = false; btn.textContent = 'บันทึกเข้าคิว';
      return;
    }
    close();
    await onDone();
  });

  setTimeout(() => q('#qpName').focus(), 30);
}
