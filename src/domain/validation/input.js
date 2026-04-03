const CLAN_NAME_REGEX = /^[\p{L}\p{N}\s_-]{2,50}$/u;
const PLAYER_NAME_REGEX = /^[\p{L}\p{N}\s_.-]{2,24}$/u;

export const sanitizeWhitespace = (value = '') => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
};

export const sanitizeClanName = (value = '') => {
  const cleaned = sanitizeWhitespace(value);
  if (!CLAN_NAME_REGEX.test(cleaned)) return null;
  return cleaned;
};

export const sanitizePlayerName = (value = '') => {
  const cleaned = sanitizeWhitespace(value);
  if (!PLAYER_NAME_REGEX.test(cleaned)) return null;
  return cleaned;
};
