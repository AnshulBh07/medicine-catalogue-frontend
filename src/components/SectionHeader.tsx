import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { fontWeights } from '../theme';

import { Icon, type IconName } from './Icon';

export interface SectionHeaderProps {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  icon?: IconName;
  iconColor?: string;
  actionIcon?: IconName;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionTitle,
  onAction,
  style,
  testID,
  icon,
  iconColor = '#0F172A',
  actionIcon,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.titleRow}>
        {icon ? (
          <View style={styles.iconContainer}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionTitle && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionTitle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>{actionTitle}</Text>
          {actionIcon ? (
            <Icon name={actionIcon} size={13} color="#15803D" />
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13.5,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
});
