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
import { fileToDataUrl, safePhoto } from './photofield.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** @param onNameSaved (newName) => void — ให้แถบหัว/แถบข้างอัปเดตชื่อตาม */
export function openProfile(user, onNameSaved = () => {}) {
  if (!user) return;
  // ลายเซ็นของตัวเอง — เฉพาะคนที่ "เซ็นรับทราบได้" (หัวหน้างาน/ผู้ดูแลระบบ) · sale ไม่มีลายเซ็น
  const canSign = user.role === 'admin' || user.role === 'manager';
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

        ${canSign ? `
        <section class="fgroup">
          <h3>ลายเซ็นของฉัน</h3>
          <div class="sigrow" id="profSigRow" data-sig="${esc(user.id)}">
            <div class="sig-thumb" data-sig-thumb><span class="sig-none">กำลังโหลด…</span></div>
            <div class="sig-actions">
              <input type="file" accept="image/*" data-sig-file hidden>
              <button type="button" class="btn btn-ghost btn-sm" data-sig-pick>✍️ เพิ่มลายเซ็น</button>
              <button type="button" class="btn btn-ghost btn-sm" data-sig-del hidden>ลบ</button>
            </div>
          </div>
          <p class="fld-hint">ใช้ตอน "เซ็นรับทราบ" — แสดงบน PDF ในคอลัมน์ NEXT DOING (เอียง 15°) · ไฟล์ .png พื้นหลังโปร่งใสสวยที่สุด</p>
          <span class="prof-msg" id="profSigMsg"></span>
        </section>` : ''}
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

  // ── ลายเซ็นของฉัน (หัวหน้า/admin จัดการของตัวเองได้ · RLS อนุญาต profile_id = auth.uid()) ──
  if (canSign) {
    const thumb = q('[data-sig-thumb]');
    const pick  = q('[data-sig-pick]');
    const del   = q('[data-sig-del]');
    const fileInp = q('[data-sig-file]');
    const paint = (url) => {
      const safe = safePhoto(url);
      thumb.innerHTML = safe ? `<img src="${safe}" alt="ลายเซ็น">` : '<span class="sig-none">ยังไม่มีลายเซ็น</span>';
      pick.textContent = safe ? 'เปลี่ยนรูป' : '✍️ เพิ่มลายเซ็น';
      del.hidden = !safe;
    };
    // โหลดลายเซ็นปัจจุบันของตัวเอง (listSignatures อ่านได้ทุกคน — กรองเอาเฉพาะของเรา)
    (async () => {
      try { const list = await adapter.listSignatures(); paint(list.find(s => s.profile_id === user.id)?.image_url); }
      catch { paint(''); }
    })();

    pick.addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', async () => {
      const f = fileInp.files?.[0];
      fileInp.value = '';
      if (!f) return;
      try {
        const url = await fileToDataUrl(f, { maxSide: 600, mime: 'image/png' });   // png คงพื้นหลังโปร่งใส
        await adapter.saveSignature(user.id, url);
        paint(url);
        msg(q('#profSigMsg'), '✓ บันทึกลายเซ็นแล้ว — จะแสดงบน PDF ตอนคุณเซ็นรับทราบ', true);
      } catch (e) { msg(q('#profSigMsg'), e.message, false); }
    });

    // ลบต้องกด 2 ครั้งยืนยัน
    let armed = false, armT = null;
    del.addEventListener('click', async () => {
      if (!armed) {
        armed = true; del.textContent = 'ยืนยันลบ?';
        armT = setTimeout(() => { armed = false; if (del.isConnected) del.textContent = 'ลบ'; }, 3500);
        return;
      }
      clearTimeout(armT); armed = false;
      try {
        await adapter.deleteSignature(user.id);
        paint('');
        msg(q('#profSigMsg'), '✓ ลบลายเซ็นแล้ว', true);
      } catch (e) { del.textContent = 'ลบ'; msg(q('#profSigMsg'), e.message, false); }
    });
  }
}

export default { openProfile };
