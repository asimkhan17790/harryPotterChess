import React, { useState, useRef } from 'react';
import { HOUSE_THEMES } from '../data/houseThemes';
import type { HouseName } from '../data/houseThemes';
import { useHouseStore } from '../stores/houseStore';

// ── CSS injected once ─────────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('hs-styles')) {
  const s = document.createElement('style');
  s.id = 'hs-styles';
  s.textContent = `
    @keyframes hsTwinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.3)}}
    @keyframes hsCardIn{from{opacity:0;transform:translateY(56px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes hsHeaderIn{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}
    @keyframes hsHeaderFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes hsGoldShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes hsDivider{0%,100%{opacity:.35;width:160px}50%{opacity:1;width:260px}}
    @keyframes hsRingSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes hsRingFast{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes hsCrestFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04)}}
    @keyframes hsPulseOut{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
    @keyframes hsSelectFill{from{width:0}to{width:100%}}
    @keyframes hsMagicPart{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(0.2)}}
    @keyframes hsTagIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
    @keyframes hsOrb{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.4);opacity:.9}}
  `;
  document.head.appendChild(s);
}

// ── Fixed star positions (module-level, stable) ───────────────────────────────
const STARS = Array.from({ length: 70 }, (_, i) => ({
  l: ((i * 137.508) % 100).toFixed(2),
  t: ((i * 97.351 + 13) % 100).toFixed(2),
  sz: (1 + (i % 3) * 0.8).toFixed(1),
  dl: ((i * 0.23) % 4).toFixed(2),
  dr: (2 + (i % 4) * 0.7).toFixed(2),
}));

// ── House metadata ────────────────────────────────────────────────────────────
const HOUSE_META: Record<HouseName, { crest: string; traits: string[]; motto: string }> = {
  gryffindor: { crest: '🦁', traits: ['Brave', 'Daring', 'Chivalrous'], motto: '"Fortuna Major"' },
  slytherin: {
    crest: '🐍',
    traits: ['Cunning', 'Ambitious', 'Resourceful'],
    motto: '"Salazar\'s Pride"',
  },
  ravenclaw: { crest: '🦅', traits: ['Wise', 'Creative', 'Witty'], motto: '"Wit Beyond Measure"' },
  hufflepuff: { crest: '🦡', traits: ['Loyal', 'Patient', 'Hardworking'], motto: '"Terra Firma"' },
};

// ── Root component ────────────────────────────────────────────────────────────
export default function HouseSelection() {
  const selectHouse = useHouseStore((s) => s.selectHouse);

  return (
    <div
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
      {/* Starfield */}
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
            animation: `hsTwinkle ${st.dr}s ease-in-out ${st.dl}s infinite`,
          }}
        />
      ))}

      {/* Floating ambient orbs */}
      {[
        { x: '12%', y: '20%', c: '#7c3aed', sz: 280 },
        { x: '85%', y: '70%', c: '#1e40af', sz: 220 },
        { x: '70%', y: '10%', c: '#b45309', sz: 180 },
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
            animation: `hsOrb ${4 + i}s ease-in-out ${i * 0.8}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Floating Header ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          background: 'rgba(10,5,25,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,215,0,0.18)',
          borderRadius: '20px',
          padding: '28px 48px 24px',
          textAlign: 'center',
          marginBottom: '36px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.08) inset',
          animation:
            'hsHeaderIn .7s cubic-bezier(.34,1.56,.64,1) both, hsHeaderFloat 5s ease-in-out 1s infinite',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '7px',
            color: '#888',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          ✦ &nbsp; Welcome to &nbsp; ✦
        </div>
        <h1
          style={{
            fontSize: 'clamp(30px, 5vw, 56px)',
            fontWeight: 'bold',
            margin: '0 0 6px',
            background:
              'linear-gradient(90deg, #b8860b 0%, #ffd700 30%, #ffe066 50%, #ffd700 70%, #b8860b 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'hsGoldShimmer 3s linear infinite',
            letterSpacing: '3px',
          }}
        >
          The Sorcerer&apos;s Board
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: '#a89060',
            margin: 0,
            letterSpacing: '2px',
            fontStyle: 'italic',
          }}
        >
          Choose your house to begin &nbsp;·&nbsp; No account needed
        </p>

        {/* Animated divider */}
        <div
          style={{
            height: '1px',
            margin: '18px auto 0',
            background: 'linear-gradient(to right, transparent, #ffd700, transparent)',
            animation: 'hsDivider 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── House Cards ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          maxWidth: '1100px',
          width: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {(Object.keys(HOUSE_THEMES) as HouseName[]).map((house, idx) => {
          const t = HOUSE_THEMES[house];
          const m = HOUSE_META[house];
          return (
            <HouseCard
              key={house}
              house={house}
              crest={m.crest}
              traits={m.traits}
              motto={m.motto}
              displayName={t.displayName}
              primaryColor={t.primaryColor}
              secondaryColor={t.secondaryColor}
              accentColor={t.accentColor}
              entranceDelay={idx * 0.12}
              onSelect={selectHouse}
            />
          );
        })}
      </div>

      <p
        style={{
          marginTop: '44px',
          fontSize: '11px',
          color: '#4a3f2a',
          letterSpacing: '4px',
          zIndex: 2,
        }}
      >
        ✦ &nbsp; WIZARD&apos;S CHESS &nbsp; ✦
      </p>
    </div>
  );
}

// ── House Card ────────────────────────────────────────────────────────────────

interface HouseCardProps {
  house: HouseName;
  crest: string;
  traits: string[];
  motto: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  entranceDelay: number;
  onSelect: (h: HouseName) => void;
}

function HouseCard({
  house,
  crest,
  traits,
  motto,
  displayName,
  primaryColor,
  secondaryColor,
  accentColor,
  entranceDelay,
  onSelect,
}: HouseCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse-tracking 3D tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1…1
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 2; // -1…1
    el.style.transform = `perspective(900px) rotateY(${dx * 14}deg) rotateX(${-dy * 10}deg) translateY(-8px) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el)
      el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0) scale(1)';
    setHovered(false);
  };

  const glowColor = accentColor;

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(house)}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(house);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${displayName}`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: '220px',
        flex: '0 0 220px',
        borderRadius: '18px',
        padding: '32px 20px 28px',
        background: `linear-gradient(155deg, ${primaryColor}ee 0%, ${primaryColor}88 40%, rgba(8,4,20,.95) 100%)`,
        border: `1px solid ${hovered ? glowColor : `${glowColor}44`}`,
        boxShadow: hovered
          ? `0 0 32px ${glowColor}66, 0 0 64px ${glowColor}33, 0 24px 48px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)`
          : `0 8px 32px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)`,
        transition: 'border-color .25s ease, box-shadow .25s ease',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        animation: `hsCardIn .6s cubic-bezier(.34,1.56,.64,1) ${entranceDelay}s both`,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Inner shimmer on hover */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '18px',
          background: `radial-gradient(ellipse at 50% 0%, ${glowColor}18 0%, transparent 65%)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity .3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* ── 3D Crest Icon ── */}
      <div
        style={{
          position: 'relative',
          width: '96px',
          height: '96px',
          margin: '0 auto 20px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Rotating outer ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            border: `1.5px dashed ${glowColor}66`,
            animation: `hsRingSpin ${hovered ? 2 : 8}s linear infinite`,
            transition: 'animation-duration .4s',
          }}
        />
        {/* Rotating inner ring (opposite) */}
        <div
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: `2px solid ${glowColor}44`,
            borderTop: `2px solid ${glowColor}cc`,
            animation: `hsRingSpin ${hovered ? 1 : 4}s linear infinite reverse`,
          }}
        />
        {/* Pulse ring on hover */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${glowColor}`,
              animation: 'hsPulseOut 1.2s ease-out infinite',
            }}
          />
        )}
        {/* Glow disc behind icon */}
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColor}33 0%, transparent 70%)`,
            filter: hovered ? `blur(4px)` : 'blur(2px)',
            transition: 'filter .3s ease',
          }}
        />
        {/* The crest emoji — 3D floating via translateZ + shadow stacking */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '52px',
            lineHeight: 1,
            transform: hovered
              ? 'translateZ(24px) translateY(-4px) scale(1.12)'
              : 'translateZ(8px) scale(1)',
            transition: 'transform .35s cubic-bezier(.34,1.56,.64,1)',
            filter: hovered
              ? `drop-shadow(0 12px 18px rgba(0,0,0,.9)) drop-shadow(0 0 16px ${glowColor}cc)`
              : `drop-shadow(0 6px 10px rgba(0,0,0,.8)) drop-shadow(0 0 8px ${glowColor}55)`,
            animation: hovered ? undefined : 'hsCrestFloat 3s ease-in-out infinite',
          }}
        >
          {crest}
        </div>
      </div>

      {/* House name */}
      <h2
        style={{
          fontSize: '21px',
          fontWeight: 'bold',
          margin: '0 0 6px',
          color: secondaryColor,
          letterSpacing: '1.5px',
          textShadow: hovered ? `0 0 12px ${secondaryColor}88` : 'none',
          transition: 'text-shadow .3s ease',
        }}
      >
        {displayName}
      </h2>

      {/* Motto */}
      <p
        style={{
          fontSize: '11px',
          color: `${glowColor}bb`,
          margin: '0 0 14px',
          fontStyle: 'italic',
          letterSpacing: '1px',
        }}
      >
        {motto}
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
        {traits.map((trait, i) => (
          <span
            key={trait}
            style={{
              fontSize: '10px',
              padding: '3px 9px',
              borderRadius: '10px',
              background: `${glowColor}18`,
              border: `1px solid ${glowColor}44`,
              color: `${glowColor}cc`,
              letterSpacing: '1px',
              animation: hovered ? `hsTagIn .25s ease ${i * 0.06}s both` : undefined,
            }}
          >
            {trait.toUpperCase()}
          </span>
        ))}
      </div>

      {/* SELECT button */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          overflow: 'hidden',
          borderRadius: '22px',
        }}
      >
        {/* Fill sweep on hover */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            background: glowColor,
            width: hovered ? '100%' : '0%',
            transition: 'width .28s ease',
            borderRadius: '22px',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '9px 28px',
            border: `1px solid ${glowColor}`,
            borderRadius: '22px',
            fontSize: '11px',
            letterSpacing: '3px',
            color: hovered ? (primaryColor < '#888' ? '#fff' : '#111') : glowColor,
            transition: 'color .28s ease',
            fontWeight: 'bold',
          }}
        >
          SELECT
        </div>
      </div>
    </div>
  );
}
