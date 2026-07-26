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

  // เฉพาะคนที่ยัง active · ตัวเองขึ้นบนสุด แล้วเรียงตามชื่อไทย (เหมือนหน้าภาพรวม)
  const people = (opt.people || [])
    .filter(p => p && p.is_active !== false)
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0)
                 || String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''), 'th'));

  // เห็นได้คนเดียว (หรือไม่มีใคร) → ไม่ต้องมีตัวเลือก (เหมือน mountTeamScope กับทีมเดียว)
  if (people.length <= 1) { host.innerHTML = ''; return { selected: () => '', filter: (r) => r || [] }; }

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
    // กรองตามเจ้าของแถว (owner_id) — ว่าง = ไม่กรอง = ทุกคน
    filter: (rows) => selected ? (rows || []).filter(r => r.owner_id === selected) : (rows || []),
  };
}
