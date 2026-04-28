if (typeof document !== 'undefined' && !document.getElementById('lp-styles')) {
  const s = document.createElement('style');
  s.id = 'lp-styles';
  s.textContent = `
    @keyframes lpStarTwinkle{0%,100%{opacity:.12;transform:scale(.7)}50%{opacity:1;transform:scale(1.3)}}
    @keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @keyframes lpGoldShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes lpFadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
    @keyframes lpBtnBreathe{0%,100%{box-shadow:0 0 12px #ffd70088,0 0 24px #ffd70044}50%{box-shadow:0 0 28px #ffd700bb,0 0 56px #ffd70066}}
    @keyframes lpOrb{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.4}50%{transform:translate(-50%,-50%) scale(1.5);opacity:.75}}
    @keyframes lpRuneFloat{0%,100%{opacity:.15;transform:translateY(0) rotate(0deg)}50%{opacity:.4;transform:translateY(-14px) rotate(6deg)}}
  `;
  document.head.appendChild(s);
}

const STARS = Array.from({ length: 80 }, (_, i) => ({
  l: ((i * 137.508) % 100).toFixed(2),
  t: ((i * 97.351 + 13) % 100).toFixed(2),
  sz: (1 + (i % 3) * 0.7).toFixed(1),
  dl: ((i * 0.19) % 4).toFixed(2),
  dr: (2.5 + (i % 4) * 0.6).toFixed(2),
}));

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚷ', 'ᚹ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ'];
const RUNE_POS = Array.from({ length: 14 }, (_, i) => ({
  l: ((i * 79.3 + 8) % 95).toFixed(1),
  t: ((i * 61.7 + 5) % 90).toFixed(1),
  dl: (i * 0.35).toFixed(2),
  dr: (4.5 + (i % 3) * 1.2).toFixed(2),
}));

interface LandingPageProps {
  onContinue: () => void;
}

export default function LandingPage({ onContinue }: LandingPageProps) {
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
        position: 'relative',
        overflow: 'hidden',
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
            animation: `lpStarTwinkle ${st.dr}s ease-in-out ${st.dl}s infinite`,
          }}
        />
      ))}

      {/* Ambient orbs */}
      {[
        { x: '15%', y: '25%', c: '#7c3aed', sz: 320 },
        { x: '82%', y: '65%', c: '#1e40af', sz: 260 },
        { x: '68%', y: '12%', c: '#b45309', sz: 200 },
        { x: '30%', y: '80%', c: '#6d1a8a', sz: 180 },
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
            animation: `lpOrb ${4 + i * 0.8}s ease-in-out ${i * 0.6}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Runes */}
      {RUNE_POS.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: `${r.l}%`,
            top: `${r.t}%`,
            fontSize: '16px',
            color: '#ffd700',
            pointerEvents: 'none',
            animation: `lpRuneFloat ${r.dr}s ease-in-out ${r.dl}s infinite`,
          }}
        >
          {RUNES[i % RUNES.length]}
        </div>
      ))}

      {/* Main card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0px',
          animation: 'lpFadeUp .8s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Crest */}
        <div
          style={{
            fontSize: '72px',
            marginBottom: '8px',
            animation: 'lpFloat 5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 24px #ffd70088)',
          }}
        >
          ♟
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '7px',
            color: '#555',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}
        >
          ✦ &nbsp; Welcome to &nbsp; ✦
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(28px, 6vw, 58px)',
            fontWeight: 'bold',
            margin: '0 0 6px',
            background:
              'linear-gradient(90deg, #b8860b 0%, #ffd700 30%, #ffe066 50%, #ffd700 70%, #b8860b 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'lpGoldShimmer 3s linear infinite',
            letterSpacing: '3px',
            textAlign: 'center',
          }}
        >
          Wizard&apos;s Chess
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#a08848',
            letterSpacing: '2px',
            margin: '0 0 40px',
            fontStyle: 'italic',
          }}
        >
          The Sorcerer&apos;s Board
        </p>

        {/* Divider */}
        <div
          style={{
            width: '260px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #ffd700, transparent)',
            marginBottom: '40px',
          }}
        />

        {/* Enter button */}
        <div
          onClick={onContinue}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onContinue();
          }}
          style={{
            cursor: 'pointer',
            padding: '14px 52px',
            borderRadius: '30px',
            border: '1.5px solid #ffd700',
            background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffe066, #ffd700, #b8860b)',
            backgroundSize: '200% 100%',
            color: '#0a0810',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '4px',
            fontFamily: '"Georgia","Times New Roman",serif',
            animation: 'lpGoldShimmer 2s linear infinite, lpBtnBreathe 2.5s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          ENTER THE ARENA
        </div>
      </div>

      <p
        style={{
          position: 'absolute',
          bottom: '24px',
          fontSize: '10px',
          color: '#2a2420',
          letterSpacing: '4px',
          zIndex: 2,
        }}
      >
        ✦ &nbsp; WIZARD&apos;S CHESS &nbsp; ✦
      </p>
    </div>
  );
}
