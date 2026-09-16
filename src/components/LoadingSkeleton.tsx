import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, spacing } from '../theme';

export interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.sm,
  style,
  testID,
}) => {
  return (
    <View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width: width as ViewStyle['width'],
          height,
          borderRadius: radius,
        },
        style,
      ]}
    />
  );
};

export interface LoadingSkeletonListProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const LoadingSkeletonList: React.FC<LoadingSkeletonListProps> = ({
  count = 4,
  style,
}) => {
  return (
    <View style={[styles.listContainer, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardSkeleton}>
          <Skeleton width={44} height={44} borderRadius={22} style={styles.avatar} />
          <View style={styles.content}>
            <Skeleton width="60%" height={16} style={styles.line} />
            <Skeleton width="40%" height={12} style={styles.line} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.skeleton,
  },
  listContainer: {
    paddingVertical: spacing.sm,
  },
  cardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    marginBottom: 2,
  },
});
