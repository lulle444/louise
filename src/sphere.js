// Wireframe sphere for the hero graphic. Dependency-free canvas drawing —
// orthographic projection of latitude/longitude circles, slowly rotated.
(function () {
  const canvas = document.getElementById('sphere');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H * 0.42, R = W * 0.34;
  const LON_LINES = 12, LAT_LINES = 7, STEPS = 72;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function project(x, y, z) {
    // simple orthographic projection with a squash on Y for a "dome" feel
    return { x: cx + x, y: cy + y * 0.82 - z * 0.06, z };
  }

  function draw(rot) {
    ctx.clearRect(0, 0, W, H);

    // longitude great-circles
    for (let i = 0; i < LON_LINES; i++) {
      const phi = (i / LON_LINES) * Math.PI * 2 + rot;
      const pts = [];
      for (let s = 0; s <= STEPS; s++) {
        const t = (s / STEPS) * Math.PI * 2;
        const x = R * Math.sin(t) * Math.cos(phi);
        const y = R * Math.cos(t);
        const z = R * Math.sin(t) * Math.sin(phi);
        pts.push(project(x, y, z));
      }
      strokePath(pts, 0.28);
    }

    // latitude circles
    for (let j = 1; j < LAT_LINES; j++) {
      const theta = (j / LAT_LINES) * Math.PI;
      const ringR = R * Math.sin(theta);
      const y0 = R * Math.cos(theta);
      const pts = [];
      for (let s = 0; s <= STEPS; s++) {
        const t = (s / STEPS) * Math.PI * 2 + rot * 0.6;
        const x = ringR * Math.cos(t);
        const z = ringR * Math.sin(t);
        pts.push(project(x, y0, z));
      }
      strokePath(pts, 0.34);
    }
  }

  function strokePath(pts, baseAlpha) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const depth = (a.z + b.z) / 2; // -R..R
      const alpha = baseAlpha * (0.35 + 0.65 * ((depth / R) * 0.5 + 0.5));
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  if (reduceMotion) {
    draw(0.4);
    return;
  }

  let rot = 0;
  function tick() {
    rot += 0.0025;
    draw(rot);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
