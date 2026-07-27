// Lightbox ดูรูปเต็มจอ + ซูมเข้า-ออก + ลาก/ปินช์ — ใช้กับนามบัตร (และรูปอื่น ๆ ในอนาคต)
// รองรับทั้ง desktop (ปุ่ม +/− · ล้อเมาส์ · ลากด้วยเมาส์) และมือถือ (ปินช์ 2 นิ้ว · ลาก 1 นิ้ว)
// ⚠️ พื้นหลังมืดคงที่ (image viewer) — hardcode ได้เหมือน .modal (#00000099) ไม่ผูกธีม

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const safe = (u) => {
  const s = String(u || '');
  return (/^data:image\//i.test(s) || /^https?:\/\//i.test(s)) ? s : '';
};

/** เปิดรูปเต็มจอ + ซูมได้ · title = ป้ายบนแถบหัว */
export function openLightbox(url, title) {
  const src = safe(url);
  if (!src) return;

  const el = document.createElement('div');
  el.className = 'lightbox';
  el.innerHTML = `
    <div class="lb-bar">
      <span class="lb-title">${esc(title || 'รูปภาพ')}</span>
      <span class="lb-sp"></span>
      <button type="button" class="lb-btn" data-zout aria-label="ซูมออก">－</button>
      <button type="button" class="lb-btn" data-zin  aria-label="ซูมเข้า">＋</button>
      <button type="button" class="lb-btn" data-reset>รีเซ็ต</button>
      <button type="button" class="lb-btn" data-close>✕ ปิด</button>
    </div>
    <div class="lb-stage" data-stage>
      <img class="lb-img" data-img src="${src}" alt="${esc(title || '')}" draggable="false">
    </div>
    <div class="lb-hint">เลื่อนล้อ/ปินช์เพื่อซูม · ลากเพื่อเลื่อน</div>`;
  document.body.appendChild(el);
  document.body.classList.add('lb-open');

  const img   = el.querySelector('[data-img]');
  const stage = el.querySelector('[data-stage]');
  let scale = 1, tx = 0, ty = 0;
  const MIN = 1, MAX = 8;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  const zoom = (f) => {
    scale = Math.min(MAX, Math.max(MIN, scale * f));
    if (scale <= 1) { scale = 1; tx = 0; ty = 0; }   // ย่อสุด = จัดกลาง
    apply();
  };

  el.querySelector('[data-zin]').addEventListener('click', () => zoom(1.3));
  el.querySelector('[data-zout]').addEventListener('click', () => zoom(1 / 1.3));
  el.querySelector('[data-reset]').addEventListener('click', () => { scale = 1; tx = 0; ty = 0; apply(); });

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoom(1.3);
    else if (e.key === '-' || e.key === '_') zoom(1 / 1.3);
  }
  function close() {
    el.remove();
    document.body.classList.remove('lb-open');
    document.removeEventListener('keydown', onKey);
  }
  el.querySelector('[data-close]').addEventListener('click', close);
  // คลิกพื้นหลัง (นอกรูป) = ปิด
  stage.addEventListener('mousedown', (e) => { if (e.target === stage) close(); });
  document.addEventListener('keydown', onKey);

  // ล้อเมาส์ = ซูม (desktop)
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

  // pointer: ลาก (1 จุด) + ปินช์ (2 จุด) — ใช้ Pointer Events ครอบทั้งเมาส์/นิ้ว
  const pts = new Map();
  let startDist = 0, startScale = 1, panning = false, lastX = 0, lastY = 0;
  img.addEventListener('pointerdown', (e) => {
    img.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      startDist = Math.hypot(a.x - b.x, a.y - b.y); startScale = scale;
    } else {
      panning = scale > 1; lastX = e.clientX; lastY = e.clientY;
    }
  });
  img.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && startDist) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      scale = Math.min(MAX, Math.max(MIN, startScale * (d / startDist)));
      if (scale <= 1) { scale = 1; tx = 0; ty = 0; }
      apply();
    } else if (panning) {
      tx += e.clientX - lastX; ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; apply();
    }
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) startDist = 0;
    if (pts.size === 0) panning = false;
  };
  img.addEventListener('pointerup', up);
  img.addEventListener('pointercancel', up);
  // ดับเบิลคลิก/แตะ = สลับซูม 1× ↔ 2.5×
  img.addEventListener('dblclick', () => { if (scale > 1) { scale = 1; tx = 0; ty = 0; } else scale = 2.5; apply(); });
}
