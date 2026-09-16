import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  loading?: boolean;
  testID?: string;
  cancelTestID?: string;
  confirmTestID?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  loading = false,
  testID,
  cancelTestID,
  confirmTestID,
}) => {
  useEffect(() => {
    // When dialog opens/closes on web, blur active element so aria-hidden applied to background or modal
    // does not block accessibility APIs due to active descendants.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        activeEl !== document.body &&
        typeof activeEl.blur === 'function'
      ) {
        activeEl.blur();
      }
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <View style={styles.dialog} testID={testID ? `${testID}-content` : undefined}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <Button
              title={cancelText}
              variant="ghost"
              size="sm"
              onPress={onCancel}
              disabled={loading}
              style={styles.cancelButton}
              testID={cancelTestID || (testID ? `${testID}-cancel` : undefined)}
            />
            <Button
              title={confirmText}
              variant={isDestructive ? 'danger' : 'primary'}
              size="sm"
              onPress={onConfirm}
              loading={loading}
              style={styles.confirmButton}
              testID={confirmTestID || (testID ? `${testID}-confirm` : undefined)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backdrop,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancelButton: {
    minWidth: 80,
  },
  confirmButton: {
    minWidth: 100,
  },
});
