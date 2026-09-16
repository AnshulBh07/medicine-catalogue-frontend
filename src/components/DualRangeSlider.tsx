import React, { useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';

const THUMB_SIZE = 26;

export interface DualRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  lowValue: number;
  highValue: number;
  onChange: (low: number, high: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function formatRupee(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function DualRangeSlider({
  min = 0,
  max = 5000,
  step = 50,
  lowValue,
  highValue,
  onChange,
  style,
  testID,
}: DualRangeSliderProps): React.ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const [localLow, setLocalLow] = useState(lowValue);
  const [localHigh, setLocalHigh] = useState(highValue);

  const lowRef = useRef(lowValue);
  const highRef = useRef(highValue);
  const startLowRef = useRef(lowValue);
  const startHighRef = useRef(highValue);
  const trackWidthRef = useRef(0);
  const usableWidthRef = useRef(0);

  useEffect(() => {
    setLocalLow(lowValue);
    lowRef.current = lowValue;
  }, [lowValue]);

  useEffect(() => {
    setLocalHigh(highValue);
    highRef.current = highValue;
  }, [highValue]);

  const updateUsableWidth = (width: number) => {
    trackWidthRef.current = width;
    usableWidthRef.current = Math.max(1, width - THUMB_SIZE);
    setTrackWidth(width);
  };

  const panResponderLow = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startLowRef.current = lowRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (usableWidthRef.current <= 0) return;
        const startPixel =
          ((startLowRef.current - min) / (max - min)) * usableWidthRef.current;
        const newPixel = startPixel + gestureState.dx;
        const rawVal =
          min + (newPixel / usableWidthRef.current) * (max - min);
        const stepped = Math.round((rawVal - min) / step) * step + min;
        const clamped = Math.min(Math.max(min, stepped), highRef.current);
        if (clamped !== lowRef.current) {
          lowRef.current = clamped;
          setLocalLow(clamped);
          onChange(clamped, highRef.current);
        }
      },
    }),
  ).current;

  const panResponderHigh = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startHighRef.current = highRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (usableWidthRef.current <= 0) return;
        const startPixel =
          ((startHighRef.current - min) / (max - min)) * usableWidthRef.current;
        const newPixel = startPixel + gestureState.dx;
        const rawVal =
          min + (newPixel / usableWidthRef.current) * (max - min);
        const stepped = Math.round((rawVal - min) / step) * step + min;
        const clamped = Math.max(Math.min(max, stepped), lowRef.current);
        if (clamped !== highRef.current) {
          highRef.current = clamped;
          setLocalHigh(clamped);
          onChange(lowRef.current, clamped);
        }
      },
    }),
  ).current;

  const handleTrackPress = (evt: GestureResponderEvent) => {
    if (usableWidthRef.current <= 0) return;
    const clickX = Math.max(
      0,
      Math.min(
        evt.nativeEvent.locationX - THUMB_SIZE / 2,
        usableWidthRef.current,
      ),
    );
    const rawVal = min + (clickX / usableWidthRef.current) * (max - min);
    const stepped = Math.round((rawVal - min) / step) * step + min;

    const distToLow = Math.abs(stepped - lowRef.current);
    const distToHigh = Math.abs(stepped - highRef.current);

    if (distToLow <= distToHigh) {
      const clamped = Math.min(Math.max(min, stepped), highRef.current);
      lowRef.current = clamped;
      setLocalLow(clamped);
      onChange(clamped, highRef.current);
    } else {
      const clamped = Math.max(Math.min(max, stepped), lowRef.current);
      highRef.current = clamped;
      setLocalHigh(clamped);
      onChange(lowRef.current, clamped);
    }
  };

  const usableWidth = Math.max(1, trackWidth - THUMB_SIZE);
  const lowPercent = Math.max(0, Math.min(1, (localLow - min) / (max - min)));
  const highPercent = Math.max(0, Math.min(1, (localHigh - min) / (max - min)));

  const lowPixel = lowPercent * usableWidth;
  const highPixel = highPercent * usableWidth;

  const isFullRange = localLow === min && localHigh === max;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Min / Max Bounds Header */}
      <View style={styles.boundsRow}>
        <Text style={styles.boundsText}>{formatRupee(min)}</Text>
        <Text style={styles.boundsText}>{formatRupee(max)}</Text>
      </View>

      {/* Slider Interactive Track Area */}
      <View
        style={styles.sliderArea}
        onLayout={(e) => updateUsableWidth(e.nativeEvent.layout.width)}
      >
        {/* Full Inactive Track */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleTrackPress}
          style={styles.trackBackground}
          testID="slider-track"
        />

        {/* Active Highlighted Track Segment */}
        {trackWidth > 0 && (
          <View
            style={[
              styles.trackActive,
              {
                left: lowPixel + THUMB_SIZE / 2,
                width: Math.max(0, highPixel - lowPixel),
                pointerEvents: 'none',
              },
            ]}
          />
        )}

        {/* Left Thumb (Minimum MRP) */}
        {trackWidth > 0 && (
          <View
            style={[
              styles.thumbTouchTarget,
              { left: lowPixel },
            ]}
            {...panResponderLow.panHandlers}
            testID="slider-thumb-min"
          >
            <View style={styles.thumbCircle} />
          </View>
        )}

        {/* Right Thumb (Maximum MRP) */}
        {trackWidth > 0 && (
          <View
            style={[
              styles.thumbTouchTarget,
              { left: highPixel },
            ]}
            {...panResponderHigh.panHandlers}
            testID="slider-thumb-max"
          >
            <View style={styles.thumbCircle} />
          </View>
        )}
      </View>

      {/* Center Value Badge */}
      <View style={styles.valueBadgeContainer}>
        <View style={styles.valueBadge}>
          <Text style={styles.valueBadgeText}>
            {formatRupee(localLow)} – {formatRupee(localHigh)}
          </Text>
          {isFullRange ? (
            <Text style={styles.fullRangeText}> (All Prices)</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  boundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  boundsText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  sliderArea: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    width: '100%',
  },
  trackActive: {
    position: 'absolute',
    height: 6,
    backgroundColor: '#085444',
    borderRadius: 3,
  },
  thumbTouchTarget: {
    position: 'absolute',
    width: THUMB_SIZE + 16,
    height: 44,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbCircle: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: '#085444',
    ...theme.shadows.md,
    elevation: 4,
  },
  valueBadgeContainer: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  valueBadgeText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#085444',
  },
  fullRangeText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#15803D',
  },
});
