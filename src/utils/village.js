import {
  JUNACI,
  VILLAGE_INCIDENT_TYPES,
  VILLAGE_LAYOUT,
  VILLAGE_ROOM_TYPES,
} from '../config/constants';

const LEGACY_ROOM_TYPES = new Set(['pilana', 'kamenolom', 'rudnik']);

const ROOM_BONUS_BY_HERO_TYPE = {
  pasivno: 14,
  energija: 10,
  stit: 8,
  zlato: 9,
  luck: 7,
  xp: 7,
};

const buildFallbackRoom = (slot, gradevine = {}, ostecenja = {}) => {
  const type = slot.defaultType ?? null;
  const level = type ? Math.max(0, Number(gradevine[type]) || 0) : 0;
  const damaged = type ? !!ostecenja[type] : false;

  return {
    id: slot.id,
    floor: slot.floor,
    column: slot.column,
    label: slot.label,
    type,
    level,
    assignedHeroId: null,
    status: !type ? 'planned' : level > 0 ? (damaged ? 'damaged' : 'active') : 'planned',
    health: level > 0 ? (damaged ? 0 : 100) : 100,
    unlocked: true,
  };
};

export const getHeroDefinition = (heroId) =>
  JUNACI.find((hero) => hero.id === heroId) ?? null;

export const getVillageRoomDefinition = (roomOrType) => {
  const type = typeof roomOrType === 'string' ? roomOrType : roomOrType?.type;
  return type ? VILLAGE_ROOM_TYPES[type] ?? null : null;
};

export const createLegacyVillageRooms = (gradevine = {}, ostecenja = {}) =>
  VILLAGE_LAYOUT.map((slot) => buildFallbackRoom(slot, gradevine, ostecenja));

export const normalizeVillageRooms = (rooms = [], gradevine = {}, ostecenja = {}) => {
  const fallbackRooms = createLegacyVillageRooms(gradevine, ostecenja);
  const savedById = new Map(Array.isArray(rooms) ? rooms.map((room) => [room.id, room]) : []);
  const assignedHeroes = new Set();

  return fallbackRooms.map((fallbackRoom) => {
    const saved = savedById.get(fallbackRoom.id) ?? {};
    const type = saved.type !== undefined ? saved.type : fallbackRoom.type;
    const hasDefinition = !!getVillageRoomDefinition(type);
    const level = hasDefinition ? Math.max(0, Number(saved.level ?? fallbackRoom.level) || 0) : 0;
    let assignedHeroId = level > 0 ? (saved.assignedHeroId ?? null) : null;

    if (assignedHeroId && assignedHeroes.has(assignedHeroId)) assignedHeroId = null;
    if (assignedHeroId) assignedHeroes.add(assignedHeroId);

    return {
      ...fallbackRoom,
      ...saved,
      type: hasDefinition ? type : fallbackRoom.type,
      level,
      assignedHeroId,
      status: level <= 0
        ? 'planned'
        : saved.status === 'repairing'
          ? 'repairing'
          : saved.status === 'damaged'
            ? 'damaged'
            : 'active',
      health: saved.status === 'damaged' ? 0 : (saved.status === 'repairing' ? 35 : 100),
      incidentType: saved.incidentType ?? null,
      incidentStartedAt: saved.incidentStartedAt ?? null,
      repairEndsAt: saved.repairEndsAt ?? null,
      unlocked: saved.unlocked ?? fallbackRoom.unlocked,
    };
  });
};

export const createLegacyBuildingStateFromRooms = (rooms = []) => {
  const gradevine = { pilana: 0, kamenolom: 0, rudnik: 0 };
  const ostecenja = { pilana: false, kamenolom: false, rudnik: false };

  rooms.forEach((room) => {
    if (!room?.type || !LEGACY_ROOM_TYPES.has(room.type)) return;
    gradevine[room.type] = Math.max(0, Number(room.level) || 0);
    ostecenja[room.type] = room.status === 'damaged' || room.status === 'repairing';
  });

  return { gradevine, ostecenja };
};

const getBaseRoomAssignmentBonusPct = (junaci = {}, room) => {
  if (!room?.assignedHeroId) return 0;
  const heroState = junaci[room.assignedHeroId];
  const heroDefinition = getHeroDefinition(room.assignedHeroId);
  if (!heroState || !heroDefinition || heroState.razina <= 0) return 0;

  let perLevel = ROOM_BONUS_BY_HERO_TYPE[heroDefinition.tipBonusa] ?? 6;
  const roomDefinition = getVillageRoomDefinition(room);
  if (roomDefinition?.idealHeroBonuses?.includes(heroDefinition.tipBonusa)) perLevel += 3;

  return heroState.razina * perLevel;
};

const getBaseRoomAssignmentMultiplier = (junaci = {}, room) =>
  1 + (getBaseRoomAssignmentBonusPct(junaci, room) / 100);

export const getRoomAssignmentBonusPct = (junaci = {}, room, supportStats = null) => {
  const baseBonusPct = getBaseRoomAssignmentBonusPct(junaci, room);
  if (!baseBonusPct) return 0;

  const crewBoostPct = Math.max(0, supportStats?.crewBonusPct ?? 0);
  return Math.round(baseBonusPct * (1 + (crewBoostPct / 100)) * 10) / 10;
};

export const getRoomAssignmentMultiplier = (junaci = {}, room, supportStats = null) =>
  1 + (getRoomAssignmentBonusPct(junaci, room, supportStats) / 100);

export const isSupportRoom = (roomOrType) =>
  getVillageRoomDefinition(roomOrType)?.kind === 'support';

export const getVillageIncidentDefinition = (incidentType) =>
  incidentType ? VILLAGE_INCIDENT_TYPES[incidentType] ?? null : null;

export const getVillageActiveSupportRoom = (state, supportType) => {
  const rooms = normalizeVillageRooms(state.villageRooms, state.gradevine, state.ostecenja);
  return rooms.find((room) => room.type === supportType && room.level > 0 && room.status === 'active') ?? null;
};

export const getVillageProgressStats = (state) => {
  const rooms = normalizeVillageRooms(state.villageRooms, state.gradevine, state.ostecenja);

  return {
    productionLevels: rooms.reduce((sum, room) => {
      const roomDefinition = getVillageRoomDefinition(room);
      return roomDefinition?.kind === 'production' ? sum + (room.level || 0) : sum;
    }, 0),
    supportLevels: rooms.reduce((sum, room) => {
      const roomDefinition = getVillageRoomDefinition(room);
      return roomDefinition?.kind === 'support' ? sum + (room.level || 0) : sum;
    }, 0),
    heroCount: Object.values(state.junaci || {}).filter((heroState) => (heroState?.razina ?? 0) > 0).length,
    prestigeLevel: Math.max(0, Number(state.prestigeRazina) || 0),
  };
};

export const getVillageRoomUnlockStatus = (roomOrType, state) => {
  const room = typeof roomOrType === 'string' ? { type: roomOrType, level: 0 } : roomOrType;
  const roomDefinition = getVillageRoomDefinition(room);

  if (!roomDefinition) {
    return {
      unlocked: false,
      shortLabel: 'Dolazi kasnije',
      requirementText: 'Ovaj modul dolazi u kasnijem milestoneu.',
    };
  }

  if ((room?.level || 0) > 0 || !roomDefinition.unlockRules) {
    return {
      unlocked: true,
      shortLabel: roomDefinition.unlockLabel ?? 'Otključano',
      requirementText: null,
    };
  }

  const stats = getVillageProgressStats(state);
  const missingRequirements = [];

  if ((roomDefinition.unlockRules.productionLevels ?? 0) > stats.productionLevels) {
    missingRequirements.push(`ukupno ${roomDefinition.unlockRules.productionLevels} razine proizvodnih soba`);
  }
  if ((roomDefinition.unlockRules.supportLevels ?? 0) > stats.supportLevels) {
    missingRequirements.push(`ukupno ${roomDefinition.unlockRules.supportLevels} razine podrške`);
  }
  if ((roomDefinition.unlockRules.heroCount ?? 0) > stats.heroCount) {
    missingRequirements.push(`${roomDefinition.unlockRules.heroCount} otključana junaka`);
  }
  if ((roomDefinition.unlockRules.prestigeLevel ?? 0) > stats.prestigeLevel) {
    missingRequirements.push(`Prestige ${roomDefinition.unlockRules.prestigeLevel}`);
  }

  return {
    unlocked: missingRequirements.length === 0,
    shortLabel: roomDefinition.unlockLabel ?? 'Otključaj kasnije',
    requirementText: missingRequirements.length
      ? `Za otključavanje treba ${missingRequirements.join(' i ')}`
      : null,
  };
};

export const getVillageSupportStats = (state) => {
  const rooms = normalizeVillageRooms(state.villageRooms, state.gradevine, state.ostecenja);

  return rooms.reduce((acc, room) => {
    const roomDefinition = getVillageRoomDefinition(room);
    if (!roomDefinition || roomDefinition.kind !== 'support' || room.level <= 0 || room.status !== 'active') return acc;

    const supportEffect = roomDefinition.supportEffect ?? {};
    const assignmentMultiplier = getBaseRoomAssignmentMultiplier(state.junaci, room);
    const effectWeight = room.level * assignmentMultiplier;

    acc.villageProductionPct += (supportEffect.villageProductionPct ?? 0) * effectWeight;
    acc.incidentRiskPct += (supportEffect.incidentRiskPct ?? 0) * effectWeight;
    acc.repairTimePct += (supportEffect.repairTimePct ?? 0) * effectWeight;
    acc.repairCostPct += (supportEffect.repairCostPct ?? 0) * effectWeight;
    acc.crewBonusPct += (supportEffect.crewBonusPct ?? 0) * effectWeight;
    acc.maxEnergyFlat += (supportEffect.maxEnergyFlat ?? 0) * effectWeight;
    return acc;
  }, {
    villageProductionPct: 0,
    incidentRiskPct: 0,
    repairTimePct: 0,
    repairCostPct: 0,
    crewBonusPct: 0,
    maxEnergyFlat: 0,
  });
};

export const getVillageIncidentResponse = (room, state) => {
  const incidentDefinition = getVillageIncidentDefinition(room?.incidentType);
  const responseDefinition = incidentDefinition?.response;
  if (!responseDefinition) return null;

  const requiredSupportType = responseDefinition.requiresSupportType ?? null;
  const requiredSupportRoom = requiredSupportType ? getVillageActiveSupportRoom(state, requiredSupportType) : null;
  const requiredSupportDefinition = requiredSupportType ? getVillageRoomDefinition(requiredSupportType) : null;
  const supportStats = getVillageSupportStats(state);
  const reduction = Math.min(0.45, (supportStats.repairCostPct ?? 0) / 100);
  const level = Math.max(1, Number(room?.level) || 1);
  const baseCost = responseDefinition.cost ?? {};
  const baseReward = responseDefinition.reward ?? {};

  const reward = {
    zlato: Math.max(0, Math.floor((baseReward.zlato ?? 0) + (level * (baseReward.zlatoPoLv ?? 0)))),
    drvo: Math.max(0, Math.floor((baseReward.drvo ?? 0) + (level * (baseReward.drvoPoLv ?? 0)))),
    kamen: Math.max(0, Math.floor((baseReward.kamen ?? 0) + (level * (baseReward.kamenPoLv ?? 0)))),
    zeljezo: Math.max(0, Math.floor((baseReward.zeljezo ?? 0) + (level * (baseReward.zeljezoPoLv ?? 0)))),
    energija: Math.max(0, Math.floor((baseReward.energija ?? 0) + (level * (baseReward.energijaPoLv ?? 0)))),
    stitovi: Math.max(0, Math.floor((baseReward.stitovi ?? 0))),
  };

  const effectParts = [];
  if (reward.zlato > 0) effectParts.push(`+${reward.zlato}🪙`);
  if (reward.energija > 0) effectParts.push(`+${reward.energija}⚡`);
  if (reward.stitovi > 0) effectParts.push(`+${reward.stitovi}🛡️`);
  if (reward.drvo > 0) effectParts.push(`+${reward.drvo}🌲`);
  if (reward.kamen > 0) effectParts.push(`+${reward.kamen}⛰️`);
  if (reward.zeljezo > 0) effectParts.push(`+${reward.zeljezo}⛏️`);

  return {
    ...responseDefinition,
    available: !requiredSupportType || !!requiredSupportRoom,
    requiredSupportType,
    requiredSupportName: requiredSupportDefinition?.naziv ?? null,
    requirementText: requiredSupportDefinition
      ? `Za ovu intervenciju treba aktivna soba ${requiredSupportDefinition.naziv}.`
      : null,
    cost: {
      zlato: Math.max(0, Math.floor(((baseCost.zlato ?? 0) + (level * (baseCost.zlatoPoLv ?? 0))) * (1 - reduction))),
      drvo: Math.max(0, Math.floor(((baseCost.drvo ?? 0) + (level * (baseCost.drvoPoLv ?? 0))) * (1 - reduction))),
      kamen: Math.max(0, Math.floor(((baseCost.kamen ?? 0) + (level * (baseCost.kamenPoLv ?? 0))) * (1 - reduction))),
      zeljezo: Math.max(0, Math.floor(((baseCost.zeljezo ?? 0) + (level * (baseCost.zeljezoPoLv ?? 0))) * (1 - reduction))),
      energija: Math.max(0, Math.floor((baseCost.energija ?? 0) + (level * (baseCost.energijaPoLv ?? 0)))),
      stitovi: Math.max(0, Math.floor(baseCost.stitovi ?? 0)),
    },
    reward,
    durationMs: responseDefinition.durationFactor
      ? Math.max(15000, Math.round(getVillageRepairDurationMs(room, state) * responseDefinition.durationFactor))
      : 0,
    effectText: effectParts.length ? `Povrat: ${effectParts.join(' · ')}` : responseDefinition.rewardText ?? null,
  };
};

export const getVillageProduction = (state, globalMultiplier) => {
  const totals = { drvo: 0, kamen: 0, zeljezo: 0 };
  const rooms = normalizeVillageRooms(state.villageRooms, state.gradevine, state.ostecenja);
  const supportStats = getVillageSupportStats(state);
  const effectiveMultiplier = globalMultiplier * (1 + (supportStats.villageProductionPct / 100));

  rooms.forEach((room) => {
    const roomDefinition = getVillageRoomDefinition(room);
    if (!roomDefinition || roomDefinition.kind !== 'production' || room.level <= 0 || room.status !== 'active') return;

    totals[roomDefinition.resourceKey] +=
      room.level
      * roomDefinition.baseProduction
      * effectiveMultiplier
      * getRoomAssignmentMultiplier(state.junaci, room, supportStats);
  });

  return totals;
};

export const getVillageRepairDurationMs = (room, state) => {
  const incidentDefinition = getVillageIncidentDefinition(room?.incidentType);
  const supportStats = getVillageSupportStats(state);
  const baseDurationMs = (incidentDefinition?.repairBaseSec ?? 90) * 1000;
  const reduction = Math.min(0.6, (supportStats.repairTimePct ?? 0) / 100);
  return Math.max(25000, Math.round(baseDurationMs * (1 - reduction)));
};

export const getVillageRepairCost = (room, state) => {
  const roomDefinition = getVillageRoomDefinition(room);
  const incidentDefinition = getVillageIncidentDefinition(room?.incidentType);
  const supportStats = getVillageSupportStats(state);
  const costMultiplier = incidentDefinition?.costMultiplier ?? 1;
  const reduction = Math.min(0.55, (supportStats.repairCostPct ?? 0) / 100);
  const level = Math.max(1, Number(room?.level) || 1);
  const isSupport = roomDefinition?.kind === 'support';

  const base = {
    zlato: Math.floor((70 + (level * 55)) * costMultiplier),
    drvo: Math.floor((isSupport ? 10 : 16 + (level * 5)) * costMultiplier),
    kamen: Math.floor((18 + (level * 7)) * costMultiplier),
    zeljezo: Math.floor((isSupport ? 10 : 14 + (level * 4)) * costMultiplier),
    energija: room?.incidentType === 'upad' ? 4 : 2,
  };

  return {
    zlato: Math.max(25, Math.floor(base.zlato * (1 - reduction))),
    drvo: Math.max(0, Math.floor(base.drvo * (1 - reduction))),
    kamen: Math.max(0, Math.floor(base.kamen * (1 - reduction))),
    zeljezo: Math.max(0, Math.floor(base.zeljezo * (1 - reduction))),
    energija: base.energija,
  };
};

export const getHeroAssignedRoom = (rooms = [], heroId) =>
  rooms.find((room) => room.assignedHeroId === heroId) ?? null;

export const getFirstVillageRoomId = (rooms = []) =>
  rooms.find((room) => room.type && room.level > 0)?.id
  ?? rooms.find((room) => room.type)?.id
  ?? rooms[0]?.id
  ?? null;

export const getVillageIncidentRoom = (rooms = []) =>
  rooms.find((room) => room.type && room.level > 0 && (room.status === 'damaged' || room.status === 'repairing')) ?? null;
