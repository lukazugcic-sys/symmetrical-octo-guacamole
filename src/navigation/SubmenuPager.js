import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ErrorBoundary from '../components/ErrorBoundary';
import { BOJE, FONT_FAMILY, uiScale } from '../config/constants';

const SubmenuChip = React.memo(({ accentColor, active, label, onPress }) => {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, progress]);

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.04)', `${accentColor}26`]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.08)', `${accentColor}88`]
    ),
    transform: [{ translateY: -progress.value * 2 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [BOJE.textMuted, BOJE.textMain]),
    opacity: 0.78 + (progress.value * 0.22),
  }));

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.submenuButton}>
      <Animated.View style={[styles.submenuChip, chipStyle]}>
        <Animated.Text style={[styles.submenuChipText, textStyle]}>
          {label.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const SubmenuPager = ({ accentColor, sections }) => {
  const pagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSection = sections[activeIndex];

  const idiNaSekciju = useCallback((index) => {
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  const onPageSelected = useCallback((event) => {
    setActiveIndex(event.nativeEvent.position);
  }, []);

  return (
    <View style={styles.container}>
      {sections.length > 1 && (
        <View style={styles.submenuRail}>
          <View style={styles.submenuHeaderRow}>
            <View>
              <Text style={styles.submenuEyebrow}>SEKCIJA</Text>
              <Text style={[styles.submenuTitle, { color: accentColor }]}>
                {activeSection?.label?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.submenuCount}>
              {String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.submenuRow}
          >
            {sections.map((section, index) => (
              <SubmenuChip
                key={section.key}
                accentColor={accentColor}
                active={activeIndex === index}
                label={section.label}
                onPress={() => idiNaSekciju(index)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
        overdrag={false}
        scrollEnabled={sections.length > 1}
      >
        {sections.map((section) => {
          const ScreenComponent = section.component;

          return (
            <View key={section.key} collapsable={false} style={styles.page}>
              <ErrorBoundary>
                <ScreenComponent />
              </ErrorBoundary>
            </View>
          );
        })}
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  submenuRail: {
    paddingTop: 12,
    paddingBottom: 10,
  },
  submenuHeaderRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  submenuEyebrow: {
    color: BOJE.textMuted,
    fontSize: Math.round(10 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  submenuTitle: {
    fontSize: Math.round(20 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  submenuCount: {
    color: BOJE.textMuted,
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 1,
  },
  submenuRow: {
    paddingHorizontal: 16,
  },
  submenuButton: {
    marginRight: 10,
  },
  submenuChip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submenuChipText: {
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});

export default SubmenuPager;