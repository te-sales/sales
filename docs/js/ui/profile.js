// โปรไฟล์ของฉัน — ตั้งชื่อที่แสดง (username) + เปลี่ยนรหัสผ่านเองในแอป (เจ้าของขอ 28 ก.ค. 2569)
//
// เดิม: admin เชิญบัญชี + รีเซ็ตรหัสผ่านผ่านอีเมลเท่านั้น
// ตอนนี้: ผู้ใช้ทุกคนแก้ "ชื่อที่แสดง" + "รหัสผ่าน" ของตัวเองได้จากปุ่มบนแถบหัว/แถบข้าง
//
// 🔒 ทำได้โดยไม่ต้อง migration:
//   • รหัสผ่าน = Supabase Auth (adapter.updatePassword ใช้ access_token ของ session ปัจจุบัน)
//   • ชื่อ    = profiles ของตัวเอง (policy profiles_update = own/admin · trigger กันแก้ role/team/สถานะ)
//   • อีเมล (login) แก้ที่นี่ไม่ได้ — เป็นตัวระบุบัญชี ต้องยืนยันอีเมล แสดงแบบอ่านอย่างเดียว

import { adapter } from '../data/adapter.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** @param onNameSaved (newName) => void — ให้แถบหัว/แถบข้างอัปเดตชื่อตาม */
export function openProfile(user, onNameSaved = () => {}) {
  if (!user) return;
  document.getElementById('profileModal')?.remove();
  const host = document.createElement('div');
  host.className = 'modal';
  host.id = 'profileModal';
  document.body.appendChild(host);

  host.innerHTML = `
    <form class="modal-box modal-sm" id="profForm" autocomplete="off">
      <div class="modal-head">
        <strong>โปรไฟล์ของฉัน</strong>
        <button type="button" class="btn btn-ghost btn-sm" data-close>ปิด</button>
      </div>
      <div class="modal-body">
        <section class="fgroup">
          <h3>บัญชี</h3>
          <div class="fgrid">
            <label class="fld fld-wide"><span>อีเมลที่ใช้เข้าระบบ (แก้ที่นี่ไม่ได้)</span>
              <input class="inp" value="${esc(user.email || '')}" readonly disabled></label>
            <label class="fld fld-wide"><span>ชื่อที่แสดง (username)</span>
              <input class="inp" id="profName" value="${esc(user.full_name || '')}"
                     placeholder="ชื่อ-สกุล" autocomplete="off"></label>
          </div>
          <div class="lg-add-row">
            <button type="button" class="btn btn-primary btn-sm" id="profSaveName">บันทึกชื่อ</button>
            <span class="prof-msg" id="profNameMsg"></span>
          </div>
        </section>

        <section class="fgroup">
          <h3>เปลี่ยนรหัสผ่าน</h3>
          <div class="fgrid">
            <label class="fld fld-wide"><span>รหัสผ่านใหม่</span>
              <input class="inp" id="profPw1" type="password" autocomplete="new-password"
                     placeholder="อย่างน้อย 6 ตัวอักษร"></label>
            <label class="fld fld-wide"><span>ยืนยันรหัสผ่านใหม่</span>
              <input class="inp" id="profPw2" type="password" autocomplete="new-password"></label>
          </div>
          <div class="lg-add-row">
            <button type="button" class="btn btn-primary btn-sm" id="profSavePw">ตั้งรหัสผ่านใหม่</button>
            <span class="prof-msg" id="profPwMsg"></span>
          </div>
          <p class="fld-hint">💡 เปลี่ยนแล้วใช้บัญชีเดิมต่อได้ทันที ไม่ต้องล็อกอินใหม่</p>
        </section>
      </div>
      <div class="modal-foot"><span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-close>เสร็จ</button></div>
    </form>`;

  const q = (s) => host.querySelector(s);
  const close = () => host.remove();
  host.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  host.addEventListener('mousedown', (e) => { if (e.target === host) close(); });

  const msg = (el, text, ok) => { el.textContent = text; el.className = 'prof-msg ' + (ok ? 'prof-ok' : 'prof-err'); };

  // ── บันทึกชื่อที่แสดง ──
  q('#profSaveName').addEventListener('click', async () => {
    const name = q('#profName').value.trim();
    if (!name) return msg(q('#profNameMsg'), 'กรอกชื่อก่อน', false);
    const btn = q('#profSaveName'); btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await adapter.saveProfile(user.id, { full_name: name });
      user.full_name = name;
      msg(q('#profNameMsg'), '✓ บันทึกชื่อแล้ว', true);
      onNameSaved(name);                       // อัปเดตแถบหัว/แถบข้างทันที
    } catch (e) {
      msg(q('#profNameMsg'), e.message, false);
    } finally {
      btn.disabled = false; btn.textContent = 'บันทึกชื่อ';
    }
  });

  // ── ตั้งรหัสผ่านใหม่ ──
  q('#profSavePw').addEventListener('click', async () => {
    const p1 = q('#profPw1').value, p2 = q('#profPw2').value;
    if (p1.length < 6) return msg(q('#profPwMsg'), 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร', false);
    if (p1 !== p2)     return msg(q('#profPwMsg'), 'รหัสผ่านสองช่องไม่ตรงกัน', false);
    const btn = q('#profSavePw'); btn.disabled = true; btn.textContent = 'กำลังตั้ง…';
    try {
      await adapter.updatePassword(p1);
      q('#profPw1').value = ''; q('#profPw2').value = '';
      msg(q('#profPwMsg'), '✓ ตั้งรหัสผ่านใหม่แล้ว', true);
    } catch (e) {
      msg(q('#profPwMsg'), e.message, false);
    } finally {
      btn.disabled = false; btn.textContent = 'ตั้งรหัสผ่านใหม่';
    }
  });
}

export default { openProfile };
