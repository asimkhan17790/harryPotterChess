import { useUserStore } from '../stores/userStore';

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
    @keyframes lpGuestPulse{0%,100%{box-shadow:0 0 8px rgba(255,215,0,0.2)}50%{box-shadow:0 0 18px rgba(255,215,0,0.45)}}
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
  const signInWithGoogle = useUserStore((s) => s.signInWithGoogle);
  const user = useUserStore((s) => s.user);

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
      {/* Signed-in user name — top right */}
      {user && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(255,215,0,0.3)',
            background: 'rgba(255,215,0,0.06)',
            color: '#ffd700',
            fontSize: '13px',
            letterSpacing: '1px',
            fontFamily: '"Georgia","Times New Roman",serif',
          }}
        >
          ✦ {user.user_metadata?.full_name?.split(' ')[0] ?? user.email}
        </div>
      )}

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
          animation: 'lpFadeUp .8s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Crest */}
        <div
          style={{
            fontSize: '72px',
            marginBottom: '16px',
            animation: 'lpFloat 5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 24px #ffd70088)',
          }}
        >
          ♟
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 52px)',
            fontWeight: 'bold',
            margin: '0 0 8px',
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
          The Sorcerer&apos;s Board
        </h1>

        <p
          style={{
            fontSize: '11px',
            color: '#a08848',
            letterSpacing: '5px',
            margin: '0 0 40px',
            textTransform: 'uppercase',
          }}
        >
          ✦ &nbsp; A Wizard&apos;s Chess &nbsp; ✦
        </p>

        {/* Divider */}
        <div
          style={{
            width: '260px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #ffd700, transparent)',
            marginBottom: '36px',
          }}
        />

        {/* Action buttons */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}
        >
          {/* Primary: play now */}
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
              minWidth: '240px',
              textAlign: 'center',
            }}
          >
            PLAY AS GUEST
          </div>

          {/* Sign in with Google — shown only when not logged in */}
          {!user && (
            <div
              onClick={() => signInWithGoogle()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') signInWithGoogle();
              }}
              style={{
                cursor: 'pointer',
                padding: '13px 32px',
                borderRadius: '30px',
                border: '1.5px solid rgba(255,215,0,0.35)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e8d5a3',
                fontSize: '13px',
                letterSpacing: '2px',
                fontFamily: '"Georgia","Times New Roman",serif',
                animation: 'lpGuestPulse 3s ease-in-out infinite',
                userSelect: 'none',
                minWidth: '240px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              SIGN IN WITH GOOGLE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
