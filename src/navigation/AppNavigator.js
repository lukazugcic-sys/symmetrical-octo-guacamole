import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Zap, Building2, Trophy, ShoppingCart, Sliders } from 'lucide-react-native';
import SlotScreen    from '../screens/SlotScreen';
import VillageScreen from '../screens/VillageScreen';
import MissionsScreen from '../screens/MissionsScreen';
import ShopScreen    from '../screens/ShopScreen';
import UpgradesScreen from '../screens/UpgradesScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const Tab = createBottomTabNavigator();

const SWIPE_MIN_DX    = 15;
const SWIPE_DIR_RATIO = 1.5;

const TAB_KONFIGURACIJA = [
  { routeName: 'Igraj',   ikona: Zap,          boja: BOJE.energija    },
  { routeName: 'Baza',    ikona: Building2,    boja: BOJE.drvo        },
  { routeName: 'Zadaci',  ikona: Trophy,       boja: BOJE.misije      },
  { routeName: 'Tržište', ikona: ShoppingCart, boja: BOJE.zlato       },
  { routeName: 'Oprema',  ikona: Sliders,      boja: BOJE.nadogradnje },
];

const PageDot = React.memo(({ aktivan }) => {
  const progress = useSharedValue(aktivan ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(aktivan ? 1 : 0, { duration: 280 });
  }, [aktivan, progress]);

  const animStyle = useAnimatedStyle(() => ({
    width:           5 + progress.value * 13,
    opacity:         0.35 + progress.value * 0.65,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.18)', BOJE.energija]
    ),
  }));

  return <Animated.View style={[styles.pageIndicatorDot, animStyle]} />;
});

const TabButton = React.memo(({ tab, aktivan, onPress }) => {
  const scale = useSharedValue(aktivan ? 1.0 : 0.88);

  useEffect(() => {
    scale.value = withSpring(aktivan ? 1.0 : 0.88, { damping: 14, stiffness: 200 });
  }, [aktivan, scale]);

  const TIcon    = tab.ikona;
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.navBtn}>
      <Animated.View style={[
        styles.navTabPill,
        aktivan
          ? [styles.navTabPillActive, { backgroundColor: tab.boja, shadowColor: tab.boja }]
          : styles.navTabPillInactive,
        animStyle,
      ]}>
        <TIcon
          size={aktivan ? 20 : 18}
          color={aktivan ? '#000' : BOJE.textMuted}
          strokeWidth={aktivan ? 2.5 : 1.8}
        />
        {aktivan && (
          <Text style={styles.navText}>{tab.routeName.toUpperCase()}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

const CustomTabBar = ({ state, navigation }) => {
  const currentIndexRef = useRef(state.index);

  useEffect(() => {
    currentIndexRef.current = state.index;
  }, [state.index]);

  const swipeRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > SWIPE_MIN_DX && Math.abs(g.dx) > Math.abs(g.dy) * SWIPE_DIR_RATIO,
      onPanResponderRelease: (_, g) => {
        const idx = currentIndexRef.current;
        if (g.dx < -60 && idx < TAB_KONFIGURACIJA.length - 1) {
          navigation.navigate(TAB_KONFIGURACIJA[idx + 1].routeName);
        } else if (g.dx > 60 && idx > 0) {
          navigation.navigate(TAB_KONFIGURACIJA[idx - 1].routeName);
        }
      },
    })
  ).current;

  return (
    <View style={styles.navWrapper} {...swipeRef.panHandlers}>
      <View style={styles.pageIndicatorRow}>
        {TAB_KONFIGURACIJA.map((_, i) => (
          <PageDot key={i} aktivan={state.index === i} />
        ))}
      </View>
      <View style={styles.floatingNavbar}>
        {TAB_KONFIGURACIJA.map((tab, i) => (
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
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  navWrapper: { backgroundColor: 'transparent' },
  pageIndicatorRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingBottom: 6,
  },
  pageIndicatorDot: { height: 5, borderRadius: 2.5 },
  floatingNavbar: {
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 28 : 16,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    backgroundColor: BOJE.navBg, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 32, borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, elevation: 18,
  },
  navBtn:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  navTabPill:        { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  navTabPillInactive:{ width: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  navTabPillActive:  { paddingHorizontal: 14, shadowOpacity: 0.55, shadowRadius: 12, elevation: 6, transform: [{ translateY: -2 }] },
  navText:           { fontSize: Math.round(11 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5, color: '#000', marginLeft: 5 },
});

export default AppNavigator;
