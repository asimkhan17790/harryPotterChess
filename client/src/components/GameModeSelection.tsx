import React, { useState, useRef } from 'react';
import { useHouseStore } from '../stores/houseStore';
import { useGameStore } from '../stores/gameStore';
import type { Difficulty } from '../utils/difficultyMapping';

// ── CSS injected once ─────────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('gms-styles')) {
  const s = document.createElement('style');
  s.id = 'gms-styles';
  s.textContent = `
    @keyframes gmsTwinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.3)}}
    @keyframes gmsCardIn{from{opacity:0;transform:translateY(56px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes gmsHeaderIn{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}
    @keyframes gmsHeaderFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes gmsGoldShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes gmsDivider{0%,100%{opacity:.35;width:160px}50%{opacity:1;width:260px}}
    @keyframes gmsRingSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes gmsCrestFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04)}}
    @keyframes gmsPulseOut{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
    @keyframes gmsOrb{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.4);opacity:.9}}
    @keyframes gmsPanelIn{from{opacity:0;transform:translateY(-14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes gmsTagIn{from{opacity:0;transform:translateY(8px) scale(.8)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes gmsBeamIn{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
    @keyframes gmsRuneFloat{0%,100%{opacity:.18;transform:translateY(0) rotate(0deg)}50%{opacity:.45;transform:translateY(-12px) rotate(8deg)}}
    @keyframes gmsTagPulse{0%,100%{box-shadow:0 0 4px currentColor}50%{box-shadow:0 0 12px currentColor,0 0 20px currentColor}}
    @keyframes gmsBtnBreathe{0%,100%{box-shadow:0 0 10px currentColor,0 0 20px currentColor}50%{box-shadow:0 0 22px currentColor,0 0 44px currentColor,0 0 60px currentColor}}
    @keyframes gmsBackBtn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  `;
  document.head.appendChild(s);
}

// ── Stable module-level stars ─────────────────────────────────────────────────
const STARS = Array.from({ length: 70 }, (_, i) => ({
  l: ((i * 137.508) % 100).toFixed(2),
  t: ((i * 97.351 + 13) % 100).toFixed(2),
  sz: (1 + (i % 3) * 0.8).toFixed(1),
  dl: ((i * 0.23) % 4).toFixed(2),
  dr: (2 + (i % 4) * 0.7).toFixed(2),
}));

// Floating rune glyphs in the background
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚷ', 'ᚹ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ'];
const RUNE_POSITIONS = Array.from({ length: 12 }, (_, i) => ({
  l: ((i * 79.3 + 8) % 95).toFixed(1),
  t: ((i * 61.7 + 5) % 90).toFixed(1),
  dl: (i * 0.4).toFixed(2),
  dr: (4 + (i % 3) * 1.5).toFixed(2),
}));

// ── Difficulty metadata ───────────────────────────────────────────────────────
const DIFFICULTY_META: Record<Difficulty, { name: string; subtitle: string }> = {
  easy: { name: 'Muggle', subtitle: 'Skill 2 · for beginners' },
  medium: { name: 'Auror', subtitle: 'Skill 10 · trained defender' },
  hard: { name: 'Dumbledore', subtitle: 'Skill 20 · near omniscient' },
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

// ── Mode card data ────────────────────────────────────────────────────────────
interface ModeData {
  icon: string;
  title: string;
  subtitle: string;
  traits: string[];
}

const MODE_DATA: Record<'human' | 'ai', ModeData> = {
  human: {
    icon: '♟',
    title: 'Two Wizards',
    subtitle: 'Pass & play on one device',
    traits: ['LOCAL', 'OFFLINE', '2-PLAYER'],
  },
  ai: {
    icon: '🔮',
    title: 'The Oracle',
    subtitle: 'Duel the Dark Wizard',
    traits: ['DARK ARTS', 'ARCANE', 'AI'],
  },
};

const IS_MOBILE =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 900px)').matches ||
    window.matchMedia('(pointer: coarse)').matches);

// ── Root component ────────────────────────────────────────────────────────────
export default function GameModeSelection() {
  const house = useHouseStore((s) => s.selectedHouse);
  const theme = useHouseStore((s) => s.theme);
  const resetHouse = useHouseStore((s) => s.resetHouse);
  const { setMode, setAiColor, setDifficulty } = useGameStore();

  const accent = theme?.accentColor ?? '#ffd700';
  const primary = theme?.primaryColor ?? '#1a1030';

  const [pendingMode, setPendingMode] = useState<'human' | 'ai' | null>(null);
  const [pendingAiColor, setPendingAiColor] = useState<'w' | 'b'>('w');
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('medium');

  const handleBegin = () => {
    if (!pendingMode) return;
    setDifficulty(pendingDifficulty);
    setAiColor(pendingAiColor === 'w' ? 'b' : 'w');
    setMode(pendingMode);
  };

  return (
    <div
      className="mobile-screen"
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 40% 30%, #1a1030 0%, #0d0818 45%, #05030f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Georgia","Times New Roman",serif',
        color: '#e8d5a3',
        padding: '24px 20px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Twinkling starfield */}
      {STARS.map((st, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: `${st.l}%`,
            top: `${st.t}%`,
            width: `${st.sz}px`,
            height: `${st.sz}px`,
            borderRadius: '50%',
            background: '#fff',
            pointerEvents: 'none',
            animation: `gmsTwinkle ${st.dr}s ease-in-out ${st.dl}s infinite`,
          }}
        />
      ))}

      {/* Floating ambient orbs */}
      {[
        { x: '12%', y: '20%', c: '#7c3aed', sz: 300 },
        { x: '85%', y: '68%', c: '#1e40af', sz: 240 },
        { x: '72%', y: '10%', c: '#b45309', sz: 190 },
      ].map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: orb.x,
            top: orb.y,
            width: orb.sz,
            height: orb.sz,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.c}22 0%, transparent 70%)`,
            transform: 'translate(-50%,-50%)',
            animation: `gmsOrb ${4 + i}s ease-in-out ${i * 0.8}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Floating rune glyphs */}
      {RUNE_POSITIONS.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: `${r.l}%`,
            top: `${r.t}%`,
            fontSize: '18px',
            color: `${accent}`,
            pointerEvents: 'none',
            animation: `gmsRuneFloat ${r.dr}s ease-in-out ${r.dl}s infinite`,
          }}
        >
          {RUNES[i % RUNES.length]}
        </div>
      ))}

      {/* ── Floating frosted-glass header ── */}
      <div
        className="mobile-sticky-header"
        style={{
          position: 'relative',
          zIndex: 2,
          background: 'rgba(10,5,25,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,215,0,0.18)',
          borderRadius: '20px',
          padding: '24px 48px 20px',
          textAlign: 'center',
          marginBottom: '32px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.08) inset',
          animation: IS_MOBILE
            ? 'gmsHeaderIn .7s cubic-bezier(.34,1.56,.64,1) both'
            : 'gmsHeaderIn .7s cubic-bezier(.34,1.56,.64,1) both, gmsHeaderFloat 5s ease-in-out 1s infinite',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '7px',
            color: '#666',
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}
        >
          ✦ &nbsp; The Sorcerer&apos;s Board &nbsp; ✦
        </div>
        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 42px)',
            fontWeight: 'bold',
            margin: '0 0 4px',
            background:
              'linear-gradient(90deg, #b8860b 0%, #ffd700 30%, #ffe066 50%, #ffd700 70%, #b8860b 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'gmsGoldShimmer 3s linear infinite',
            letterSpacing: '2px',
          }}
        >
          Choose Your Battle
        </h1>
        {house && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                color: accent,
                letterSpacing: '1.5px',
                fontWeight: 'bold',
                textShadow: `0 0 12px ${accent}88`,
              }}
            >
              {theme?.displayName ?? house}
            </span>
            <button
              onClick={resetHouse}
              style={{
                cursor: 'pointer',
                padding: '5px 14px',
                borderRadius: '20px',
                border: `1px solid rgba(255,215,0,0.45)`,
                background: 'rgba(255,215,0,0.10)',
                color: '#e8d0a0',
                fontSize: '11px',
                letterSpacing: '1.5px',
                fontFamily: '"Georgia","Times New Roman",serif',
                transition: 'all .2s ease',
                animation: 'gmsBackBtn .5s ease .3s both',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,215,0,0.22)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,215,0,0.8)';
                (e.currentTarget as HTMLButtonElement).style.color = '#ffd700';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,215,0,0.10)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,215,0,0.45)';
                (e.currentTarget as HTMLButtonElement).style.color = '#e8d0a0';
              }}
            >
              ← Change House
            </button>
          </div>
        )}
        {/* Animated divider */}
        <div
          className="mobile-header-divider"
          style={{
            height: '1px',
            margin: '14px auto 0',
            background: 'linear-gradient(to right, transparent, #ffd700, transparent)',
            animation: 'gmsDivider 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Mode cards ── */}
      <div
        className="mobile-carousel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          maxWidth: '560px',
          width: 'min(560px, calc(100vw - 32px))',
          position: 'relative',
          zIndex: 2,
          marginBottom: '28px',
        }}
      >
        {(['human', 'ai'] as const).map((mode, idx) => (
          <ModeCard
            key={mode}
            data={MODE_DATA[mode]}
            accent={accent}
            primary={primary}
            selected={pendingMode === mode}
            entranceDelay={idx * 0.15}
            onSelect={() => setPendingMode(mode)}
          />
        ))}
      </div>

      {/* ── AI options panel ── */}
      {pendingMode === 'ai' && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'rgba(10,5,25,0.68)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${accent}44`,
            borderRadius: '16px',
            padding: '22px 32px',
            marginBottom: '28px',
            width: '100%',
            maxWidth: 'min(480px, calc(100vw - 32px))',
            boxShadow: `0 0 40px ${accent}1a, 0 8px 32px rgba(0,0,0,.55)`,
            animation: 'gmsPanelIn .4s cubic-bezier(.34,1.56,.64,1) both',
          }}
        >
          {/* Play As */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '4px',
                color: '#a08848',
                marginBottom: '12px',
                textShadow: '0 0 8px rgba(160,136,72,0.5)',
                animation: 'gmsBeamIn .4s ease both',
              }}
            >
              ✦ &nbsp; PLAY AS &nbsp; ✦
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {(['w', 'b'] as const).map((c) => {
                const sel = pendingAiColor === c;
                const label = c === 'w' ? 'White' : 'Black';
                const pieceIcon = c === 'w' ? '♔' : '♚';
                const iconColor = c === 'w' ? '#fff8e0' : '#8899cc';
                return (
                  <div
                    key={c}
                    onClick={() => setPendingAiColor(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setPendingAiColor(c);
                    }}
                    aria-pressed={sel}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 28px',
                      borderRadius: '10px',
                      border: `1.5px solid ${sel ? accent : '#444'}`,
                      background: sel
                        ? `linear-gradient(135deg, ${accent}28, ${accent}0c)`
                        : 'rgba(255,255,255,0.03)',
                      color: sel ? accent : '#888',
                      fontSize: '14px',
                      letterSpacing: '1px',
                      transition: 'all .2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: sel ? `0 0 16px ${accent}44` : 'none',
                      transform: sel ? 'scale(1.05) translateY(-1px)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontSize: '20px', color: iconColor }}>{pieceIcon}</span>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div
            style={{
              height: '1px',
              margin: '0 0 16px',
              background: `linear-gradient(to right, transparent, ${accent}33, transparent)`,
              animation: 'gmsBeamIn .4s ease .2s both',
            }}
          />

          {/* Difficulty */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '4px',
                color: '#a08848',
                marginBottom: '12px',
                textShadow: '0 0 8px rgba(160,136,72,0.5)',
                animation: 'gmsBeamIn .4s ease .15s both',
              }}
            >
              ✦ &nbsp; DIFFICULTY &nbsp; ✦
            </div>
            <div
              style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}
            >
              {DIFFICULTIES.map((d, di) => {
                const sel = pendingDifficulty === d;
                return (
                  <div
                    key={d}
                    onClick={() => setPendingDifficulty(d)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setPendingDifficulty(d);
                    }}
                    aria-pressed={sel}
                    style={{
                      cursor: 'pointer',
                      padding: '9px 20px',
                      borderRadius: '22px',
                      border: `1px solid ${sel ? accent : '#444'}`,
                      background: sel
                        ? `linear-gradient(135deg, ${accent}26, ${accent}0a)`
                        : 'rgba(255,255,255,0.02)',
                      color: sel ? accent : '#888',
                      fontSize: '12px',
                      letterSpacing: '1.5px',
                      transition: 'all .22s ease',
                      boxShadow: sel ? `0 0 14px ${accent}44` : 'none',
                      transform: sel ? 'scale(1.07) translateY(-1px)' : 'scale(1)',
                      animation: `gmsCardIn .4s ease ${di * 0.08}s both`,
                    }}
                  >
                    {DIFFICULTY_META[d].name}
                  </div>
                );
              })}
            </div>
            <p
              style={{
                fontSize: '11px',
                color: '#555',
                margin: '10px 0 0',
                letterSpacing: '0.5px',
                fontStyle: 'italic',
              }}
            >
              {DIFFICULTY_META[pendingDifficulty].subtitle}
            </p>
          </div>
        </div>
      )}

      {/* ── BEGIN GAME button ── */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          overflow: 'hidden',
          borderRadius: '30px',
          zIndex: 2,
          marginBottom: '32px',
          boxShadow: pendingMode ? `0 0 18px ${accent}88, 0 0 40px ${accent}44` : 'none',
          transition: 'box-shadow .4s ease',
          animation: pendingMode ? `gmsBtnBreathe 2.2s ease-in-out infinite` : undefined,
          color: accent,
        }}
      >
        {/* Sweep fill on enabled */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            background: `linear-gradient(90deg, ${accent}, #ffe066, ${accent})`,
            backgroundSize: '200% 100%',
            width: pendingMode ? '100%' : '0%',
            transition: 'width .35s ease',
            borderRadius: '30px',
            animation: pendingMode ? 'gmsGoldShimmer 2s linear infinite' : undefined,
          }}
        />
        <div
          onClick={handleBegin}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleBegin();
          }}
          aria-disabled={!pendingMode}
          style={{
            position: 'relative',
            zIndex: 1,
            cursor: pendingMode ? 'pointer' : 'not-allowed',
            padding: '14px 56px',
            border: `1.5px solid ${pendingMode ? accent : '#3a3a3a'}`,
            borderRadius: '30px',
            color: pendingMode ? '#0a0810' : '#555',
            fontSize: '15px',
            fontWeight: 'bold',
            letterSpacing: '4px',
            fontFamily: '"Georgia","Times New Roman",serif',
            transition: 'color .35s ease',
            userSelect: 'none',
          }}
        >
          ⚡ BEGIN GAME
        </div>
      </div>

      <p style={{ fontSize: '11px', color: '#3a3228', letterSpacing: '4px', zIndex: 2 }}>
        ✦ &nbsp; A WIZARD&apos;S CHESS &nbsp; ✦
      </p>
    </div>
  );
}

// ── Mode Card ─────────────────────────────────────────────────────────────────

interface ModeCardProps {
  data: ModeData;
  accent: string;
  primary: string;
  selected: boolean;
  entranceDelay: number;
  onSelect: () => void;
}

function ModeCard({ data, accent, primary, selected, entranceDelay, onSelect }: ModeCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = selected || hovered;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.transform = `perspective(900px) rotateY(${dx * 14}deg) rotateX(${-dy * 10}deg) translateY(-8px) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el)
      el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0) scale(1)';
    setHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className="mobile-carousel-item"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${data.title}`}
      aria-pressed={selected}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: 'clamp(160px, calc(50vw - 36px), 220px)',
        flex: '1 1 160px',
        maxWidth: '220px',
        borderRadius: '18px',
        padding: '32px 20px 28px',
        background: selected
          ? `linear-gradient(155deg, ${primary}ee 0%, ${accent}18 50%, rgba(8,4,20,.95) 100%)`
          : 'linear-gradient(155deg, #1a1030dd 0%, #0d0818aa 60%, rgba(5,3,15,.95) 100%)',
        border: `1.5px solid ${active ? accent : `${accent}33`}`,
        boxShadow: active
          ? `0 0 32px ${accent}66, 0 0 64px ${accent}33, 0 24px 48px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)`
          : `0 8px 32px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)`,
        transition: 'border-color .25s ease, box-shadow .25s ease, background .3s ease',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        animation: `gmsCardIn .6s cubic-bezier(.34,1.56,.64,1) ${entranceDelay}s both`,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Inner shimmer on hover/select */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '18px',
          background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 65%)`,
          opacity: active ? 1 : 0,
          transition: 'opacity .3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* 3D icon area */}
      <div
        style={{
          position: 'relative',
          width: '96px',
          height: '96px',
          margin: '0 auto 20px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Outer slow-spin dashed ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            border: `1.5px dashed ${accent}66`,
            animation: `gmsRingSpin ${active ? 2 : 8}s linear infinite`,
            transition: 'animation-duration .4s',
          }}
        />
        {/* Inner counter-spin solid ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: `2px solid ${accent}44`,
            borderTop: `2px solid ${accent}cc`,
            animation: `gmsRingSpin ${active ? 1 : 4}s linear infinite reverse`,
          }}
        />
        {/* Pulse on hover/selected */}
        {active && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${accent}`,
              animation: 'gmsPulseOut 1.2s ease-out infinite',
            }}
          />
        )}
        {/* Glow disc */}
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
            filter: active ? 'blur(4px)' : 'blur(2px)',
            transition: 'filter .3s',
          }}
        />
        {/* Icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '52px',
            lineHeight: 1,
            transform: active
              ? 'translateZ(24px) translateY(-4px) scale(1.12)'
              : 'translateZ(8px) scale(1)',
            transition: 'transform .35s cubic-bezier(.34,1.56,.64,1)',
            filter: active
              ? `drop-shadow(0 12px 18px rgba(0,0,0,.9)) drop-shadow(0 0 16px ${accent}cc)`
              : `drop-shadow(0 6px 10px rgba(0,0,0,.8)) drop-shadow(0 0 8px ${accent}55)`,
            animation: active ? undefined : 'gmsCrestFloat 3s ease-in-out infinite',
          }}
        >
          {data.icon}
        </div>
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: '0 0 4px',
          color: active ? accent : '#e8d5a3',
          letterSpacing: '1.5px',
          textShadow: active ? `0 0 12px ${accent}88` : 'none',
          transition: 'color .3s, text-shadow .3s',
        }}
      >
        {data.title}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '12px',
          color: active ? '#d4c08a' : '#b09060',
          margin: '0 0 14px',
          fontStyle: 'italic',
          letterSpacing: '0.5px',
          transition: 'color .3s',
        }}
      >
        {data.subtitle}
      </p>

      {/* Trait tags */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '22px',
        }}
      >
        {data.traits.map((trait, ti) => (
          <span
            key={trait}
            style={{
              fontSize: '10px',
              padding: '4px 10px',
              borderRadius: '10px',
              background: active ? `${accent}28` : 'rgba(255,255,255,0.08)',
              border: `1px solid ${active ? accent : 'rgba(255,255,255,0.22)'}`,
              color: active ? accent : 'rgba(255,255,255,0.75)',
              letterSpacing: '1.2px',
              fontWeight: active ? 'bold' : 'normal',
              transition: 'all .25s ease',
              animation: active
                ? `gmsTagIn .3s cubic-bezier(.34,1.56,.64,1) ${ti * 0.08}s both, gmsTagPulse 2.5s ease ${ti * 0.3 + 1}s infinite`
                : `gmsTagIn .5s ease ${ti * 0.1 + entranceDelay}s both`,
              boxShadow: active ? `0 0 8px ${accent}55` : 'none',
            }}
          >
            {trait}
          </span>
        ))}
      </div>

      {/* SELECT / CHOSEN button */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          overflow: 'hidden',
          borderRadius: '22px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            background: accent,
            width: active ? '100%' : '0%',
            transition: 'width .28s ease',
            borderRadius: '22px',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '9px 24px',
            border: `1px solid ${accent}`,
            borderRadius: '22px',
            fontSize: '11px',
            letterSpacing: '3px',
            color: active ? '#111' : accent,
            transition: 'color .28s ease',
            fontWeight: 'bold',
          }}
        >
          {selected ? 'CHOSEN ✓' : 'SELECT'}
        </div>
      </div>
    </div>
  );
}
