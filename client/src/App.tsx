import { useState } from 'react';
import { useHouseStore } from './stores/houseStore';
import { useGameStore } from './stores/gameStore';
import HouseSelection from './components/HouseSelection';
import GameModeSelection from './components/GameModeSelection';
import ChessScene from './scenes/ChessScene';
import AuthButton from './components/AuthButton';
import ProfileModal from './components/ProfileModal';

function HomeButton() {
  const resetHouse = useHouseStore((s) => s.resetHouse);
  return (
    <button
      onClick={resetHouse}
      title="Home"
      style={{
        position: 'fixed',
        top: 'calc(16px + var(--safe-top))',
        left: 'calc(16px + var(--safe-left))',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        minHeight: '44px',
        background: 'rgba(3, 1, 12, 0.85)',
        border: '1px solid rgba(255, 215, 0, 0.5)',
        borderRadius: '24px',
        color: '#ffd700',
        fontSize: '13px',
        fontFamily: "'Cinzel', 'Georgia', serif",
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        letterSpacing: '0.5px',
      }}
    >
      ⌂ Home
    </button>
  );
}

function OrientationHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      onClick={() => setDismissed(true)}
      className="rotate-hint"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3,1,12,0.88)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        fontFamily: "'Cinzel', 'Georgia', serif",
        color: '#ffd700',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>↻</div>
        <p style={{ fontSize: '15px', letterSpacing: '2px', marginBottom: '8px' }}>
          Rotate for the best experience
        </p>
        <p style={{ fontSize: '11px', color: '#a08848', letterSpacing: '3px' }}>TAP TO DISMISS</p>
      </div>
    </div>
  );
}

export default function App() {
  const selectedHouse = useHouseStore((s) => s.selectedHouse);
  const gameMode = useGameStore((s) => s.gameMode);
  const inGame = !!(selectedHouse && gameMode);

  return (
    <>
      <AuthButton />
      <ProfileModal />
      {selectedHouse && !inGame && <HomeButton />}
      {!selectedHouse ? <HouseSelection /> : !gameMode ? <GameModeSelection /> : <ChessScene />}
      <OrientationHint />
    </>
  );
}
