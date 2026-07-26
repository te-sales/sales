// แถบเลือกดู "รายบุคคล" — ดรอปดาวน์เลือกดูงาน/ลูกค้าของ sale แต่ละคน
// ใช้ร่วมหน้า Pending Project (F4) และ Book 3 สี (F5) — เจ้าของขอ 26 ก.ค. 2569
//
// กรองด้วย owner_id (เจ้าของแถวจากการ login) — กติกาเดียวกับดรอปดาวน์เป้ารายคนบนหน้าภาพรวม
//   ⚠️ ห้ามกรองด้วย sale_name (free text) — คนละคนพิมพ์ชื่อไม่ตรงกัน จับคู่พลาด
// ข้อมูลถูก RLS คัดมาแล้ว ที่นี่แค่กรอง "ในสิ่งที่เห็นได้" ตามคนที่เลือก ไม่ได้ข้ามสิทธิ์
// แสดงเฉพาะเมื่อผู้ใช้เห็นคนได้มากกว่า 1 คน (admin/หัวหน้า/ทีมที่มีหลายคน) — sale เดี่ยวไม่ต้องมี
// ⭐ ใช้คู่กับ mountTeamScope: เลือกทีมก่อน แล้วค่อยเจาะรายคน (กรองต่อกัน ไม่ทับกัน)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** ชื่อคนไว้โชว์ในดรอปดาวน์: full_name > email · ต่อท้ายโค้ดทีม + ป้าย (ฉัน) */
function personLabel(p, teams, meId) {
  const name = p.full_name || p.email || '—';
  const code = (teams || []).find(t => t.id === p.team_id)?.code || p.teams?.code || '';
  return `${name}${p.id === meId ? ' (ฉัน)' : ''}${code ? ' · ' + code : ''}`;
}

/**
 * วาดดรอปดาวน์เลือกคนลง host แล้วผูก event
 * @param opt { people:[], teams:[], meId, initial }   people = profiles ที่ RLS ให้เห็น
 * @param onChange (selectedId) => void    selectedId = '' คือทุกคน
 * @returns { selected():string, filter(rows):rows[] }
 */
export function mountPersonScope(host, opt = {}, onChange = () => {}) {
  if (!host) return { selected: () => '', filter: (r) => r || [] };
  const teams = opt.teams || [];
  const meId  = opt.meId || null;
  // ฟิลด์เจ้าของแถว: Pending = owner_id · Book 3 สี = sale_id (คนละชื่อคอลัมน์)
  const ownerField = opt.ownerField || 'owner_id';

  // เฉพาะคนที่ยัง active · ตัวเองขึ้นบนสุด แล้วเรียงตามชื่อไทย (เหมือนหน้าภาพรวม)
  const people = (opt.people || [])
    .filter(p => p && p.is_active !== false)
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0)
                 || String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''), 'th'));

  // โผล่เสมอถ้ามีอย่างน้อย 1 คน (ตัวเราเอง) — ให้เลือก "ตัวเอง ↔ ทุกคน ↔ คนอื่น" ได้
  // (เดิมซ่อนเมื่อ ≤1 คน ทำให้บางบัญชีไม่เห็นดรอปดาวน์เลย — เจ้าของแจ้ง 27 ก.ค. 2569)
  if (people.length < 1) { host.innerHTML = ''; return { selected: () => '', filter: (r) => r || [] }; }

  let selected = people.some(p => p.id === opt.initial) ? opt.initial : '';

  host.innerHTML = `
    <div class="person-scope">
      <span class="person-scope-l">ดูของ</span>
      <select class="inp inp-sm" id="personScopeSel" aria-label="เลือกดูงานของแต่ละคน">
        <option value="">— ทุกคน —</option>
        ${people.map(p => `<option value="${esc(p.id)}" ${selected === p.id ? 'selected' : ''}>${esc(personLabel(p, teams, meId))}</option>`).join('')}
      </select>
    </div>`;

  const sel = host.querySelector('#personScopeSel');
  sel.addEventListener('change', () => { selected = sel.value; onChange(selected); });

  return {
    selected: () => selected,
    // กรองตามเจ้าของแถว (owner_id / sale_id) — ว่าง = ไม่กรอง = ทุกคน
    filter: (rows) => selected ? (rows || []).filter(r => r[ownerField] === selected) : (rows || []),
  };
}

/**
 * <select> เลือก "SALE NAME (sale ผู้ดูแล)" สำหรับฟอร์ม — ใช้ร่วม Pending (owner_id) + Book 3 สี (sale_id)
 * เก็บเป็น id ของบัญชี (FK) ไม่ใช่ข้อความ → เปลี่ยนชื่อในตั้งค่าระบบแล้วชื่ออัปเดตตามทุกที่
 *   • ค่าเริ่มต้น = คนที่ล็อกอิน (ตั้งจาก formRow ก่อนเรียก)
 *   • บัญชีถูกปิดใช้งาน/ลบ → ยังคงค่าเดิมไว้ให้เห็น + ชวนให้เลือกผู้ดูแลใหม่ (แอดมินมากรอกต่อ)
 * @param currentId ค่าปัจจุบัน (owner_id/sale_id ของแถว · ว่าง = ยังไม่ระบุ)
 */
export function ownerSelectHtml(key, label, currentId, people, meId, hint) {
  const cur = currentId ?? '';
  const list = (people || []).filter(p => p && p.is_active !== false)
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0)
                 || String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''), 'th'));
  const known = new Set(list.map(p => p.id));
  const opt = (p, inactive) =>
    `<option value="${esc(p.id)}" ${cur === p.id ? 'selected' : ''}>${esc(p.full_name || p.email || '—')}${p.id === meId ? ' (ฉัน)' : ''}${inactive ? ' (ปิดใช้งาน)' : ''}</option>`;
  // เจ้าของปัจจุบันที่ถูกปิดใช้งาน/ไม่อยู่ในลิสต์ → ต้องคงค่าไว้ให้เห็น ไม่งั้น dropdown เด้งไปโชว์คนอื่นเงียบ ๆ
  const orphan  = cur && !known.has(cur);
  const orphanP = orphan ? (people || []).find(p => p.id === cur) : null;
  return `<label class="fld"><span>${esc(label)}</span>
    <select name="${esc(key)}">
      <option value="" ${!cur ? 'selected' : ''}>— ยังไม่ระบุผู้ดูแล —</option>
      ${list.map(p => opt(p, false)).join('')}
      ${orphanP ? opt(orphanP, true)
                : (orphan ? `<option value="${esc(cur)}" selected>(บัญชีถูกลบแล้ว — เลือกผู้ดูแลใหม่)</option>` : '')}
    </select>
    ${hint === false ? '' : `<small class="fld-hint">${esc(hint || 'เลือกจากบัญชีผู้ใช้ · ค่าเริ่มต้น = คนที่ล็อกอิน · เปลี่ยนชื่อบัญชีในตั้งค่าระบบแล้วชื่ออัปเดตตามทุกที่')}</small>`}
  </label>`;
}
