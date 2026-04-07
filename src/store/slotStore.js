import { create } from 'zustand';

const buildStaticColumns = (symbols) => Array.from({ length: 5 }, (_, columnIndex) => ([
  symbols[columnIndex],
  symbols[columnIndex + 5],
  symbols[columnIndex + 10],
]));

const getVisibleColumn = (symbols, reelColumns, columnIndex) => {
  const fallback = [
    symbols[columnIndex],
    symbols[columnIndex + 5],
    symbols[columnIndex + 10],
  ];
  const activeColumn = reelColumns?.[columnIndex];
  if (!Array.isArray(activeColumn) || activeColumn.length < 3) {
    return fallback;
  }

  return activeColumn.slice(-3);
};

const INITIAL_SYMBOLS = Array(15).fill('gold');

// Stanje specifično za automat — kratkotrajno, ne treba perzistenciju.
export const useSlotStore = create((set) => ({
  simboli:          INITIAL_SYMBOLS,
  reelColumns:      buildStaticColumns(INITIAL_SYMBOLS),
  vrti:             false,
  ulog:             1,
  dobitnaPolja:     [],
  dobitakNaCekanju: null,
  turboRezim:       false,
  winCelebration:   null,  // null | 'win' | 'jackpot'
  celebrationKey:   0,     // inkrementira se pri svakoj novoj proslavi
  raidAktivan:      false, // true kad skull linija triggera Raid Modal

  setSimboli:          (simboli)          => set({ simboli }),
  setReelColumns:      (reelColumns)      => set({ reelColumns }),
  setVrti:             (vrti)             => set({ vrti }),
  setUlog:             (ulog)             => set({ ulog }),
  setDobitnaPolja:     (dobitnaPolja)     => set({ dobitnaPolja }),
  setDobitakNaCekanju: (dobitakNaCekanju) => set({ dobitakNaCekanju }),
  setTurboRezim:       (turboRezim)       => set({ turboRezim }),
  getVisibleColumn:    (columnIndex)      => {
    const state = useSlotStore.getState();
    return getVisibleColumn(state.simboli, state.reelColumns, columnIndex);
  },
  setWinCelebration:   (tip)              => set((s) => ({
    winCelebration: tip,
    celebrationKey: tip ? s.celebrationKey + 1 : s.celebrationKey,
  })),
  setRaidAktivan:      (raidAktivan)      => set({ raidAktivan }),
}));
