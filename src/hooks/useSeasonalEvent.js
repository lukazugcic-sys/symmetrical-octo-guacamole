import { useState, useEffect } from 'react';
import { dohvatiAktivniDogadaj } from '../config/sezonalniDogadaji';

/**
 * Vraća trenutno aktivan sezonalni događaj ili null.
 * Provjerava jednom pri učitavanju i ažurira se svakih sat vremena.
 */
export const useSeasonalEvent = () => {
  const [aktivniDogadaj, setAktivniDogadaj] = useState(() => dohvatiAktivniDogadaj());

  useEffect(() => {
    const interval = setInterval(() => {
      setAktivniDogadaj(dohvatiAktivniDogadaj());
    }, 60 * 60 * 1000); // ponovna provjera svakih sat
    return () => clearInterval(interval);
  }, []);

  return aktivniDogadaj;
};
