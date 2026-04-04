import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useEvent,
  useHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ErrorBoundary from '../components/ErrorBoundary';
import { BOJE, FONT_FAMILY, uiScale } from '../config/constants';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);
const NAV_TIMING = { duration: 180, reduceMotion: ReduceMotion.Never };

const usePageScrollHandler = (handlers, dependencies) => {
  const { context, doDependenciesDiffer } = useHandler(handlers, dependencies);

  return useEvent(
    (event) => {
      'worklet';
      const { onPageScroll } = handlers;

      if (onPageScroll && event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event, context);
      }
    },
    ['onPageScroll'],
    doDependenciesDiffer,
  );
};

const SubmenuChip = React.memo(({ accentColor, active, index, label, onPress, pageProgress }) => {
  const chipStyle = useAnimatedStyle(() => {
    const focus = 1 - Math.min(Math.abs(pageProgress.value - index), 1);

    return {
      backgroundColor: interpolateColor(
        focus,
        [0, 1],
        ['rgba(255,255,255,0.04)', `${accentColor}26`],
      ),
      borderColor: interpolateColor(
        focus,
        [0, 1],
        ['rgba(255,255,255,0.08)', `${accentColor}88`],
      ),
      transform: [
        { translateY: -focus * 2 },
        { scale: 0.985 + (focus * 0.015) },
      ],
    };
  }, [accentColor, index]);

  const textStyle = useAnimatedStyle(() => {
    const focus = 1 - Math.min(Math.abs(pageProgress.value - index), 1);

    return {
      color: interpolateColor(focus, [0, 1], [BOJE.textMuted, BOJE.textMain]),
      opacity: 0.82 + (focus * 0.18),
    };
  }, [index]);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.submenuButton}
    >
      <Animated.View style={[styles.submenuChip, chipStyle]}>
        <Animated.Text style={[styles.submenuChipText, textStyle]}>
          {label.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const PagerScene = React.memo(({ index, pageProgress, section }) => {
  const ScreenComponent = section.component;

  const sceneStyle = useAnimatedStyle(() => {
    const distance = Math.abs(pageProgress.value - index);

    return {
      opacity: interpolate(distance, [0, 0.8, 1], [1, 0.98, 0.95], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            pageProgress.value,
            [index - 1, index, index + 1],
            [12, 0, -12],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(distance, [0, 1], [1, 0.992], Extrapolation.CLAMP),
        },
      ],
    };
  }, [index]);

  return (
    <Animated.View collapsable={false} style={[styles.page, sceneStyle]}>
      <ErrorBoundary>
        <ScreenComponent />
      </ErrorBoundary>
    </Animated.View>
  );
});

const SubmenuPager = ({ accentColor, sections }) => {
  const pagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSection = sections[activeIndex];
  const pageProgress = useSharedValue(0);

  const pageScrollHandler = usePageScrollHandler({
    onPageScroll: (event) => {
      'worklet';
      pageProgress.value = event.position + event.offset;
    },
  }, []);

  const idiNaSekciju = useCallback((index) => {
    setActiveIndex(index);
    pageProgress.value = withTiming(index, NAV_TIMING);
    pagerRef.current?.setPage(index);
  }, [pageProgress]);

  const onPageSelected = useCallback((event) => {
    const nextIndex = event.nativeEvent.position;
    pageProgress.value = nextIndex;
    setActiveIndex(nextIndex);
  }, [pageProgress]);

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
                index={index}
                label={section.label}
                onPress={() => idiNaSekciju(index)}
                pageProgress={pageProgress}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <AnimatedPagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        offscreenPageLimit={Math.min(2, sections.length)}
        onPageScroll={pageScrollHandler}
        onPageSelected={onPageSelected}
        overdrag={false}
        scrollEnabled={sections.length > 1}
      >
        {sections.map((section, index) => (
          <View key={section.key} collapsable={false} style={styles.pageContainer}>
            <PagerScene index={index} pageProgress={pageProgress} section={section} />
          </View>
        ))}
      </AnimatedPagerView>
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
  pageContainer: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});

export default SubmenuPager;