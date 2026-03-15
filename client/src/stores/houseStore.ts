import { create } from 'zustand';
import { HOUSE_THEMES } from '../data/houseThemes';
import type { HouseName, HouseTheme } from '../data/houseThemes';

interface HouseState {
  selectedHouse: HouseName | null;
  theme: HouseTheme | null;
  selectHouse: (house: HouseName) => void;
}

export const useHouseStore = create<HouseState>((set) => ({
  selectedHouse: null,
  theme: null,
  selectHouse: (house) => set({ selectedHouse: house, theme: HOUSE_THEMES[house] }),
}));
