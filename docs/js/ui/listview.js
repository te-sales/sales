// docs/js/ui/listview.js
// ปุ่มสลับมุมมอง "ตาราง / การ์ด" สำหรับหน้า Pending + Book 3 สี
//
// ทำไมต้องแยกเป็นไฟล์กลาง: ทั้ง 2 หน้าต้องทำงานเหมือนกันเป๊ะ (เจ้าของอยากได้
// ประสบการณ์เดียวกัน) — เขียนที่เดียว แก้ทีเดียวได้เท่ากันทั้งคู่ (กติกา "ห้ามก๊อปโค้ด")
//
// พฤติกรรม:
//   - laptop / iPad (>430px): ผู้ใช้เลือกเองได้ว่าจะดูเป็น "ตาราง" หรือ "การ์ด 2 คอลัมน์"
//   - มือถือ (≤430px): บังคับการ์ดอยู่แล้ว → ปุ่มถูกซ่อนด้วย CSS (.viewmode)
//   - จำค่าไว้ใน localStorage ค่าเดียว ใช้ร่วมทั้ง 2 หน้า (เลือกครั้งเดียวเหมือนกันหมด)
//
// วิธีทำงาน: ใส่คลาส .list-cards ให้กล่องรายการ (#pList / #bList) → CSS สลับ
//   .tbl-wrap ↔ .cards (ดู app.css หัวข้อ "มุมมองการ์ดที่ผู้ใช้เลือก")

const LS_KEY = 'te:listView';   // 'table' | 'cards'

export function getListView() {
  try { return localStorage.getItem(LS_KEY) === 'cards' ? 'cards' : 'table'; }
  catch { return 'table'; }
}
function setListView(v) {
  try { localStorage.setItem(LS_KEY, v); } catch { /* โหมดส่วนตัว/เต็ม = ข้ามไป ใช้ default */ }
}

// HTML ของปุ่มสลับ — วางในแถบเครื่องมือ ใช้สไตล์ .segmented เดิม (ไม่เพิ่ม CSS ซ้ำ)
export function listViewHtml() {
  const m = getListView();
  return `
    <div class="segmented viewmode" role="tablist" aria-label="มุมมอง" title="สลับมุมมอง ตาราง / การ์ด">
      <button type="button" data-lv="table" class="${m === 'table' ? 'on' : ''}" aria-label="มุมมองตาราง">☰ ตาราง</button>
      <button type="button" data-lv="cards" class="${m === 'cards' ? 'on' : ''}" aria-label="มุมมองการ์ด">▤ การ์ด</button>
    </div>`;
}

// ใส่/ถอดคลาสให้กล่องรายการตามมุมมองปัจจุบัน — เรียกได้ทุกครั้งหลัง render รายการ
export function applyListView(listEl) {
  if (listEl) listEl.classList.toggle('list-cards', getListView() === 'cards');
}

// ผูกปุ่มสลับ · root = element ที่มีปุ่ม (แถบเครื่องมือ) · listEl = กล่องรายการที่จะใส่คลาส
export function bindListView(root, listEl) {
  applyListView(listEl);
  root.querySelectorAll('.viewmode [data-lv]').forEach(btn => {
    btn.addEventListener('click', () => {
      setListView(btn.dataset.lv);
      root.querySelectorAll('.viewmode [data-lv]')
          .forEach(x => x.classList.toggle('on', x === btn));
      applyListView(listEl);   // สลับทันที ไม่ต้องโหลดข้อมูลใหม่ (การ์ด+ตารางอยู่ใน DOM แล้ว)
    });
  });
}
