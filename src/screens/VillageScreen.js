import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  AlertTriangle,
  Coins,
  Crown,
  Mountain,
  Pickaxe,
  Shield,
  TreePine,
  Users,
  Zap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';
import { useSlotStore } from '../store/slotStore';
import {
  BOJE,
  FONT_FAMILY,
  JUNACI,
  uiScale,
  VILLAGE_LAYOUT,
  VILLAGE_PRESSURE_PHASES,
  ZGRADE,
} from '../config/constants';
import { dohvatiRaidPovijest } from '../firebase/raids';
import {
  getFirstVillageRoomId,
  getHeroAssignedRoom,
  getHeroDefinition,
  getVillageIncidentDefinition,
  getVillageIncidentResponse,
  getRoomAssignmentBonusPct,
  getRoomAssignmentMultiplier,
  getVillageIncidentRoom,
  getVillageRoomUnlockStatus,
  getVillageProduction,
  getVillageRepairCost,
  getVillageRepairDurationMs,
  getVillageRoomDefinition,
  getVillageSupportStats,
  isSupportRoom,
  normalizeVillageRooms,
} from '../utils/village';
import { izracunajHeroBonus, izracunajMaxEnergiju, izracunajPasivniMnozitelj } from '../utils/economy';

const ICON_BY_TYPE = {
  pilana: TreePine,
  kamenolom: Mountain,
  rudnik: Pickaxe,
  servis: Shield,
  zapovjednistvo: Crown,
  jezgra: Zap,
};

const statusMeta = (room, unlockStatus = null) => {
  if (!room?.type) return { label: 'Kasnije', tone: BOJE.textMuted };
  if (unlockStatus && !unlockStatus.unlocked && room.level <= 0) return { label: 'Zaključana', tone: BOJE.prestige };
  if (room.status === 'damaged') return { label: 'Prekid rada', tone: BOJE.slotVatra };
  if (room.status === 'repairing') return { label: 'U popravku', tone: BOJE.misije };
  if (room.level <= 0) return { label: 'Spremno za gradnju', tone: BOJE.textMuted };
  return { label: 'Aktivna soba', tone: BOJE.xp };
};

const formatRate = (value) => `+${value >= 10 ? value.toFixed(0) : value.toFixed(1)}/s`;
const formatCountdown = (ms) => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
};

const clampPct = (value) => Math.max(0, Math.min(100, Math.round(value)));

const getVillagePrestigeStage = (prestigeRazina) => {
  if (prestigeRazina >= 5) {
    return {
      label: 'Jezgrena citadela',
      accentColor: BOJE.energija,
      copy: 'Naselje više ne izgleda privremeno. Jezgra, zapovjedne linije i svjetlosni potpis sela postaju trajni dio identiteta.',
      progressPct: 100,
      progressLabel: 'Završna transformacija sela je dosegnuta.',
      groundLabel: 'Industrijska jezgra',
      supportLabel: 'Citadelni prsten',
    };
  }

  if (prestigeRazina >= 3) {
    return {
      label: 'Zapovjedna utvrda',
      accentColor: BOJE.prestige,
      copy: 'Selo više djeluje organizirano i obranjivo. Gornja etaža nosi sve više težine u ritmu naselja.',
      progressPct: clampPct(((prestigeRazina - 3) / 2) * 100),
      progressLabel: 'Prestige V otvara jezgrenu citadelu i završni vizualni sloj sela.',
      groundLabel: 'Utvrđene radionice',
      supportLabel: 'Zapovjedni kat',
    };
  }

  if (prestigeRazina >= 1) {
    return {
      label: 'Ojačano naselje',
      accentColor: BOJE.klan,
      copy: 'Prvi prestige više nije samo broj. Selo počinje djelovati kao trajna baza, a ne kao privremeni kamp.',
      progressPct: clampPct(((prestigeRazina - 1) / 2) * 100),
      progressLabel: 'Prestige III otvara sljedeći veliki vizualni skok sela.',
      groundLabel: 'Ojačane smjene',
      supportLabel: 'Organizirana galerija',
    };
  }

  return {
    label: 'Pogranično selo',
    accentColor: BOJE.drvo,
    copy: 'Drvene grede, otvorene smjene i krhka infrastruktura. Sve još izgleda kao privremeno naselje koje tek traži svoju formu.',
    progressPct: 0,
    progressLabel: 'Prvi prestige otvara prvu trajnu transformaciju sela.',
    groundLabel: 'Drvene radionice',
    supportLabel: 'Privremena galerija',
  };
};

const getVillageVisualTheme = (prestigeRazina) => {
  if (prestigeRazina >= 5) {
    return {
      shell: {
        surface: '#0E1622',
        border: `${BOJE.energija}44`,
        glow: 'rgba(163,230,53,0.10)',
        plate: 'rgba(163,230,53,0.09)',
        beam: 'rgba(252,211,77,0.10)',
        materialLabel: 'Kompozitni okvir · energetske šine',
        copy: 'Katovi su sada spojeni u tvrdu citadelu s vodljivim pragovima i jasnim energetskim vodovima.',
        tags: ['Kompozit', 'Oklop', 'Jezgra'],
      },
      floors: {
        0: {
          accent: BOJE.zeljezo,
          border: 'rgba(203,213,225,0.18)',
          surface: 'rgba(203,213,225,0.07)',
          rail: 'rgba(203,213,225,0.12)',
          brace: 'rgba(255,255,255,0.08)',
          materialLabel: 'Oklopne ploče · sidreni kanali',
          productionFrameLabel: 'Oklopni prag',
          supportFrameLabel: 'Tehnički okvir',
          emptyFrameLabel: 'Tvrda niša',
          surfaceLabel: 'Vodljiva podnica',
          roomSurface: 'rgba(255,255,255,0.04)',
          roomBorder: 'rgba(203,213,225,0.14)',
        },
        1: {
          accent: BOJE.energija,
          border: 'rgba(163,230,53,0.24)',
          surface: 'rgba(163,230,53,0.08)',
          rail: 'rgba(163,230,53,0.14)',
          brace: 'rgba(252,211,77,0.10)',
          materialLabel: 'Jezgrene šine · citadelni prsten',
          productionFrameLabel: 'Radijalni prag',
          supportFrameLabel: 'Jezgreni okvir',
          emptyFrameLabel: 'Citadelna niša',
          surfaceLabel: 'Energetski most',
          roomSurface: 'rgba(163,230,53,0.04)',
          roomBorder: 'rgba(163,230,53,0.18)',
        },
      },
    };
  }

  if (prestigeRazina >= 3) {
    return {
      shell: {
        surface: '#101522',
        border: `${BOJE.prestige}40`,
        glow: 'rgba(252,211,77,0.09)',
        plate: 'rgba(252,211,77,0.08)',
        beam: 'rgba(56,189,248,0.10)',
        materialLabel: 'Zakivene galerije · signalni pragovi',
        copy: 'Drvo je gotovo nestalo iz okvira. Selo sada djeluje planski, s tvrdim mostovima i jasnim zapovjednim linijama.',
        tags: ['Zakovice', 'Mostovi', 'Signal'],
      },
      floors: {
        0: {
          accent: BOJE.kamen,
          border: 'rgba(148,163,184,0.18)',
          surface: 'rgba(148,163,184,0.06)',
          rail: 'rgba(148,163,184,0.12)',
          brace: 'rgba(252,211,77,0.08)',
          materialLabel: 'Zakivene ploče · servisni kanali',
          productionFrameLabel: 'Zakivene spojnice',
          supportFrameLabel: 'Servisni nosač',
          emptyFrameLabel: 'Pločna niša',
          surfaceLabel: 'Tvrda mrežasta podnica',
          roomSurface: 'rgba(255,255,255,0.04)',
          roomBorder: 'rgba(148,163,184,0.14)',
        },
        1: {
          accent: BOJE.prestige,
          border: 'rgba(252,211,77,0.22)',
          surface: 'rgba(252,211,77,0.08)',
          rail: 'rgba(252,211,77,0.14)',
          brace: 'rgba(56,189,248,0.10)',
          materialLabel: 'Zapovjedni most · signalne linije',
          productionFrameLabel: 'Galerijski prag',
          supportFrameLabel: 'Zapovjedni okvir',
          emptyFrameLabel: 'Promatračka niša',
          surfaceLabel: 'Promatračka galerija',
          roomSurface: 'rgba(252,211,77,0.04)',
          roomBorder: 'rgba(252,211,77,0.16)',
        },
      },
    };
  }

  if (prestigeRazina >= 1) {
    return {
      shell: {
        surface: '#0E1621',
        border: `${BOJE.klan}30`,
        glow: 'rgba(56,189,248,0.08)',
        plate: 'rgba(56,189,248,0.06)',
        beam: 'rgba(34,211,238,0.10)',
        materialLabel: 'Ojačane grede · metalni spoj',
        copy: 'Prvi trajni sloj stiže kroz ojačane pragove, zakrpane ploče i čvršću razdvojenost katova.',
        tags: ['Grede', 'Ploče', 'Galerija'],
      },
      floors: {
        0: {
          accent: BOJE.drvo,
          border: 'rgba(103,232,249,0.18)',
          surface: 'rgba(103,232,249,0.06)',
          rail: 'rgba(103,232,249,0.11)',
          brace: 'rgba(255,255,255,0.07)',
          materialLabel: 'Teške grede · zakovane ploče',
          productionFrameLabel: 'Ojačani prag',
          supportFrameLabel: 'Radionički okvir',
          emptyFrameLabel: 'Rezervni prag',
          surfaceLabel: 'Zakrpana podnica',
          roomSurface: 'rgba(255,255,255,0.04)',
          roomBorder: 'rgba(103,232,249,0.13)',
        },
        1: {
          accent: BOJE.stit,
          border: 'rgba(34,211,238,0.22)',
          surface: 'rgba(34,211,238,0.08)',
          rail: 'rgba(34,211,238,0.12)',
          brace: 'rgba(56,189,248,0.08)',
          materialLabel: 'Ručni most · nadzorna galerija',
          productionFrameLabel: 'Mostni prag',
          supportFrameLabel: 'Galerijski okvir',
          emptyFrameLabel: 'Pomoćna niša',
          surfaceLabel: 'Ojačana galerija',
          roomSurface: 'rgba(34,211,238,0.04)',
          roomBorder: 'rgba(34,211,238,0.14)',
        },
      },
    };
  }

  return {
    shell: {
      surface: '#0B111C',
      border: 'rgba(255,255,255,0.08)',
      glow: 'rgba(103,232,249,0.06)',
      plate: 'rgba(255,255,255,0.04)',
      beam: 'rgba(255,255,255,0.05)',
      materialLabel: 'Otvorene grede · platneni zakloni',
      copy: 'Selo je još privremeno. Podovi, nosači i prolazi izgledaju kao nešto što je sastavljeno da preživi prvi val.',
      tags: ['Grede', 'Zemlja', 'Most'],
    },
    floors: {
      0: {
        accent: BOJE.drvo,
        border: 'rgba(255,255,255,0.10)',
        surface: 'rgba(255,255,255,0.03)',
        rail: 'rgba(103,232,249,0.08)',
        brace: 'rgba(255,255,255,0.06)',
        materialLabel: 'Drvene grede · zemljani prag',
        productionFrameLabel: 'Sirovi okvir',
        supportFrameLabel: 'Pomoćni okvir',
        emptyFrameLabel: 'Prazna niša',
        surfaceLabel: 'Daske i zemlja',
        roomSurface: 'rgba(255,255,255,0.03)',
        roomBorder: 'rgba(255,255,255,0.08)',
      },
      1: {
        accent: BOJE.stit,
        border: 'rgba(34,211,238,0.16)',
        surface: 'rgba(34,211,238,0.06)',
        rail: 'rgba(34,211,238,0.08)',
        brace: 'rgba(255,255,255,0.05)',
        materialLabel: 'Konopna galerija · pomoćni most',
        productionFrameLabel: 'Pomoćni prag',
        supportFrameLabel: 'Galerijski okvir',
        emptyFrameLabel: 'Otvorena niša',
        surfaceLabel: 'Otvorena platforma',
        roomSurface: 'rgba(34,211,238,0.03)',
        roomBorder: 'rgba(34,211,238,0.12)',
      },
    },
  };
};

const getVillagePressureState = ({ rooms, energija, maxEnergija, villageSupportStats, pressureDirector }) => {
  const pressurePhase = VILLAGE_PRESSURE_PHASES[pressureDirector?.phase] ?? VILLAGE_PRESSURE_PHASES.calm;
  const builtRooms = rooms.filter((room) => room.type && room.level > 0);
  const activeRooms = builtRooms.filter((room) => room.status === 'active');
  const damagedRooms = builtRooms.filter((room) => room.status === 'damaged');
  const repairingRooms = builtRooms.filter((room) => room.status === 'repairing');
  const staffedActiveRooms = activeRooms.filter((room) => room.assignedHeroId);
  const totalSupportRooms = Math.max(1, rooms.filter((room) => isSupportRoom(room)).length);
  const activeSupportRooms = activeRooms.filter((room) => isSupportRoom(room));
  const reservePct = clampPct(maxEnergija > 0 ? (energija / maxEnergija) * 100 : 0);
  const crewCoveragePct = clampPct(activeRooms.length > 0 ? (staffedActiveRooms.length / activeRooms.length) * 100 : 0);
  const supportCoveragePct = clampPct((activeSupportRooms.length / totalSupportRooms) * 100);

  const pressureScore = clampPct(
    18
      + (damagedRooms.length * 24)
      + (repairingRooms.length * 10)
      + (reservePct < 35 ? 24 : reservePct < 60 ? 10 : 0)
      + (crewCoveragePct < 45 ? 18 : crewCoveragePct < 70 ? 8 : 0)
      - Math.min(18, Math.round(villageSupportStats.incidentRiskPct * 0.35))
      - Math.min(12, Math.round(villageSupportStats.repairTimePct * 0.25))
  );

  const readinessScore = clampPct(
    34
      + Math.round(crewCoveragePct * 0.26)
      + Math.round(supportCoveragePct * 0.22)
      + Math.round(reservePct * 0.18)
      - (damagedRooms.length * 12)
      - (repairingRooms.length * 5)
  );

  let label = 'Kontrolirana smjena';
  let tone = BOJE.xp;
  let copy = pressurePhase.copy;
  const cycleLabel = pressurePhase.label;

  if (pressureScore >= 72) {
    label = 'Kritična smjena';
    tone = BOJE.slotVatra;
    copy = `${pressurePhase.copy} Pritisak je previsok. Jedan novi incident lako ruši cijeli raspored proizvodnje.`;
  } else if (pressureScore >= 48) {
    label = 'Nestabilna smjena';
    tone = BOJE.misije;
    copy = `${pressurePhase.copy} Selo još radi, ali samo ako brzo zatvaraš rupe u energiji, posadi i podršci.`;
  } else if (pressureScore >= 28) {
    label = 'Napeta smjena';
    tone = BOJE.prestige;
    copy = `${pressurePhase.copy} Imaš prostora za rast, ali raspored mora ostati uredan kako bi sljedeći val bio pod kontrolom.`;
  }

  let recommendation = 'Selo je spremno za nadogradnje. Pritisak je dovoljno nizak da otvoriš novu sobu ili digneš razinu postojećih modula.';
  if (damagedRooms.length > 0) {
    recommendation = 'Prvo zatvori aktivni incident. Tek kad se prizemlje vrati u ritam, rast opet vrijedi.';
  } else if (reservePct < 35) {
    recommendation = 'Energetska rezerva je tanka. Čuvaj reakcije ili koristi automat kao kratki burst.';
  } else if (crewCoveragePct < 70) {
    recommendation = 'Sljedeći val će osjetiti prazne smjene. Dodijeli još junaka aktivnim sobama.';
  } else if (supportCoveragePct < 100) {
    recommendation = 'Gornja etaža još nije puna. Svaka nova soba podrške smanjuje amplitude idućeg vala.';
  } else if (pressurePhase.id === 'peak') {
    recommendation = 'Direktor gura selo u vrh vala. Drži energiju i servis spremnima prije nego što otvoriš novi rast.';
  } else if (pressurePhase.id === 'recovery') {
    recommendation = 'Ovo je prozor za sanaciju i novi raspored. Vrati heroje u sobe prije nego što se linija opet zategne.';
  }

  return {
    pressureScore,
    readinessScore,
    reservePct,
    crewCoveragePct,
    supportCoveragePct,
    label,
    tone,
    copy,
    cycleLabel,
    recommendation,
    directorPhase: pressurePhase.id,
    directorLabel: pressurePhase.label,
    directorCopy: pressurePhase.copy,
    directorTone: pressurePhase.tone,
    directorRemainingMs: Math.max(0, (pressureDirector?.phaseEndsAt ?? 0) - Date.now()),
    directorChancePct: Math.round((pressurePhase.incidentChanceMultiplier ?? 1) * 100),
    activeRoomsCount: activeRooms.length,
    builtRoomsCount: builtRooms.length,
    staffedActiveRoomsCount: staffedActiveRooms.length,
    activeSupportRoomsCount: activeSupportRooms.length,
    damagedCount: damagedRooms.length,
    repairingCount: repairingRooms.length,
  };
};

const getVillagePhaseVisualState = ({ directorPhase, floor = null }) => {
  const shellState = (() => {
    switch (directorPhase) {
      case 'rising':
        return {
          tone: BOJE.prestige,
          label: 'VAL SE DIŽE',
          copy: 'Selo ulazi u ubrzanje. Mir još postoji, ali linije više ne dišu ravnomjerno.',
          pulseDurationMs: 1400,
          minOpacity: 0.12,
          maxOpacity: 0.32,
        };
      case 'peak':
        return {
          tone: BOJE.slotVatra,
          label: 'VRH PRITISKA',
          copy: 'Cijela konstrukcija radi pod opterećenjem. Svaki otvoreni problem sada djeluje veći nego prije nekoliko sekundi.',
          pulseDurationMs: 900,
          minOpacity: 0.18,
          maxOpacity: 0.44,
        };
      case 'recovery':
        return {
          tone: BOJE.klan,
          label: 'POVRAT U RITAM',
          copy: 'Selo još nije mirno, ali amplituda popušta i otvara prozor za vraćanje discipline.',
          pulseDurationMs: 1700,
          minOpacity: 0.10,
          maxOpacity: 0.24,
        };
      default:
        return {
          tone: BOJE.xp,
          label: 'MIRAN PROZOR',
          copy: 'Sustav diše uredno. Ovo je trenutak kad se rast i priprema osjećaju najjeftinijima.',
          pulseDurationMs: 2100,
          minOpacity: 0.06,
          maxOpacity: 0.16,
        };
    }
  })();

  if (floor === null) return shellState;

  if (floor === 0) {
    switch (directorPhase) {
      case 'rising':
        return {
          ...shellState,
          rowLabel: 'PRIZEMLJE UBRZAVA',
          rowCopy: 'Proizvodne linije hvataju tempo i prazne smjene postaju vidljivije.',
        };
      case 'peak':
        return {
          ...shellState,
          rowLabel: 'PRIZEMLJE POD OPTEREĆENJEM',
          rowCopy: 'Svaki zastoj ovdje sada izravno povlači cijeli ciklus sela prema prekidu.',
        };
      case 'recovery':
        return {
          ...shellState,
          rowLabel: 'PRIZEMLJE VRAĆA TAKT',
          rowCopy: 'Stolovi i linije se smiruju, ali još traže ravnomjeran raspored prije novog vala.',
        };
      default:
        return {
          ...shellState,
          rowLabel: 'PRIZEMLJE DIŠE MIRNO',
          rowCopy: 'Ovo je najčišći prozor za nadogradnje i zatvaranje praznih smjena.',
        };
    }
  }

  switch (directorPhase) {
    case 'rising':
      return {
        ...shellState,
        rowLabel: 'PODRŠKA ZATEŽE MREŽU',
        rowCopy: 'Gornji kat prelazi iz rezerve u aktivno amortiziranje sljedećeg udara.',
      };
    case 'peak':
      return {
        ...shellState,
        rowLabel: 'PODRŠKA DRŽI GRANICU',
        rowCopy: 'Servis, komanda i jezgra sada najviše određuju koliko će selo puknuti ili izdržati.',
      };
    case 'recovery':
      return {
        ...shellState,
        rowLabel: 'PODRŠKA SLAŽE OPORAVAK',
        rowCopy: 'Ovo je kat koji vraća amplitudu pod kontrolu prije novog ciklusa.',
      };
    default:
      return {
        ...shellState,
        rowLabel: 'PODRŠKA ČUVA REZERVU',
        rowCopy: 'Kad je mirno, gornja etaža pretvara višak discipline u sigurniji sljedeći val.',
      };
  }

    const getRoomPhaseChromeState = ({ room, roomTelegraph, directorPhase }) => {
      if (room?.status === 'damaged') {
        return {
          tone: BOJE.slotVatra,
          label: 'PREKID RADA',
          copy: 'Soba je izbačena iz ritma dok se incident ne zatvori.',
          pulseDurationMs: 760,
          minOpacity: 0.12,
          maxOpacity: 0.28,
        };
      }

      if (room?.status === 'repairing') {
        return {
          tone: BOJE.misije,
          label: 'SANACIJA',
          copy: 'Povrat u puni rad još traje. Svaki detalj ovdje još nosi trag zastoja.',
          pulseDurationMs: 1040,
          minOpacity: 0.1,
          maxOpacity: 0.22,
        };
      }

      if (roomTelegraph?.severity === 'critical') {
        return {
          tone: roomTelegraph.tone,
          label: 'VRH U OVOJ SOBI',
          copy: 'Ovaj modul nosi najveći trenutni teret i najlakše puca prvi.',
          pulseDurationMs: 680,
          minOpacity: 0.14,
          maxOpacity: 0.32,
        };
      }

      if (roomTelegraph?.severity === 'warning') {
        return {
          tone: roomTelegraph.tone,
          label: 'NAPET MODUL',
          copy: 'Linija još radi, ali ovdje se najjasnije osjeti skori porast pritiska.',
          pulseDurationMs: 920,
          minOpacity: 0.1,
          maxOpacity: 0.24,
        };
      }

      const supportCopy = directorPhase === 'peak'
        ? 'Podrška sada upija najveći dio udara i određuje koliko selo drži formu.'
        : directorPhase === 'recovery'
          ? 'Podrška vraća amplitudu pod kontrolu prije sljedeće eskalacije.'
          : directorPhase === 'rising'
            ? 'Podrška prelazi iz rezerve u pripremu za novi vrh vala.'
            : 'Podrška drži mirnu rezervu i sprema selo za sljedeći ciklus.';
      const productionCopy = directorPhase === 'peak'
        ? 'Proizvodna linija radi pod najvećim opterećenjem i svaki manjak postaje skuplji.'
        : directorPhase === 'recovery'
          ? 'Radni ritam se smiruje i otvara prostor za povratak discipline.'
          : directorPhase === 'rising'
            ? 'Ova linija ubrzava i postaje osjetljivija na prazne smjene.'
            : 'Linija radi uredno i daje najčišći prozor za rast.';

      if (directorPhase === 'peak') {
        return {
          tone: BOJE.slotVatra,
          label: 'VRH VALA',
          copy: isSupportRoom(room) ? supportCopy : productionCopy,
          pulseDurationMs: 880,
          minOpacity: 0.1,
          maxOpacity: 0.24,
        };
      }

      if (directorPhase === 'recovery') {
        return {
          tone: BOJE.klan,
          label: 'OPORAVAK',
          copy: isSupportRoom(room) ? supportCopy : productionCopy,
          pulseDurationMs: 1420,
          minOpacity: 0.08,
          maxOpacity: 0.18,
        };
      }

      if (directorPhase === 'rising') {
        return {
          tone: BOJE.prestige,
          label: 'PORAST PRITISKA',
          copy: isSupportRoom(room) ? supportCopy : productionCopy,
          pulseDurationMs: 1260,
          minOpacity: 0.08,
          maxOpacity: 0.18,
        };
      }

      return {
        tone: BOJE.xp,
        label: 'MIRAN PROZOR',
        copy: isSupportRoom(room) ? supportCopy : productionCopy,
        pulseDurationMs: 1800,
        minOpacity: 0.05,
        maxOpacity: 0.12,
      };
    };
};

const getVillageForecastState = ({ rooms, villagePressure, villageSupportStats, junaci }) => {
  const activeRooms = rooms.filter((room) => room.type && room.level > 0 && room.status === 'active');
  if (!activeRooms.length) {
    return {
      focusRoomId: null,
      riskByRoomId: {},
      watchList: [],
      forecastTitle: 'Nema otvorene smjene za procjenu.',
      forecastCopy: 'Kad selo ponovno pokrene aktivne sobe, direktor će ovdje isticati najizloženije zone.',
      forecastAction: 'Izgradi ili vrati sobu u puni rad za novu prognozu.',
    };
  }

  const riskEntries = activeRooms
    .map((room) => {
      const roomDefinition = getVillageRoomDefinition(room);
      const assignmentBonusPct = getRoomAssignmentBonusPct(junaci, room, villageSupportStats);
      let score = 18;

      score += roomDefinition?.kind === 'production' ? 10 : 6;
      score += Math.max(0, ((roomDefinition?.incidentPool?.length ?? 1) - 1) * 8);
      if (!room.assignedHeroId) score += 18;
      if (villagePressure.reservePct < 40) score += roomDefinition?.kind === 'production' ? 8 : 4;
      if (villagePressure.crewCoveragePct < 70) score += 7;

      if (villagePressure.directorPhase === 'rising') {
        score += roomDefinition?.kind === 'production' ? 8 : 5;
      } else if (villagePressure.directorPhase === 'peak') {
        score += roomDefinition?.kind === 'production' ? 16 : 10;
      } else if (villagePressure.directorPhase === 'recovery') {
        score -= 6;
      }

      if (room.type === 'servis' && villagePressure.directorPhase !== 'peak') score -= 4;
      if (room.type === 'jezgra' && villagePressure.reservePct < 35) score += 6;
      score -= Math.min(18, Math.round(assignmentBonusPct * 0.45));

      const clampedScore = clampPct(score);
      let label = 'STABILNO';
      let tone = BOJE.xp;
      let reason = assignmentBonusPct > 0 ? `+${Math.round(assignmentBonusPct)}% posada drži red` : 'Smjena je pod kontrolom';

      if (clampedScore >= 72) {
        label = 'NA UDARU';
        tone = BOJE.slotVatra;
        reason = room.assignedHeroId
          ? 'Vrh vala najlakše probija kroz ovaj modul'
          : 'Prazna smjena otvara najtanju liniju obrane';
      } else if (clampedScore >= 48) {
        label = 'POD NADZOROM';
        tone = BOJE.misije;
        reason = room.assignedHeroId
          ? 'Soba radi, ali traži bliži nadzor u sljedećem valu'
          : 'Nedostaje nosivi junak za stabilniji ritam';
      }

      return {
        id: room.id,
        room,
        roomDefinition,
        score: clampedScore,
        label,
        tone,
        reason,
      };
    })
    .sort((a, b) => b.score - a.score);

  const focusRoom = riskEntries[0];
  const watchList = riskEntries.slice(0, 3);
  const focusName = focusRoom?.roomDefinition?.naziv ?? 'glavni modul';
  let forecastTitle = `Najizloženija soba: ${focusName}`;
  let forecastCopy = `${focusRoom?.reason ?? 'Linija sela je uredna.'}`;

  if (villagePressure.directorPhase === 'calm') {
    forecastTitle = `Mirni prozor, ali ${focusName} ostaje najtanji dio rasporeda`;
    forecastCopy = 'Direktor je miran, ali već označava gdje će prvi udar najlakše proći ako ostaviš smjenu praznom.';
  } else if (villagePressure.directorPhase === 'rising') {
    forecastTitle = `Sljedeći val najviše prijeti sobi ${focusName}`;
    forecastCopy = 'Linija se zateže. Ovo je trenutak za preraspodjelu junaka prije nego što ritam pređe u vrh vala.';
  } else if (villagePressure.directorPhase === 'peak') {
    forecastTitle = `Vrh vala trenutno gura kroz sobu ${focusName}`;
    forecastCopy = 'Najizloženiji modul sada najviše određuje hoće li selo pasti u prekid ili zadržati kontrolu.';
  } else if (villagePressure.directorPhase === 'recovery') {
    forecastTitle = `Oporavak traje, ali ${focusName} još traži nadzor`;
    forecastCopy = 'Prozor za sanaciju je otvoren. Ako ovdje vratiš red, sljedeći ciklus kreće iz znatno stabilnije pozicije.';
  }

  let forecastAction = 'Dodijeli glavnog junaka i drži energiju spremnom za brzu reakciju.';
  if (focusRoom && !focusRoom.room.assignedHeroId) {
    forecastAction = `Prvi potez: dodijeli junaka u ${focusRoom.roomDefinition?.naziv ?? 'ovu sobu'} prije idućeg skoka pritiska.`;
  } else if (villagePressure.reservePct < 40) {
    forecastAction = 'Prvi potez: napuni rezervu energije ili čuvaj automat za hitnu korekciju.';
  } else if (villagePressure.directorPhase === 'recovery') {
    forecastAction = 'Prvi potez: vrati ravnomjeran raspored prije nego što direktor opet podigne tempo.';
  }

  return {
    focusRoomId: focusRoom?.id ?? null,
    riskByRoomId: Object.fromEntries(riskEntries.map((entry) => [entry.id, entry])),
    watchList,
    forecastTitle,
    forecastCopy,
    forecastAction,
  };
};

const getResidentFallbackGlyph = (room) => {
  switch (room?.type) {
    case 'pilana': return '🌲';
    case 'kamenolom': return '⛰️';
    case 'rudnik': return '⛏️';
    case 'servis': return '🛡️';
    case 'zapovjednistvo': return '👑';
    case 'jezgra': return '⚡';
    default: return '•';
  }
};

const getRoomTelegraphState = ({ roomForecast, villagePressure }) => {
  if (!roomForecast) return null;
  if (villagePressure.directorPhase === 'calm' && roomForecast.score < 60) return null;
  if (roomForecast.score < 48) return null;

  const remainingMs = Math.max(0, villagePressure.directorRemainingMs);

  if (roomForecast.score >= 72 && (villagePressure.directorPhase === 'peak' || remainingMs <= 25000)) {
    return {
      severity: 'critical',
      label: 'UDAR NA VRATIMA',
      tone: BOJE.slotVatra,
      copy: 'Najtanji dio obrane je ovdje. Ako ne zatvoriš rupu, sljedeći udar najlakše lomi ovu smjenu.',
      countdownLabel: `Procijenjeni udar unutar ${formatCountdown(remainingMs)}`,
    };
  }

  if (roomForecast.score >= 60 || remainingMs <= 35000) {
    return {
      severity: 'warning',
      label: 'LINIJA POPUŠTA',
      tone: BOJE.misije,
      copy: 'Smjena još drži ritam, ali val se skuplja upravo oko ovog modula.',
      countdownLabel: `Novi prozor dolazi za ${formatCountdown(remainingMs)}`,
    };
  }

  return {
    severity: 'watch',
    label: 'POD NADZOROM',
    tone: BOJE.prestige,
    copy: 'Direktor zadržava ovu sobu u fokusu. Nije kritično, ali nije ni sigurno ostaviti je praznom.',
    countdownLabel: `Prati ritam još ${formatCountdown(remainingMs)}`,
  };
};

const getRoomMotionMeta = (room) => {
  switch (room?.type) {
    case 'pilana':
      return {
        residentPattern: 'sway',
        propPattern: 'sway',
        baseDurationMs: 860,
        motionAmplitude: 1,
      };
    case 'kamenolom':
      return {
        residentPattern: 'stomp',
        propPattern: 'stomp',
        baseDurationMs: 980,
        motionAmplitude: 0.9,
      };
    case 'rudnik':
      return {
        residentPattern: 'pulse',
        propPattern: 'pulse',
        baseDurationMs: 780,
        motionAmplitude: 1.04,
      };
    case 'servis':
      return {
        residentPattern: 'drift',
        propPattern: 'stomp',
        baseDurationMs: 900,
        motionAmplitude: 0.95,
      };
    case 'zapovjednistvo':
      return {
        residentPattern: 'glide',
        propPattern: 'hover',
        baseDurationMs: 1040,
        motionAmplitude: 0.85,
      };
    case 'jezgra':
      return {
        residentPattern: 'hover',
        propPattern: 'pulse',
        baseDurationMs: 760,
        motionAmplitude: 1.12,
      };
    default:
      return {
        residentPattern: 'bob',
        propPattern: 'bob',
        baseDurationMs: 920,
        motionAmplitude: 0.8,
      };
  }
};

const getRoomTensionState = ({ room, roomTelegraph }) => {
  if (!room?.type || room.level <= 0) {
    return {
      level: 'idle',
      tone: BOJE.textMuted,
      label: 'PRAZNA NIŠA',
      copy: 'Ovaj prostor još nema aktivan unutarnji ritam ni prijetnju koju treba pratiti.',
      countdownLabel: null,
      progressPct: 12,
    };
  }

  if (room.status === 'damaged') {
    return {
      level: 'critical',
      tone: BOJE.slotVatra,
      label: 'RAD PREKINUT',
      copy: 'Interijer je zatvoren, a stanovnici i alati su izvučeni dok se incident ne zaključi.',
      countdownLabel: null,
      progressPct: 100,
    };
  }

  if (room.status === 'repairing') {
    return {
      level: 'warning',
      tone: BOJE.misije,
      label: 'SANACIJA U TIJEKU',
      copy: 'Soba se vraća kroz popravke instalacija, pragova i radnih točaka prije punog povratka u ritam.',
      countdownLabel: room.repairEndsAt ? `Povrat za ${formatCountdown(Math.max(0, room.repairEndsAt - Date.now()))}` : null,
      progressPct: 72,
    };
  }

  if (roomTelegraph?.severity === 'critical') {
    return {
      level: 'critical',
      tone: roomTelegraph.tone,
      label: 'PREDUDARNO STANJE',
      copy: 'Interijer je već u napetosti. Još nema loma, ali svi znakovi pokazuju da je udar blizu.',
      countdownLabel: roomTelegraph.countdownLabel,
      progressPct: 90,
    };
  }

  if (roomTelegraph?.severity === 'warning') {
    return {
      level: 'warning',
      tone: roomTelegraph.tone,
      label: 'NAPETA LINIJA',
      copy: 'Prostor i posada još rade, ali ritam je već pod pritiskom i traži bliži nadzor.',
      countdownLabel: roomTelegraph.countdownLabel,
      progressPct: 66,
    };
  }

  if (roomTelegraph?.severity === 'watch') {
    return {
      level: 'watch',
      tone: roomTelegraph.tone,
      label: 'TIHI PRITISAK',
      copy: 'Direktor ovu sobu drži u fokusu. Nema panike, ali modul više nije potpuno bezbrižan.',
      countdownLabel: roomTelegraph.countdownLabel,
      progressPct: 40,
    };
  }

  return {
    level: 'calm',
    tone: BOJE.xp,
    label: 'STABILNA SMJENA',
    copy: 'Interijer djeluje uredno, stanovnici se kreću bez zastoja, a prostor drži miran ritam.',
    countdownLabel: null,
    progressPct: 22,
  };
};

const getRoomSceneLayout = ({ room, prestigeRazina }) => {
  const frameLabel = prestigeRazina >= 5
    ? 'Citadelni raster'
    : prestigeRazina >= 3
      ? 'Signalni raster'
      : prestigeRazina >= 1
        ? 'Ojačani raster'
        : 'Provizorni raster';

  switch (room?.type) {
    case 'pilana':
      return {
        label: 'Pilanska linija',
        frameLabel,
        rows: [
          { align: 'between', nodes: ['🪵', '🪚', '🪵'] },
          { align: 'center', nodes: ['🌲'] },
        ],
      };
    case 'kamenolom':
      return {
        label: 'Kameni plato',
        frameLabel,
        rows: [
          { align: 'start', nodes: ['🧱', '🧱'] },
          { align: 'end', nodes: ['⛰️'] },
        ],
      };
    case 'rudnik':
      return {
        label: 'Dubinsko okno',
        frameLabel,
        rows: [
          { align: 'center', nodes: ['🕳️'] },
          { align: 'between', nodes: ['⚙️', '⛏️'] },
          { align: 'center', nodes: ['⚙️'] },
        ],
      };
    case 'servis':
      return {
        label: 'Servisna klupa',
        frameLabel,
        rows: [
          { align: 'between', nodes: ['🧰', '🔧'] },
          { align: 'center', nodes: ['🛡️'] },
        ],
      };
    case 'zapovjednistvo':
      return {
        label: 'Most nadzora',
        frameLabel,
        rows: [
          { align: 'between', nodes: ['📡', '👁️', '👑'] },
        ],
      };
    case 'jezgra':
      return {
        label: 'Radijalna jezgra',
        frameLabel,
        rows: [
          { align: 'center', nodes: ['⚡'] },
          { align: 'between', nodes: ['🔋', '⬢'] },
          { align: 'center', nodes: ['⚡'] },
        ],
      };
    default:
      return {
        label: 'Prazna niša',
        frameLabel,
        rows: [
          { align: 'center', nodes: ['▫️'] },
        ],
      };
  }
};

const getRoomInteriorProfile = ({ room, roomDefinition, assignedHero, roomTelegraph, prestigeRazina, floorTheme }) => {
  const stageProfile = prestigeRazina >= 5
    ? {
      label: 'JEZGRENI INTERIJER',
      surfaceLabel: 'Vodljivi pragovi i energetske obloge',
      props: ['⚡', '⬢'],
      rhythm: 'Interijer sada djeluje kao trajna infrastruktura, ne kao privremena zakrpa.',
    }
    : prestigeRazina >= 3
      ? {
        label: 'ZAPOVJEDNI INTERIJER',
        surfaceLabel: 'Zakivene ploče i signalni mostovi',
        props: ['📡', '⬡'],
        rhythm: 'Prolazi, stolovi i radne linije sada imaju planski raspored i jasnu hijerarhiju.',
      }
      : prestigeRazina >= 1
        ? {
          label: 'OJAČANI INTERIJER',
          surfaceLabel: 'Ojačane grede i metalni spoj',
          props: ['🧱', '🔩'],
          rhythm: 'Privremeni kamp polako prelazi u bazu s pravim konstrukcijskim ritmom.',
        }
        : {
          label: 'POGRANIČNI INTERIJER',
          surfaceLabel: 'Daske, konop i improvizirane ograde',
          props: ['🪵', '🪢'],
          rhythm: 'Sve još djeluje sastavljeno da izdrži prvi nalet, a ne da traje.',
        };

  const roomProfile = (() => {
    switch (room?.type) {
      case 'pilana':
        return {
          sceneLabel: 'Pilanski stolovi',
          props: ['🪚', '🌲'],
          rhythm: 'Piljevina, trupci i kratki ritmovi smjene drže prostor živim.',
        };
      case 'kamenolom':
        return {
          sceneLabel: 'Kameni stolovi',
          props: ['🧱', '⛰️'],
          rhythm: 'Težak materijal i kratak hod između radnih točaka određuju tempo prostora.',
        };
      case 'rudnik':
        return {
          sceneLabel: 'Metalna okna',
          props: ['⚙️', '⛏️'],
          rhythm: 'Okna, alati i tamniji tonovi čine ovu sobu najtežom linijom proizvodnje.',
        };
      case 'servis':
        return {
          sceneLabel: 'Servisni stol',
          props: ['🧰', '🛡️'],
          rhythm: 'Ovdje se kaos prevodi u red kroz alat, rezervne dijelove i brze zahvate.',
        };
      case 'zapovjednistvo':
        return {
          sceneLabel: 'Signalna galerija',
          props: ['📡', '👑'],
          rhythm: 'Pregled linija i nadzorne točke daju ovoj sobi autoritet nad ostatkom sela.',
        };
      case 'jezgra':
        return {
          sceneLabel: 'Energetski luk',
          props: ['🔋', '⚡'],
          rhythm: 'Ovdje se stabilnost osjeća kroz punjenje, svjetlo i tvrdu tehničku disciplinu.',
        };
      default:
        return {
          sceneLabel: 'Rezervna niša',
          props: ['▫️', '•'],
          rhythm: 'Prostor još čeka svoju stvarnu funkciju.',
        };
    }
  })();
  const motionMeta = getRoomMotionMeta(room);
  const tensionMeta = getRoomTensionState({ room, roomTelegraph });
  const sceneLayout = getRoomSceneLayout({ room, prestigeRazina });

  let postureLabel = 'Smjena otvorena';
  let postureCopy = roomTelegraph?.copy ?? roomProfile.rhythm;
  let presenceLabel = assignedHero
    ? 'Voditelj i stanovnici drže puni ciklus'
    : 'Mali stanovnici drže osnovni ciklus';

  if (!roomDefinition || room.level <= 0) {
    postureLabel = 'Niša čeka gradnju';
    postureCopy = 'Okvir i podnica postoje, ali prostor još nema radnu namjenu ni stalni raspored.';
    presenceLabel = 'Prostor još nema stalnu posadu';
  } else if (room.status === 'damaged') {
    postureLabel = 'Interijer zatvoren';
    postureCopy = 'Radni stolovi i prolazi su ispražnjeni dok incident ne bude zaključen.';
    presenceLabel = 'Stanovnici su evakuirani iz prostora';
  } else if (room.status === 'repairing') {
    postureLabel = 'Interijer se vraća';
    postureCopy = 'Konstrukcija se vraća u ritam kroz sanaciju prolaza, alata i energetskih veza.';
    presenceLabel = 'Stanovnici čekaju povratak smjene';
  } else if (assignedHero) {
    postureLabel = 'Junak drži jezgru smjene';
    postureCopy = `${assignedHero.naziv} vodi prostor kroz ${stageProfile.surfaceLabel.toLowerCase()} i daje mu puni radni ritam.`;
  } else if (roomTelegraph) {
    postureLabel = 'Smjena pod pritiskom';
    postureCopy = `${roomTelegraph.copy} Ova praznina čini interijer osjetljivijim na sljedeći udar.`;
  } else {
    postureLabel = 'Smjena bez voditelja';
    postureCopy = `${roomProfile.rhythm} Još nedostaje nosivi junak koji bi ovu sobu pretvorio u potpuno discipliniran modul.`;
  }

  return {
    tone: tensionMeta.tone ?? floorTheme?.accent ?? roomDefinition?.boja ?? BOJE.textMuted,
    stageLabel: stageProfile.label,
    sceneLabel: roomProfile.sceneLabel,
    materialLabel: floorTheme?.materialLabel ?? stageProfile.surfaceLabel,
    surfaceLabel: stageProfile.surfaceLabel,
    propGlyphs: Array.from(new Set([
      roomProfile.props[0],
      stageProfile.props[0],
      roomProfile.props[1],
      stageProfile.props[1],
    ].filter(Boolean))).slice(0, 4),
    postureLabel,
    postureCopy,
    presenceLabel,
    rhythmCopy: roomProfile.rhythm,
    residentPattern: motionMeta.residentPattern,
    propPattern: motionMeta.propPattern,
    baseDurationMs: motionMeta.baseDurationMs,
    motionAmplitude: motionMeta.motionAmplitude,
    tensionLevel: tensionMeta.level,
    tensionLabel: tensionMeta.label,
    tensionCopy: tensionMeta.copy,
    tensionCountdownLabel: tensionMeta.countdownLabel,
    tensionProgressPct: tensionMeta.progressPct,
    sceneLayout,
  };
};

const getSupportRoomSummary = (room, roomDefinition, junaci) => {
  if (!roomDefinition?.supportEffect) return 'Podrška selu';
  const assignmentMultiplier = getRoomAssignmentMultiplier(junaci, room);
  const effectWeight = room.level * assignmentMultiplier;
  const summaryParts = [];
  const production = Math.round((roomDefinition.supportEffect.villageProductionPct ?? 0) * effectWeight);
  const safety = Math.round((roomDefinition.supportEffect.incidentRiskPct ?? 0) * effectWeight);
  const crew = Math.round((roomDefinition.supportEffect.crewBonusPct ?? 0) * effectWeight);
  const maxEnergy = Math.round((roomDefinition.supportEffect.maxEnergyFlat ?? 0) * effectWeight);

  if (production > 0) summaryParts.push(`+${production}% selo`);
  if (safety > 0) summaryParts.push(`-${safety}% rizik`);
  if (crew > 0) summaryParts.push(`+${crew}% posada`);
  if (maxEnergy > 0) summaryParts.push(`+${maxEnergy} energija`);

  return summaryParts.slice(0, 2).join(' · ') || 'Podrška selu';
};

const SummaryMetric = ({ label, value, accentColor }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
  </View>
);

const PhasePulseLayer = ({ tone, pulseDurationMs, minOpacity, maxOpacity, style }) => {
  const opacity = useRef(new Animated.Value(minOpacity)).current;

  useEffect(() => {
    opacity.stopAnimation();
    opacity.setValue(minOpacity);

    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: maxOpacity,
          duration: pulseDurationMs,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: minOpacity,
          duration: pulseDurationMs,
          useNativeDriver: true,
        }),
      ]),
    );

    loopAnimation.start();

    return () => {
      loopAnimation.stop();
      opacity.stopAnimation();
    };
  }, [maxOpacity, minOpacity, opacity, pulseDurationMs]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          backgroundColor: tone,
          opacity,
        },
      ]}
    />
  );
};

const getMotionDurationMs = ({ baseDurationMs, tensionLevel }) => {
  const factor = tensionLevel === 'critical'
    ? 0.55
    : tensionLevel === 'warning'
      ? 0.72
      : tensionLevel === 'watch'
        ? 0.86
        : 1;

  return Math.max(260, Math.round(baseDurationMs * factor));
};

const getAnimatedMotionTransforms = ({ motionValue, pattern, amplitude }) => {
  switch (pattern) {
    case 'sway':
      return [
        {
          translateX: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-2 * amplitude, 2 * amplitude],
          }),
        },
      ];
    case 'stomp':
      return [
        {
          translateY: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4 * amplitude],
          }),
        },
      ];
    case 'pulse':
      return [
        {
          scale: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1 + (0.08 * amplitude)],
          }),
        },
      ];
    case 'drift':
      return [
        {
          translateX: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-1.5 * amplitude, 1.5 * amplitude],
          }),
        },
        {
          translateY: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -2 * amplitude],
          }),
        },
      ];
    case 'glide':
      return [
        {
          translateX: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-3 * amplitude, 3 * amplitude],
          }),
        },
        {
          scale: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1 + (0.04 * amplitude)],
          }),
        },
      ];
    case 'hover':
      return [
        {
          translateY: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-2.5 * amplitude, 0],
          }),
        },
        {
          scale: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1 + (0.05 * amplitude)],
          }),
        },
      ];
    default:
      return [
        {
          translateY: motionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4 * amplitude],
          }),
        },
      ];
  }
};

const ResidentMarker = ({ emoji, accentColor, active, muted, delayMs, motionPattern = 'bob', tensionLevel = 'calm', baseDurationMs = 860, motionAmplitude = 1 }) => {
  const motionValue = useRef(new Animated.Value(0)).current;
  const loopDurationMs = getMotionDurationMs({ baseDurationMs, tensionLevel });

  useEffect(() => {
    motionValue.stopAnimation();
    motionValue.setValue(0);
    if (!active) return undefined;

    let loopAnimation;
    const timeout = setTimeout(() => {
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(motionValue, {
            toValue: 1,
            duration: loopDurationMs,
            useNativeDriver: true,
          }),
          Animated.timing(motionValue, {
            toValue: 0,
            duration: loopDurationMs,
            useNativeDriver: true,
          }),
        ]),
      );
      loopAnimation.start();
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      loopAnimation?.stop();
      motionValue.stopAnimation();
    };
  }, [active, motionValue, delayMs, loopDurationMs]);

  return (
    <Animated.View
      style={[
        styles.residentMarker,
        {
          borderColor: muted ? 'rgba(255,255,255,0.10)' : tensionLevel === 'critical' ? `${accentColor}77` : `${accentColor}44`,
          backgroundColor: muted ? 'rgba(255,255,255,0.05)' : tensionLevel === 'critical' ? `${accentColor}24` : `${accentColor}18`,
        },
        active && { transform: getAnimatedMotionTransforms({ motionValue, pattern: motionPattern, amplitude: motionAmplitude }) },
      ]}
    >
      <Text style={[styles.residentMarkerEmoji, muted && styles.residentMarkerEmojiMuted]}>{emoji}</Text>
    </Animated.View>
  );
};

const InteriorPropChip = ({ glyph, accentColor, active, delayMs, motionPattern = 'bob', tensionLevel = 'calm', baseDurationMs = 920, motionAmplitude = 1, large = false }) => {
  const motionValue = useRef(new Animated.Value(0)).current;
  const loopDurationMs = getMotionDurationMs({ baseDurationMs, tensionLevel });

  useEffect(() => {
    motionValue.stopAnimation();
    motionValue.setValue(0);
    if (!active) return undefined;

    let loopAnimation;
    const timeout = setTimeout(() => {
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(motionValue, {
            toValue: 1,
            duration: loopDurationMs,
            useNativeDriver: true,
          }),
          Animated.timing(motionValue, {
            toValue: 0,
            duration: loopDurationMs,
            useNativeDriver: true,
          }),
        ]),
      );
      loopAnimation.start();
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      loopAnimation?.stop();
      motionValue.stopAnimation();
    };
  }, [active, motionValue, delayMs, loopDurationMs]);

  return (
    <Animated.View
      style={[
        styles.roomInteriorPropChip,
        large && styles.roomInteriorPropChipLarge,
        {
          borderColor: `${accentColor}${tensionLevel === 'critical' ? '55' : '2A'}`,
          backgroundColor: tensionLevel === 'critical' ? `${accentColor}16` : 'rgba(255,255,255,0.06)',
        },
        active && { transform: getAnimatedMotionTransforms({ motionValue, pattern: motionPattern, amplitude: motionAmplitude }) },
      ]}
    >
      <Text style={[styles.roomInteriorPropTxt, large && styles.roomInteriorPropTxtLarge]}>{glyph}</Text>
    </Animated.View>
  );
};

const getSceneRowAlignmentStyle = (align) => {
  switch (align) {
    case 'between':
      return styles.interiorSceneRowBetween;
    case 'start':
      return styles.interiorSceneRowStart;
    case 'end':
      return styles.interiorSceneRowEnd;
    default:
      return styles.interiorSceneRowCenter;
  }
};

const InteriorSceneBoard = ({ sceneLayout, accentColor, active, tensionLevel, motionPattern, baseDurationMs, motionAmplitude, large = false }) => (
  <View
    style={[
      styles.interiorSceneBoard,
      large && styles.interiorSceneBoardLarge,
      {
        borderColor: `${accentColor}30`,
        backgroundColor: tensionLevel === 'critical' ? `${accentColor}12` : `${accentColor}0D`,
      },
    ]}
  >
    <View style={[styles.interiorSceneBoardRail, { backgroundColor: `${accentColor}20` }]} />
    <View style={styles.interiorSceneBoardHeader}>
      <Text style={[styles.interiorSceneBoardFrame, { color: accentColor }]}>{sceneLayout.frameLabel}</Text>
      <Text style={styles.interiorSceneBoardLabel}>{sceneLayout.label}</Text>
    </View>

    <View style={styles.interiorSceneBoardGrid}>
      {sceneLayout.rows.map((row, rowIndex) => (
        <View
          key={`${sceneLayout.label}-row-${rowIndex}`}
          style={[styles.interiorSceneRow, getSceneRowAlignmentStyle(row.align)]}
        >
          {row.nodes.map((glyph, nodeIndex) => (
            <InteriorPropChip
              key={`${sceneLayout.label}-${rowIndex}-${nodeIndex}`}
              glyph={glyph}
              accentColor={accentColor}
              active={active}
              delayMs={(rowIndex * 140) + (nodeIndex * 90)}
              motionPattern={motionPattern}
              tensionLevel={tensionLevel}
              baseDurationMs={baseDurationMs}
              motionAmplitude={motionAmplitude}
              large={large}
            />
          ))}
        </View>
      ))}
    </View>
  </View>
);

const InteriorTensionPanel = ({ tone, label, copy, countdownLabel, progressPct, compact = false }) => (
  <View
    style={[
      styles.interiorTensionPanel,
      compact && styles.interiorTensionPanelCompact,
      {
        borderColor: `${tone}33`,
        backgroundColor: `${tone}10`,
      },
    ]}
  >
    <View style={styles.interiorTensionHeader}>
      <Text style={[styles.interiorTensionLabel, { color: tone }]}>{label}</Text>
      {countdownLabel ? <Text style={styles.interiorTensionCountdown}>{countdownLabel}</Text> : null}
    </View>
    <View style={styles.interiorTensionTrack}>
      <View
        style={[
          styles.interiorTensionFill,
          {
            width: `${Math.max(progressPct, 8)}%`,
            backgroundColor: tone,
          },
        ]}
      />
    </View>
    <Text style={[styles.interiorTensionCopy, compact && styles.interiorTensionCopyCompact]}>{copy}</Text>
  </View>
);

const RoomResidentStrip = ({ room, assignedHero, accentColor, interiorProfile }) => {
  const residentSlots = getRoomResidentCapacity(room);
  const residentGlyph = getResidentFallbackGlyph(room);
  const active = room.status === 'active';
  const interiorTone = interiorProfile?.tone ?? accentColor;
  const propActive = room.level > 0 && room.status !== 'damaged';
  const statusText = assignedHero
    ? 'Junak u smjeni'
    : room.status === 'repairing'
      ? 'Smjena čeka povrat'
      : room.status === 'damaged'
        ? 'Smjena evakuirana'
        : active
          ? 'Smjena otvorena'
          : 'Smjena zatvorena';

  return (
    <View style={styles.roomResidentsWrap}>
      <View style={styles.roomResidentsHeader}>
        <Text style={styles.roomResidentsLabel}>STANARI</Text>
        <Text style={[styles.roomResidentsStatus, assignedHero && { color: accentColor }]}>{statusText}</Text>
      </View>

      <Text style={styles.roomResidentsMeta}>{interiorProfile?.presenceLabel ?? (assignedHero ? 'Voditelj pokriva smjenu' : 'Soba još čeka voditelja')} · {residentSlots} prisutnih</Text>

      {interiorProfile ? (
        <View
          style={[
            styles.roomInteriorPanel,
            {
              borderColor: `${interiorTone}33`,
              backgroundColor: `${interiorTone}10`,
            },
          ]}
        >
          <View style={styles.roomInteriorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roomInteriorEyebrow, { color: interiorTone }]}>{interiorProfile.stageLabel}</Text>
              <Text style={styles.roomInteriorTitle}>{interiorProfile.sceneLabel}</Text>
            </View>
            <View
              style={[
                styles.roomInteriorBadge,
                {
                  borderColor: `${interiorTone}44`,
                  backgroundColor: `${interiorTone}16`,
                },
              ]}
            >
              <Text style={[styles.roomInteriorBadgeTxt, { color: interiorTone }]}>{interiorProfile.postureLabel}</Text>
            </View>
          </View>

          <View style={styles.roomInteriorTagsRow}>
            <View
              style={[
                styles.roomInteriorMaterialChip,
                {
                  borderColor: `${interiorTone}3D`,
                  backgroundColor: `${interiorTone}14`,
                },
              ]}
            >
              <Text style={[styles.roomInteriorMaterialChipTxt, { color: interiorTone }]}>{interiorProfile.surfaceLabel}</Text>
            </View>
            <View style={styles.roomInteriorLayoutChip}>
              <Text style={styles.roomInteriorLayoutChipTxt}>{interiorProfile.sceneLayout.label}</Text>
            </View>
          </View>

          <InteriorSceneBoard
            sceneLayout={interiorProfile.sceneLayout}
            accentColor={interiorTone}
            active={propActive}
            tensionLevel={interiorProfile.tensionLevel}
            motionPattern={interiorProfile.propPattern}
            baseDurationMs={interiorProfile.baseDurationMs + 120}
            motionAmplitude={interiorProfile.motionAmplitude}
          />

          <Text style={styles.roomInteriorCopy}>{interiorProfile.postureCopy}</Text>

          <InteriorTensionPanel
            tone={interiorTone}
            label={interiorProfile.tensionLabel}
            copy={interiorProfile.tensionCopy}
            countdownLabel={interiorProfile.tensionCountdownLabel}
            progressPct={interiorProfile.tensionProgressPct}
            compact
          />
        </View>
      ) : null}

      <View style={styles.roomResidentsRow}>
        {Array.from({ length: residentSlots }).map((_, index) => {
          const isLeadResident = index === 0 && !!assignedHero;
          return (
            <ResidentMarker
              key={`${room.id}-resident-${index}`}
              emoji={isLeadResident ? assignedHero.emodzi : residentGlyph}
              accentColor={accentColor}
              active={active}
              muted={!isLeadResident}
              delayMs={index * 140}
              motionPattern={interiorProfile?.residentPattern}
              tensionLevel={interiorProfile?.tensionLevel}
              baseDurationMs={interiorProfile?.baseDurationMs}
              motionAmplitude={interiorProfile?.motionAmplitude}
            />
          );
        })}
      </View>
    </View>
  );
};

const SignalMeter = ({ label, value, accentColor, note }) => (
  <View style={styles.signalMeter}>
    <View style={styles.signalMeterHeader}>
      <Text style={styles.signalMeterLabel}>{label}</Text>
      <Text style={[styles.signalMeterValue, { color: accentColor }]}>{value}%</Text>
    </View>
    <View style={styles.signalMeterTrack}>
      <View
        style={[
          styles.signalMeterFill,
          {
            width: value > 0 ? `${Math.max(value, 6)}%` : '0%',
            backgroundColor: accentColor,
          },
        ]}
      />
    </View>
    <Text style={styles.signalMeterNote}>{note}</Text>
  </View>
);

const ForecastChip = ({ item, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.82}
    style={[
      styles.forecastChip,
      { borderColor: `${item.tone}44`, backgroundColor: `${item.tone}14` },
    ]}
    onPress={onPress}
  >
    <Text style={[styles.forecastChipLabel, { color: item.tone }]}>{item.roomDefinition?.kratko ?? 'Soba'}</Text>
    <Text style={styles.forecastChipMeta}>{item.label}</Text>
  </TouchableOpacity>
);

const getRoomResidentCapacity = (room) => (
  room.level > 0 ? Math.min(3, isSupportRoom(room) ? 2 : Math.max(2, room.level)) : 2
);

const InspectorShiftBoard = ({ room, assignedHero, roomForecast, roomTelegraph, accentColor, interiorProfile }) => {
  const residentCapacity = getRoomResidentCapacity(room);
  const riskTone = roomTelegraph?.tone ?? roomForecast?.tone ?? BOJE.textMuted;
  const staffingLabel = assignedHero ? 'Voditelj smjene prisutan' : 'Voditelj smjene nedostaje';
  const staffingCopy = assignedHero
    ? 'Ovaj junak vodi lokalni ritam sobe i nosi puni bonus smjene.'
    : 'Bez voditelja smjene soba ulazi mekše u sljedeći val i ostaje osjetljivija na pucanje rasporeda.';
  const forecastCopy = roomTelegraph
    ? `${roomTelegraph.copy} ${roomTelegraph.countdownLabel}`
    : roomForecast
      ? roomForecast.reason
      : interiorProfile?.rhythmCopy ?? 'Direktor trenutačno ne vidi pojačan rizik u ovoj sobi.';

  return (
    <View style={styles.shiftBoard}>
      <View style={styles.shiftBoardHeader}>
        <Text style={styles.shiftBoardTitle}>Raspored smjene</Text>
        <View style={[
          styles.shiftRiskBadge,
          { borderColor: `${riskTone}44`, backgroundColor: `${riskTone}14` },
        ]}>
          <Text style={[styles.shiftRiskBadgeTxt, { color: riskTone }]}>{roomTelegraph?.label ?? roomForecast?.label ?? 'STABILNO'}</Text>
        </View>
      </View>

      <View style={[
        styles.shiftLeadSlot,
        assignedHero && { borderColor: `${accentColor}44`, backgroundColor: `${accentColor}12` },
      ]}>
        <Text style={styles.shiftLeadEmoji}>{assignedHero?.emodzi ?? '□'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.shiftLeadTitle}>{assignedHero ? assignedHero.naziv : staffingLabel}</Text>
          <Text style={styles.shiftLeadMeta}>{staffingCopy}</Text>
        </View>
      </View>

      <View style={styles.shiftResidentsRow}>
        {Array.from({ length: residentCapacity }).map((_, index) => {
          const isLeadResident = index === 0 && !!assignedHero;
          return (
            <ResidentMarker
              key={`${room.id}-shift-${index}`}
              emoji={isLeadResident ? assignedHero.emodzi : '•'}
              accentColor={accentColor}
              active={room.status === 'active'}
              muted={!isLeadResident}
              delayMs={index * 120}
            />
          );
        })}
        <Text style={styles.shiftResidentsMeta}>{staffingLabel} · {interiorProfile?.presenceLabel ?? `prisutno ${residentCapacity} malih stanovnika`}</Text>
      </View>

      <Text style={styles.shiftBoardCopy}>{forecastCopy}</Text>
    </View>
  );
};

const VillageRoomTile = ({ room, selected, hovered, production, junaci, unlockStatus, villageSupportStats, roomForecast, roomTelegraph, floorTheme, prestigeRazina, directorPhase, onPress }) => {
  const roomDefinition = getVillageRoomDefinition(room);
  const assignedHero = getHeroDefinition(room.assignedHeroId);
  const status = statusMeta(room, unlockStatus);
  const accentColor = roomDefinition?.boja ?? status.tone;
  const forecastTone = roomForecast?.tone ?? accentColor;
  const telegraphTone = roomTelegraph?.tone ?? forecastTone;
  const roomPhaseChrome = getRoomPhaseChromeState({ room, roomTelegraph, directorPhase });
  const RoomIcon = roomDefinition ? (ICON_BY_TYPE[room.type] ?? TreePine) : null;
  const frameLabel = roomDefinition
    ? roomDefinition.kind === 'support'
      ? floorTheme?.supportFrameLabel ?? 'Okvir podrške'
      : floorTheme?.productionFrameLabel ?? 'Radionički okvir'
    : floorTheme?.emptyFrameLabel ?? 'Rezervna niša';
  const surfaceLabel = floorTheme?.surfaceLabel ?? 'Podnica sela';
  const roomInterior = getRoomInteriorProfile({
    room,
    roomDefinition,
    assignedHero,
    roomTelegraph,
    prestigeRazina,
    floorTheme,
  });
  const assignmentBonusPct = roomDefinition && room.level > 0
    ? getRoomAssignmentBonusPct(junaci, room, villageSupportStats)
    : 0;
  const buildPct = roomDefinition ? clampPct((room.level / roomDefinition.maxLv) * 100) : 0;
  const repairRemainingMs = room.repairEndsAt ? Math.max(0, room.repairEndsAt - Date.now()) : 0;
  const roomModeLabel = roomDefinition
    ? roomDefinition.kind === 'support' ? 'PODRŠKA' : 'PROIZVODNJA'
    : 'REZERVA';
  const summaryText = roomDefinition
    ? !unlockStatus?.unlocked && room.level <= 0
      ? unlockStatus.shortLabel
      : roomDefinition.kind === 'support'
        ? room.level > 0
          ? getSupportRoomSummary(room, roomDefinition, junaci)
          : 'Otključava sigurniji i stabilniji ritam sela'
        : room.level > 0
          ? formatRate(production)
          : 'Dodaj sobu u ritam sela'
    : 'Druga etaža ostaje prazna u ovoj fazi';
  const primarySignal = !roomDefinition
    ? 'Čeka budući modul'
    : room.status === 'damaged'
      ? 'Incident aktivan'
      : room.status === 'repairing'
        ? `Popravak ${formatCountdown(repairRemainingMs)}`
        : roomDefinition.kind === 'support'
          ? room.level > 0
            ? getSupportRoomSummary(room, roomDefinition, junaci)
            : 'Smanjuje vrhove pritiska'
          : room.level > 0
            ? formatRate(production)
            : 'Spremno za gradnju';
  const secondarySignal = !roomDefinition
    ? 'Rezervni prostor'
    : room.level <= 0
      ? unlockStatus?.unlocked
        ? 'Slot je otvoren'
        : unlockStatus?.shortLabel ?? 'Kasnije'
      : assignmentBonusPct > 0
        ? `+${assignmentBonusPct}% posada`
        : assignedHero
          ? 'Posada u sobi'
          : 'Bez dodijeljene posade';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.roomTile,
        {
          backgroundColor: floorTheme?.roomSurface ?? 'rgba(255,255,255,0.03)',
          borderColor: floorTheme?.roomBorder ?? 'rgba(255,255,255,0.08)',
        },
        selected && styles.roomTileSelected,
        hovered && styles.roomTileHovered,
        room.status === 'damaged' && styles.roomTileDamaged,
        roomTelegraph?.severity === 'critical' && styles.roomTileForecastHot,
        selected && { borderColor: accentColor, backgroundColor: `${accentColor}10` },
      ]}
      onPress={onPress}
    >
      <PhasePulseLayer
        tone={roomPhaseChrome.tone}
        pulseDurationMs={roomPhaseChrome.pulseDurationMs}
        minOpacity={roomPhaseChrome.minOpacity}
        maxOpacity={roomPhaseChrome.maxOpacity}
        style={styles.roomPhasePulse}
      />
      <View style={[styles.roomFrameCap, { backgroundColor: directorPhase === 'calm' ? (floorTheme?.rail ?? 'rgba(255,255,255,0.05)') : `${roomPhaseChrome.tone}88` }]} />
      <View style={[styles.roomToneHalo, { backgroundColor: `${accentColor}14` }]} />

      <View style={styles.roomTileHeader}>
        <View style={styles.roomHeaderBadges}>
          <View style={[
            styles.roomKindBadge,
            { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}44` },
          ]}>
            <Text style={[styles.roomKindTxt, { color: accentColor }]}>{roomModeLabel}</Text>
          </View>
          <View style={[
            styles.roomBadge,
            { backgroundColor: `${status.tone}18`, borderColor: `${status.tone}55` },
          ]}>
            <Text style={[styles.roomBadgeTxt, { color: status.tone }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.roomLv}>{room.type ? `LV ${room.level}/${roomDefinition?.maxLv ?? room.level}` : 'R2'}</Text>
      </View>

      <View style={[
        styles.roomGlyphWrap,
        { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}33` },
      ]}>
        {RoomIcon ? (
          <RoomIcon size={24} color={accentColor} strokeWidth={2.2} />
        ) : (
          <Text style={styles.roomPlaceholder}>+</Text>
        )}
      </View>

      <Text style={styles.roomName}>{roomDefinition?.kratko ?? 'Rezervni modul'}</Text>
      <Text style={styles.roomNote}>{summaryText}</Text>

      <View
        style={[
          styles.roomMaterialRow,
          {
            borderColor: directorPhase === 'calm' ? (floorTheme?.roomBorder ?? 'rgba(255,255,255,0.08)') : `${roomPhaseChrome.tone}30`,
            backgroundColor: directorPhase === 'calm' ? (floorTheme?.rail ?? 'rgba(255,255,255,0.05)') : `${roomPhaseChrome.tone}10`,
          },
        ]}
      >
        <View
          style={[
            styles.roomMaterialChip,
            {
              borderColor: `${floorTheme?.accent ?? accentColor}44`,
              backgroundColor: `${floorTheme?.accent ?? accentColor}16`,
            },
          ]}
        >
          <Text style={[styles.roomMaterialChipTxt, { color: floorTheme?.accent ?? accentColor }]}>{frameLabel}</Text>
        </View>
        <Text style={styles.roomMaterialTxt}>{surfaceLabel}</Text>
      </View>

      <View
        style={[
          styles.roomPhaseBand,
          {
            borderColor: `${roomPhaseChrome.tone}30`,
            backgroundColor: `${roomPhaseChrome.tone}10`,
          },
        ]}
      >
        <Text style={[styles.roomPhaseBandLabel, { color: roomPhaseChrome.tone }]}>{roomPhaseChrome.label}</Text>
        <Text style={styles.roomPhaseBandCopy}>{roomPhaseChrome.copy}</Text>
      </View>

      <View style={styles.roomProgressTrack}>
        <View style={[styles.roomProgressFill, { width: `${buildPct}%`, backgroundColor: accentColor }]} />
      </View>

      <RoomResidentStrip room={room} assignedHero={assignedHero} accentColor={accentColor} interiorProfile={roomInterior} />

      {roomForecast ? (
        <View style={[
          styles.roomForecastRow,
          { backgroundColor: `${telegraphTone}12`, borderColor: `${telegraphTone}33` },
        ]}>
          <Text style={[styles.roomForecastLabel, { color: telegraphTone }]}>{roomTelegraph?.label ?? roomForecast.label}</Text>
          <Text style={styles.roomForecastReason}>{roomTelegraph?.copy ?? roomForecast.reason}</Text>
          {roomTelegraph?.countdownLabel ? <Text style={styles.roomForecastCountdown}>{roomTelegraph.countdownLabel}</Text> : null}
        </View>
      ) : null}

      <View style={styles.roomSignalStack}>
        <View style={[
          styles.roomSignalChip,
          { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}33` },
        ]}>
          <Text style={styles.roomSignalTxt}>{primarySignal}</Text>
        </View>
        <View style={styles.roomSignalChipMuted}>
          <Text style={styles.roomSignalTxtMuted}>{secondarySignal}</Text>
        </View>
      </View>

      <View style={styles.roomCrewRow}>
        <Users size={13} color={assignedHero ? BOJE.textMain : BOJE.textMuted} />
        <Text style={[styles.roomCrewTxt, assignedHero && { color: BOJE.textMain }]}>
          {assignedHero ? `${assignedHero.emodzi} ${assignedHero.naziv}` : 'Bez posade'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const shouldStartHeroDrag = (gestureState) =>
  Math.abs(gestureState.dy) > 8 || (Math.abs(gestureState.dx) > 14 && Math.abs(gestureState.dy) > 4);

const DraggableHeroCard = ({
  hero,
  isCurrentRoom,
  isAssignedElsewhere,
  isGlobalActive,
  dragging,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => shouldStartHeroDrag(gestureState),
    onMoveShouldSetPanResponderCapture: (_, gestureState) => shouldStartHeroDrag(gestureState),
    onPanResponderGrant: (event, gestureState) => {
      onDragStart(hero, gestureState.moveX || event.nativeEvent.pageX, gestureState.moveY || event.nativeEvent.pageY);
    },
    onPanResponderMove: (_, gestureState) => {
      onDragMove(hero, gestureState.moveX, gestureState.moveY);
    },
    onPanResponderRelease: (_, gestureState) => {
      onDragEnd(hero, gestureState.moveX, gestureState.moveY);
    },
    onPanResponderTerminate: (_, gestureState) => {
      onDragEnd(hero, gestureState.moveX, gestureState.moveY);
    },
  })).current;

  return (
    <View {...panResponder.panHandlers} style={dragging && styles.heroDragSourceHidden}>
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.heroAssignCard,
          isCurrentRoom && styles.heroAssignCardActive,
          isAssignedElsewhere && styles.heroAssignCardBusy,
        ]}
        onPress={onPress}
      >
        <Text style={styles.heroAssignEmoji}>{hero.emodzi}</Text>
        <Text style={styles.heroAssignName}>{hero.naziv}</Text>
        <Text style={styles.heroAssignMeta}>
          {isCurrentRoom
            ? 'U ovoj sobi'
            : isAssignedElsewhere
              ? `Premjesti iz ${getVillageRoomDefinition(isAssignedElsewhere)?.kratko ?? 'druge sobe'}`
              : 'Slobodan za raspored'}
        </Text>
        <Text style={[styles.heroAssignMeta, isGlobalActive && { color: BOJE.nadogradnje }]}>
          {isGlobalActive ? 'Globalni bonus aktivan' : 'Globalni bonus nije aktivan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const VillageScreen = () => {
  const navigation = useNavigation();
  const uid = useGameStore((s) => s.uid);
  const zlato = useGameStore((s) => s.zlato);
  const energija = useGameStore((s) => s.energija);
  const stitovi = useGameStore((s) => s.stitovi);
  const resursi = useGameStore((s) => s.resursi);
  const gradevine = useGameStore((s) => s.gradevine);
  const ostecenja = useGameStore((s) => s.ostecenja);
  const villageRoomsState = useGameStore((s) => s.villageRooms);
  const izvrsiPrestige = useGameStore((s) => s.izvrsiPrestige);
  const raidPovijest = useGameStore((s) => s.raidPovijest);
  const junaci = useGameStore((s) => s.junaci);
  const aktivniJunaci = useGameStore((s) => s.aktivniJunaci);
  const igracRazina = useGameStore((s) => s.igracRazina);
  const prestigeRazina = useGameStore((s) => s.prestigeRazina);
  const razine = useGameStore((s) => s.razine);
  const villagePressureDirector = useGameStore((s) => s.villagePressureDirector);
  const postaviRevengeTarget = useGameStore((s) => s.postaviRevengeTarget);
  const nadogradiSobu = useGameStore((s) => s.nadogradiSobu);
  const pokreniPopravakSobe = useGameStore((s) => s.pokreniPopravakSobe);
  const hitniPopravakSobe = useGameStore((s) => s.hitniPopravakSobe);
  const aktivirajIncidentOdgovor = useGameStore((s) => s.aktivirajIncidentOdgovor);
  const dodijeliHeroURoom = useGameStore((s) => s.dodijeliHeroURoom);
  const ukloniHeroIzSobe = useGameStore((s) => s.ukloniHeroIzSobe);
  const setRaidAktivan = useSlotStore((s) => s.setRaidAktivan);

  const [ucitavaPovijest, setUcitavaPovijest] = useState(false);
  const rooms = normalizeVillageRooms(villageRoomsState, gradevine, ostecenja);
  const [selectedRoomId, setSelectedRoomId] = useState(() => getFirstVillageRoomId(rooms));
  const screenRootRef = useRef(null);
  const roomRefs = useRef(new Map());
  const roomDropFramesRef = useRef(new Map());
  const screenOffsetRef = useRef({ x: 0, y: 0 });
  const dragPreviewPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [draggingHeroId, setDraggingHeroId] = useState(null);
  const [hoverRoomId, setHoverRoomId] = useState(null);
  const villageState = { villageRooms: rooms, gradevine, ostecenja, junaci, prestigeRazina };
  const villageUnlockSeen = useGameStore((s) => s.villageUnlockSeen);
  const showVillageUnlock = useGameStore((s) => s.showVillageUnlock);

  const globalHeroPassive = 1 + (izracunajHeroBonus(junaci, aktivniJunaci, 'pasivno') / 100);
  const villageMultiplier = izracunajPasivniMnozitelj(igracRazina, prestigeRazina) * globalHeroPassive;
  const villageSupportStats = getVillageSupportStats(villageState);
  const maxEnergija = izracunajMaxEnergiju(razine?.baterija ?? 0) + Math.round(villageSupportStats.maxEnergyFlat || 0);
  const produkcija = getVillageProduction(villageState, villageMultiplier);
  const aktivneSobe = rooms.filter((room) => room.type && room.level > 0 && room.status === 'active').length;
  const posadjeneSobe = rooms.filter((room) => room.assignedHeroId).length;
  const supportRooms = rooms.filter((room) => isSupportRoom(room) && room.level > 0 && room.status === 'active').length;
  const incidentRoom = getVillageIncidentRoom(rooms);
  const villagePressure = getVillagePressureState({
    rooms,
    energija,
    maxEnergija,
    villageSupportStats,
    pressureDirector: villagePressureDirector,
  });
  const prestigeStage = getVillagePrestigeStage(prestigeRazina);
  const villageVisualTheme = getVillageVisualTheme(prestigeRazina);
  const groundFloorTheme = villageVisualTheme.floors[0];
  const supportFloorTheme = villageVisualTheme.floors[1];
  const shellPhaseVisual = getVillagePhaseVisualState({ directorPhase: villagePressure.directorPhase });
  const groundPhaseVisual = getVillagePhaseVisualState({ directorPhase: villagePressure.directorPhase, floor: 0 });
  const supportPhaseVisual = getVillagePhaseVisualState({ directorPhase: villagePressure.directorPhase, floor: 1 });
  const villageForecast = getVillageForecastState({
    rooms,
    villagePressure,
    villageSupportStats,
    junaci,
  });
  const roomTelegraphById = Object.fromEntries(
    Object.entries(villageForecast.riskByRoomId)
      .map(([roomId, roomForecast]) => [roomId, getRoomTelegraphState({ roomForecast, villagePressure })])
      .filter(([, telegraph]) => !!telegraph),
  );
  const supportDeckRooms = rooms.filter((room) => isSupportRoom(room));
  const focusForecast = villageForecast.watchList[0] ?? null;
  const focusForecastRoomDefinition = getVillageRoomDefinition(focusForecast?.room);
  const focusTelegraph = focusForecast ? roomTelegraphById[focusForecast.id] ?? null : null;
  const hasPreIncidentWarning = !incidentRoom && !!focusTelegraph;
  const eventTone = incidentRoom ? BOJE.slotVatra : focusTelegraph?.tone ?? BOJE.energija;
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const selectedRoomDefinition = getVillageRoomDefinition(selectedRoom);
  const selectedRoomForecast = selectedRoom ? villageForecast.riskByRoomId[selectedRoom.id] ?? null : null;
  const selectedRoomTelegraph = selectedRoom ? roomTelegraphById[selectedRoom.id] ?? null : null;
  const selectedRoomFloor = VILLAGE_LAYOUT.find((slot) => slot.id === selectedRoom?.id)?.floor ?? 0;
  const selectedFloorTheme = selectedRoomFloor === 1 ? supportFloorTheme : groundFloorTheme;
  const selectedRoomUnlockStatus = selectedRoom ? getVillageRoomUnlockStatus(selectedRoom, villageState) : { unlocked: false, shortLabel: 'Kasnije', requirementText: null };
  const selectedIncident = getVillageIncidentDefinition(selectedRoom?.incidentType);
  const selectedIncidentResponse = selectedRoom ? getVillageIncidentResponse(selectedRoom, villageState) : null;
  const selectedRoomCost = selectedRoomDefinition?.cijena
    ? selectedRoomDefinition.cijena((selectedRoom?.level || 0) + 1)
    : null;
  const selectedRoomAssignedHero = getHeroDefinition(selectedRoom?.assignedHeroId);
  const selectedRoomBonusPct = selectedRoom ? getRoomAssignmentBonusPct(junaci, selectedRoom, villageSupportStats) : 0;
  const selectedRoomBaseAssignmentMultiplier = selectedRoom ? getRoomAssignmentMultiplier(junaci, selectedRoom) : 1;
  const selectedRoomAssignmentMultiplier = selectedRoom ? getRoomAssignmentMultiplier(junaci, selectedRoom, villageSupportStats) : 1;
  const selectedRoomSupportEffects = selectedRoomDefinition?.supportEffect
    ? {
      productionPct: Math.round((selectedRoomDefinition.supportEffect.villageProductionPct ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
      safetyPct: Math.round((selectedRoomDefinition.supportEffect.incidentRiskPct ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
      repairTimePct: Math.round((selectedRoomDefinition.supportEffect.repairTimePct ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
      repairCostPct: Math.round((selectedRoomDefinition.supportEffect.repairCostPct ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
      crewBonusPct: Math.round((selectedRoomDefinition.supportEffect.crewBonusPct ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
      maxEnergyFlat: Math.round((selectedRoomDefinition.supportEffect.maxEnergyFlat ?? 0) * selectedRoom.level * selectedRoomBaseAssignmentMultiplier),
    }
    : null;
  const selectedRoomPrimarySupportLabel = selectedRoomSupportEffects
    ? selectedRoomSupportEffects.maxEnergyFlat > 0
      ? `+${selectedRoomSupportEffects.maxEnergyFlat} max ⚡`
      : selectedRoomSupportEffects.crewBonusPct > 0
        ? `+${selectedRoomSupportEffects.crewBonusPct}% posada`
        : selectedRoomSupportEffects.productionPct > 0
          ? `+${selectedRoomSupportEffects.productionPct}% selo`
          : 'Globalna podrška'
    : 'Globalna podrška';
  const selectedRoomRepairCost = selectedRoom ? getVillageRepairCost(selectedRoom, villageState) : null;
  const selectedRoomRepairMs = selectedRoom ? getVillageRepairDurationMs(selectedRoom, villageState) : 0;
  const selectedRoomRepairRemainingMs = selectedRoom?.repairEndsAt ? Math.max(0, selectedRoom.repairEndsAt - Date.now()) : 0;
  const selectedRoomInterior = selectedRoom
    ? getRoomInteriorProfile({
      room: selectedRoom,
      roomDefinition: selectedRoomDefinition,
      assignedHero: selectedRoomAssignedHero,
      roomTelegraph: selectedRoomTelegraph,
      prestigeRazina,
      floorTheme: selectedFloorTheme,
    })
    : null;
  const otkljucaniJunaci = JUNACI.filter((hero) => (junaci[hero.id]?.razina ?? 0) > 0);
  const draggingHero = draggingHeroId ? getHeroDefinition(draggingHeroId) : null;
  const spremanZaPrestige =
    gradevine.pilana === ZGRADE[0].maxLv
    && gradevine.kamenolom === ZGRADE[1].maxLv
    && gradevine.rudnik === ZGRADE[2].maxLv;

  const updateScreenOffset = () => {
    screenRootRef.current?.measureInWindow?.((x, y) => {
      screenOffsetRef.current = { x, y };
    });
  };

  const refreshRoomDropFrames = () => {
    roomRefs.current.forEach((node, roomId) => {
      node?.measureInWindow?.((x, y, width, height) => {
        roomDropFramesRef.current.set(roomId, { x, y, width, height });
      });
    });
  };

  const findDropRoomId = (pageX, pageY) => {
    for (const room of rooms) {
      const frame = roomDropFramesRef.current.get(room.id);
      if (!frame) continue;
      const isWithinBounds = pageX >= frame.x
        && pageX <= frame.x + frame.width
        && pageY >= frame.y
        && pageY <= frame.y + frame.height;
      if (!isWithinBounds) continue;
      if (!room.type || room.level <= 0 || room.status !== 'active') return null;
      return room.id;
    }
    return null;
  };

  const updateDragPreviewPosition = (pageX, pageY) => {
    dragPreviewPosition.setValue({
      x: pageX - screenOffsetRef.current.x - 82,
      y: pageY - screenOffsetRef.current.y - 54,
    });
  };

  const handleHeroDragStart = (hero, pageX, pageY) => {
    updateScreenOffset();
    refreshRoomDropFrames();
    setDraggingHeroId(hero.id);
    setHoverRoomId(null);
    updateDragPreviewPosition(pageX, pageY);
  };

  const handleHeroDragMove = (_, pageX, pageY) => {
    updateDragPreviewPosition(pageX, pageY);
    const nextRoomId = findDropRoomId(pageX, pageY);
    setHoverRoomId((currentRoomId) => (currentRoomId === nextRoomId ? currentRoomId : nextRoomId));
  };

  const handleHeroDragEnd = (hero, pageX, pageY) => {
    const dropRoomId = findDropRoomId(pageX, pageY);
    if (dropRoomId) {
      dodijeliHeroURoom(dropRoomId, hero.id);
      setSelectedRoomId(dropRoomId);
    }
    setDraggingHeroId(null);
    setHoverRoomId(null);
  };

  const potvrdiPrestige = () => {
    Alert.alert(
      'Potvrdi Prestige',
      'Ovo resetira selo na početni ritam, ali zadržava trajni prestige bonus. Nastaviti?',
      [
        { text: 'Odustani', style: 'cancel' },
        { text: 'Izvrši Prestige', style: 'destructive', onPress: izvrsiPrestige },
      ],
    );
  };

  useEffect(() => {
    if (!rooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(getFirstVillageRoomId(rooms));
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateScreenOffset();
      refreshRoomDropFrames();
    });

    return () => cancelAnimationFrame(frame);
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    let aktivan = true;
    if (!uid) return undefined;

    setUcitavaPovijest(true);
    dohvatiRaidPovijest(uid)
      .then((povijest) => {
        if (!aktivan || !Array.isArray(povijest)) return;
        useGameStore.setState({ raidPovijest: povijest.slice(0, 20) });
      })
      .finally(() => {
        if (aktivan) setUcitavaPovijest(false);
      });

    return () => {
      aktivan = false;
    };
  }, [uid]);

  useEffect(() => {
    rooms.forEach((room) => {
      if (!room?.type || room.level > 0 || villageUnlockSeen.includes(room.id)) return;
      const unlockStatus = getVillageRoomUnlockStatus(room, villageState);
      if (unlockStatus.unlocked) {
        showVillageUnlock(room.id, room.type);
      }
    });
  }, [rooms, villageUnlockSeen, villageState, showVillageUnlock]);

  return (
    <View
      ref={screenRootRef}
      collapsable={false}
      style={styles.screenRoot}
      onLayout={() => {
        updateScreenOffset();
        refreshRoomDropFrames();
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={draggingHeroId === null}
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Baza</Text>
        <Text style={styles.heroTitle}>Selo je sada glavna petlja igre.</Text>
        <Text style={styles.heroSubtitle}>
          Dodijeli junake sobama, održavaj proizvodnju stabilnom i koristi automat kao kratki burst resursa kada selo traži podršku.
        </Text>

        <View style={styles.metricsGrid}>
          <SummaryMetric label="Aktivne sobe" value={String(aktivneSobe)} accentColor={BOJE.xp} />
          <SummaryMetric
            label="Posada"
            value={villageSupportStats.crewBonusPct > 0 ? `${posadjeneSobe} / +${Math.round(villageSupportStats.crewBonusPct)}%` : String(posadjeneSobe)}
            accentColor={BOJE.klan}
          />
          <SummaryMetric
            label="Podrška"
            value={villageSupportStats.maxEnergyFlat > 0 ? `${supportRooms} / +${Math.round(villageSupportStats.maxEnergyFlat)}⚡` : `${supportRooms} soba`}
            accentColor={BOJE.stit}
          />
          <SummaryMetric label="Sigurnost" value={`-${Math.round(villageSupportStats.incidentRiskPct)}% rizik`} accentColor={BOJE.misije} />
          <SummaryMetric label="Drvo" value={formatRate(produkcija.drvo)} accentColor={BOJE.drvo} />
          <SummaryMetric label="Kamen + željezo" value={`${formatRate(produkcija.kamen)} · ${formatRate(produkcija.zeljezo)}`} accentColor={BOJE.kamen} />
        </View>
      </View>

      <View style={[
        styles.transformationCard,
        {
          borderColor: villageVisualTheme.shell.border,
          backgroundColor: villageVisualTheme.shell.surface,
        },
      ]}>
        <View style={[styles.transformationGlow, { backgroundColor: villageVisualTheme.shell.glow }]} />
        <View style={styles.transformationHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.transformationEyebrow, { color: prestigeStage.accentColor }]}>{prestigeStage.label}</Text>
            <Text style={styles.transformationTitle}>Transformacija sela kroz prestige</Text>
          </View>
          <View style={styles.transformationPill}>
            <Text style={styles.transformationPillTxt}>P {prestigeRazina}</Text>
          </View>
        </View>
        <Text style={styles.transformationCopy}>{prestigeStage.copy}</Text>
        <Text style={styles.transformationStructureCopy}>{villageVisualTheme.shell.copy}</Text>
        <View style={styles.transformationMaterialsRow}>
          {villageVisualTheme.shell.tags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.transformationMaterialChip,
                {
                  borderColor: `${prestigeStage.accentColor}33`,
                  backgroundColor: `${prestigeStage.accentColor}10`,
                },
              ]}
            >
              <Text style={[styles.transformationMaterialChipTxt, { color: prestigeStage.accentColor }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <View style={styles.transformationTrack}>
          <View
            style={[
              styles.transformationFill,
              {
                width: `${Math.max(prestigeStage.progressPct, prestigeStage.progressPct > 0 ? 8 : 0)}%`,
                backgroundColor: prestigeStage.accentColor,
              },
            ]}
          />
        </View>
        <Text style={styles.transformationMeta}>{prestigeStage.progressLabel}</Text>
      </View>

      <View style={styles.pressureCard}>
        <View style={styles.pressureHeader}>
          <View style={styles.pressureTextColumn}>
            <View style={[
              styles.pressureBadge,
              { backgroundColor: `${villagePressure.directorTone}18`, borderColor: `${villagePressure.directorTone}44` },
            ]}>
              <Text style={[styles.pressureBadgeTxt, { color: villagePressure.directorTone }]}>{villagePressure.cycleLabel}</Text>
            </View>
            <Text style={styles.pressureTitle}>Taktička ploča sela</Text>
            <Text style={styles.pressureCopy}>{villagePressure.copy}</Text>
          </View>

          <View style={[
            styles.pressureScoreOrb,
            { borderColor: `${villagePressure.tone}55`, backgroundColor: `${villagePressure.tone}12` },
          ]}>
            <Text style={[styles.pressureScoreValue, { color: villagePressure.tone }]}>{villagePressure.pressureScore}</Text>
            <Text style={styles.pressureScoreLabel}>Pritisak</Text>
          </View>
        </View>

        <View style={[
          styles.phaseWindowCard,
          { borderColor: `${villagePressure.directorTone}33`, backgroundColor: `${villagePressure.directorTone}10` },
        ]}>
          <Text style={[styles.phaseWindowEyebrow, { color: villagePressure.directorTone }]}>DIREKTOR VALA</Text>
          <Text style={styles.phaseWindowTitle}>{villagePressure.directorLabel}</Text>
          <Text style={styles.phaseWindowCopy}>{villagePressure.directorCopy}</Text>
          <Text style={styles.phaseWindowMeta}>
            Sljedeći prijelaz za {formatCountdown(villagePressure.directorRemainingMs)} · tempo incidenta {villagePressure.directorChancePct}% od baznog ritma
          </Text>
        </View>

        <View style={styles.forecastCard}>
          <Text style={styles.forecastEyebrow}>PROGNOZA PRITISKA</Text>
          <Text style={styles.forecastTitle}>{villageForecast.forecastTitle}</Text>
          <Text style={styles.forecastCopy}>{villageForecast.forecastCopy}</Text>

          <View style={styles.forecastChipsRow}>
            {villageForecast.watchList.map((item) => (
              <ForecastChip
                key={item.id}
                item={item}
                onPress={() => setSelectedRoomId(item.id)}
              />
            ))}
          </View>

          <Text style={styles.forecastAction}>{villageForecast.forecastAction}</Text>
        </View>

        <View style={styles.pressureMetaRow}>
          <View style={styles.pressureMetaPill}>
            <Text style={styles.pressureMetaTxt}>{villagePressure.label}</Text>
          </View>
          <View style={styles.pressureMetaPill}>
            <Text style={styles.pressureMetaTxt}>{villagePressure.damagedCount + villagePressure.repairingCount} aktivnih zastoja</Text>
          </View>
          <View style={styles.pressureMetaPill}>
            <Text style={styles.pressureMetaTxt}>{villagePressure.activeSupportRoomsCount}/{Math.max(supportDeckRooms.length, 1)} sobe podrške online</Text>
          </View>
        </View>

        <View style={styles.signalGrid}>
          <SignalMeter
            label="Pritisak"
            value={villagePressure.pressureScore}
            accentColor={villagePressure.tone}
            note={incidentRoom ? 'Incident drži selo u reakciji' : 'Val oscilira kroz zalihu, kvarove i raspored'}
          />
          <SignalMeter
            label="Spremnost"
            value={villagePressure.readinessScore}
            accentColor={BOJE.klan}
            note={`${villagePressure.activeRoomsCount}/${Math.max(villagePressure.builtRoomsCount, 1)} izgrađenih soba trenutno radi`}
          />
          <SignalMeter
            label="Rezerva"
            value={villagePressure.reservePct}
            accentColor={BOJE.energija}
            note={`${Math.floor(energija)} / ${maxEnergija} energije za hitne odluke`}
          />
          <SignalMeter
            label="Posada"
            value={villagePressure.crewCoveragePct}
            accentColor={BOJE.prestige}
            note={villagePressure.activeRoomsCount > 0
              ? `${villagePressure.staffedActiveRoomsCount}/${villagePressure.activeRoomsCount} aktivnih smjena popunjeno`
              : 'Izgradi prve sobe za puni raspored'}
          />
        </View>

        <Text style={styles.pressureHint}>{villagePressure.recommendation}</Text>
      </View>

      <View style={[
        styles.eventCard,
        (incidentRoom || hasPreIncidentWarning) && {
          borderColor: `${eventTone}99`,
          backgroundColor: `${eventTone}12`,
        },
      ]}>
        <View style={styles.eventHeader}>
          <View style={styles.eventIconWrap}>
            {incidentRoom || hasPreIncidentWarning ? <AlertTriangle size={18} color={eventTone} /> : <Zap size={18} color={BOJE.energija} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>
              {incidentRoom
                ? 'Hitna situacija u selu'
                : hasPreIncidentWarning
                  ? `Nadgledaj ${focusForecastRoomDefinition?.naziv ?? 'kritičnu sobu'}`
                  : villagePressure.cycleLabel}
            </Text>
            <Text style={styles.eventCopy}>
              {incidentRoom
                ? `${getVillageIncidentDefinition(incidentRoom.incidentType)?.naziv ?? 'Incident'} u sobi ${getVillageRoomDefinition(incidentRoom)?.naziv ?? 'Soba'} traži reakciju. Pokreni popravak ili zatvori manjak proizvodnje preko automata.`
                : hasPreIncidentWarning
                  ? `${focusForecastRoomDefinition?.naziv ?? 'Ova soba'} nosi najveći prediktivni rizik u sljedećem valu. ${focusTelegraph?.copy ?? focusForecast?.reason ?? villagePressure.recommendation} ${focusTelegraph?.countdownLabel ?? ''}`
                  : `${villagePressure.recommendation} Automat služi kao kratka korekcija kad želiš kupiti vrijeme.`}
            </Text>
          </View>
        </View>

        <View style={styles.eventActions}>
          {incidentRoom ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryPill}
              onPress={() => setSelectedRoomId(incidentRoom.id)}
            >
              <Text style={styles.primaryPillTxt}>OTVORI SOBU</Text>
            </TouchableOpacity>
          ) : hasPreIncidentWarning ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryPill, { backgroundColor: eventTone }]}
              onPress={() => focusForecast?.id && setSelectedRoomId(focusForecast.id)}
            >
              <Text style={styles.primaryPillTxt}>POSTAVI NADZOR</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryPill}
            onPress={() => navigation.navigate('Igraj')}
          >
            <Text style={styles.secondaryPillTxt}>AUTOMAT ZA BURST RESURSE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[
        styles.supportDeckCard,
        {
          borderColor: supportFloorTheme.border,
          backgroundColor: supportFloorTheme.surface,
        },
      ]}>
        <View style={styles.supportDeckHeader}>
          <Text style={styles.supportDeckEyebrow}>Gornja etaža</Text>
          <Text style={styles.supportDeckTitle}>Podrška određuje koliko selo oscilira.</Text>
          <Text style={[styles.supportDeckMaterial, { color: supportFloorTheme.accent }]}>{supportFloorTheme.materialLabel}</Text>
          <Text style={styles.supportDeckCopy}>
            {prestigeStage.supportLabel} · servis, zapovjedništvo i jezgra ne dižu samo brojke. Oni smanjuju amplitude između mirnog prozora i naglog udara.
          </Text>
        </View>

        <View style={styles.supportDeckGrid}>
          {supportDeckRooms.map((room) => {
            const roomDefinition = getVillageRoomDefinition(room);
            const unlockStatus = getVillageRoomUnlockStatus(room, villageState);
            const status = statusMeta(room, unlockStatus);
            const assignedHero = getHeroDefinition(room.assignedHeroId);
            const accentColor = roomDefinition?.boja ?? status.tone;
            const primaryText = room.level > 0
              ? getSupportRoomSummary(room, roomDefinition, junaci)
              : unlockStatus.unlocked
                ? 'Spremno za izgradnju'
                : unlockStatus.shortLabel;
            const secondaryText = assignedHero
              ? `${assignedHero.emodzi} ${assignedHero.naziv} vodi smjenu`
              : room.level > 0
                ? 'Bez dodijeljene posade'
                : unlockStatus.requirementText ?? 'Otključava se kroz razvoj osnovnih soba';

            return (
              <TouchableOpacity
                key={room.id}
                activeOpacity={0.82}
                style={[
                  styles.supportDeckItem,
                  { borderColor: `${accentColor}2A`, backgroundColor: `${accentColor}10` },
                  room.status === 'damaged' && styles.supportDeckItemAlert,
                ]}
                onPress={() => setSelectedRoomId(room.id)}
              >
                <View style={styles.supportDeckItemHeader}>
                  <Text style={[styles.supportDeckItemEyebrow, { color: accentColor }]}>
                    {room.level > 0 ? `LV ${room.level}` : 'ETAŽA 2'}
                  </Text>
                  <View style={[
                    styles.supportDeckItemBadge,
                    { backgroundColor: `${status.tone}18`, borderColor: `${status.tone}44` },
                  ]}>
                    <Text style={[styles.supportDeckItemBadgeTxt, { color: status.tone }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.supportDeckItemName}>{roomDefinition?.naziv ?? 'Rezervni modul'}</Text>
                <Text style={styles.supportDeckItemPrimary}>{primaryText}</Text>
                <Text style={styles.supportDeckItemSecondary}>{secondaryText}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.villageShell,
          {
            borderColor: villageVisualTheme.shell.border,
            backgroundColor: villageVisualTheme.shell.surface,
          },
        ]}
      >
        <View style={[styles.villageShellGlow, { backgroundColor: villageVisualTheme.shell.glow }]} />
        <PhasePulseLayer
          tone={shellPhaseVisual.tone}
          pulseDurationMs={shellPhaseVisual.pulseDurationMs}
          minOpacity={shellPhaseVisual.minOpacity}
          maxOpacity={shellPhaseVisual.maxOpacity}
          style={styles.villageShellPulse}
        />
        <View style={styles.villageShellHeader}>
          <Text style={styles.villageShellTitle}>PRESJEK NASELJA</Text>
          <Text style={styles.villageShellSub}>{prestigeStage.label} · {villagePressure.cycleLabel.toLowerCase()} · prizemlje proizvodi, gornja etaža amortizira udar.</Text>
        </View>

        <View
          style={[
            styles.shellPhaseCard,
            {
              borderColor: `${shellPhaseVisual.tone}40`,
              backgroundColor: `${shellPhaseVisual.tone}10`,
            },
          ]}
        >
          <View style={styles.shellPhaseHeader}>
            <Text style={[styles.shellPhaseEyebrow, { color: shellPhaseVisual.tone }]}>{shellPhaseVisual.label}</Text>
            <Text style={styles.shellPhaseMeta}>{formatCountdown(villagePressure.directorRemainingMs)}</Text>
          </View>
          <Text style={styles.shellPhaseCopy}>{shellPhaseVisual.copy}</Text>
        </View>

        <View
          style={[
            styles.shellMaterialCard,
            {
              borderColor: villageVisualTheme.shell.border,
              backgroundColor: villageVisualTheme.shell.plate,
            },
          ]}
        >
          <Text style={[styles.shellMaterialTitle, { color: prestigeStage.accentColor }]}>{villageVisualTheme.shell.materialLabel}</Text>
          <Text style={styles.shellMaterialCopy}>{villageVisualTheme.shell.copy}</Text>
          <View style={styles.shellMaterialTagsRow}>
            {villageVisualTheme.shell.tags.map((tag) => (
              <View key={tag} style={[styles.shellMaterialTag, { backgroundColor: villageVisualTheme.shell.beam }]}>
                <Text style={styles.shellMaterialTagTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {[0, 1].map((floor) => {
          const floorTheme = floor === 0 ? groundFloorTheme : supportFloorTheme;
          const floorPhaseVisual = floor === 0 ? groundPhaseVisual : supportPhaseVisual;

          return (
            <View
              key={`floor-${floor}`}
              style={[
                styles.floorRow,
                {
                  borderColor: floorTheme.border,
                  backgroundColor: floorTheme.surface,
                },
              ]}
            >
              <PhasePulseLayer
                tone={floorPhaseVisual.tone}
                pulseDurationMs={floorPhaseVisual.pulseDurationMs}
                minOpacity={floorPhaseVisual.minOpacity}
                maxOpacity={floorPhaseVisual.maxOpacity}
                style={styles.floorPhasePulse}
              />
              <View
                style={[
                  styles.floorAccentRail,
                  { backgroundColor: floorTheme.rail },
                ]}
              />
              <View
                style={[
                  styles.floorPhaseCard,
                  {
                    borderColor: `${floorPhaseVisual.tone}36`,
                    backgroundColor: `${floorPhaseVisual.tone}10`,
                  },
                ]}
              >
                <Text style={[styles.floorPhaseLabel, { color: floorPhaseVisual.tone }]}>{floorPhaseVisual.rowLabel}</Text>
                <Text style={styles.floorPhaseCopy}>{floorPhaseVisual.rowCopy}</Text>
              </View>
              <View style={styles.floorHeaderRow}>
                <Text style={styles.floorLabel}>{floor === 0 ? 'PRIZEMLJE · PROIZVODNJA' : 'GORNJA ETAŽA · PODRŠKA'}</Text>
                <Text style={[styles.floorStageLabel, floor === 1 && { color: prestigeStage.accentColor }]}> 
                  {floor === 0 ? prestigeStage.groundLabel : prestigeStage.supportLabel}
                </Text>
              </View>
              <Text style={[styles.floorMaterialTxt, { color: floorTheme.accent }]}>{floorTheme.materialLabel}</Text>
              <View style={styles.floorBraceRow}>
                {Array.from({ length: 3 }).map((_, braceIndex) => (
                  <View
                    key={`floor-${floor}-brace-${braceIndex}`}
                    style={[
                      styles.floorBraceSegment,
                      {
                        backgroundColor: braceIndex === 1 ? floorTheme.rail : floorTheme.brace,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.floorTrack}>
                {VILLAGE_LAYOUT
                  .filter((slot) => slot.floor === floor)
                  .map((slot) => {
                    const room = rooms.find((item) => item.id === slot.id);
                    const roomDefinition = getVillageRoomDefinition(room);
                    const roomUnlockStatus = getVillageRoomUnlockStatus(room, villageState);
                    const roomForecast = villageForecast.riskByRoomId[slot.id] ?? null;
                    const production = roomDefinition && room.level > 0 && room.status === 'active'
                      ? room.level
                        * roomDefinition.baseProduction
                        * villageMultiplier
                        * getRoomAssignmentMultiplier(junaci, room, villageSupportStats)
                      : 0;

                    return (
                      <View
                        key={slot.id}
                        ref={(node) => {
                          if (node) roomRefs.current.set(slot.id, node);
                          else roomRefs.current.delete(slot.id);
                        }}
                        collapsable={false}
                        style={styles.roomDropWrap}
                        onLayout={refreshRoomDropFrames}
                      >
                        <VillageRoomTile
                          room={room}
                          selected={selectedRoomId === slot.id}
                          hovered={hoverRoomId === slot.id && draggingHeroId !== null}
                          production={production}
                          junaci={junaci}
                          unlockStatus={roomUnlockStatus}
                          villageSupportStats={villageSupportStats}
                          roomForecast={roomForecast}
                          roomTelegraph={roomTelegraphById[slot.id] ?? null}
                          floorTheme={floorTheme}
                          prestigeRazina={prestigeRazina}
                          directorPhase={villagePressure.directorPhase}
                          onPress={() => setSelectedRoomId(slot.id)}
                        />
                      </View>
                    );
                  })}
              </View>
            </View>
          );
        })}
      </View>

      {selectedRoom && (
        <View
          style={[
            styles.inspectorCard,
            {
              borderColor: selectedRoomTelegraph?.tone ? `${selectedRoomTelegraph.tone}55` : selectedFloorTheme.border,
              backgroundColor: selectedRoom.status === 'damaged'
                ? `${BOJE.slotVatra}10`
                : selectedFloorTheme.surface,
            },
          ]}
        >
          <View style={[styles.inspectorGlow, { backgroundColor: `${selectedRoomInterior?.tone ?? selectedFloorTheme.accent}10` }]} />
          <View style={styles.inspectorHeader}>
            <View>
              <Text style={styles.inspectorEyebrow}>Inspektor sobe</Text>
              <Text style={styles.inspectorTitle}>{selectedRoomDefinition?.naziv ?? 'Rezervni modul'}</Text>
            </View>
            <View style={[
              styles.inspectorBadge,
              !selectedRoomUnlockStatus.unlocked && selectedRoom.level <= 0 && styles.inspectorBadgeLocked,
            ]}>
              <Text style={styles.inspectorBadgeTxt}>{statusMeta(selectedRoom, selectedRoomUnlockStatus).label}</Text>
            </View>
          </View>

          <Text style={styles.inspectorCopy}>
            {selectedRoomDefinition?.opis ?? 'Rezervni prostor ostaje prazan dok osnovna tri modula ne postanu dovoljno jaka.'}
          </Text>

          {selectedRoomInterior ? (
            <View
              style={[
                styles.inspectorInteriorPanel,
                {
                  borderColor: selectedFloorTheme.border,
                  backgroundColor: selectedFloorTheme.roomSurface ?? 'rgba(255,255,255,0.04)',
                },
              ]}
            >
              <View style={styles.inspectorInteriorHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inspectorInteriorEyebrow, { color: selectedRoomInterior.tone }]}>{selectedRoomInterior.stageLabel}</Text>
                  <Text style={styles.inspectorInteriorTitle}>{selectedRoomInterior.sceneLabel}</Text>
                </View>
                <View
                  style={[
                    styles.inspectorInteriorBadge,
                    {
                      borderColor: `${selectedRoomInterior.tone}44`,
                      backgroundColor: `${selectedRoomInterior.tone}16`,
                    },
                  ]}
                >
                  <Text style={[styles.inspectorInteriorBadgeTxt, { color: selectedRoomInterior.tone }]}>{selectedRoomInterior.postureLabel}</Text>
                </View>
              </View>

              <Text style={styles.inspectorInteriorCopy}>{selectedRoomInterior.postureCopy}</Text>

              <InteriorTensionPanel
                tone={selectedRoomInterior.tone}
                label={selectedRoomInterior.tensionLabel}
                copy={selectedRoomInterior.tensionCopy}
                countdownLabel={selectedRoomInterior.tensionCountdownLabel}
                progressPct={selectedRoomInterior.tensionProgressPct}
              />

              <View style={styles.inspectorInteriorTagsRow}>
                <View
                  style={[
                    styles.inspectorInteriorMaterialChip,
                    {
                      borderColor: `${selectedFloorTheme.accent}3A`,
                      backgroundColor: `${selectedFloorTheme.accent}14`,
                    },
                  ]}
                >
                  <Text style={[styles.inspectorInteriorMaterialChipTxt, { color: selectedFloorTheme.accent }]}>{selectedRoomInterior.materialLabel}</Text>
                </View>
                <View style={styles.inspectorInteriorLayoutChip}>
                  <Text style={styles.inspectorInteriorLayoutChipTxt}>{selectedRoomInterior.sceneLayout.label}</Text>
                </View>
              </View>

              <InteriorSceneBoard
                sceneLayout={selectedRoomInterior.sceneLayout}
                accentColor={selectedRoomInterior.tone}
                active={selectedRoom.level > 0 && selectedRoom.status !== 'damaged'}
                tensionLevel={selectedRoomInterior.tensionLevel}
                motionPattern={selectedRoomInterior.propPattern}
                baseDurationMs={selectedRoomInterior.baseDurationMs + 120}
                motionAmplitude={selectedRoomInterior.motionAmplitude}
                large
              />
            </View>
          ) : null}

          {selectedRoomDefinition ? (
            <>
              <View style={styles.inspectorStatsRow}>
                <View style={styles.inspectorStat}>
                  <Coins size={16} color={selectedRoomDefinition.boja} />
                  <Text style={styles.inspectorStatTxt}>{selectedRoom.level > 0 ? `LV ${selectedRoom.level}` : 'Nije izgrađena'}</Text>
                </View>
                <View style={styles.inspectorStat}>
                  <Zap size={16} color={selectedRoomDefinition.kind === 'support' ? selectedRoomDefinition.boja : BOJE.energija} />
                  <Text style={styles.inspectorStatTxt}>
                    {selectedRoomDefinition.kind === 'support'
                      ? selectedRoom.level > 0
                        ? selectedRoomPrimarySupportLabel
                        : 'Globalna podrška'
                      : selectedRoom.level > 0 && selectedRoom.status === 'active'
                        ? formatRate(
                          selectedRoom.level
                          * selectedRoomDefinition.baseProduction
                          * villageMultiplier
                          * selectedRoomAssignmentMultiplier
                        )
                        : '0/s'}
                  </Text>
                </View>
                <View style={styles.inspectorStat}>
                  <Crown size={16} color={selectedRoomBonusPct > 0 ? BOJE.prestige : BOJE.textMuted} />
                  <Text style={styles.inspectorStatTxt}>{selectedRoomBonusPct > 0 ? `+${selectedRoomBonusPct}% posada` : 'Bez bonusa'}</Text>
                </View>
              </View>

              {selectedRoomDefinition.kind === 'support' && selectedRoom.level > 0 && selectedRoomSupportEffects && (
                <View style={styles.supportPanel}>
                  <Text style={styles.costLabel}>Učinak sobe podrške</Text>
                  {selectedRoomSupportEffects.productionPct > 0 ? (
                    <Text style={styles.costTxt}>🏭 +{selectedRoomSupportEffects.productionPct}% selo</Text>
                  ) : null}
                  {selectedRoomSupportEffects.safetyPct > 0 ? (
                    <Text style={styles.costTxt}>🛡️ -{selectedRoomSupportEffects.safetyPct}% rizik incidenta</Text>
                  ) : null}
                  {selectedRoomSupportEffects.crewBonusPct > 0 ? (
                    <Text style={styles.costTxt}>👥 +{selectedRoomSupportEffects.crewBonusPct}% učinak posade</Text>
                  ) : null}
                  {selectedRoomSupportEffects.maxEnergyFlat > 0 ? (
                    <Text style={styles.costTxt}>⚡ +{selectedRoomSupportEffects.maxEnergyFlat} maksimalna energija</Text>
                  ) : null}
                  {selectedRoomSupportEffects.repairTimePct > 0 ? (
                    <Text style={styles.costTxt}>⚙️ -{selectedRoomSupportEffects.repairTimePct}% trajanje popravka</Text>
                  ) : null}
                  {selectedRoomSupportEffects.repairCostPct > 0 ? (
                    <Text style={styles.costTxt}>🧰 -{selectedRoomSupportEffects.repairCostPct}% trošak hitnog popravka</Text>
                  ) : null}
                </View>
              )}

              {!selectedRoomUnlockStatus.unlocked && selectedRoom.level <= 0 ? (
                <View style={styles.lockedPanel}>
                  <Text style={styles.costLabel}>Otključavanje sobe</Text>
                  <Text style={styles.lockedPanelTxt}>{selectedRoomUnlockStatus.requirementText}</Text>
                </View>
              ) : (selectedRoom.status === 'damaged' || selectedRoom.status === 'repairing') ? (
                <>
                  <View style={[styles.costPanel, styles.repairCostPanel]}>
                    <Text style={styles.costLabel}>
                      {selectedRoom.status === 'repairing' ? 'Popravak u tijeku' : 'Trošak hitnog popravka'}
                    </Text>
                    {selectedIncident ? (
                      <Text style={styles.costTxt}>⚠️ {selectedIncident.naziv} · {selectedIncident.kratko}</Text>
                    ) : null}
                    <Text style={styles.costTxt}>🪙 {selectedRoomRepairCost?.zlato || 0}</Text>
                    <Text style={styles.costTxt}>⚡ {selectedRoomRepairCost?.energija || 0}</Text>
                    <Text style={styles.costTxt}>🌲 {selectedRoomRepairCost?.drvo || 0}</Text>
                    <Text style={styles.costTxt}>⛰️ {selectedRoomRepairCost?.kamen || 0}</Text>
                    <Text style={styles.costTxt}>⛏️ {selectedRoomRepairCost?.zeljezo || 0}</Text>
                    {selectedRoom.status === 'repairing' ? (
                      <Text style={styles.repairEtaTxt}>Gotovo za {formatCountdown(selectedRoomRepairRemainingMs)}</Text>
                    ) : (
                      <Text style={styles.repairEtaTxt}>Standardni popravak traje oko {formatCountdown(selectedRoomRepairMs)}</Text>
                    )}
                  </View>

                  {selectedIncidentResponse ? (
                    <View style={[
                      styles.incidentResponsePanel,
                      !selectedIncidentResponse.available && styles.incidentResponsePanelLocked,
                    ]}>
                      <Text style={styles.incidentResponseTitle}>{selectedIncidentResponse.label}</Text>
                      <Text style={styles.incidentResponseCopy}>
                        {selectedIncidentResponse.available
                          ? selectedIncidentResponse.kratko
                          : selectedIncidentResponse.requirementText}
                      </Text>
                      <View style={styles.incidentResponseCosts}>
                        {selectedIncidentResponse.cost.zlato > 0 ? <Text style={styles.costTxt}>🪙 {selectedIncidentResponse.cost.zlato}</Text> : null}
                        {selectedIncidentResponse.cost.energija > 0 ? <Text style={styles.costTxt}>⚡ {selectedIncidentResponse.cost.energija}</Text> : null}
                        {selectedIncidentResponse.cost.stitovi > 0 ? <Text style={styles.costTxt}>🛡️ {selectedIncidentResponse.cost.stitovi}</Text> : null}
                        {selectedIncidentResponse.cost.drvo > 0 ? <Text style={styles.costTxt}>🌲 {selectedIncidentResponse.cost.drvo}</Text> : null}
                        {selectedIncidentResponse.cost.kamen > 0 ? <Text style={styles.costTxt}>⛰️ {selectedIncidentResponse.cost.kamen}</Text> : null}
                        {selectedIncidentResponse.cost.zeljezo > 0 ? <Text style={styles.costTxt}>⛏️ {selectedIncidentResponse.cost.zeljezo}</Text> : null}
                      </View>
                      {selectedIncidentResponse.effectText ? (
                        <Text style={styles.incidentResponseEffect}>{selectedIncidentResponse.effectText}</Text>
                      ) : null}
                      {selectedIncidentResponse.tradeoffText ? (
                        <Text style={styles.incidentResponseTradeoff}>{selectedIncidentResponse.tradeoffText}</Text>
                      ) : null}
                      {selectedIncidentResponse.mode === 'secure' ? (
                        <Text style={styles.incidentResponseEffect}>Vraća sobu odmah u rad.</Text>
                      ) : (
                        <Text style={styles.incidentResponseEffect}>Novi oporavak: oko {formatCountdown(selectedIncidentResponse.durationMs)}</Text>
                      )}
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    {selectedIncidentResponse ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[
                          styles.actionBtn,
                          styles.incidentResponseBtn,
                          !selectedIncidentResponse.available && styles.actionBtnDisabled,
                        ]}
                        disabled={!selectedIncidentResponse.available}
                        onPress={() => aktivirajIncidentOdgovor(selectedRoom.id)}
                      >
                        <Text style={styles.incidentResponseBtnTxt}>{selectedIncidentResponse.label}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {selectedRoom.status === 'damaged' ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[styles.actionBtn, styles.repairBtn]}
                        onPress={() => pokreniPopravakSobe(selectedRoom.id)}
                      >
                        <Text style={styles.repairBtnTxt}>POKRENI POPRAVAK</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.actionBtn, styles.progressBtn]}>
                        <Text style={styles.progressBtnTxt}>U TIJEKU · {formatCountdown(selectedRoomRepairRemainingMs)}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={[styles.actionBtn, styles.upgradeBtn]}
                      onPress={() => hitniPopravakSobe(selectedRoom.id)}
                    >
                      <Text style={styles.upgradeBtnTxt}>HITNI POPRAVAK</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.walletRow}>
                    <Text style={styles.walletTxt}>Stanje: 🪙 {Math.floor(zlato)} · ⚡ {Math.floor(energija)} · 🛡️ {Math.floor(stitovi)} · 🌲 {Math.floor(resursi.drvo)} · ⛰️ {Math.floor(resursi.kamen)} · ⛏️ {Math.floor(resursi.zeljezo)}</Text>
                  </View>
                </>
              ) : (
                <>
                  {selectedRoomCost && selectedRoom.level < selectedRoomDefinition.maxLv && (
                    <View style={styles.costPanel}>
                      <Text style={styles.costLabel}>{selectedRoom.level > 0 ? 'Sljedeća razina' : 'Trošak gradnje'}</Text>
                      <Text style={styles.costTxt}>🪙 {selectedRoomCost.zlato || 0}</Text>
                      <Text style={styles.costTxt}>🌲 {selectedRoomCost.drvo || 0}</Text>
                      <Text style={styles.costTxt}>⛰️ {selectedRoomCost.kamen || 0}</Text>
                      <Text style={styles.costTxt}>⛏️ {selectedRoomCost.zeljezo || 0}</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    {selectedRoom.level < selectedRoomDefinition.maxLv ? (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[styles.actionBtn, styles.upgradeBtn]}
                        onPress={() => nadogradiSobu(selectedRoom.id)}
                      >
                        <Text style={styles.upgradeBtnTxt}>{selectedRoom.level > 0 ? 'NADOGRADI SOBU' : 'IZGRADI SOBU'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.actionBtn, styles.maxedBtn]}>
                        <Text style={styles.maxedBtnTxt}>MAKSIMALNA RAZINA</Text>
                      </View>
                    )}

                    {selectedRoomAssignedHero && (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[styles.actionBtn, styles.unassignBtn]}
                        onPress={() => ukloniHeroIzSobe(selectedRoom.id)}
                      >
                        <Text style={styles.unassignBtnTxt}>UKLONI POSADU</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {selectedRoomDefinition.kind === 'support' && selectedRoom.level > 0 ? (
                <Text style={styles.helperTxt}>
                  {selectedRoom.type === 'servis'
                    ? 'Servisna stanica ne proizvodi resurse izravno. Ona stabilizira cijelo selo i čini svaki kvar jeftinijim i kraćim.'
                    : selectedRoom.type === 'zapovjednistvo'
                      ? 'Zapovjedna soba ne proizvodi resurse izravno. Ona pojačava učinak dodijeljene posade i daje ostatku sela uredniji ritam.'
                      : 'Energetska jezgra ne proizvodi resurse izravno. Ona podiže energetski kapacitet sela i daje završni sloj sigurnosti za duže sesije i hitne reakcije.'}
                </Text>
              ) : (!selectedRoomUnlockStatus.unlocked && selectedRoom.level <= 0) ? (
                <Text style={styles.helperTxt}>{selectedRoomUnlockStatus.shortLabel}</Text>
              ) : null}

              <View style={styles.crewHeader}>
                <Text style={styles.crewTitle}>Posada sobe</Text>
                <Text style={styles.crewSubtitle}>
                  Junak može biti globalno aktivan i istovremeno dodijeljen sobi. Dodir dodjeljuje odmah, a povlačenje omogućuje drop na bilo koju aktivnu sobu.
                </Text>
              </View>

              {selectedRoom.level > 0 && (
                <InspectorShiftBoard
                  room={selectedRoom}
                  assignedHero={selectedRoomAssignedHero}
                  roomForecast={selectedRoomForecast}
                  roomTelegraph={selectedRoomTelegraph}
                  accentColor={selectedRoomDefinition.boja}
                  interiorProfile={selectedRoomInterior}
                />
              )}

              {selectedRoom.level <= 0 ? (
                <Text style={styles.helperTxt}>Najprije izgradi sobu, pa tek onda dodijeli junaka.</Text>
              ) : selectedRoom.status !== 'active' ? (
                <Text style={styles.helperTxt}>Soba mora biti potpuno aktivna prije rasporeda posade.</Text>
              ) : otkljucaniJunaci.length === 0 ? (
                <Text style={styles.helperTxt}>Još nema otkrivenih junaka. Otkrij ih kroz summon ili spin nagrade.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={draggingHeroId === null}
                  contentContainerStyle={styles.heroStrip}
                >
                  {otkljucaniJunaci.map((hero) => {
                    const assignedRoom = getHeroAssignedRoom(rooms, hero.id);
                    const isCurrentRoom = assignedRoom?.id === selectedRoom.id;
                    const assignedElsewhereRoom = assignedRoom && !isCurrentRoom ? assignedRoom : null;
                    const isGlobalActive = aktivniJunaci.includes(hero.id);

                    return (
                      <DraggableHeroCard
                        key={hero.id}
                        hero={hero}
                        isCurrentRoom={isCurrentRoom}
                        isAssignedElsewhere={assignedElsewhereRoom}
                        isGlobalActive={isGlobalActive}
                        dragging={draggingHeroId === hero.id}
                        onPress={() => dodijeliHeroURoom(selectedRoom.id, hero.id)}
                        onDragStart={handleHeroDragStart}
                        onDragMove={handleHeroDragMove}
                        onDragEnd={handleHeroDragEnd}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </>
          ) : (
            <Text style={styles.helperTxt}>
              Ova etaža je namjerno ostavljena praznom. Prvi milestone se fokusira na tri proizvodne sobe i jasnu interakciju s posadom.
            </Text>
          )}
        </View>
      )}

      {spremanZaPrestige && (
        <View style={styles.prestigeCard}>
          <View style={styles.prestigeHeader}>
            <View style={styles.prestigeIconWrap}>
              <Crown size={18} color={BOJE.prestige} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prestigeTitle}>Prestige je spreman</Text>
              <Text style={styles.prestigeCopy}>Selo je dovršilo puni razvojni krug. Reset daje novi stalni množitelj i otvara sljedeći tempo progresije.</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.82} style={styles.prestigeBtn} onPress={potvrdiPrestige}>
            <Text style={styles.prestigeBtnTxt}>IZVRŠI PRESTIGE</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.raidLogCard}>
        <Text style={styles.raidLogTitle}>Nedavni upadi</Text>
        {ucitavaPovijest ? (
          <Text style={styles.raidLogEmpty}>Učitavanje povijesti...</Text>
        ) : raidPovijest.length === 0 ? (
          <Text style={styles.raidLogEmpty}>Nema nedavnih upada.</Text>
        ) : raidPovijest.slice(0, 3).map((r) => {
          const vrijeme = r.vrijemeNapadaMs ? new Date(r.vrijemeNapadaMs).toLocaleTimeString() : '';
          const jeOut = r.tip === 'outgoing';
          const mozeOsveta = !jeOut && r.napadacUid && r.mozeProtunapadDo && Date.now() < r.mozeProtunapadDo;

          return (
            <View key={r.id} style={styles.raidRow}>
              <Text style={styles.raidLogItem}>
                {jeOut ? 'Napao' : 'Napadnut'} {jeOut ? (r.metaIme ?? 'meta') : (r.napadacIme ?? 'napadač')} · {Math.floor(r.ukradeno?.drvo ?? 0)}🌲 {Math.floor(r.ukradeno?.kamen ?? 0)}⛰️ {Math.floor(r.ukradeno?.zeljezo ?? 0)}⛏️ {vrijeme ? `· ${vrijeme}` : ''}
              </Text>
              {mozeOsveta && (
                <TouchableOpacity
                  style={styles.revengeBtn}
                  onPress={() => {
                    postaviRevengeTarget(r);
                    useGameStore.setState({ poruka: 'OSVETA AKTIVNA: +25% plijen' });
                    setRaidAktivan(true);
                    navigation.navigate('Igraj');
                  }}
                >
                  <Text style={styles.revengeBtnTxt}>OSVETI SE</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
      </ScrollView>

      {draggingHero && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragPreview,
            {
              transform: [
                { translateX: dragPreviewPosition.x },
                { translateY: dragPreviewPosition.y },
              ],
            },
          ]}
        >
          <View style={[styles.heroAssignCard, styles.dragPreviewCard, hoverRoomId && styles.dragPreviewCardActive]}>
            <Text style={styles.heroAssignEmoji}>{draggingHero.emodzi}</Text>
            <Text style={styles.heroAssignName}>{draggingHero.naziv}</Text>
            <Text style={styles.heroAssignMeta}>
              {hoverRoomId
                ? `Spusti u ${getVillageRoomDefinition(rooms.find((room) => room.id === hoverRoomId))?.kratko ?? 'sobu'}`
                : 'Povuci prema aktivnoj sobi'}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    marginBottom: 14,
  },
  eyebrow: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(24 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    lineHeight: Math.round(30 * uiScale),
  },
  heroSubtitle: {
    color: BOJE.textMuted,
    fontSize: Math.round(13 * uiScale),
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
    marginTop: 10,
  },
  transformationCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  transformationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 92,
  },
  transformationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  transformationEyebrow: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  transformationTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(18 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 8,
  },
  transformationPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  transformationPillTxt: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  transformationCopy: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 10,
  },
  transformationStructureCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 10,
  },
  transformationMaterialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  transformationMaterialChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  transformationMaterialChipTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  transformationTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 14,
  },
  transformationFill: {
    height: '100%',
    borderRadius: 999,
  },
  transformationMeta: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 10,
  },
  pressureCard: {
    backgroundColor: '#09111E',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 14,
  },
  pressureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  pressureTextColumn: {
    flex: 1,
  },
  pressureBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pressureBadgeTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pressureTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(20 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 10,
  },
  pressureCopy: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 6,
  },
  phaseWindowCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  phaseWindowEyebrow: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  phaseWindowTitle: {
    color: BOJE.textMain,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 6,
  },
  phaseWindowCopy: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  phaseWindowMeta: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 10,
  },
  forecastCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
  },
  forecastEyebrow: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  forecastTitle: {
    color: BOJE.textMain,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 8,
  },
  forecastCopy: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  forecastChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  forecastChip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  forecastChipLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  forecastChipMeta: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    marginTop: 3,
  },
  forecastAction: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 12,
  },
  pressureScoreOrb: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  pressureScoreValue: {
    fontSize: Math.round(24 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    lineHeight: Math.round(26 * uiScale),
  },
  pressureScoreLabel: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pressureMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  pressureMetaPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pressureMetaTxt: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  signalMeter: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 12,
  },
  signalMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signalMeterLabel: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  signalMeterValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  signalMeterTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 10,
  },
  signalMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  signalMeterNote: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 8,
  },
  pressureHint: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: Math.round(16 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  eventCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 18,
    marginBottom: 14,
  },
  eventCardAlert: {
    borderColor: `${BOJE.slotVatra}99`,
    backgroundColor: `${BOJE.slotVatra}12`,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(15 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginBottom: 4,
  },
  eventCopy: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  primaryPill: {
    backgroundColor: BOJE.slotVatra,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryPillTxt: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  secondaryPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryPillTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  supportDeckCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 14,
  },
  supportDeckHeader: {
    marginBottom: 4,
  },
  supportDeckEyebrow: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  supportDeckTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(18 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 8,
  },
  supportDeckCopy: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 6,
  },
  supportDeckMaterial: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  supportDeckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  supportDeckItem: {
    width: '48%',
    minHeight: 150,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  supportDeckItemAlert: {
    borderColor: `${BOJE.slotVatra}66`,
    backgroundColor: `${BOJE.slotVatra}12`,
  },
  supportDeckItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  supportDeckItemEyebrow: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  supportDeckItemBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supportDeckItemBadgeTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  supportDeckItemName: {
    color: BOJE.textMain,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 12,
  },
  supportDeckItemPrimary: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
  },
  supportDeckItemSecondary: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 8,
  },
  villageShell: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  villageShellGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  villageShellPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  villageShellHeader: {
    marginBottom: 12,
  },
  villageShellTitle: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  villageShellSub: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    marginTop: 4,
  },
  shellPhaseCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  shellPhaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  shellPhaseEyebrow: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  shellPhaseMeta: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  shellPhaseCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 8,
  },
  shellMaterialCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  shellMaterialTitle: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  shellMaterialCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  shellMaterialTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  shellMaterialTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shellMaterialTagTxt: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  floorRow: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  floorPhasePulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floorAccentRail: {
    height: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  floorPhaseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  floorPhaseLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  floorPhaseCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  floorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  floorLabel: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  floorStageLabel: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  floorMaterialTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  floorBraceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  floorBraceSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  floorTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roomDropWrap: {
    flex: 1,
  },
  roomTile: {
    flex: 1,
    minHeight: 336,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  roomPhasePulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  roomTileSelected: {
    borderColor: BOJE.drvo,
    backgroundColor: `${BOJE.drvo}10`,
  },
  roomTileHovered: {
    borderColor: BOJE.klan,
    backgroundColor: `${BOJE.klan}14`,
  },
  roomTileDamaged: {
    borderColor: BOJE.slotVatra,
    backgroundColor: `${BOJE.slotVatra}12`,
  },
  roomTileForecastHot: {
    borderColor: `${BOJE.slotVatra}AA`,
  },
  roomToneHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 74,
  },
  roomFrameCap: {
    height: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  roomTileHeader: {
    minHeight: 50,
    justifyContent: 'space-between',
  },
  roomHeaderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomKindBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roomKindTxt: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  roomBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roomBadgeTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  roomLv: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginTop: 6,
  },
  roomGlyphWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 12,
  },
  roomPlaceholder: {
    color: BOJE.textMuted,
    fontSize: 24,
    fontFamily: FONT_FAMILY,
    fontWeight: '300',
  },
  roomName: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  roomNote: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 4,
  },
  roomMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 10,
  },
  roomMaterialChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roomMaterialChipTxt: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  roomMaterialTxt: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  roomPhaseBand: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 10,
  },
  roomPhaseBandLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  roomPhaseBandCopy: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
    marginTop: 4,
  },
  roomProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 12,
  },
  roomProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  roomResidentsWrap: {
    marginTop: 12,
  },
  roomInteriorPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  roomInteriorHeader: {
    gap: 6,
  },
  roomInteriorEyebrow: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  roomInteriorTitle: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    lineHeight: 15,
    marginTop: 4,
  },
  roomInteriorBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  roomInteriorBadgeTxt: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  roomInteriorTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  roomInteriorMaterialChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roomInteriorMaterialChipTxt: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  roomInteriorLayoutChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roomInteriorLayoutChipTxt: {
    color: BOJE.textMain,
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  roomInteriorPropChip: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInteriorPropTxt: {
    fontSize: 13,
  },
  roomInteriorPropChipLarge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
  },
  roomInteriorPropTxtLarge: {
    fontSize: 16,
  },
  interiorSceneBoard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  interiorSceneBoardLarge: {
    padding: 12,
  },
  interiorSceneBoardRail: {
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  interiorSceneBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  interiorSceneBoardFrame: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  interiorSceneBoardLabel: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  interiorSceneBoardGrid: {
    gap: 8,
    marginTop: 10,
  },
  interiorSceneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  interiorSceneRowStart: {
    justifyContent: 'flex-start',
  },
  interiorSceneRowCenter: {
    justifyContent: 'center',
  },
  interiorSceneRowEnd: {
    justifyContent: 'flex-end',
  },
  interiorSceneRowBetween: {
    justifyContent: 'space-between',
  },
  roomInteriorCopy: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 15,
    marginTop: 10,
  },
  interiorTensionPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  interiorTensionPanelCompact: {
    padding: 9,
    marginTop: 10,
  },
  interiorTensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  interiorTensionLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  interiorTensionCountdown: {
    color: BOJE.textMuted,
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  interiorTensionTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginTop: 8,
  },
  interiorTensionFill: {
    height: '100%',
    borderRadius: 999,
  },
  interiorTensionCopy: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 15,
    marginTop: 8,
  },
  interiorTensionCopyCompact: {
    fontSize: 9,
    lineHeight: 14,
  },
  roomResidentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  roomResidentsLabel: {
    color: BOJE.textMuted,
    fontSize: 9,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roomResidentsMeta: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
    marginTop: 6,
  },
  roomResidentsStatus: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  roomResidentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  residentMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentMarkerEmoji: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  residentMarkerEmojiMuted: {
    color: BOJE.textMuted,
  },
  roomForecastRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  roomForecastLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  roomForecastReason: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
    marginTop: 4,
  },
  roomForecastCountdown: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
    marginTop: 4,
  },
  roomSignalStack: {
    gap: 8,
    marginTop: 12,
  },
  roomSignalChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  roomSignalChipMuted: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  roomSignalTxt: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    lineHeight: 14,
  },
  roomSignalTxtMuted: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
  },
  roomCrewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
  },
  roomCrewTxt: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    marginLeft: 6,
  },
  shiftBoard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginTop: 12,
  },
  shiftBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  shiftBoardTitle: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  shiftRiskBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  shiftRiskBadgeTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  shiftLeadSlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginTop: 12,
  },
  shiftLeadEmoji: {
    color: BOJE.textMain,
    fontSize: 20,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    width: 24,
  },
  shiftLeadTitle: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  shiftLeadMeta: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 4,
  },
  shiftResidentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  shiftResidentsMeta: {
    color: BOJE.textMuted,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    lineHeight: 14,
    marginLeft: 2,
  },
  shiftBoardCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 12,
  },
  inspectorCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  inspectorGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inspectorEyebrow: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  inspectorTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(20 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 4,
  },
  inspectorBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inspectorBadgeLocked: {
    backgroundColor: `${BOJE.prestige}18`,
    borderWidth: 1,
    borderColor: `${BOJE.prestige}44`,
  },
  inspectorBadgeTxt: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  inspectorCopy: {
    color: BOJE.textMuted,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
    marginTop: 12,
  },
  inspectorInteriorPanel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  inspectorInteriorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  inspectorInteriorEyebrow: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inspectorInteriorTitle: {
    color: BOJE.textMain,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 6,
  },
  inspectorInteriorBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inspectorInteriorBadgeTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inspectorInteriorCopy: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 10,
  },
  inspectorInteriorTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  inspectorInteriorMaterialChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inspectorInteriorMaterialChipTxt: {
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  inspectorInteriorLayoutChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inspectorInteriorLayoutChipTxt: {
    color: BOJE.textMain,
    fontSize: 10,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  inspectorInteriorPropChip: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorInteriorPropTxt: {
    fontSize: 14,
  },
  inspectorStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  inspectorStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
  },
  inspectorStatTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginLeft: 8,
  },
  costPanel: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  supportPanel: {
    marginTop: 16,
    backgroundColor: `${BOJE.stit}10`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${BOJE.stit}33`,
    padding: 14,
    gap: 8,
  },
  lockedPanel: {
    marginTop: 16,
    backgroundColor: `${BOJE.prestige}12`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${BOJE.prestige}40`,
    padding: 14,
    gap: 8,
  },
  lockedPanelTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
  },
  repairCostPanel: {
    backgroundColor: `${BOJE.slotVatra}10`,
    borderWidth: 1,
    borderColor: `${BOJE.slotVatra}33`,
  },
  incidentResponsePanel: {
    marginTop: 14,
    backgroundColor: `${BOJE.energija}10`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${BOJE.energija}33`,
    padding: 14,
  },
  incidentResponsePanelLocked: {
    backgroundColor: `${BOJE.textMuted}10`,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  incidentResponseTitle: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  incidentResponseCopy: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  incidentResponseCosts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  incidentResponseEffect: {
    color: BOJE.textMain,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginTop: 10,
  },
  incidentResponseTradeoff: {
    color: BOJE.misije,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 8,
  },
  costLabel: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    width: '100%',
  },
  costTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  upgradeBtn: {
    backgroundColor: BOJE.textMain,
  },
  incidentResponseBtn: {
    backgroundColor: BOJE.energija,
  },
  upgradeBtnTxt: {
    color: '#000',
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  incidentResponseBtnTxt: {
    color: '#000',
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  repairBtn: {
    backgroundColor: BOJE.slotVatra,
  },
  repairBtnTxt: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  progressBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  progressBtnTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  actionBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  unassignBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  unassignBtnTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  maxedBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  maxedBtnTxt: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
  crewHeader: {
    marginTop: 18,
  },
  crewTitle: {
    color: BOJE.textMain,
    fontSize: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  crewSubtitle: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 4,
  },
  currentCrewCard: {
    backgroundColor: `${BOJE.klan}12`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${BOJE.klan}40`,
    padding: 14,
    marginTop: 12,
  },
  currentCrewTitle: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  currentCrewTxt: {
    color: BOJE.klan,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginTop: 4,
  },
  currentCrewCardMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  currentCrewMutedTxt: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
  },
  helperTxt: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
    marginTop: 14,
  },
  repairEtaTxt: {
    color: BOJE.textMain,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    width: '100%',
  },
  walletRow: {
    marginTop: 12,
  },
  walletTxt: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
  },
  heroStrip: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  heroDragSourceHidden: {
    opacity: 0.18,
  },
  heroAssignCard: {
    width: 170,
    borderRadius: 20,
    padding: 14,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroAssignCardActive: {
    borderColor: BOJE.klan,
    backgroundColor: `${BOJE.klan}14`,
  },
  heroAssignCardBusy: {
    borderColor: `${BOJE.misije}88`,
  },
  heroAssignEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  heroAssignName: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  heroAssignMeta: {
    color: BOJE.textMuted,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 6,
  },
  dragPreview: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 40,
    elevation: 12,
  },
  dragPreviewCard: {
    borderColor: `${BOJE.stit}77`,
    backgroundColor: 'rgba(8, 12, 22, 0.96)',
  },
  dragPreviewCardActive: {
    borderColor: BOJE.klan,
    backgroundColor: `${BOJE.klan}18`,
  },
  raidLogCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 16,
  },
  prestigeCard: {
    backgroundColor: `${BOJE.prestige}10`,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${BOJE.prestige}70`,
    padding: 18,
    marginBottom: 14,
  },
  prestigeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  prestigeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${BOJE.prestige}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prestigeTitle: {
    color: BOJE.prestige,
    fontSize: Math.round(15 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginBottom: 4,
  },
  prestigeCopy: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
  },
  prestigeBtn: {
    backgroundColor: BOJE.prestige,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  prestigeBtnTxt: {
    color: '#000',
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  raidLogTitle: {
    color: BOJE.textMain,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  raidRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BOJE.border,
  },
  raidLogItem: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    lineHeight: 18,
  },
  revengeBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: BOJE.slotVatra,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revengeBtnTxt: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
  raidLogEmpty: {
    color: BOJE.textMuted,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
  },
});

export default VillageScreen;
