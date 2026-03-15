import { HOUSE_THEMES } from '../data/houseThemes';
import type { HouseName } from '../data/houseThemes';
import { useHouseStore } from '../stores/houseStore';

const HOUSE_CRESTS: Record<HouseName, string> = {
  gryffindor: '🦁',
  slytherin: '🐍',
  ravenclaw: '🦅',
  hufflepuff: '🦡',
};

const cardStyle = (
  primary: string,
  secondary: string,
  accent: string,
  hovered: boolean,
): React.CSSProperties => ({
  position: 'relative',
  cursor: 'pointer',
  borderRadius: '12px',
  padding: '32px 24px',
  background: `linear-gradient(135deg, ${primary} 0%, ${secondary}22 100%)`,
  border: `2px solid ${hovered ? accent : primary}`,
  boxShadow: hovered ? `0 0 24px ${accent}88, 0 8px 32px #0008` : '0 4px 16px #0006',
  transform: hovered ? 'translateY(-4px) scale(1.03)' : 'none',
  transition: 'all 0.2s ease',
  textAlign: 'center',
  minWidth: '180px',
  flex: '1 1 180px',
  maxWidth: '220px',
});

export default function HouseSelection() {
  const selectHouse = useHouseStore((s) => s.selectHouse);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #08080f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Georgia", "Times New Roman", serif',
        color: '#e8d5a3',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', letterSpacing: '6px', color: '#888', marginBottom: '8px' }}>
          ✦ WELCOME TO ✦
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 'bold',
            margin: 0,
            background: 'linear-gradient(135deg, #ffd700 0%, #c8a000 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            letterSpacing: '2px',
          }}
        >
          Wizard&apos;s Chess
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#aaa',
            margin: '12px 0 0',
            letterSpacing: '1px',
          }}
        >
          Choose your house to begin
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '200px',
          height: '1px',
          background: 'linear-gradient(to right, transparent, #ffd70066, transparent)',
          margin: '20px 0 32px',
        }}
      />

      {/* House Cards */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          maxWidth: '960px',
          width: '100%',
        }}
      >
        {(Object.keys(HOUSE_THEMES) as HouseName[]).map((house) => {
          const t = HOUSE_THEMES[house];
          return (
            <HouseCard
              key={house}
              house={house}
              crest={HOUSE_CRESTS[house]}
              displayName={t.displayName}
              description={t.description}
              primaryColor={t.primaryColor}
              secondaryColor={t.secondaryColor}
              accentColor={t.accentColor}
              onSelect={selectHouse}
            />
          );
        })}
      </div>

      <p
        style={{
          marginTop: '40px',
          fontSize: '12px',
          color: '#555',
          letterSpacing: '2px',
        }}
      >
        ✦ &nbsp; WIZARD&apos;S CHESS &nbsp; ✦
      </p>
    </div>
  );
}

// ── House Card Sub-component ─────────────────────────────────────────────────

interface HouseCardProps {
  house: HouseName;
  crest: string;
  displayName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  onSelect: (h: HouseName) => void;
}

function HouseCard({
  house,
  crest,
  displayName,
  description,
  primaryColor,
  secondaryColor,
  accentColor,
  onSelect,
}: HouseCardProps) {
  // Simple hover state via onMouseEnter/Leave + ref
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={cardStyle(primaryColor, secondaryColor, accentColor, hovered)}
      onClick={() => onSelect(house)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(house);
      }}
      aria-label={`Select ${displayName}`}
    >
      {/* Glow ring on hover */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '14px',
            background: `radial-gradient(ellipse at 50% 0%, ${accentColor}44 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ fontSize: '52px', marginBottom: '12px', lineHeight: 1 }}>{crest}</div>

      <h2
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          margin: '0 0 8px',
          color: secondaryColor,
          letterSpacing: '1px',
        }}
      >
        {displayName}
      </h2>

      <p
        style={{
          fontSize: '13px',
          color: '#ccc',
          margin: 0,
          fontStyle: 'italic',
          lineHeight: '1.4',
        }}
      >
        {description}
      </p>

      <div
        style={{
          marginTop: '20px',
          padding: '8px 20px',
          borderRadius: '20px',
          background: hovered ? accentColor : 'transparent',
          border: `1px solid ${accentColor}`,
          color: hovered ? '#fff' : accentColor,
          fontSize: '12px',
          letterSpacing: '2px',
          transition: 'all 0.2s ease',
          display: 'inline-block',
        }}
      >
        SELECT
      </div>
    </div>
  );
}

// Import React for useState usage
import React from 'react';
