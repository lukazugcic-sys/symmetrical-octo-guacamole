/**
 * src/config/sezonalniDogadaji.js
 *
 * Definicija sezonalnih događaja.
 * Svaki događaj ima:
 *   id, naziv, emodzi, boja, opis
 *   pocetakMjesec/Dan, krajMjesec/Dan (1-indeksirano, year-wrap podržan)
 *   modifikatorBlaga  — { symbolKey: multiplier } za težinski pool simbola
 *   bonusMnozitelj    — globalni množitelj dobitka za trajanja događaja
 */

export const SEZONALNI_DOGADAJI = [
  {
    id:    'halloween',
    naziv: 'Noć Vještica',
    emodzi: '🎃',
    boja:   '#F97316',
    opis:   'Lubanje napadaju češće, ali jackpot je dvostruk!',
    pocetakMjesec: 10, pocetakDan: 15,
    krajMjesec:    10, krajDan:    31,
    modifikatorBlaga: { skull: 2.5, gem: 1.8, gold: 0.7 },
    bonusMnozitelj: 2.0,
  },
  {
    id:    'bozic',
    naziv: 'Božićni Festival',
    emodzi: '🎄',
    boja:   '#22C55E',
    opis:   'Više drva, manje teškoća. Vesele igre!',
    pocetakMjesec: 12, pocetakDan: 20,
    krajMjesec:    1,  krajDan:    5,
    modifikatorBlaga: { wood: 2.5, gold: 1.5, skull: 0.3 },
    bonusMnozitelj: 1.5,
  },
  {
    id:    'nova_godina',
    naziv: 'Nova Godina',
    emodzi: '🎆',
    boja:   '#E879F9',
    opis:   'Dijamantska kiša! Bonus dijamanti na svakom dobitku.',
    pocetakMjesec: 12, pocetakDan: 30,
    krajMjesec:    1,  krajDan:    3,
    modifikatorBlaga: { gem: 2.5, gold: 1.8, skull: 0.4 },
    bonusMnozitelj: 2.0,
  },
  {
    id:    'ljeto',
    naziv: 'Ljetni Festival',
    emodzi: '☀️',
    boja:   '#FBBF24',
    opis:   'Zlatna sezona — više zlata i energije!',
    pocetakMjesec: 7, pocetakDan: 1,
    krajMjesec:    7, krajDan:    31,
    modifikatorBlaga: { gold: 2.0, energy: 1.8 },
    bonusMnozitelj: 1.25,
  },
];

/**
 * Vrati aktivni sezonalni događaj za zadani datum, ili null.
 * @param {Date} datum
 * @returns {object|null}
 */
export const dohvatiAktivniDogadaj = (datum = new Date()) => {
  const mj  = datum.getMonth() + 1; // 1-12
  const dan = datum.getDate();       // 1-31

  for (const d of SEZONALNI_DOGADAJI) {
    const { pocetakMjesec: pm, pocetakDan: pd, krajMjesec: km, krajDan: kd } = d;

    // Prolazi li raspon godišnju granicu (npr. prosinac → siječanj)?
    const premostujeGodinu = pm > km || (pm === km && pd > kd);

    let aktivan;
    if (premostujeGodinu) {
      // Aktivan ako je NAKON početka ILI PRIJE kraja
      aktivan = (mj > pm || (mj === pm && dan >= pd)) ||
                (mj < km || (mj === km && dan <= kd));
    } else {
      aktivan = (mj > pm || (mj === pm && dan >= pd)) &&
                (mj < km || (mj === km && dan <= kd));
    }

    if (aktivan) return d;
  }
  return null;
};
