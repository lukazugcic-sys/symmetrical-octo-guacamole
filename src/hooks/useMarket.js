import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Hook koji pokreće tajmer za ažuriranje tržišnih cijena svakih 45 sekundi.
 * Poziva se jednom iz App.js kako bi tajmer radio neovisno o aktivnom ekranu.
 */
export const useMarket = () => {
  const timerMarket = useGameStore((s) => s.timerMarket);

  useEffect(() => {
    const timer = setInterval(timerMarket, 45000);
    return () => clearInterval(timer);
  }, [timerMarket]);
};
