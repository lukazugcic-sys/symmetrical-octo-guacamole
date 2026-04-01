import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  ZVUČNI EFEKTI — Uputa za dodavanje zvukova:                              │
// │  1. Dodajte .mp3 datoteke u /assets/sounds/                               │
// │  2. Zamijenite `null` s require() za željeni zvuk, npr:                   │
// │       spin: require('../../assets/sounds/spin.mp3'),                      │
// └──────────────────────────────────────────────────────────────────────────┘
const ZVUKOVI = {
  spin:    null, // require('../../assets/sounds/spin.mp3'),
  win:     null, // require('../../assets/sounds/win.mp3'),
  jackpot: null, // require('../../assets/sounds/jackpot.mp3'),
  build:   null, // require('../../assets/sounds/build.mp3'),
  attack:  null, // require('../../assets/sounds/attack.mp3'),
  collect: null, // require('../../assets/sounds/collect.mp3'),
  button:  null, // require('../../assets/sounds/button.mp3'),
};

/**
 * Hook za upravljanje zvučnim efektima.
 * Svaka pogreška (nedostaje datoteka, isključen zvuk) se tiho zanemaruje.
 *
 * Upotreba:
 *   const { play } = useSounds();
 *   play('spin');    // pri svakoj vrtnji
 *   play('win');     // pri dobitku
 *   play('jackpot'); // pri jackpotu
 *   play('attack');  // pri napadu lubanje
 *   play('build');   // pri gradnji/nadogradnji
 *   play('collect'); // pri preuzimanju dobitka
 */
export const useSounds = () => {
  const soundRefs = useRef({});

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    }).catch(() => {});

    return () => {
      Object.values(soundRefs.current).forEach((s) => s?.unloadAsync?.().catch(() => {}));
      soundRefs.current = {};
    };
  }, []);

  const play = useCallback(async (tip) => {
    const source = ZVUKOVI[tip];
    if (!source) return;

    try {
      // Unload prethodne instance istog zvuka za čisto preklapanje
      await soundRefs.current[tip]?.unloadAsync().catch(() => {});

      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume: 1.0 });
      soundRefs.current[tip] = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (_e) {
      // Tiho zanemari greške (nedostaje datoteka, audio nije inicijaliziran)
    }
  }, []);

  return { play };
};
