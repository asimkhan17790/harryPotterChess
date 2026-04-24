import { useState } from 'react';
import { useHouseStore } from './stores/houseStore';
import { useGameStore } from './stores/gameStore';
import LandingPage from './components/LandingPage';
import HouseSelection from './components/HouseSelection';
import GameModeSelection from './components/GameModeSelection';
import ChessScene from './scenes/ChessScene';
import AuthButton from './components/AuthButton';
import ProfileModal from './components/ProfileModal';

export default function App() {
  const [hasChosen, setHasChosen] = useState(false);
  const selectedHouse = useHouseStore((s) => s.selectedHouse);
  const gameMode = useGameStore((s) => s.gameMode);

  if (!hasChosen) {
    return <LandingPage onContinue={() => setHasChosen(true)} />;
  }

  return (
    <>
      <AuthButton />
      <ProfileModal />
      {!selectedHouse ? <HouseSelection /> : !gameMode ? <GameModeSelection /> : <ChessScene />}
    </>
  );
}
