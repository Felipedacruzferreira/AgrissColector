(() => {
  const STORAGE_KEY = "tl-map-collector:v1";
  const NEAR_PX = 10; /* screen px */

  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const map = document.getElementById("map");
  const markersEl = document.getElementById("markers");
  const countEl = document.getElementById("count");

  /** @type {{ id: string, x: number, y: number }[]} percent 0..100 */
  let marks = load();

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originTx = 0;
  let originTy = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.marks) ? parsed.marks : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ marks, updatedAt: Date.now() }));
    countEl.textContent = `${marks.length} marcados`;
  }

  function mode() {
    return document.querySelector('input[name="mode"]:checked')?.value || "mark";
  }

  function applyTransform() {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    viewport.classList.toggle("mode-mark", mode() === "mark" && !dragging);
  }

  function render() {
    markersEl.innerHTML = "";
    for (const m of marks) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "marker";
      el.style.left = `${m.x}%`;
      el.style.top = `${m.y}%`;
      el.dataset.id = m.id;
      el.dataset.x = String(m.x);
      el.dataset.y = String(m.y);
      el.title = `Coletado (${m.x.toFixed(1)}%, ${m.y.toFixed(1)}%)`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mode() === "erase") {
          marks = marks.filter((x) => x.id !== m.id);
          save();
          render();
        }
      });
      markersEl.appendChild(el);
    }
    countEl.textContent = `${marks.length} marcados`;
  }

  function clientToPercent(clientX, clientY) {
    const rect = map.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
    };
  }

  function distPx(a, b, mapRect) {
    const ax = (a.x / 100) * mapRect.width;
    const ay = (a.y / 100) * mapRect.height;
    const bx = (b.x / 100) * mapRect.width;
    const by = (b.y / 100) * mapRect.height;
    return Math.hypot(ax - bx, ay - by);
  }

  function findNear(percent) {
    const rect = map.getBoundingClientRect();
    let best = null;
    let bestD = Infinity;
    for (const m of marks) {
      const d = distPx(m, percent, rect);
      if (d < NEAR_PX && d < bestD) {
        best = m;
        bestD = d;
      }
    }
    return best;
  }

  function placeOrToggle(clientX, clientY) {
    const p = clientToPercent(clientX, clientY);
    if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return;

    const near = findNear(p);
    if (mode() === "erase") {
      if (near) {
        marks = marks.filter((x) => x.id !== near.id);
        save();
        render();
      }
      return;
    }

    if (near) {
      marks = marks.filter((x) => x.id !== near.id);
    } else {
      marks.push({
        id: crypto.randomUUID(),
        x: p.x,
        y: p.y,
      });
    }
    save();
    render();
  }

  function zoomAt(factor, clientX, clientY) {
    const prev = scale;
    scale = Math.min(6, Math.max(0.35, scale * factor));
    const r = viewport.getBoundingClientRect();
    const cx = clientX - r.left;
    const cy = clientY - r.top;
    tx = cx - ((cx - tx) * scale) / prev;
    ty = cy - ((cy - ty) * scale) / prev;
    applyTransform();
  }

  function fitInitial() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const mw = map.naturalWidth || map.width;
    const mh = map.naturalHeight || map.height;
    if (!mw || !mh) return;
    scale = Math.min(vw / mw, vh / mh) * 0.98;
    tx = (vw - mw * scale) / 2;
    ty = (vh - mh * scale) / 2;
    applyTransform();
  }

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originTx = tx;
    originTy = ty;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("dragging");
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 4) moved = true;
    if (moved) {
      tx = originTx + dx;
      ty = originTy + dy;
      applyTransform();
    }
  });

  viewport.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove("dragging");
    applyTransform();
    if (!moved) placeOrToggle(e.clientX, e.clientY);
  });

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    },
    { passive: false }
  );

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(1 / 1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnResetView").addEventListener("click", fitInitial);
  document.getElementById("btnClear").addEventListener("click", () => {
    if (!marks.length) return;
    if (!confirm(`Apagar os ${marks.length} pontos salvos neste navegador?`)) return;
    marks = [];
    save();
    render();
  });

  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener("change", applyTransform);
  }

  map.addEventListener("load", () => {
    fitInitial();
    render();
  });
  if (map.complete) {
    fitInitial();
    render();
  }
})();
