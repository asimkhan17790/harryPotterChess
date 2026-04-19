import { useHouseStore } from './stores/houseStore';
import { useGameStore } from './stores/gameStore';
import HouseSelection from './components/HouseSelection';
import GameModeSelection from './components/GameModeSelection';
import ChessScene from './scenes/ChessScene';

export default function App() {
  const selectedHouse = useHouseStore((s) => s.selectedHouse);
  const gameMode = useGameStore((s) => s.gameMode);

  if (!selectedHouse) return <HouseSelection />;
  if (!gameMode) return <GameModeSelection />;
  return <ChessScene />;
}
