// Opće pomoćne funkcije koje ne spadaju u ekonomiku ni konstante.

export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const secureRandom01 = () => {
  if (typeof globalThis?.crypto?.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] / 0x100000000;
  }
  return Math.random();
};

export const randomChance = (chance) => secureRandom01() < chance;

export const randomInt = (maxExclusive) => {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
  return Math.floor(secureRandom01() * maxExclusive);
};

export const shuffle = (list) => {
  const arr = Array.isArray(list) ? [...list] : [];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
