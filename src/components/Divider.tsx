import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '../theme';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  marginVertical?: number;
}

export const Divider: React.FC<DividerProps> = ({
  style,
  color = colors.border,
  marginVertical = spacing.md,
}) => {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: color, marginVertical },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
});
