import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Hook koji pokreće tajmer za pasivnu produkciju resursa i regeneraciju energije/štita.
 * Poziva se jednom iz App.js kako bi tajmer radio neovisno o aktivnom ekranu.
 */
export const useVillage = () => {
  const timerTick = useGameStore((s) => s.timerTick);

  useEffect(() => {
    const timer = setInterval(timerTick, 1000);
    return () => clearInterval(timer);
  }, [timerTick]);
};
