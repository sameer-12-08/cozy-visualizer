import { useEffect, useRef } from "react";

/** Ambient Stardust / Floating Embers: soft glowing particles drifting upward.
 *  Particles flee gently from the pointer; speed and glow rise while playing.
 *  In `ambient` mode they drift at a fixed calm pace and ignore the pointer. Colours from theme vars. */
export function Embers({ playing, count = 60, ambient = false, className = "" }: { playing: boolean; count?: number; ambient?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let mx = -9999, my = -9999, raf = 0, energy = 0;
    const ps = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), vx: 0, vy: 0, r: 0.6 + Math.random() * 1.8, p: Math.random() * 6.28, hot: Math.random() < 0.6,
    }));
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    if (!ambient) window.addEventListener("pointermove", move);

    const draw = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cs = getComputedStyle(c);
      const main = cs.getPropertyValue("--main").trim() || "#e2b714";
      const cap = cs.getPropertyValue("--caption").trim() || main;
      energy += ((ambient ? 0.45 : playRef.current ? 1 : 0.25) - energy) * 0.03;
      const t = time / 1000;
      ctx.globalCompositeOperation = "lighter";
      for (const p of ps) {
        let px = p.x * w, py = p.y * h;
        const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (1 - d2 / 9000) * 0.6; p.vx += (dx / Math.sqrt(d2 + 1)) * f; p.vy += (dy / Math.sqrt(d2 + 1)) * f; }
        p.vx *= 0.92; p.vy *= 0.92;
        px += p.vx + Math.sin(t * 0.8 + p.p) * 0.25;
        py += p.vy - (0.15 + p.r * 0.2) * (0.4 + energy * 1.6);
        if (py < -10) { py = h + 10; px = Math.random() * w; }
        if (px < -10) px = w + 10; else if (px > w + 10) px = -10;
        if (py > h + 12) py = -10;
        p.x = px / w; p.y = py / h;
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.p * 3);
        const rad = p.r * (1 + energy * 0.6) * 4;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, p.hot ? main : cap);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = (0.25 + 0.55 * tw) * (0.5 + energy * 0.5);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); };
  }, [count, ambient]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
