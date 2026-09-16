import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, componentHeights, theme } from '../theme';
import { Button, type ButtonProps } from './Button';
import { Icon, type IconName } from './Icon';

export type SpecificButtonProps = Omit<ButtonProps, 'variant'>;

export const PrimaryButton: React.FC<SpecificButtonProps> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<SpecificButtonProps> = (props) => (
  <Button variant="secondary" {...props} />
);

export const DangerButton: React.FC<SpecificButtonProps> = (props) => (
  <Button variant="danger" {...props} />
);

export const OutlineButton: React.FC<SpecificButtonProps> = (props) => (
  <Button variant="outline" {...props} />
);

export const GhostButton: React.FC<SpecificButtonProps> = (props) => (
  <Button variant="ghost" {...props} />
);

export interface FloatingActionButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  style,
  accessibilityLabel = 'Add item',
  testID,
}) => {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[styles.fab, style]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name={icon} size="xl" color={colors.textInverse} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: componentHeights.fab,
    height: componentHeights.fab,
    borderRadius: componentHeights.fab / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.fab,
  },
});
