import { useEffect, useRef, useCallback } from 'react';

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

const IMA_AKTIVNIH_ZVUKOVA = Object.values(ZVUKOVI).some(Boolean);

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
  const audioRef = useRef(null);
  const audioModeReadyRef = useRef(false);

  const ensureAudio = useCallback(async () => {
    if (!IMA_AKTIVNIH_ZVUKOVA) return null;

    if (!audioRef.current) {
      const expoAv = await import('expo-av');
      audioRef.current = expoAv.Audio;
    }

    if (!audioModeReadyRef.current && audioRef.current) {
      await audioRef.current.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      }).catch(() => {});
      audioModeReadyRef.current = true;
    }

    return audioRef.current;
  }, []);

  useEffect(() => {
    return () => {
      Object.values(soundRefs.current).forEach((s) => s?.unloadAsync?.().catch(() => {}));
      soundRefs.current = {};
    };
  }, []);

  const play = useCallback(async (tip) => {
    const source = ZVUKOVI[tip];
    if (!source) return;

    try {
      const Audio = await ensureAudio();
      if (!Audio) return;

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
  }, [ensureAudio]);

  return { play };
};
