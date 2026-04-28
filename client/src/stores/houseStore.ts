import { create } from 'zustand';
import { HOUSE_THEMES } from '../data/houseThemes';
import type { HouseName, HouseTheme } from '../data/houseThemes';
import { useGameStore } from './gameStore';

interface HouseState {
  selectedHouse: HouseName | null;
  theme: HouseTheme | null;
  selectHouse: (house: HouseName) => void;
  resetHouse: () => void;
}

export const useHouseStore = create<HouseState>((set) => ({
  selectedHouse: null,
  theme: null,
  selectHouse: (house) => {
    useGameStore.getState().reset();
    set({ selectedHouse: house, theme: HOUSE_THEMES[house] });
  },
  resetHouse: () => {
    useGameStore.getState().reset();
    set({ selectedHouse: null, theme: null });
  },
}));
