import { createFileRoute } from "@tanstack/react-router";
import { Visualizer as Bars } from "@/components/Visualizer";
import { Embers } from "@/components/Embers";
import { hue, artBg, VinylArt, VuMeter, EqPopover, AudioBadge } from "@/components/Extras";
import { useEffect, useMemo, useRef, useState } from "react";
import { SkipBack, SkipForward, Play, Pause, Music, Disc3, Mic2, Folder, Flame, Search, ListMusic, Plus, Palette, Volume2, CornerDownRight, X, ArrowUp, Minimize2, Maximize2, Sparkles, AudioLines, SlidersHorizontal } from "lucide-react";

const VIEW_ICONS = { Songs: Music, Albums: Disc3, Artists: Mic2, Folders: Folder, "Most Played": Flame } as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickMusic — Minimal macOS FLAC/WAV Player" },
      { name: "description", content: "UI prototype of QuickMusic, a minimal native macOS lossless player with Monkeytype themes." },
      { property: "og:title", content: "QuickMusic — Minimal macOS Player" },
      { property: "og:description", content: "Songs, albums, artists, folders, queue, mini player and themes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Theme = { name: string; bg: string; main: string; caption: string; text: string; sub: string; subalt: string; error: string };
const THEMES: Theme[] = [
  { name: "serika dark", bg: "#323437", main: "#e2b714", caption: "#e2b714", text: "#d1d0c5", sub: "#646669", subalt: "#2c2e31", error: "#ca4754" },
  { name: "serika", bg: "#e1e1e3", main: "#e2b714", caption: "#e2b714", text: "#323437", sub: "#aaaeb3", subalt: "#d1d3d8", error: "#da3333" },
  { name: "dracula", bg: "#282a36", main: "#bd93f9", caption: "#6272a4", text: "#f8f8f2", sub: "#6272a4", subalt: "#20222c", error: "#ff5555" },
  { name: "nord", bg: "#242933", main: "#88c0d0", caption: "#5e81ac", text: "#e5e9f0", sub: "#929aaa", subalt: "#1d2128", error: "#bf616a" },
  { name: "botanical", bg: "#7b9c98", main: "#eaf1f3", caption: "#495755", text: "#eaf1f3", sub: "#495755", subalt: "#6f8f8b", error: "#f6c9b4" },
  { name: "carbon", bg: "#313131", main: "#f66e0d", caption: "#f66e0d", text: "#f5e6c8", sub: "#616161", subalt: "#2b2b2b", error: "#e72d2d" },
  { name: "8008", bg: "#333a45", main: "#f44c7f", caption: "#f44c7f", text: "#e9ecf0", sub: "#939eae", subalt: "#2e343d", error: "#da3333" },
  { name: "olivia", bg: "#1c1b1d", main: "#deaf9d", caption: "#deaf9d", text: "#f2efed", sub: "#4e3e3e", subalt: "#232124", error: "#bf616a" },
  { name: "matrix", bg: "#000000", main: "#15ff00", caption: "#15ff00", text: "#d1ffcd", sub: "#006500", subalt: "#032000", error: "#da3333" },
  { name: "lavender", bg: "#ada6c2", main: "#e4e3e9", caption: "#e4e3e9", text: "#2f2a41", sub: "#e4e3e9", subalt: "#a19ab7", error: "#da3333" },
];

type Song = { id: number; title: string; artist: string; album: string; folder: string; dur: number; fmt: string; plays: number };
const RAW: [string, string, string, number, string][] = [
  ["So What", "Miles Davis", "Kind of Blue", 562, "FLAC 24/96"],
  ["Freddie Freeloader", "Miles Davis", "Kind of Blue", 586, "FLAC 24/96"],
  ["Blue in Green", "Miles Davis", "Kind of Blue", 337, "FLAC 24/96"],
  ["Teardrop", "Massive Attack", "Mezzanine", 330, "FLAC 16/44"],
  ["Angel", "Massive Attack", "Mezzanine", 379, "FLAC 16/44"],
  ["Windowlicker", "Aphex Twin", "Windowlicker", 367, "WAV 16/44"],
  ["Xtal", "Aphex Twin", "Selected Ambient Works", 291, "FLAC 16/44"],
  ["Avril 14th", "Aphex Twin", "Drukqs", 125, "FLAC 16/44"],
  ["Pyramid Song", "Radiohead", "Amnesiac", 289, "FLAC 24/48"],
  ["Weird Fishes", "Radiohead", "In Rainbows", 318, "FLAC 24/48"],
  ["Reckoner", "Radiohead", "In Rainbows", 290, "FLAC 24/48"],
  ["Hyperballad", "Björk", "Post", 321, "WAV 24/96"],
];
const SONGS: Song[] = RAW.map(([title, artist, album, dur, fmt], i) => ({
  id: i, title, artist, album, dur, fmt, folder: `~/Music/${artist}/${album}`, plays: (i * 37) % 90 + 3,
}));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type View = "Songs" | "Albums" | "Artists" | "Folders" | "Most Played";

function Art({ album, size = 40 }: { album: string; size?: number }) {
  const h = hue(album);
  return (
    <div className="shrink-0 rounded-md shadow-md" style={{ width: size, height: size,
      background: `linear-gradient(135deg, hsl(${h} 60% 55%), hsl(${(h + 60) % 360} 50% 25%))` }} />
  );
}

type Viz = "bars" | "embers";

/** Module-level on purpose: if it were declared inside App() it would get a new
 *  component identity on every render, unmounting the canvas each second as the
 *  playback timer ticks (visible as the visualizer blanking and restarting). */
function Visualizer({ viz, playing, bars, ambient = false }: {
  viz: Viz;
  playing: boolean;
  bars?: number;
  ambient?: boolean;
}) {
  return viz === "bars" ? (
    <Bars playing={playing} bars={bars ?? 48} ambient={ambient} />
  ) : (
    <Embers playing={playing} count={Math.max(30, bars ?? 48)} ambient={ambient} />
  );
}

function App() {
  const [theme, setTheme] = useState(0);
  const [hoverTheme, setHoverTheme] = useState<number | null>(null);
  const [view, setView] = useState<View>("Songs");
  const [q, setQ] = useState("");
  const [cur, setCur] = useState<Song>(SONGS[3]!);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(64);
  const [vol, setVol] = useState(70);
  const [queue, setQueue] = useState<Song[]>(SONGS.slice(4, 8));
  const [showQueue, setShowQueue] = useState(true);
  const [mode, setMode] = useState<"window" | "mini" | "full">("window");
  const [themeOpen, setThemeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [eqOpen, setEqOpen] = useState(false);
  const [viz, setViz] = useState<Viz>("bars");
  useEffect(() => { const v = localStorage.getItem("qm-viz"); if (v === "embers") setViz(v); }, []);
  useEffect(() => { localStorage.setItem("qm-viz", viz); }, [viz]);
  const VizToggle = () => (
    <button onClick={() => setViz(viz === "bars" ? "embers" : "bars")} title={`Visualizer: ${viz === "bars" ? "Bars" : "Embers"} (V)`}
      className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs text-sub transition hover:border-main hover:text-main">
      {viz === "bars" ? <AudioLines size={14} /> : <Sparkles size={14} />}<span className="hidden sm:inline">{viz === "bars" ? "Bars" : "Embers"}</span>
    </button>
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = localStorage.getItem("qm-theme"); if (t) setTheme(+t); }, []);
  useEffect(() => { localStorage.setItem("qm-theme", String(theme)); }, [theme]);

  const t = THEMES[hoverTheme ?? theme]!;
  const vars = { "--bg": t.bg, "--main": t.main, "--caption": t.caption, "--text": t.text, "--sub": t.sub, "--subalt": t.subalt, "--error": t.error } as React.CSSProperties;

  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setPos((p) => (p + 1 >= cur.dur ? 0 : p + 1)), 1000);
    return () => clearInterval(i);
  }, [playing, cur]);

  const play = (s: Song) => { setCur(s); setPos(0); setPlaying(true); };
  const next = () => { if (queue[0]) { play(queue[0]); setQueue(queue.slice(1)); } };
  const prev = () => { const i = SONGS.findIndex((s) => s.id === cur.id); play(SONGS[(i - 1 + SONGS.length) % SONGS.length]!); };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1400); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).tagName === "INPUT";
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape") { searchRef.current?.blur(); if (mode === "full") setMode("window"); setThemeOpen(false); }
      else if (e.key === "F8" || (e.key === " " && !typing)) { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "F9") next();
      else if ((e.key === "v" || e.key === "V") && !typing) setViz((v) => (v === "bars" ? "embers" : "bars"));
      else if (e.key === "F7") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = SONGS.filter((x) => !s || [x.title, x.artist, x.folder].some((f) => f.toLowerCase().includes(s)));
    return view === "Most Played" ? [...list].sort((a, b) => b.plays - a.plays) : list;
  }, [q, view]);

  const groups = (key: "album" | "artist" | "folder") => {
    const m = new Map<string, Song[]>();
    filtered.forEach((s) => m.set(s[key], [...(m.get(s[key]) ?? []), s]));
    return [...m.entries()];
  };

  const Controls = ({ big = false }: { big?: boolean }) => (
    <div className={`flex items-center ${big ? "gap-10" : "gap-5"}`}>
      <button onClick={prev} className="text-sub transition hover:scale-110 hover:text-foreground" title="Previous (F7)"><SkipBack size={big ? 32 : 18} fill="currentColor" /></button>
      <button onClick={() => setPlaying(!playing)} title="Play/Pause (F8)"
        className={`grid place-items-center rounded-full bg-main text-background shadow-lg transition hover:scale-105 active:scale-95 ${big ? "h-16 w-16" : "h-9 w-9"}`}>
        {playing ? <Pause size={big ? 28 : 16} fill="currentColor" /> : <Play size={big ? 28 : 16} fill="currentColor" className="ml-0.5" />}
      </button>
      <button onClick={next} className="text-sub transition hover:scale-110 hover:text-foreground" title="Next (F9)"><SkipForward size={big ? 32 : 18} fill="currentColor" /></button>
    </div>
  );
  const Seek = () => (
    <div className="flex w-full items-center gap-3 font-mono text-xs text-sub">
      <span>{fmt(pos)}</span>
      <input type="range" min={0} max={cur.dur} value={pos} onChange={(e) => setPos(+e.target.value)} className="flex-1 accent-[var(--main)]" />
      <span>-{fmt(cur.dur - pos)}</span>
    </div>
  );
  const Lights = ({ onGreen }: { onGreen?: () => void }) => (
    <div className="group/lights flex gap-2">
      {([["#ff5f57", "×", () => flash("Close — app keeps playing in menu bar"), "Close"], ["#febc2e", "−", () => setMode("mini"), "Mini player"], ["#28c840", "+", onGreen, "Full screen"]] as const).map(([c, sym, fn, label]) => (
        <button key={label} onClick={fn} title={label} aria-label={label}
          className="grid h-3 w-3 place-items-center rounded-full text-[9px] font-bold leading-none shadow-[inset_0_0_0_0.5px_oklch(0_0_0/0.25)]" style={{ background: c }}>
          <span className="opacity-0 transition group-hover/lights:opacity-100" style={{ color: "oklch(0 0 0 / 0.55)" }}>{sym}</span>
        </button>
      ))}
    </div>
  );

  const Row = ({ s, i }: { s: Song; i: number }) => {
    const active = s.id === cur.id;
    return (
      <div onDoubleClick={() => play(s)}
        className={`group grid grid-cols-[2rem_2.25rem_1fr_auto_3rem] items-center gap-3 rounded-lg px-3 py-2 text-sm transition md:grid-cols-[2rem_2.25rem_1.4fr_1fr_6rem_auto_3rem] ${active ? "bg-main/15 text-main" : "hover:bg-subalt"}`}>
        <button onClick={() => play(s)} className="font-mono text-xs text-sub">
          <span className="group-hover:hidden">{active && playing ? "♪" : i + 1}</span>
          <Play size={12} fill="currentColor" className="hidden text-foreground group-hover:inline" />
        </button>
        <Art album={s.album} size={36} />
        <div className="min-w-0"><div className="truncate font-medium">{s.title}</div><div className="truncate text-xs text-sub md:hidden">{s.artist}</div></div>
        <span className="hidden truncate text-sub md:block">{s.artist}</span>
        <span className="hidden w-fit rounded border px-1.5 py-0.5 font-mono text-[10px] text-sub md:block">{view === "Most Played" ? `${s.plays} plays` : s.fmt}</span>
        <span className="flex gap-2 opacity-0 transition group-hover:opacity-100">
          <button title="Play next" onClick={() => { setQueue([s, ...queue]); flash(`Playing next: ${s.title}`); }} className="text-sub hover:text-main"><CornerDownRight size={14} /></button>
          <button title="Add to queue" onClick={() => { setQueue([...queue, s]); flash(`Queued: ${s.title}`); }} className="text-sub hover:text-main"><Plus size={14} /></button>
        </span>
        <span className="text-right font-mono text-xs text-sub">{fmt(s.dur)}</span>
      </div>
    );
  };

  const Content = () => {
    if (view === "Songs" || view === "Most Played") return <div>{filtered.map((s, i) => <Row key={s.id} s={s} i={i} />)}</div>;
    if (view === "Albums")
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
          {groups("album").map(([a, ss]) => (
            <button key={a} onClick={() => { play(ss[0]!); setQueue(ss.slice(1)); flash(`Playing album ${a}`); }} className="text-left">
              <Art album={a} size={150} />
              <div className="mt-2 truncate text-sm">{a}</div>
              <div className="truncate text-xs text-sub">{ss[0]?.artist} · {ss.length} songs</div>
            </button>
          ))}
        </div>
      );
    const key = view === "Artists" ? "artist" : "folder";
    return (
      <div className="space-y-6">
        {groups(key).map(([g, ss]) => (
          <div key={g}>
            <div className={`mb-1 px-3 text-xs uppercase tracking-wider text-caption ${key === "folder" ? "font-mono normal-case" : ""}`}>{key === "folder" ? "📁 " : ""}{g}</div>
            {ss.map((s, i) => <Row key={s.id} s={s} i={i} />)}
          </div>
        ))}
      </div>
    );
  };

  if (mode === "mini")
    return (
      <div style={vars} className="grid min-h-screen place-items-start justify-center pt-10">
        <div className="island group/island window-shadow flex w-[min(92vw,26rem)] flex-col overflow-hidden rounded-[2rem] p-2 transition-all duration-500">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 shrink-0 rounded-full ${playing ? "animate-[spin_6s_linear_infinite]" : ""}`}
              style={{ background: `radial-gradient(circle, var(--bg) 0 12%, transparent 13%), ${artBg(cur.album)}` }} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{cur.title}</div><div className="truncate text-[11px] text-sub">{cur.artist}</div></div>
            <div className="h-6 w-14"><Visualizer viz={viz} playing={playing} bars={10} /></div>
            <button onClick={() => setPlaying(!playing)} className="grid h-9 w-9 place-items-center rounded-full bg-main text-background">{playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}</button>
          </div>
          <div className="grid grid-rows-[0fr] transition-all duration-500 group-hover/island:grid-rows-[1fr]">
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-3 px-2 pb-2 pt-4">
                <Seek />
                <div className="flex items-center justify-between">
                  <AudioBadge fmt={cur.fmt} playing={playing} />
                  <Controls />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViz(viz === "bars" ? "embers" : "bars")} title="Switch visualizer" className="text-sub hover:text-main">{viz === "bars" ? <AudioLines size={14} /> : <Sparkles size={14} />}</button>
                    <button onClick={() => setMode("window")} title="Expand" className="text-sub hover:text-foreground"><Maximize2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  if (mode === "full") {
    const h = hue(cur.album);
    return (
      <div style={vars} className="relative flex min-h-screen flex-col overflow-hidden bg-background p-8 sm:p-16">
        <div className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
          style={{ background: `radial-gradient(60% 50% at 20% 30%, hsl(${h} 60% 45% / 0.35), transparent 70%), radial-gradient(50% 40% at 85% 80%, color-mix(in oklab, var(--main) 25%, transparent), transparent 70%)` }} />
        <div className="pointer-events-none absolute inset-0 opacity-70"><Visualizer viz={viz} playing={playing} bars={80} ambient /></div>
        <div className="relative flex items-center justify-between font-mono text-xs text-sub">
          <span>quickmusic / now playing</span>
          <div className="flex items-center gap-3"><VizToggle /><button onClick={() => setMode("window")} className="hover:text-foreground">esc</button></div>
        </div>
        <div className="relative my-auto max-w-5xl">
          <div className="font-mono text-sm text-caption">{cur.artist.toLowerCase()} — {cur.album.toLowerCase()}</div>
          <h1 className="mt-3 font-mono text-5xl font-bold lowercase leading-none tracking-tight text-main sm:text-8xl">{cur.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs text-sub">
            <AudioBadge fmt={cur.fmt} playing={playing} />
            <span>{cur.plays} plays</span><span>up next: <span className="text-foreground">{queue[0]?.title.toLowerCase() ?? "—"}</span></span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-3xl space-y-6">
          <Seek /><div className="flex justify-center"><Controls big /></div>
        </div>
      </div>
    );
  }

  const totalMin = Math.round(filtered.reduce((a, s) => a + s.dur, 0) / 60);
  return (
    <div style={vars} className="flex min-h-screen items-center justify-center p-2 sm:p-8">
      <div className="window-shadow window-highlight flex h-[min(760px,calc(100vh-2rem))] w-full max-w-[1200px] overflow-hidden rounded-2xl bg-background">
        {/* Sidebar */}
        <aside className="glass hidden w-56 shrink-0 flex-col border-r p-3 sm:flex">
          <Lights onGreen={() => setMode("full")} />
          <div className="relative mt-5">
            <Search size={14} className="absolute left-2.5 top-2 text-sub" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
              className="w-full rounded-md bg-background/60 py-1.5 pl-8 pr-7 text-sm outline-none placeholder:text-sub focus:ring-2 focus:ring-main" />
            <kbd className="absolute right-2 top-1.5 rounded border px-1 font-mono text-[10px] text-sub">/</kbd>
          </div>
          <div className="mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sub">Library</div>
          {(["Songs", "Albums", "Artists", "Folders", "Most Played"] as View[]).map((v) => {
            const I = VIEW_ICONS[v];
            return (
              <button key={v} onClick={() => setView(v)}
                className={`mt-0.5 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition ${view === v ? "bg-main/20 text-main" : "hover:bg-background/40"}`}>
                <I size={15} className={view === v ? "text-main" : "text-sub"} />{v}
              </button>
            );
          })}
          <div className="mt-auto space-y-1">
            <button onClick={() => flash("Open panel: choose files or folder…")} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-sub hover:text-foreground"><Plus size={15} />Add Songs / Folder</button>
            <button onClick={() => setThemeOpen(!themeOpen)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-sub hover:text-foreground"><Palette size={15} />{THEMES[theme]?.name}</button>
          </div>
        </aside>

        {/* Main */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <header className="titlebar relative overflow-hidden border-b px-6 py-7"
            style={{ background: `linear-gradient(120deg, color-mix(in oklab, var(--main) 18%, transparent), transparent 70%)` }}>
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 ${viz === "bars" ? "h-16 opacity-60" : "top-0 opacity-90"}`}><Visualizer viz={viz} playing={playing} bars={64} /></div>
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-sub">Library</div>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-caption">{view}</h1>
                <div className="mt-1 font-mono text-xs text-sub">{filtered.length} songs · {totalMin} min · lossless</div>
              </div>
              <div className="flex items-center gap-2">
                <VizToggle />
                <button onClick={() => { if (filtered[0]) { play(filtered[0]); setQueue(filtered.slice(1)); } }}
                  className="flex items-center gap-1.5 rounded-full bg-main px-4 py-1.5 text-sm font-medium text-background transition hover:scale-105"><Play size={14} fill="currentColor" />Play</button>
                <button onClick={() => setShowQueue(!showQueue)} title="Queue"
                  className={`grid h-8 w-8 place-items-center rounded-full border transition ${showQueue ? "bg-main/20 text-main" : "text-sub hover:text-foreground"}`}><ListMusic size={15} /></button>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto px-4 py-3"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); flash("Dropped files added to library"); }}>
            <Content />
            {filtered.length === 0 && <div className="mt-20 text-center text-sub">No results for “{q}”</div>}
          </div>

          {/* Player bar */}
          <footer className="glass relative flex items-center gap-4 overflow-hidden border-t px-4 py-3 md:gap-6 md:px-5">
            <div className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
              style={{ background: `radial-gradient(40% 140% at 6% 50%, hsl(${hue(cur.album)} 65% 50% / ${playing ? 0.35 : 0.18}), transparent 70%)` }} />
            <div className="relative flex w-48 min-w-0 items-center gap-3 md:w-72"><VinylArt album={cur.album} size={44} playing={playing} />
              <div className="min-w-0"><div className="truncate text-sm font-medium">{cur.title}</div><div className="truncate text-xs text-sub">{cur.artist}</div>
                <div className="mt-0.5 hidden xl:block"><AudioBadge fmt={cur.fmt} playing={playing} /></div></div></div>
            <div className="relative flex flex-1 flex-col items-center gap-1"><Controls /><Seek /></div>
            <div className="relative hidden md:block"><VuMeter playing={playing} vol={vol} /></div>
            <div className="hidden w-36 items-center gap-2 text-sub lg:flex"><Volume2 size={15} /><input type="range" value={vol} onChange={(e) => setVol(+e.target.value)} className="flex-1 accent-[var(--main)]" /></div>
            <button onClick={() => setEqOpen(!eqOpen)} title="Equalizer" className={`relative ${eqOpen ? "text-main" : "text-sub hover:text-foreground"}`}><SlidersHorizontal size={15} /></button>
            <button onClick={() => setMode("mini")} title="Mini player" className="relative text-sub hover:text-foreground"><Minimize2 size={15} /></button>
            <button onClick={() => setMode("full")} title="Full screen" className="relative text-sub hover:text-foreground"><Maximize2 size={15} /></button>
          </footer>

          {eqOpen && <EqPopover onClose={() => setEqOpen(false)} />}
          {themeOpen && (
            <div className="glass window-shadow absolute bottom-24 left-4 w-64 rounded-lg p-2" onMouseLeave={() => setHoverTheme(null)}>
              <div className="px-2 pb-1 text-[11px] text-sub">Hover to preview, click to keep</div>
              {THEMES.map((th, i) => (
                <button key={th.name} onMouseEnter={() => setHoverTheme(i)} onClick={() => { setTheme(i); setThemeOpen(false); setHoverTheme(null); }}
                  className="flex w-full items-center justify-between rounded px-2 py-1 font-mono text-xs hover:bg-background/50">
                  <span>{th.name}</span>
                  <span className="flex gap-1">{[th.bg, th.main, th.text, th.sub].map((c) => <span key={c} className="h-3 w-3 rounded-full border" style={{ background: c }} />)}</span>
                </button>
              ))}
            </div>
          )}
          {toast && <div className="glass absolute left-1/2 top-16 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs">{toast}</div>}
        </main>

        {showQueue && (
          <aside className="glass hidden w-64 shrink-0 overflow-auto border-l p-3 lg:block">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sub">Now Playing</div>
            <div className="flex items-center gap-2 rounded-md bg-main/15 p-2"><Art album={cur.album} size={32} /><div className="min-w-0 text-xs"><div className="truncate text-main">{cur.title}</div><div className="truncate text-sub">{cur.artist}</div></div></div>
            <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-sub">Up Next · {queue.length}</div>
            {queue.map((s, i) => (
              <div key={i} className="group flex items-center gap-2 rounded-md p-1.5 text-xs hover:bg-background/40">
                <Art album={s.album} size={28} />
                <div className="min-w-0 flex-1"><div className="truncate">{s.title}</div><div className="truncate text-sub">{s.album}</div></div>
                <span className="hidden gap-1 group-hover:flex">
                  <button disabled={i === 0} onClick={() => { const n = [...queue]; const a = n[i - 1]!; n[i - 1] = n[i]!; n[i] = a; setQueue(n); }} className="text-sub hover:text-main"><ArrowUp size={12} /></button>
                  <button onClick={() => setQueue(queue.filter((_, j) => j !== i))} className="text-sub hover:text-error"><X size={12} /></button>
                </span>
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
