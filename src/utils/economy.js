// Ekonomske formule — izvedene vrijednosti koje ovise o razinama igrača.
// Izvučene ovdje kako bi bile lako testabilne i višekratno upotrebljive.

export const izracunajMaxEnergiju = (baterija) =>
  100 + (baterija * 50);

export const izracunajMaxStitova = (oklop) =>
  1 + oklop;

export const izracunajSansuZaDobitak = (sreca) =>
  0.25 + (sreca * 0.03);

export const izracunajPotrebniXp = (razina) =>
  Math.floor(100 * Math.pow(1.3, razina - 1));

export const izracunajPrestigeMnozitelj = (prestige) =>
  1 + (prestige * 0.5);

export const izracunajPasivniMnozitelj = (igracRazina, prestigeRazina) =>
  (1 + (igracRazina * 0.05)) * izracunajPrestigeMnozitelj(prestigeRazina);
