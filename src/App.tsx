"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Pair = { id: string; term: string; definition: string };
type Tile = { id: string; pairId: string; text: string; side: "term" | "definition" };
type View = "setup" | "game";

const BUILT_IN: Pair[] = [
  ["ਓ", "Oo'rhaa"], ["ਅ", "Ai'rhaa"], ["ੲ", "Ee'rhee"], ["ਸ", "Sas'saa"],
  ["ਹ", "Haa'haa"], ["ਕ", "Kak'kaa"], ["ਖ", "Khakh'khaa"], ["ਗ", "Gag'gaa"],
  ["ਘ", "Ghag'ghaa"], ["ਙ", "Ngan'ngaa"], ["ਚ", "Chach'chaa"], ["ਛ", "Chhachh'chhaa"],
  ["ਜ", "Jaj'jaa"], ["ਝ", "Jhaj'jhaa"], ["ਞ", "Njan'njaa"], ["ਟ", "Tain'kaa"],
  ["ਠ", "Thath'thaa"], ["ਡ", "Dad'daa"], ["ਢ", "Dhad'dhaa"], ["ਣ", "Nhaa'nhaa"],
  ["ਤ", "Tat'taa"], ["ਥ", "Thath'thaa"], ["ਦ", "Dad'daa"], ["ਧ", "Dhad'dhaa"],
  ["ਨ", "Nan'naa"], ["ਪ", "Pap'paa"], ["ਫ", "Phaph'phaa"], ["ਬ", "Bab'baa"],
  ["ਭ", "Bhab'baa"], ["ਮ", "Mam'maa"], ["ਯ", "Yay'yaa"], ["ਰ", "Raa'raa"],
  ["ਲ", "Lal'laa"], ["ਵ", "Vav'vaa"], ["ੜ", "Rhar'rhaa"], ["ਸ਼", "Shash'shaa"],
  ["ਖ਼", "Khakh'khaa (pair bindi)"], ["ਗ਼", "Ghag'ghaa (pair bindi)"], ["ਜ਼", "Zaz'zaa"],
  ["ਫ਼", "Faf'faa"], ["ਲ਼", "Lal'laa (pair bindi)"],
].map(([term, definition], index) => ({ id: `punjabi-${index}`, term, definition }));

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const toTiles = (pairs: Pair[], seed = 0): Tile[] => [
  ...shuffle(pairs.map((pair) => ({
    id: `${pair.id}-term-${seed}`,
    pairId: pair.id,
    text: pair.term,
    side: "term" as const,
  }))),
  ...shuffle(pairs.map((pair) => ({
    id: `${pair.id}-definition-${seed}`,
    pairId: pair.id,
    text: pair.definition,
    side: "definition" as const,
  }))),
];

export default function App() {
  const [view, setView] = useState<View>("setup");
  const [pairs, setPairs] = useState<Pair[]>(BUILT_IN);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(BUILT_IN.map((pair) => pair.id)));
  const [search, setSearch] = useState("");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [misses, setMisses] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const seed = useRef(1);
  const locked = useRef(false);
  const pairQueue = useRef<Pair[]>([]);

  const selectedPairs = useMemo(() => pairs.filter((pair) => selectedIds.has(pair.id)), [pairs, selectedIds]);
  const filteredPairs = useMemo(() => {
    const query = search.toLowerCase().trim();
    return query ? pairs.filter((pair) => `${pair.term} ${pair.definition}`.toLowerCase().includes(query)) : pairs;
  }, [pairs, search]);

  const playTone = useCallback((good: boolean) => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.setValueAtTime(good ? 520 : 180, ctx.currentTime);
      if (good) oscillator.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.18);
    } catch { /* sound is optional */ }
  }, [soundOn]);

  const drawNextRound = useCallback((previousRoundIds = new Set<string>()) => {
    const chosen: Pair[] = [];

    while (chosen.length < 4) {
      if (pairQueue.current.length === 0) {
        const avoid = new Set([
          ...previousRoundIds,
          ...chosen.map((pair) => pair.id),
        ]);
        const freshFirst = shuffle(selectedPairs.filter((pair) => !avoid.has(pair.id)));
        const recentLast = shuffle(selectedPairs.filter((pair) => avoid.has(pair.id)));
        pairQueue.current = [...freshFirst, ...recentLast];
      }

      const next = pairQueue.current.shift();
      if (next && !chosen.some((pair) => pair.id === next.id)) chosen.push(next);
    }

    return chosen;
  }, [selectedPairs]);

  const beginGame = () => {
    if (selectedIds.size < 4) return;
    pairQueue.current = shuffle(selectedPairs);
    const boardPairs = pairQueue.current.splice(0, 4);
    setTiles(toTiles(boardPairs, seed.current++));
    setScore(0); setRound(1); setStreak(0); setBest(0); setPicked([]); setMatched([]); setView("game");
  };

  const chooseTile = (tile: Tile) => {
    if (locked.current || picked.includes(tile.id) || matched.includes(tile.id)) return;
    const nextPicked = [...picked, tile.id];
    setPicked(nextPicked);
    if (nextPicked.length < 2) return;
    locked.current = true;
    const [first, second] = nextPicked.map((id) => tiles.find((item) => item.id === id)!);
    const isMatch = first.pairId === second.pairId && first.side !== second.side;
    if (isMatch) {
      const roundMatches = [...matched, ...nextPicked];
      const roundComplete = roundMatches.length === tiles.length;
      setMatched(roundMatches);
      setScore((value) => value + 1);
      setStreak((value) => { const next = value + 1; setBest((old) => Math.max(old, next)); return next; });
      playTone(true);
      window.setTimeout(() => {
        if (roundComplete) {
          const previousRoundIds = new Set(tiles.map((tile) => tile.pairId));
          const nextPairs = drawNextRound(previousRoundIds);
          setTiles(toTiles(nextPairs, seed.current++));
          setMatched([]);
          setRound((value) => value + 1);
        }
        setPicked([]); locked.current = false;
      }, 360);
    } else {
      setWrong(nextPicked); setMisses((value) => value + 1); setStreak(0); playTone(false);
      window.setTimeout(() => { setPicked([]); setWrong([]); locked.current = false; }, 620);
    }
  };

  const togglePair = (id: string) => setSelectedIds((current) => {
    const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  if (view === "game") {
    return (
      <main className="game-page">
        <header className="game-header">
          <button className="brand" onClick={() => setView("setup")} aria-label="Back to set selection"><span className="brand-mark">∞</span><span>INFINITE <b>MATCH</b></span></button>
          <div className="game-actions"><button className="icon-button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Mute sounds" : "Turn on sounds"}>{soundOn ? "♪" : "×"}</button><button className="quit-button" onClick={() => setView("setup")}>End game</button></div>
        </header>
        <section className="score-strip" aria-label="Game statistics">
          <div><span className="stat-label">MATCHES</span><strong>{String(score).padStart(2, "0")}</strong></div>
          <div><span className="stat-label">STREAK</span><strong>{streak}<small>×</small></strong></div>
          <div><span className="stat-label">BEST</span><strong>{best}<small>×</small></strong></div>
          <div><span className="stat-label">ACCURACY</span><strong>{score + misses ? Math.round((score / (score + misses)) * 100) : 100}<small>%</small></strong></div>
        </section>
        <section className="game-shell">
          <div className="game-copy"><span className="eyebrow mint">ENDLESS MODE</span><h1>Clear the board.<br/><em>Keep the rhythm.</em></h1><p>Match each term with its corresponding answer. Clear all eight tiles to deal the next round.</p><div className="live-pill"><i /> Round {round} · {selectedIds.size} pairs in rotation</div></div>
          <div className="tile-board" aria-label="Matching cards">
            <div className="tile-side"><div className="side-label"><span>TERM</span><i /></div><div className="tile-grid">{tiles.filter((tile) => tile.side === "term").map((tile) => <button key={tile.id} disabled={matched.includes(tile.id)} className={`match-tile ${tile.side} ${picked.includes(tile.id) ? "picked" : ""} ${matched.includes(tile.id) ? "matched" : ""} ${wrong.includes(tile.id) ? "wrong" : ""}`} onClick={() => chooseTile(tile)}><span className="tile-type">TERM</span><span className="tile-text">{tile.text}</span></button>)}</div></div>
            <div className="tile-side"><div className="side-label answer-label"><i /><span>ANSWER</span></div><div className="tile-grid">{tiles.filter((tile) => tile.side === "definition").map((tile) => <button key={tile.id} disabled={matched.includes(tile.id)} className={`match-tile ${tile.side} ${picked.includes(tile.id) ? "picked" : ""} ${matched.includes(tile.id) ? "matched" : ""} ${wrong.includes(tile.id) ? "wrong" : ""}`} onClick={() => chooseTile(tile)}><span className="tile-type">ANSWER</span><span className="tile-text">{tile.text}</span></button>)}</div></div>
          </div>
        </section>
        <p className="game-hint">Matched cards leave an empty slot — clear all eight to deal again.</p>
      </main>
    );
  }

  return (
    <main className="setup-page">
      <header className="site-header"><div className="brand"><span className="brand-mark">∞</span><span>INFINITE <b>MATCH</b></span></div><span className="header-note">Any subject · no finish line</span></header>
      <section className="hero">
        <div><span className="eyebrow coral">BUILD YOUR ROUND</span><h1>Pick your pairs.<br/><em>Match forever.</em></h1><p>Choose exactly what you want to practice. Clear all eight tiles and a freshly shuffled board appears.</p></div>
      </section>
      <section className="builder">
        <div className="builder-top"><div><span className="step-number">01</span><div><h2>Choose your pairs</h2><p>Gurmukhi Alphabet starter set · {selectedIds.size} of {pairs.length} selected</p></div></div><div className="builder-actions"><button onClick={() => setSelectedIds(new Set(pairs.map((pair) => pair.id)))}>Select all</button><span>/</span><button onClick={() => setSelectedIds(new Set())}>Clear</button></div></div>
        <div className="filter-row"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search terms or answers" aria-label="Search pairs" /></label></div>
        <div className="pair-grid">
          {filteredPairs.map((pair) => <button key={pair.id} className={`pair-option ${selectedIds.has(pair.id) ? "selected" : ""}`} onClick={() => togglePair(pair.id)} aria-pressed={selectedIds.has(pair.id)}><span className="check">{selectedIds.has(pair.id) ? "✓" : ""}</span><strong>{pair.term}</strong><small>{pair.definition}</small></button>)}
        </div>
        {!filteredPairs.length && <div className="empty-state">No pairs match "{search}".</div>}
      </section>
      <section className="start-bar"><div><span className="step-number dark">02</span><div><strong>Ready when you are</strong><p>{selectedIds.size < 4 ? "Select at least 4 pairs to begin" : `${selectedIds.size} pairs · eight tiles per round`}</p></div></div><button className="start-button" disabled={selectedIds.size < 4} onClick={beginGame}>Start matching <span>→</span></button></section>
      <footer><span>Made for learning anything</span><span>•</span><span>Pick your pairs · match forever</span></footer>
    </main>
  );
}
