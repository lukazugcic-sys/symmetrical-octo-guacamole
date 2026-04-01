import { useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { useSlotStore } from '../store/slotStore';
import { useUI } from '../context/UIContext';
import { useHaptics } from './useHaptics';
import { useSounds } from './useSounds';
import { useSeasonalEvent } from './useSeasonalEvent';
import {
  SVO_BLAGO, BLAGO, LUCKY_SPIN_INTERVAL, MAX_WIN_STREAK,
  STREAK_BONUS_PER_WIN, WILD_BOOST_CHANCE_PER_LEVEL, ZGRADE,
} from '../config/constants';
import {
  izracunajMaxStitova, izracunajPrestigeMnozitelj, izracunajSansuZaDobitak,
} from '../utils/economy';
import { delay, randomChance, randomInt } from '../utils/helpers';

// Izgradi težinski pool simbola na osnovu sezonalnog modificatora
const izgradiPool = (dogadaj) => {
  if (!dogadaj?.modifikatorBlaga) return SVO_BLAGO;
  const pool = [];
  SVO_BLAGO.forEach((sym) => {
    const mult  = dogadaj.modifikatorBlaga[sym] ?? 1.0;
    const count = Math.max(1, Math.round(mult * 2));
    for (let i = 0; i < count; i++) pool.push(sym);
  });
  return pool;
};

/**
 * Hook koji enkapsulira svu logiku automata:
 *  - Animirane reference (stupciAnims, stupciBlurs, winScaleAnims)
 *  - zavrtiMasinu — async logika vrtnje + izračun dobitaka
 *  - preuzmiDobitak — preuzimanje trenutnog dobitka
 *  - igrajGamble — duplanje dobitka (crvena/crna)
 *
 * Flash i shake efekti čitaju se iz UIContext.
 * Symbol pool se prilagođuje aktivnom sezonalnom događaju.
 */
export const useSlotMachine = () => {
  const { onFlash: _onFlash, onShake: _onShake } = useUI();
  const aktivniDogadaj = useSeasonalEvent();

  const { light, medium, heavy, success, error: hapticError } = useHaptics();
  const { play } = useSounds();

  // Animirani refs za stupce i polja automata
  const stupciAnims    = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const stupciBlurs    = useRef([...Array(5)].map(() => new Animated.Value(1))).current;
  const winScaleAnims  = useRef([...Array(15)].map(() => new Animated.Value(1))).current;
  const spinLoopsRef   = useRef([]);

  // ─── Animiraj pobjednička polja ─────────────────────────────────────────────
  const animirajDobitak = (polja) => {
    polja.forEach((idx) => {
      Animated.sequence([
        Animated.spring(winScaleAnims[idx], { toValue: 1.25, friction: 3, tension: 40, useNativeDriver: true }),
        Animated.timing(winScaleAnims[idx],  { toValue: 1.15, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  // ─── Preuzmi dobitak ────────────────────────────────────────────────────────
  const preuzmiDobitak = () => {
    const ss = useSlotStore.getState();
    const d  = ss.dobitakNaCekanju;
    if (!d) return;

    success();
    play('collect');

    const gs = useGameStore.getState();
    const maxStitova = izracunajMaxStitova(gs.razine.oklop || 0);

    useGameStore.setState((s) => ({
      zlato: s.zlato + (d.zlato || 0),
      dijamanti: s.dijamanti + (d.dijamanti || 0),
      energija: s.energija + (d.energija || 0),
      stitovi: Math.min(maxStitova, s.stitovi + (d.stitovi || 0)),
      resursi: {
        drvo: s.resursi.drvo + (d.drvo || 0),
        kamen: s.resursi.kamen + (d.kamen || 0),
        zeljezo: s.resursi.zeljezo + (d.zeljezo || 0),
      },
      ...(d.zlato > 0 ? { ukupnoZlata: s.ukupnoZlata + d.zlato } : {}),
    }));

    if (d.zlato > 0) { gs.azurirajMisiju('zlato', d.zlato); gs.azurirajKlanZadatak('zlato', d.zlato); }
    if (d.linije   > 0) { gs.azurirajMisiju('dobitak', d.linije); gs.azurirajKlanZadatak('dobitak', d.linije); }

    if (d.zlato > 0) {
      const gs2 = useGameStore.getState();
      const novoUkupnoZlato = gs2.ukupnoZlata;
      gs2.provjeriDostignuca(undefined, novoUkupnoZlato, undefined, undefined);
    }

    useGameStore.setState({ poruka: 'DOBITAK PREUZET!' });
    useSlotStore.getState().setDobitakNaCekanju(null);
    useSlotStore.getState().setDobitnaPolja([]);
  };

  // ─── Gamble (duplanje) ──────────────────────────────────────────────────────
  const igrajGamble = (odabranaBoja) => {
    const trenutniDobitak = useSlotStore.getState().dobitakNaCekanju;
    if (!trenutniDobitak) return;
    const izvucenaKarta = randomChance(0.5) ? 'red' : 'black';
    const flashBoja = izvucenaKarta === 'red'
      ? 'rgba(255, 42, 85, 0.5)'
      : 'rgba(100, 100, 100, 0.7)';
    _onFlash(flashBoja);

    if (izvucenaKarta === odabranaBoja) {
      useSlotStore.setState((state) => ({
        dobitakNaCekanju: {
          zlato:     (state.dobitakNaCekanju?.zlato ?? 0)     * 2,
          dijamanti: (state.dobitakNaCekanju?.dijamanti ?? 0) * 2,
          energija:  (state.dobitakNaCekanju?.energija ?? 0)  * 2,
          stitovi:   (state.dobitakNaCekanju?.stitovi ?? 0)   * 2,
          drvo:      (state.dobitakNaCekanju?.drvo ?? 0)      * 2,
          kamen:     (state.dobitakNaCekanju?.kamen ?? 0)     * 2,
          zeljezo:   (state.dobitakNaCekanju?.zeljezo ?? 0)   * 2,
          linije:    state.dobitakNaCekanju?.linije ?? 0,
        },
      }));
      useGameStore.setState({
        poruka: `POGODAK! IZVUČENA JE ${izvucenaKarta === 'red' ? 'CRVENA' : 'CRNA'}! x2!`,
      });
    } else {
      useSlotStore.getState().setDobitakNaCekanju(null);
      useSlotStore.getState().setDobitnaPolja([]);
      useGameStore.setState({
        poruka: `GUBITAK! IZVUČENA JE ${izvucenaKarta === 'red' ? 'CRVENA' : 'CRNA'}.`,
      });
    }
  };

  // ─── Glavna logika vrtnje ───────────────────────────────────────────────────
  const zavrtiMasinu = async () => {
    const ss = useSlotStore.getState();
    if (ss.dobitakNaCekanju) return;

    const gs          = useGameStore.getState();
    const { ulog, turboRezim } = ss;
    const jeFreeSpin  = gs.luckySpinCounter === 1;

    if (ss.vrti || (!jeFreeSpin && gs.energija < ulog)) {
      if (!ss.vrti) useGameStore.setState({ poruka: 'NEDOVOLJNO ENERGIJE' });
      return;
    }

    // Oduzmi energiju ili koristi free spin
    if (!jeFreeSpin) {
      useGameStore.setState((s) => ({ energija: s.energija - ulog }));
    }
    useGameStore.getState().azurirajMisiju('spin');
    useGameStore.getState().azurirajKlanZadatak('spin');

    let dobijeniXp  = ulog * 2;
    const novaVrtnja = gs.ukupnoVrtnji + 1;
    useGameStore.setState({ ukupnoVrtnji: novaVrtnja });
    useGameStore.getState().provjeriDostignuca(novaVrtnja, undefined, undefined, undefined);

    const noviLuckyCounter = jeFreeSpin ? LUCKY_SPIN_INTERVAL : gs.luckySpinCounter - 1;
    useGameStore.setState({ luckySpinCounter: noviLuckyCounter });
    if (jeFreeSpin) {
      useGameStore.getState().azurirajMisiju('luckySpin');
      useGameStore.setState({ poruka: '🍀 LUCKY SPIN! BESPLATNA VRTNJA!' });
    }

    useSlotStore.getState().setVrti(true);
    useSlotStore.getState().setDobitnaPolja([]);
    if (!jeFreeSpin) useGameStore.setState({ poruka: 'VRTNJA...' });

    // Haptika + zvuk pri početku vrtnje
    light();
    play('spin');

    winScaleAnims.forEach((anim) => anim.setValue(1));
    stupciAnims.forEach((anim)   => anim.setValue(0));

    const spinDuration = turboRezim ? 120 : 250;
    const spinDelay    = turboRezim ? 250 : 600;
    const stopDelay    = turboRezim ? 100 : 250;
    const finalDelay   = turboRezim ? 150 : 300;

    spinLoopsRef.current.forEach((a) => a?.stop?.());
    spinLoopsRef.current = stupciAnims.map((anim) =>
      Animated.loop(Animated.timing(anim, { toValue: 300, duration: spinDuration, easing: Easing.linear, useNativeDriver: true }))
    );

    Animated.parallel(
      spinLoopsRef.current.concat(
        stupciBlurs.map((anim) => Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: true }))
      )
    ).start();

    await delay(spinDelay);

    try {
      // Osvježi stanje nakon čekanja (može se promijeniti za to vrijeme)
      const gs2          = useGameStore.getState();
      const wildBoostLevel  = gs2.razine.wildBoost || 0;
      const wildBoostChance = wildBoostLevel * WILD_BOOST_CHANCE_PER_LEVEL;
      const sansaZaDobitak  = izracunajSansuZaDobitak(gs2.razine.sreca || 0);
      const prestigeMnozitelj = izracunajPrestigeMnozitelj(gs2.prestigeRazina);
      const winStreakMultiplier = 1 + (Math.min(gs2.winStreak, MAX_WIN_STREAK) * STREAK_BONUS_PER_WIN);
      const eventMnozitelj = aktivniDogadaj?.bonusMnozitelj ?? 1.0;
      const maxStitova = izracunajMaxStitova(gs2.razine.oklop || 0);

      // Težinski pool simbola prilagođen aktivnom sezonalnom događaju
      const simbolPool = izgradiPool(aktivniDogadaj);

      let noviSimboli = Array(15).fill(null).map(() => {
        if (randomChance(wildBoostChance)) return 'wild';
        return simbolPool[randomInt(simbolPool.length)];
      });

      const linije = [
        [5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14],
        [0, 6, 12, 8, 4], [10, 6, 2, 8, 14],
      ];

      if (randomChance(sansaZaDobitak)) {
        const ponudjenoBlago = SVO_BLAGO.filter((s) => s !== 'skull');
        const dob    = ponudjenoBlago[randomInt(ponudjenoBlago.length)];
        const rLinija = linije[randomInt(linije.length)];
        const rand   = randomInt(10000) / 10000;
        const raspon = rand > 0.95 ? [0, 1, 2, 3, 4] : (rand > 0.7 ? [0, 1, 2, 3] : [0, 1, 2]);
        raspon.forEach((i) => { noviSimboli[rLinija[i]] = dob; });
      }

      useSlotStore.getState().setSimboli(noviSimboli);

      for (let i = 0; i < 5; i++) {
        stupciAnims[i].stopAnimation();
        stupciAnims[i].setValue(-200);
        Animated.parallel([
          Animated.spring(stupciAnims[i], { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.timing(stupciBlurs[i], { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        await delay(stopDelay);
      }

      await delay(finalDelay);

      // Izračun dobitaka po linijama
      let ukupnoZlato = 0, ukupnoDijamanata = 0, ukupnoEnergije = 0, ukupnoStitova = 0;
      let resursiDobitak     = { drvo: 0, kamen: 0, zeljezo: 0 };
      let dobijenaPoljaPrivremena = [];
      let linijaDobitnih = 0;
      let jackpotLinija  = false;

      linije.forEach((linija) => {
        let targetSymbol = noviSimboli[linija[0]];
        if (targetSymbol === 'wild') {
          for (let i = 1; i < 5; i++) {
            if (noviSimboli[linija[i]] !== 'wild') { targetSymbol = noviSimboli[linija[i]]; break; }
          }
        }
        if (targetSymbol === 'skull') return;

        let consecutiveCount = 0;
        for (let i = 0; i < 5; i++) {
          if (noviSimboli[linija[i]] === targetSymbol || noviSimboli[linija[i]] === 'wild') {
            consecutiveCount++;
          } else {
            break;
          }
        }

        if (consecutiveCount >= 3) {
          linijaDobitnih++;
          const isAllWilds = targetSymbol === 'wild';
          const isJackpot  = consecutiveCount === 5;
          if (isJackpot) jackpotLinija = true;

          const detalji    = isAllWilds ? BLAGO['gem'] : BLAGO[targetSymbol];
          const multiplier = isJackpot ? 15 : (consecutiveCount === 4 ? 4 : 1);
          const jackpotBonus = isJackpot ? 2 : 1;
          dobijeniXp += (consecutiveCount * ulog * 3);

          if (targetSymbol === 'shield' && !isAllWilds) {
            ukupnoStitova += (ulog >= 10 ? 2 : 1) * (consecutiveCount - 2);
          } else if (targetSymbol === 'energy' && !isAllWilds) {
            ukupnoEnergije += Math.floor(detalji.baza * ulog * 0.5 * multiplier * prestigeMnozitelj * winStreakMultiplier * eventMnozitelj);
          } else if (targetSymbol === 'gem' || isAllWilds) {
            ukupnoDijamanata += Math.max(1, Math.floor((isAllWilds ? 5 : detalji.baza) * (ulog * 0.1) * multiplier * jackpotBonus * prestigeMnozitelj * winStreakMultiplier * eventMnozitelj));
          } else {
            const kolicina = Math.floor(detalji.baza * ulog * multiplier * jackpotBonus * (1 + (gs2.razine.pojacalo || 0) * 0.1) * prestigeMnozitelj * winStreakMultiplier * eventMnozitelj);
            if (targetSymbol === 'gold') ukupnoZlato += kolicina;
            else resursiDobitak[detalji.tip] += kolicina;
          }

          linija.slice(0, consecutiveCount).forEach((idx) => dobijenaPoljaPrivremena.push(idx));
        }
      });

      useGameStore.getState().dodajXp(dobijeniXp);

      const brojLubanja = noviSimboli.filter((s) => s === 'skull').length;

      if (dobijenaPoljaPrivremena.length > 0) {
        const jedinstvenaPolja = [...new Set(dobijenaPoljaPrivremena)];
        useSlotStore.getState().setDobitnaPolja(jedinstvenaPolja);
        animirajDobitak(jedinstvenaPolja);

        const noviWinStreak = gs2.winStreak + 1;
        useGameStore.setState({ winStreak: noviWinStreak });
        if (noviWinStreak >= 3) useGameStore.getState().azurirajMisiju('streak');

        useSlotStore.getState().setDobitakNaCekanju({
          zlato:     ukupnoZlato,
          dijamanti: ukupnoDijamanata,
          energija:  ukupnoEnergije,
          stitovi:   ukupnoStitova,
          drvo:      resursiDobitak.drvo,
          kamen:     resursiDobitak.kamen,
          zeljezo:   resursiDobitak.zeljezo,
          linije:    linijaDobitnih,
        });

        if (jackpotLinija) {
          _onFlash('rgba(255, 215, 0, 0.5)');
          _onShake();
          heavy();
          play('jackpot');
          useSlotStore.getState().setWinCelebration('jackpot');
          useGameStore.setState({ poruka: `🎰 JACKPOT! 5 U NIZU! 2× BONUS${gs2.winStreak > 0 ? ` + ${Math.round((winStreakMultiplier - 1) * 100)}% NIZ` : ''}! PREUZMI ILI DUPLAJ!` });
        } else if (noviWinStreak >= 3) {
          medium();
          play('win');
          useSlotStore.getState().setWinCelebration('win');
          useGameStore.setState({ poruka: `🔥 NIZ x${noviWinStreak}! +${Math.round((winStreakMultiplier - 1) * 100)}% BONUS! PREUZMI ILI DUPLAJ!` });
        } else {
          medium();
          play('win');
          useSlotStore.getState().setWinCelebration('win');
          useGameStore.setState({ poruka: 'DOBITAK! PREUZMI ILI DUPLAJ!' });
        }
      } else if (brojLubanja >= 3) {
        useGameStore.setState({ winStreak: 0 });
        _onShake();

        const gs3 = useGameStore.getState();
        let novaPoruka  = '';
        let noviStitovi = gs3.stitovi;

        if (gs3.stitovi <= 0) {
          _onFlash('rgba(255, 51, 0, 0.4)');
          hapticError();
          play('attack');
          const gubitakZlata = Math.floor(gs3.zlato * (0.05 * brojLubanja));
          useGameStore.setState((s) => ({ zlato: Math.max(0, s.zlato - gubitakZlata) }));
          noviStitovi = 0;

          const izgradeneINeostecene = ZGRADE.filter(
            (zg) => gs3.gradevine[zg.id] > 0 && !gs3.ostecenja[zg.id]
          );
          if (izgradeneINeostecene.length > 0) {
            const meta = izgradeneINeostecene[randomInt(izgradeneINeostecene.length)];
            useGameStore.setState((s) => ({ ostecenja: { ...s.ostecenja, [meta.id]: true } }));
            novaPoruka = `KATASTROFA! -${gubitakZlata} 🪙 I OŠTEĆEN(A) ${meta.naziv.toUpperCase()}!`;
          } else {
            novaPoruka = `NAPAD! ODUZETO ${gubitakZlata} 🪙`;
          }
          // Otvori modal za uzvratni napad na pravog igrača
          useSlotStore.getState().setRaidAktivan(true);
        } else {
          _onFlash('rgba(0, 212, 255, 0.4)');
          medium();
          play('attack');
          const steta = Math.min(gs3.stitovi, Math.floor(brojLubanja / 2) || 1);
          noviStitovi = gs3.stitovi - steta;
          novaPoruka  = `OBRANA AKTIVNA! -${steta} ŠTITA`;
        }

        useGameStore.setState({ stitovi: noviStitovi, poruka: novaPoruka });

        const skullP = noviSimboli.map((v, i) => (v === 'skull' ? i : null)).filter((v) => v !== null);
        useSlotStore.getState().setDobitnaPolja(skullP);
        animirajDobitak(skullP);
      } else {
        useGameStore.setState({ winStreak: 0, poruka: 'NEMA DOBITKA. POKUŠAJ PONOVO.' });
      }
    } finally {
      spinLoopsRef.current.forEach((a) => a?.stop?.());
      spinLoopsRef.current = [];
      useSlotStore.getState().setVrti(false);
    }
  };

  return {
    stupciAnims,
    stupciBlurs,
    winScaleAnims,
    zavrtiMasinu,
    preuzmiDobitak,
    igrajGamble,
  };
};
