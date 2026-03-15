import { useHouseStore } from './stores/houseStore';
import HouseSelection from './components/HouseSelection';
import ChessScene from './scenes/ChessScene';

export default function App() {
  const selectedHouse = useHouseStore((s) => s.selectedHouse);

  if (!selectedHouse) return <HouseSelection />;
  return <ChessScene />;
}
