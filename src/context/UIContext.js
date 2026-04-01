import { createContext, useContext } from 'react';

/**
 * UI kontekst — dijeli flash overlay i shake animacije između ekrana
 * bez prop drillinga.
 *
 * Vrijednosti:
 *   onFlash(boja: string)  — trigerira flash overlay zadane boje
 *   onShake()              — trigerira animaciju tresenja ekrana
 *
 * Upotreba u podređenim komponentama:
 *   const { onFlash, onShake } = useUI();
 */
export const UIContext = createContext({
  onFlash: () => {},
  onShake: () => {},
});

export const useUI = () => useContext(UIContext);
