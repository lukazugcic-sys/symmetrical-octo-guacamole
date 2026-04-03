const isArray = (v) => Array.isArray(v);

export const validateGameContent = ({
  BAZA_MISIJA,
  DOSTIGNUCA,
}) => {
  const errors = [];

  if (!isArray(BAZA_MISIJA) || BAZA_MISIJA.length === 0) errors.push('BAZA_MISIJA invalid');
  if (!isArray(DOSTIGNUCA) || DOSTIGNUCA.length === 0) errors.push('DOSTIGNUCA invalid');

  const missionTips = isArray(BAZA_MISIJA)
    ? BAZA_MISIJA.map((m) => m?.tip).filter(Boolean)
    : [];
  if (missionTips.length === 0) errors.push('BAZA_MISIJA has no valid tip values');

  return { ok: errors.length === 0, errors };
};
