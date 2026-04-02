// Ekonomske formule — izvedene vrijednosti koje ovise o razinama igrača.
import { JUNACI } from '../config/constants';
// Izvučene ovdje kako bi bile lako testabilne i višekratno upotrebljive.

/**
 * Maksimalna energija igrača. Bazna: 100, +50 po razini baterije.
 * @param {number} baterija - razina nadogradnje baterije (0+)
 * @returns {number}
 */
export const izracunajMaxEnergiju = (baterija) =>
  100 + (baterija * 50);

/**
 * Maksimalni broj štitova. Bazni: 1, +1 po razini oklopa.
 * @param {number} oklop - razina nadogradnje oklopa (0+)
 * @returns {number}
 */
export const izracunajMaxStitova = (oklop) =>
  1 + oklop;

/**
 * Šansa za dobitak na automatu. Bazna: 25%, +3% po razini sreće.
 * @param {number} sreca - razina nadogradnje sreće (0+)
 * @returns {number} vrijednost između 0 i 1
 */
export const izracunajSansuZaDobitak = (sreca) =>
  0.25 + (sreca * 0.03);

/**
 * XP potreban za sljedeću razinu. Raste eksponencijalno (x1.3 po razini).
 * @param {number} razina - trenutna razina igrača (1+)
 * @returns {number}
 */
export const izracunajPotrebniXp = (razina) =>
  Math.floor(100 * Math.pow(1.3, razina - 1));

/**
 * Prestige množitelj — trajni bonus nakon svake krunidbe.
 * Bazni: 1.0, +0.35 po prestige razini (ranije 0.5 — uravnoteženo).
 * @param {number} prestige - prestige razina (0+)
 * @returns {number}
 */
export const izracunajPrestigeMnozitelj = (prestige) =>
  1 + (prestige * 0.35);

/**
 * Ukupni pasivni množitelj za produkciju zgrada.
 * Kombinira bonus razine igrača (+5% po razini) i prestige množitelj.
 * @param {number} igracRazina - razina igrača (1+)
 * @param {number} prestigeRazina - prestige razina (0+)
 * @returns {number}
 */
export const izracunajPasivniMnozitelj = (igracRazina, prestigeRazina) =>
  (1 + (igracRazina * 0.05)) * izracunajPrestigeMnozitelj(prestigeRazina);

/**
 * Zbroji bonus za određeni tip od svih aktivnih junaka.
 * @param {Object} junaci       - mapa heroId → { razina }
 * @param {string[]} aktivni    - niz aktivnih hero ID-ova
 * @param {string} tip          - 'zlato' | 'energija' | 'pasivno' | 'stit' | 'luck' | 'xp'
 * @returns {number}             - ukupna vrijednost bonusa (postotak ili flat)
 */
export const izracunajHeroBonus = (junaci = {}, aktivni = [], tip) => {
  let ukupno = 0;
  aktivni.forEach((heroId) => {
    const stanje = junaci[heroId];
    if (!stanje || stanje.razina <= 0) return;
    const def = JUNACI.find((h) => h.id === heroId);
    if (!def || def.tipBonusa !== tip) return;
    ukupno += def.bonusPoRazini * stanje.razina;
  });
  return ukupno;
};
