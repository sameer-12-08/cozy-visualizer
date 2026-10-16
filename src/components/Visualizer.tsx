import { useEffect, useRef } from "react";

/** Minimal bar visualizer. Bars dance while playing and swell toward the mouse pointer.
 *  Colours come from the theme's --main / --sub CSS variables, so it follows the selected theme. */
export function Visualizer({ playing, bars = 48, className = "" }: { playing: boolean; bars?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let mx = -1, my = -1, raf = 0, energy = 0;
    const h = new Array(bars).fill(0);
    const host = window;
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); const pad = 60;
      if (e.clientX < r.left - pad || e.clientX > r.right + pad || e.clientY < r.top - pad * 2 || e.clientY > r.bottom + pad) { mx = -1; return; }
      mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; };
    const leave = () => { mx = -1; };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);

    const draw = (time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, ht = c.clientHeight;
      if (c.width !== w * dpr) { c.width = w * dpr; c.height = ht * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, ht);
      const cs = getComputedStyle(c);
      const main = cs.getPropertyValue("--main").trim() || "#e2b714";
      const sub = cs.getPropertyValue("--sub").trim() || "#646669";
      energy += ((playRef.current ? 1 : 0.15) - energy) * 0.05;
      const t = time / 1000, gap = 3, bw = (w - gap * (bars - 1)) / bars;
      const lift = mx >= 0 ? 1 + Math.max(0, 1 - Math.abs(my - 0.5) / 2) * 0.6 : 1;
      for (let i = 0; i < bars; i++) {
        const x = i / (bars - 1);
        const wave = 0.35 + 0.3 * Math.sin(t * 3 + i * 0.45) * Math.sin(t * 1.7 + i * 0.13) + 0.25 * Math.sin(t * 5.3 + i * 1.1);
        const near = mx >= 0 ? Math.exp(-((x - mx) ** 2) / 0.006) : 0;
        const target = Math.max(0.04, (Math.abs(wave) * energy + near * 0.55) * lift);
        h[i] += (target - h[i]) * 0.18;
        const bh = Math.min(1, h[i]) * ht;
        const g = ctx.createLinearGradient(0, ht, 0, ht - bh);
        g.addColorStop(0, sub); g.addColorStop(1, main);
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(near, energy * 0.7);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), ht - bh, bw, bh, Math.min(bw / 2, 3));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); };
  }, [bars]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
