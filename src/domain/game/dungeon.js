import {
  TAMNICA_BOSSOVI,
  TAMNICA_IGRAC_MAX_HP,
  TAMNICA_NEPRIJATELJI,
  TAMNICA_SHOP,
} from '../../config/constants';

export const setupDungeonFloor = (sprat, snagaRazina = 0, obranaRazina = 0) => {
  const tierIndex = Math.min(Math.floor((sprat - 1) / 3), TAMNICA_NEPRIJATELJI.length - 1);
  const nep = TAMNICA_NEPRIJATELJI[tierIndex];
  const isBoss = sprat % 5 === 0;
  const scaleMult = 1 + (sprat - 1) * 0.25;
  let hp = Math.ceil(nep.bazaHp * scaleMult);
  let bossData = null;

  if (isBoss) {
    const defined = TAMNICA_BOSSOVI.find((b) => b.sprat === sprat);
    const last = TAMNICA_BOSSOVI[TAMNICA_BOSSOVI.length - 1];
    bossData = defined ?? {
      ...last,
      hpMnozac: last.hpMnozac + (sprat - last.sprat) * 0.1,
      napadMnozac: last.napadMnozac + (sprat - last.sprat) * 0.05,
      bonus: {
        zlato: Math.floor(last.bonus.zlato * (1 + (sprat - last.sprat) * 0.15)),
        dijamanti: Math.floor(last.bonus.dijamanti * (1 + (sprat - last.sprat) * 0.1)),
        tokenovi: Math.floor(last.bonus.tokenovi * (1 + (sprat - last.sprat) * 0.1)),
      },
    };
    hp = Math.ceil(hp * bossData.hpMnozac);
  }

  const igracMaxHp = TAMNICA_IGRAC_MAX_HP + obranaRazina * TAMNICA_SHOP[1].bonusPoRazini;
  return { hp, nep, bossData, isBoss, tierIndex, igracMaxHp };
};
