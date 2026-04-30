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
        top: '16px',
        left: '16px',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
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
    </>
  );
}
