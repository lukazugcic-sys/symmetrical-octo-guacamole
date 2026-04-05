import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  ReduceMotion,
} from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Zap, Building2, Trophy, ShoppingCart, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SlotScreen        from '../screens/SlotScreen';
import VillageScreen     from '../screens/VillageScreen';
import MissionsScreen    from '../screens/MissionsScreen';
import ShopScreen        from '../screens/ShopScreen';
import UpgradesScreen    from '../screens/UpgradesScreen';
import ClanScreen        from '../screens/ClanScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import HeroesScreen      from '../screens/HeroesScreen';
import KovacnicaScreen   from '../screens/KovacnicaScreen';
import TurnirScreen      from '../screens/TurnirScreen';
import TamnicaScreen     from '../screens/TamnicaScreen';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';
import SubmenuPager      from './SubmenuPager';

const Tab = createBottomTabNavigator();
const NAV_TIMING = { duration: 180, reduceMotion: ReduceMotion.Never };

const ROOT_MENU_KONFIGURACIJA = [
  {
    routeName: 'Baza',
    label: 'Baza',
    ikona: Building2,
    boja: BOJE.drvo,
    sections: [
      { key: 'selo', label: 'Selo', component: VillageScreen },
      { key: 'nadogradnje', label: 'Nadogradnje', component: UpgradesScreen },
      { key: 'kovacnica', label: 'Kovačnica', component: KovacnicaScreen },
    ],
  },
  {
    routeName: 'Igraj',
    label: 'Igraj',
    ikona: Zap,
    boja: BOJE.energija,
    sections: [
      { key: 'automat', label: 'Automat', component: SlotScreen },
      { key: 'turnir', label: 'Turnir', component: TurnirScreen },
      { key: 'tamnica', label: 'Tamnica', component: TamnicaScreen },
    ],
  },
  {
    routeName: 'Napredak',
    label: 'Napredak',
    ikona: Trophy,
    boja: BOJE.misije,
    sections: [
      { key: 'zadaci', label: 'Zadaci', component: MissionsScreen },
      { key: 'junaci', label: 'Junaci', component: HeroesScreen },
    ],
  },
  {
    routeName: 'Drustvo',
    label: 'Društvo',
    ikona: Users,
    boja: BOJE.klan,
    sections: [
      { key: 'klan', label: 'Klan', component: ClanScreen },
      { key: 'ljestvica', label: 'Ljestvica', component: LeaderboardScreen },
    ],
  },
  {
    routeName: 'Trgovina',
    label: 'Trgovina',
    ikona: ShoppingCart,
    boja: BOJE.zlato,
    sections: [
      { key: 'trziste', label: 'Trgovina', component: ShopScreen },
    ],
  },
];

// ─── Animirani tab gumb ───────────────────────────────────────────────────────
const TabButton = React.memo(({ tab, aktivan, onPress }) => {
  const progress = useSharedValue(aktivan ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(aktivan ? 1 : 0, NAV_TIMING);
  }, [aktivan, progress]);

  const TIcon = tab.ikona;
  const bubbleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.04)', `${tab.boja}22`]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.08)', `${tab.boja}88`]
    ),
    transform: [
      { translateY: -progress.value * 1.5 },
      { scale: 0.98 + (progress.value * 0.02) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [BOJE.textMuted, BOJE.textMain]),
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.navBtn}
    >
      <Animated.View style={[
        styles.navItem,
        bubbleStyle,
      ]}>
        <TIcon
          size={18}
          color={aktivan ? tab.boja : BOJE.textMuted}
          strokeWidth={aktivan ? 2.4 : 1.9}
        />
        <Animated.Text style={[styles.navText, labelStyle]}>
          {tab.label.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── Prilagođena navigacijska traka ──────────────────────────────────────────
const CustomTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.navWrapper}>
      <View style={[styles.floatingNavbar, { marginBottom: Math.max(14, insets.bottom + 8) }] }>
        {ROOT_MENU_KONFIGURACIJA.map((tab, i) => (
          <TabButton
            key={tab.routeName}
            tab={tab}
            aktivan={state.index === i}
            onPress={() => navigation.navigate(tab.routeName)}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Glavni navigator ─────────────────────────────────────────────────────────
const AppNavigator = () => (
  <Tab.Navigator
    initialRouteName="Baza"
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <CustomTabBar {...props} />}
  >
    {ROOT_MENU_KONFIGURACIJA.map((menu) => (
      <Tab.Screen key={menu.routeName} name={menu.routeName}>
        {() => (
          <SubmenuPager accentColor={menu.boja} sections={menu.sections} />
        )}
      </Tab.Screen>
    ))}
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  navWrapper: {
    backgroundColor: 'transparent',
  },
  floatingNavbar: {
    marginHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A0F1BCC',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 18,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  navItem: {
    minHeight: 56,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navText: {
    marginTop: 5,
    fontSize: Math.round(9 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    letterSpacing: 0.9,
    textAlign: 'center',
  },
});

export default AppNavigator;
