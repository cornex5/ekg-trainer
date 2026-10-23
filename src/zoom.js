// Pan and zoom for an svg inside a container, by changing its viewBox.
// Wheel zooms around the cursor, drag pans, two fingers pinch, a tap calls onTap.
export function createZoom(view, { onTap, allowDouble = () => true }) {
  let lastTap = { t: 0, x: 0, y: 0 };
  let svg = null;
  let base = null;
  let vb = null;
  const ptrs = new Map();
  let drag = null;
  let pinch = null;

  const MAX = 14;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function apply() {
    // keep the window inside the page; when fully zoomed out it equals the base box
    vb[0] = clamp(vb[0], base[0], base[0] + base[2] - vb[2]);
    vb[1] = clamp(vb[1], base[1], base[1] + base[3] - vb[3]);
    svg.setAttribute('viewBox', vb.map((n) => n.toFixed(3)).join(' '));
  }
  function toUser(cx, cy) {
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  }
  function zoomAt(factor, cx, cy) {
    const w = clamp(vb[2] / factor, base[2] / MAX, base[2]);
    const f = vb[2] / w;
    if (f === 1) return;
    const [ux, uy] = toUser(cx, cy);
    vb[2] = w;
    vb[3] = (w * base[3]) / base[2];
    svg.setAttribute('viewBox', vb.join(' '));
    const [vx, vy] = toUser(cx, cy);
    vb[0] += ux - vx;
    vb[1] += uy - vy;
    apply();
  }

  view.addEventListener(
    'wheel',
    (e) => {
      if (!svg) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * 0.0018), e.clientX, e.clientY);
    },
    { passive: false },
  );
  view.addEventListener('pointerdown', (e) => {
    if (!svg) return;
    view.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) {
      drag = { x: e.clientX, y: e.clientY, moved: 0, vb: [...vb], u: toUser(e.clientX, e.clientY) };
      view.classList.add('grab');
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      drag = null;
    }
  });
  view.addEventListener('pointermove', (e) => {
    if (!svg || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch.d > 0 && d > 0) zoomAt(d / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      pinch.d = d;
    } else if (drag) {
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
      if (drag.moved < 5) return;
      vb = [...drag.vb];
      svg.setAttribute('viewBox', vb.join(' '));
      const [cx, cy] = toUser(e.clientX, e.clientY);
      vb[0] += drag.u[0] - cx;
      vb[1] += drag.u[1] - cy;
      apply();
    }
  });
  function end(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    view.classList.remove('grab');
    if (drag && ptrs.size === 0 && drag.moved < 5 && e.type === 'pointerup') {
      const now = performance.now();
      const dbl = now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 12;
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      if (dbl && allowDouble()) {
        lastTap.t = 0;
        api.reset();
      } else onTap && onTap(e);
    }
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) drag = null;
  }
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);

  const api = {
    // markup: svg string; keepView keeps the current window when the picture is redrawn
    load(markup, keepView) {
      const old = vb && base ? { vb: [...vb], w: base[2] } : null;
      view.innerHTML = markup;
      svg = view.querySelector('svg');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      const b = svg.viewBox.baseVal;
      base = [b.x, b.y, b.width, b.height];
      vb = keepView && old && old.w === base[2] ? old.vb : [...base];
      apply();
    },
    reset() {
      if (!svg) return;
      vb = [...base];
      apply();
    },
    zoomBy(f) {
      if (!svg) return;
      const r = view.getBoundingClientRect();
      zoomAt(f, r.left + r.width / 2, r.top + r.height / 2);
    },
    svg: () => svg,
    point: (e) => toUser(e.clientX, e.clientY),
    level: () => (base ? base[2] / vb[2] : 1),
  };
  return api;
}
