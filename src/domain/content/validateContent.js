const isArray = (v) => Array.isArray(v);

export const validateGameContent = ({
  BAZA_MISIJA,
  DOSTIGNUCA,
  JUNACI,
  RECEPTI,
  TURNIR_RAZINE,
  SANDUK_TIPOVI,
  TAMNICA_NEPRIJATELJI,
  TAMNICA_BOSSOVI,
}) => {
  const errors = [];

  if (!isArray(BAZA_MISIJA) || BAZA_MISIJA.length === 0) errors.push('BAZA_MISIJA invalid');
  if (!isArray(DOSTIGNUCA) || DOSTIGNUCA.length === 0) errors.push('DOSTIGNUCA invalid');
  if (!isArray(JUNACI) || JUNACI.length === 0) errors.push('JUNACI invalid');
  if (!isArray(RECEPTI) || RECEPTI.length === 0) errors.push('RECEPTI invalid');
  if (!isArray(TURNIR_RAZINE) || TURNIR_RAZINE.length === 0) errors.push('TURNIR_RAZINE invalid');
  if (!isArray(SANDUK_TIPOVI) || SANDUK_TIPOVI.length === 0) errors.push('SANDUK_TIPOVI invalid');
  if (!isArray(TAMNICA_NEPRIJATELJI) || TAMNICA_NEPRIJATELJI.length === 0) errors.push('TAMNICA_NEPRIJATELJI invalid');
  if (!isArray(TAMNICA_BOSSOVI) || TAMNICA_BOSSOVI.length === 0) errors.push('TAMNICA_BOSSOVI invalid');

  const duplicateMissionTips = isArray(BAZA_MISIJA)
    ? BAZA_MISIJA.map((m) => m?.tip).filter(Boolean)
    : [];
  if (duplicateMissionTips.length === 0) errors.push('BAZA_MISIJA has no valid tip values');

  return { ok: errors.length === 0, errors };
};
