import { useEffect, useRef, useState } from "react";

export const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
export const artBg = (album: string) => {
  const h = hue(album);
  return `linear-gradient(135deg, hsl(${h} 60% 55%), hsl(${(h + 60) % 360} 50% 25%))`;
};

/** Album sleeve with a vinyl disc that slides out and spins while playing. */
export function VinylArt({ album, size, playing }: { album: string; size: number; playing: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size * (playing ? 1.35 : 1), height: size, transition: "width 600ms cubic-bezier(.2,.8,.2,1)" }}>
      <div className={`absolute top-0 rounded-full shadow-lg transition-all duration-700 ease-out ${playing ? "animate-[spin_4s_linear_infinite]" : ""}`}
        style={{ width: size, height: size, left: playing ? size * 0.35 : 0,
          background: `radial-gradient(circle, color-mix(in oklab, var(--main) 80%, black) 0 14%, oklch(0.12 0 0) 15% 17%, transparent 18%), repeating-radial-gradient(circle, oklch(0.16 0 0) 0 1px, oklch(0.1 0 0) 1px 3px)` }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 30deg, transparent 0 20%, oklch(1 0 0 / 0.12) 25%, transparent 30% 70%, oklch(1 0 0 / 0.08) 75%, transparent 80%)" }} />
      </div>
      <div className="sleeve absolute left-0 top-0 rounded-md shadow-xl" style={{ width: size, height: size, background: artBg(album) }} />
    </div>
  );
}

/** Stereo L/R peak meter, simulated from playback state. */
export function VuMeter({ playing, vol }: { playing: boolean; vol: number }) {
  const l = useRef<HTMLDivElement>(null), r = useRef<HTMLDivElement>(null);
  const play = useRef(playing); play.current = playing;
  const v = useRef(vol); v.current = vol;
  useEffect(() => {
    let raf = 0, a = 0, b = 0;
    const tick = (t: number) => {
      const e = play.current ? v.current / 100 : 0;
      const ta = e * (0.55 + 0.4 * Math.abs(Math.sin(t / 130) * Math.sin(t / 370)));
      const tb = e * (0.55 + 0.4 * Math.abs(Math.sin(t / 150 + 1) * Math.sin(t / 410)));
      a += (ta - a) * (ta > a ? 0.5 : 0.08); b += (tb - b) * (tb > b ? 0.5 : 0.08);
      if (l.current) l.current.style.width = `${a * 100}%`;
      if (r.current) r.current.style.width = `${b * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const bar = (ref: React.RefObject<HTMLDivElement | null>, ch: string) => (
    <div className="flex items-center gap-1.5">
      <span className="w-2 font-mono text-[9px] text-sub">{ch}</span>
      <div className="relative h-1 w-16 overflow-hidden rounded-full bg-sub/20">
        <div ref={ref} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--sub), var(--main) 70%, var(--error))", backgroundSize: "4rem 100%" }} />
      </div>
    </div>
  );
  return <div className="flex flex-col gap-1" title="Peak meter">{bar(l, "L")}{bar(r, "R")}</div>;
}

const BANDS = ["60", "250", "1k", "4k", "12k"];
export function EqPopover({ onClose }: { onClose: () => void }) {
  const [g, setG] = useState([0, 0, 0, 0, 0]);
  return (
    <div className="glass window-shadow window-highlight absolute bottom-24 right-4 z-20 w-64 rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-sub">
        <span className="font-semibold uppercase tracking-wider">Equalizer</span>
        <span className="flex gap-2"><button onClick={() => setG([0, 0, 0, 0, 0])} className="hover:text-main">Flat</button><button onClick={onClose} className="hover:text-foreground">Done</button></span>
      </div>
      <div className="flex h-32 justify-between px-1">
        {BANDS.map((b, i) => (
          <div key={b} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] text-main">{g[i]! > 0 ? "+" : ""}{g[i]}</span>
            <input type="range" min={-12} max={12} value={g[i]} onChange={(e) => setG(g.map((x, j) => (j === i ? +e.target.value : x)))}
              className="h-20 w-4 accent-[var(--main)] [writing-mode:vertical-lr] [direction:rtl]" />
            <span className="font-mono text-[9px] text-sub">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "24-bit / 96 kHz" from "FLAC 24/96". */
export function AudioBadge({ fmt, playing }: { fmt: string; playing: boolean }) {
  const [codec, spec] = fmt.split(" ");
  const [bits, rate] = (spec ?? "16/44").split("/");
  const khz = rate === "44" ? "44.1" : rate;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] text-sub">
      <span className={`h-1.5 w-1.5 rounded-full ${playing ? "bg-main shadow-[0_0_6px_var(--main)]" : "bg-sub"}`} />
      {codec} · {bits}-bit / {khz} kHz
    </span>
  );
}
