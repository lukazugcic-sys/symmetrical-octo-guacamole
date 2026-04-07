import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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
import { isExpoGo } from '../utils/helpers';

const NAV_TIMING = { duration: 180, reduceMotion: ReduceMotion.Never };
let cachedPagerViewComponent;
let hasResolvedPagerViewComponent = false;
let hasWarnedAboutPagerFallback = false;

const getPagerViewComponent = () => {
  if (isExpoGo()) {
    return null;
  }

  if (hasResolvedPagerViewComponent) {
    return cachedPagerViewComponent;
  }

  hasResolvedPagerViewComponent = true;

  try {
    const pagerModule = require('react-native-pager-view');
    cachedPagerViewComponent = pagerModule?.default ?? pagerModule;
  } catch (error) {
    cachedPagerViewComponent = null;
    if (!hasWarnedAboutPagerFallback) {
      hasWarnedAboutPagerFallback = true;
      console.warn('[SubmenuPager] PagerView is unavailable in this build. Falling back to scroll-based paging.', error?.message || error);
    }
  }

  return cachedPagerViewComponent;
};

const PagerViewComponent = getPagerViewComponent();
const AnimatedPagerView = PagerViewComponent
  ? Animated.createAnimatedComponent(PagerViewComponent)
  : null;

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

const SubmenuPager = ({ accentColor, sections, swipeEnabled = false }) => {
  const pagerRef = useRef(null);
  const fallbackPagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pageProgress = useSharedValue(0);
  const { width: viewportWidth } = useWindowDimensions();
  const pageWidth = Math.max(1, viewportWidth);
  const canSwipeBetweenSections = swipeEnabled && sections.length > 1;

  const pageScrollHandler = usePageScrollHandler({
    onPageScroll: (event) => {
      'worklet';
      pageProgress.value = event.position + event.offset;
    },
  }, []);

  const idiNaSekciju = useCallback((index) => {
    setActiveIndex(index);
    pageProgress.value = withTiming(index, NAV_TIMING);
    if (AnimatedPagerView) {
      pagerRef.current?.setPage(index);
      return;
    }

    fallbackPagerRef.current?.scrollTo({ x: pageWidth * index, animated: true });
  }, [pageProgress, pageWidth]);

  const onPageSelected = useCallback((event) => {
    const nextIndex = event.nativeEvent.position;
    pageProgress.value = nextIndex;
    setActiveIndex(nextIndex);
  }, [pageProgress]);

  const onFallbackScroll = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    pageProgress.value = offsetX / pageWidth;
  }, [pageProgress, pageWidth]);

  const onFallbackMomentumEnd = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.max(0, Math.min(sections.length - 1, Math.round(offsetX / pageWidth)));
    pageProgress.value = nextIndex;
    setActiveIndex(nextIndex);
  }, [pageProgress, pageWidth, sections.length]);

  return (
    <View style={styles.container}>
      {sections.length > 1 && (
        <View style={styles.submenuRail}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.submenuRow}
            keyboardShouldPersistTaps="handled"
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

      {AnimatedPagerView ? (
        <AnimatedPagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          offscreenPageLimit={Math.min(2, sections.length)}
          onPageScroll={pageScrollHandler}
          onPageSelected={onPageSelected}
          overdrag={false}
          scrollEnabled={canSwipeBetweenSections}
        >
          {sections.map((section, index) => (
            <View key={section.key} collapsable={false} style={styles.pageContainer}>
              <PagerScene index={index} pageProgress={pageProgress} section={section} />
            </View>
          ))}
        </AnimatedPagerView>
      ) : (
        <ScrollView
          ref={fallbackPagerRef}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
          scrollEnabled={canSwipeBetweenSections}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onFallbackScroll}
          onMomentumScrollEnd={onFallbackMomentumEnd}
          style={styles.pagerFallback}
        >
          {sections.map((section, index) => (
            <View key={section.key} collapsable={false} style={[styles.pageContainer, { width: pageWidth }]}> 
              <PagerScene index={index} pageProgress={pageProgress} section={section} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BOJE.bg,
  },
  submenuRail: {
    marginTop: 6,
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(10,15,27,0.92)',
  },
  submenuRow: {
    paddingHorizontal: 2,
  },
  submenuButton: {
    marginRight: 6,
  },
  submenuChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submenuChipText: {
    fontSize: Math.round(10 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  pager: {
    flex: 1,
  },
  pagerFallback: {
    flex: 1,
    backgroundColor: BOJE.bg,
  },
  pageContainer: {
    flex: 1,
    backgroundColor: BOJE.bg,
  },
  page: {
    flex: 1,
    backgroundColor: BOJE.bg,
  },
});

export default SubmenuPager;