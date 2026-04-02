import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Zap, Building2, Trophy, ShoppingCart, Sliders, Users, Crown, Sword } from 'lucide-react-native';
import SlotScreen        from '../screens/SlotScreen';
import VillageScreen     from '../screens/VillageScreen';
import MissionsScreen    from '../screens/MissionsScreen';
import ShopScreen        from '../screens/ShopScreen';
import UpgradesScreen    from '../screens/UpgradesScreen';
import ClanScreen        from '../screens/ClanScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import HeroesScreen      from '../screens/HeroesScreen';
import ErrorBoundary     from '../components/ErrorBoundary';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const Tab = createBottomTabNavigator();

const SWIPE_MIN_DX    = 15;  // minimalni pomak (px) da se gesta prepozna kao swipe
const SWIPE_DIR_RATIO = 1.5; // dx mora biti N× veći od dy da se prepozna kao horizontalni swipe

// Konfiguracija tabova (redoslijed, ikona, boja)
const TAB_KONFIGURACIJA = [
  { routeName: 'Igraj',   ikona: Zap,          boja: BOJE.energija    },
  { routeName: 'Baza',    ikona: Building2,    boja: BOJE.drvo        },
  { routeName: 'Zadaci',  ikona: Trophy,       boja: BOJE.misije      },
  { routeName: 'Tržište', ikona: ShoppingCart, boja: BOJE.zlato       },
  { routeName: 'Oprema',  ikona: Sliders,      boja: BOJE.nadogradnje },
  { routeName: 'Klan',    ikona: Users,        boja: BOJE.klan        },
  { routeName: 'Top',     ikona: Crown,        boja: BOJE.ljestvica   },
  { routeName: 'Junaci',  ikona: Sword,        boja: BOJE.nadogradnje },
];

// ─── Prilagođena navigacijska traka ──────────────────────────────────────────
const CustomTabBar = ({ state, navigation }) => {
  // Swipe gesta između tabova
  const swipeRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > SWIPE_MIN_DX && Math.abs(g.dx) > Math.abs(g.dy) * SWIPE_DIR_RATIO,
      onPanResponderRelease: (_, g) => {
        const trenutniIndeks = state.index;
        if (g.dx < -60 && trenutniIndeks < TAB_KONFIGURACIJA.length - 1) {
          navigation.navigate(TAB_KONFIGURACIJA[trenutniIndeks + 1].routeName);
        } else if (g.dx > 60 && trenutniIndeks > 0) {
          navigation.navigate(TAB_KONFIGURACIJA[trenutniIndeks - 1].routeName);
        }
      },
    })
  ).current;

  return (
    <View style={styles.navWrapper} {...swipeRef.panHandlers}>
      {/* Indikator stranica (dots) */}
      <View style={styles.pageIndicatorRow}>
        {TAB_KONFIGURACIJA.map((_, i) => (
          <View
            key={i}
            style={[styles.pageIndicatorDot, state.index === i && styles.pageIndicatorDotActive]}
          />
        ))}
      </View>

      {/* Floating navigacijska traka */}
      <View style={styles.floatingNavbar}>
        {TAB_KONFIGURACIJA.map((tab, i) => {
          const aktivan = state.index === i;
          const TIcon   = tab.ikona;
          return (
            <TouchableOpacity
              key={tab.routeName}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(tab.routeName)}
              style={styles.navBtn}
            >
              <View style={[
                styles.navTabPill,
                aktivan
                  ? [styles.navTabPillActive, { backgroundColor: tab.boja, shadowColor: tab.boja }]
                  : styles.navTabPillInactive,
              ]}>
                <TIcon
                  size={aktivan ? 20 : 18}
                  color={aktivan ? '#000' : BOJE.textMuted}
                  strokeWidth={aktivan ? 2.5 : 1.8}
                />
                {aktivan && (
                  <Text style={styles.navText}>
                    {tab.routeName.toUpperCase()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Glavni navigator ─────────────────────────────────────────────────────────
const AppNavigator = () => (
  <Tab.Navigator
    initialRouteName="Igraj"
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <CustomTabBar {...props} />}
  >
    <Tab.Screen name="Igraj">{() => <ErrorBoundary><SlotScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Baza">{() => <ErrorBoundary><VillageScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Zadaci">{() => <ErrorBoundary><MissionsScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Tržište">{() => <ErrorBoundary><ShopScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Oprema">{() => <ErrorBoundary><UpgradesScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Klan">{() => <ErrorBoundary><ClanScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Top">{() => <ErrorBoundary><LeaderboardScreen /></ErrorBoundary>}</Tab.Screen>
    <Tab.Screen name="Junaci">{() => <ErrorBoundary><HeroesScreen /></ErrorBoundary>}</Tab.Screen>
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  navWrapper: {
    backgroundColor: 'transparent',
  },
  pageIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  pageIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pageIndicatorDotActive: {
    width: 18,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BOJE.energija,
    shadowColor: BOJE.energija,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingNavbar: {
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 28 : 16,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: BOJE.navBg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: BOJE.border,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 18,
  },
  navBtn:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  navTabPill:        { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  navTabPillInactive:{ width: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  navTabPillActive:  { paddingHorizontal: 14, shadowOpacity: 0.55, shadowRadius: 12, elevation: 6, transform: [{ translateY: -2 }] },
  navText:           { fontSize: Math.round(11 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5, color: '#000', marginLeft: 5 },
});

export default AppNavigator;
