import { useHouseStore } from './stores/houseStore';
import { useGameStore } from './stores/gameStore';
import HouseSelection from './components/HouseSelection';
import GameModeSelection from './components/GameModeSelection';
import ChessScene from './scenes/ChessScene';
import AuthButton from './components/AuthButton';
import ProfileModal from './components/ProfileModal';

export default function App() {
  const selectedHouse = useHouseStore((s) => s.selectedHouse);
  const gameMode = useGameStore((s) => s.gameMode);

  return (
    <>
      <AuthButton />
      <ProfileModal />
      {!selectedHouse ? <HouseSelection /> : !gameMode ? <GameModeSelection /> : <ChessScene />}
    </>
  );
}
