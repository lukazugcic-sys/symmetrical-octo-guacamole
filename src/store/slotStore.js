import { create } from 'zustand';

// Stanje specifično za automat — kratkotrajno, ne treba perzistenciju.
export const useSlotStore = create((set) => ({
  simboli:          Array(15).fill('gold'),
  vrti:             false,
  ulog:             1,
  dobitnaPolja:     [],
  dobitakNaCekanju: null,
  turboRezim:       false,
  winCelebration:   null,  // null | 'win' | 'jackpot'
  celebrationKey:   0,     // inkrementira se pri svakoj novoj proslavi
  raidAktivan:      false, // true kad skull linija triggera Raid Modal

  setSimboli:          (simboli)          => set({ simboli }),
  setVrti:             (vrti)             => set({ vrti }),
  setUlog:             (ulog)             => set({ ulog }),
  setDobitnaPolja:     (dobitnaPolja)     => set({ dobitnaPolja }),
  setDobitakNaCekanju: (dobitakNaCekanju) => set({ dobitakNaCekanju }),
  setTurboRezim:       (turboRezim)       => set({ turboRezim }),
  setWinCelebration:   (tip)              => set((s) => ({
    winCelebration: tip,
    celebrationKey: tip ? s.celebrationKey + 1 : s.celebrationKey,
  })),
  setRaidAktivan:      (raidAktivan)      => set({ raidAktivan }),
}));
