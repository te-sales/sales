// แถบเลือก/บอกทีม — ใช้ร่วมหน้า Pending Project และ Book 3 สี (เจ้าของขอ 25 ก.ค. 2569)
//
// แสดง "กำลังแสดง: <ทีม>" + ชิปให้กดเลือกทีม (รวมทุกทีม / รายทีม)
// ให้สิทธิ์ทีมแม่ = เห็นทีมลูกด้วย (subtree) — สอดคล้องกับ can_access_team() ฝั่ง DB
// ⚠️ ข้อมูลถูก RLS คัดมาแล้ว ที่นี่แค่กรอง "ในสิ่งที่เห็นได้" ตามทีมที่เลือก ไม่ได้ข้ามสิทธิ์

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** เซตของ team id ที่เลือก + ทีมลูก-หลานทั้งหมด (ว่าง = ไม่กรอง = ทุกทีม) */
export function teamSubtree(teams, id) {
  const out = new Set();
  if (!id) return out;
  out.add(id);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of teams || []) {
      if (!out.has(t.id) && t.parent_team_id && out.has(t.parent_team_id)) { out.add(t.id); changed = true; }
    }
  }
  return out;
}

/** ชื่อขอบเขตที่กำลังแสดง (ใช้บนหัว) */
export function scopeName(teams, id) {
  if (!id) return 'รวมทุกทีม';
  const t = (teams || []).find(x => x.id === id);
  if (!t) return id;
  return t.name && t.name !== t.code ? `${t.code} · ${t.name}` : t.code;
}

/**
 * วาดแถบเลือกทีมลง host แล้วผูก event
 * @param onChange (selectedId) => void   selectedId = '' คือรวมทุกทีม
 * @returns { selected():string, filter(rows):rows[] }
 *
 * แสดงเฉพาะเมื่อผู้ใช้เห็นได้มากกว่า 1 ทีม (admin/หัวหน้า) — sale ทีมเดียวไม่ต้องมีตัวเลือก
 */
export function mountTeamScope(host, teams, initial, onChange) {
  teams = teams || [];
  let selected = teams.some(t => t.id === initial) ? initial : '';
  if (teams.length <= 1) { host.innerHTML = ''; return { selected: () => '', filter: (r) => r }; }

  const draw = () => {
    host.innerHTML = `
      <div class="team-scope">
        <span class="team-scope-l">กำลังแสดง <b class="team-scope-cur">${esc(scopeName(teams, selected))}</b></span>
        <span class="team-scope-sp"></span>
        <button type="button" class="chip ${!selected ? 'on' : ''}" data-team="">รวมทุกทีม</button>
        ${teams.map(t => `<button type="button" class="chip ${t.parent_team_id ? 'chip-sub' : ''} ${selected === t.id ? 'on' : ''}"
                            data-team="${esc(t.id)}" title="${esc(scopeName(teams, t.id))}">${esc(t.code)}</button>`).join('')}
      </div>`;
    host.querySelectorAll('[data-team]').forEach(b => b.addEventListener('click', () => {
      selected = b.dataset.team;
      const cur = host.querySelector('.team-scope-cur');
      if (cur) cur.textContent = scopeName(teams, selected);
      host.querySelectorAll('[data-team]').forEach(x => x.classList.toggle('on', x.dataset.team === selected));
      onChange(selected);
    }));
  };
  draw();

  return {
    selected: () => selected,
    filter: (rows) => {
      if (!selected) return rows || [];
      const ids = teamSubtree(teams, selected);
      return (rows || []).filter(r => ids.has(r.team_id));
    },
  };
}
