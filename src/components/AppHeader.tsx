import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fontWeights, spacing } from '../theme';
import { Icon } from './Icon';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  rightIcon?: 'filter' | 'filter-filled' | 'search' | 'add' | 'more' | 'edit';
  onRightPress?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  leftAction,
  rightAction,
  rightIcon,
  onRightPress,
  style,
  titleStyle,
  subtitleStyle,
  testID,
}) => {
  return (
    <View style={[styles.header, style]} testID={testID}>
      <View style={styles.leftContainer}>
        {showBack && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="back" size="lg" color={colors.textInverse} />
          </TouchableOpacity>
        ) : leftAction ? (
          <View style={styles.leftActionContainer}>{leftAction}</View>
        ) : null}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightAction}
        {rightIcon && onRightPress ? (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={rightIcon}
            testID={testID ? `${testID}-right-button` : 'app-header-right-button'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={rightIcon} size="md" color={colors.textInverse} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    backgroundColor: colors.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftActionContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: fontWeights.normal,
    marginTop: 2,
    opacity: 0.9,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});
