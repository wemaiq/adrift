(function () {
  const FIRST_START_IMMEDIATELY = true;

  function createCanvas() {
    const c = document.createElement('canvas');
    c.id = 'rain';
    c.setAttribute('aria-hidden', 'true');
    c.style.position = 'fixed';
    c.style.inset = '0';
    c.style.setProperty('z-index', '0', 'important');
    c.style.setProperty('pointer-events', 'none', 'important');
    document.body.appendChild(c);
    return c;
  }

  const existing = document.getElementById('rain');
  const canvas = (existing && existing.tagName === 'CANVAS') ? existing : createCanvas();
  const ctx = canvas.getContext('2d');

  const P = {
    gravity: 2200,
    windDrift: 8,
    speedMin: 750,
    speedMax: 900,
    lenMin: 30,
    lenMax: 55,
    thickMin: 0.8,
    thickMax: 1.4,
    alphaMin: 0.08,
    alphaMax: 0.2,
    fadeRate: 0.0015,
    spawnJitter: 0.0012,
    splashParticles: 8,
    splashSpeed: 50,
    splashLife: 1.3,
    rippleLife: 1.6
  };

  const MAX_DROP_LIFE = 4.5;

  // Random delay and duration for rain easter egg
  const RAIN_DELAY = 60 + Math.random() * 60;  // Random 60-120 seconds wait
  const RAIN_DURATION = 30 + Math.random() * 30; // Rain for 30-60 seconds

  const RAIN_CYCLE = [
    { time: 0, intensity: 0.0 },
    { time: RAIN_DELAY, intensity: 0.0 },
    { time: RAIN_DELAY + 5, intensity: 0.2 },
    { time: RAIN_DELAY + 10, intensity: 0.7 },
    { time: RAIN_DELAY + RAIN_DURATION, intensity: 0.5 },
    { time: RAIN_DELAY + RAIN_DURATION + 10, intensity: 0.0 }
  ];

  let W = 0, H = 0, DPR = 1, MAX_DROPS = 240;
  const PREFERS_REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = canvas.width = Math.floor(window.innerWidth * DPR);
    H = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    MAX_DROPS = Math.max(30, Math.min(240, Math.floor((W * H) / 9000)));
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  const drops = [], splashes = [], ripples = [];
  let intensity = 0, targetIntensity = 0;
  let running = false, rafId = 0, last = performance.now();

  const startTime = Date.now();

  function updateRainCycle() {
    const t = (Date.now() - startTime) / 1000;
    for (let i = 0; i < RAIN_CYCLE.length - 1; i++) {
      const a = RAIN_CYCLE[i];
      const b = RAIN_CYCLE[i + 1];
      if (t >= a.time && t < b.time) {
        const f = (t - a.time) / (b.time - a.time);
        targetIntensity = a.intensity + f * (b.intensity - a.intensity);
        return;
      }
    }
    // If past last cycle point, stop
    targetIntensity = RAIN_CYCLE[RAIN_CYCLE.length - 1].intensity;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawnDrop() {
    const speed = rnd(P.speedMin, P.speedMax);
    const len = rnd(P.lenMin, P.lenMax);
    const x = rnd(0, W);
    const y = rnd(-120 * DPR, -30 * DPR);
    const impactY = rnd(0, H);
    const thickness = rnd(P.thickMin, P.thickMax) * DPR;

    drops.push({
      x,
      y,
      vx: rnd(-P.windDrift, P.windDrift),
      vy: speed,
      len,
      thickness,
      alpha: rnd(P.alphaMin, P.alphaMax),
      impactY,
      age: 0
    });
  }

  function spawnToMatchIntensity(dtMs) {
    const want = Math.floor(MAX_DROPS * intensity);
    if (drops.length < want) {
      const deficit = want - drops.length;
      const burst = Math.min(deficit, Math.ceil(deficit * 0.15) + 1);
      for (let i = 0; i < burst; i++) spawnDrop();
    } else if (Math.random() < P.spawnJitter * dtMs * intensity && drops.length < MAX_DROPS) {
      spawnDrop();
    }
  }

  function triggerSplash(x, y) {
    for (let i = 0; i < P.splashParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rnd(P.splashSpeed * 0.5, P.splashSpeed * 4);
      const upward = Math.sin(angle) * 0.9;
      splashes.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: upward * speed,
        alpha: 0.25,
        age: 0,
        life: P.splashLife,
        size: rnd(0.6, 1.6) * DPR
      });
    }

    ripples.push({
      x,
      y,
      r: 0,
      maxR: rnd(16, 28) * DPR,
      alpha: 0.12,
      shimmer: Math.random() > 0.6,
      life: P.rippleLife,
      age: 0
    });
  }

  function step(dt) {
    const dtMs = dt * 1000;

    updateRainCycle();

    if (intensity < targetIntensity) intensity = Math.min(targetIntensity, intensity + P.fadeRate * dtMs);
    else if (intensity > targetIntensity) intensity = Math.max(targetIntensity, intensity - P.fadeRate * dtMs);

    spawnToMatchIntensity(dtMs);
    ctx.clearRect(0, 0, W, H);

    // Drops
    ctx.save();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += P.gravity * dt;
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      d.age += dt;

      const x2 = d.x;
      const y2 = d.y - d.len;

      ctx.globalAlpha = d.alpha;
      ctx.lineWidth = d.thickness;
      ctx.strokeStyle = 'rgba(230,235,240,0.75)';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (d.y > d.impactY || d.y > H + 20 || d.age > MAX_DROP_LIFE) {
        triggerSplash(d.x, d.y);
        drops.splice(i, 1);
      }
    }
    ctx.restore();

    // Splashes
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(240,240,255,0.1)';
    for (let i = splashes.length - 1; i >= 0; i--) {
      const p = splashes[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      p.age += dt;
      p.alpha -= dt / p.life;

      if (p.alpha <= 0) {
        splashes.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'rgba(230,235,240,0.7)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Ripples
    ctx.save();
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      r.r += 20 * dt;
      r.alpha -= dt / r.life;

      if (r.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }

      const glow = r.shimmer ? (Math.sin(r.age * 7) * 0.06 + 0.06) : 0;
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = `rgba(255,255,255,${r.alpha + glow})`;
      ctx.lineWidth = 1 * DPR;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function loop(now) {
  if (!running) return;
  const dt = Math.max(0.001, Math.min(0.04, (now - last) / 1000));
  last = now;
  step(dt);
  
  // Keep running until we're past the entire rain cycle
  const currentTime = (Date.now() - startTime) / 1000;
  const lastCycleTime = RAIN_CYCLE[RAIN_CYCLE.length - 1].time + 20; // Add buffer
  
  if (currentTime < lastCycleTime || intensity > 0.001 || drops.length > 0 || splashes.length > 0) {
    rafId = requestAnimationFrame(loop);
  } else {
    running = false;
    rafId = 0;
  }
}

  function ensureLoop() {
    if (!running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  const RainFX = {
  start() { 
    if (PREFERS_REDUCED) return; 
    // Don't override targetIntensity here - let updateRainCycle control it
    ensureLoop(); 
  },
  stop() { targetIntensity = 0; ensureLoop(); },
  destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    drops.length = 0;
    splashes.length = 0;
    ripples.length = 0;
    window.removeEventListener('resize', resize);
    try { canvas.remove(); } catch {}
  }
};
Object.freeze(RainFX);
Object.defineProperty(window, 'RainFX', { value: RainFX });

// Always start the loop to begin the timer
if (FIRST_START_IMMEDIATELY) {
  ensureLoop();  // Start the loop but don't force intensity to 1
}
})();