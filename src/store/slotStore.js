import { create } from 'zustand';

// Stanje specifično za automat — kratkotrajno, ne treba perzistenciju.
export const useSlotStore = create((set) => ({
  simboli:          Array(15).fill('gold'),
  vrti:             false,
  ulog:             1,
  dobitnaPolja:     [],
  dobitakNaCekanju: null,
  turboRezim:       false,

  setSimboli:          (simboli)          => set({ simboli }),
  setVrti:             (vrti)             => set({ vrti }),
  setUlog:             (ulog)             => set({ ulog }),
  setDobitnaPolja:     (dobitnaPolja)     => set({ dobitnaPolja }),
  setDobitakNaCekanju: (dobitakNaCekanju) => set({ dobitakNaCekanju }),
  setTurboRezim:       (turboRezim)       => set({ turboRezim }),
}));
