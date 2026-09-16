import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, FormField, Icon, TextInput } from '../../components';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { PublicManufacturer } from '../../types/models';

export interface ManufacturerFormModalProps {
  visible: boolean;
  manufacturer: PublicManufacturer | null;
  onClose: () => void;
  onSuccess: (savedManufacturer: PublicManufacturer) => void;
}

export const ManufacturerFormModal: React.FC<ManufacturerFormModalProps> = ({
  visible,
  manufacturer,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(manufacturer);

  const [name, setName] = useState(manufacturer ? manufacturer.name : '');
  const [active, setActive] = useState(manufacturer ? manufacturer.active : true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (manufacturer) {
      setName(manufacturer.name);
      setActive(manufacturer.active);
    } else {
      setName('');
      setActive(true);
    }
    setNameError(null);
    setErrorMessage(null);
  }, [manufacturer, visible]);

  const handleSubmit = async () => {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
      setNameError('Manufacturer name is required');
      return;
    }
    setNameError(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isEditing && manufacturer) {
        const response = await apiClient.patch<{ manufacturer: PublicManufacturer }>(
          `/manufacturers/${manufacturer.id}`,
          {
            name: trimmedName,
            active,
          },
        );
        onSuccess(response.manufacturer);
      } else {
        const response = await apiClient.post<{ manufacturer: PublicManufacturer }>(
          '/manufacturers',
          {
            name: trimmedName,
            active,
          },
        );
        onSuccess(response.manufacturer);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save manufacturer';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="manufacturer-form-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close manufacturer modal"
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="manufacturers" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Manufacturer' : 'Add Manufacturer'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing
                    ? 'Update pharmaceutical producer details'
                    : 'Register a new pharmaceutical producer'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              testID="close-manufacturer-modal-btn"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {errorMessage ? (
              <View style={styles.errorBox} testID="manufacturer-form-error">
                <Icon name="warning" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Manufacturer Name Input */}
            <FormField
              label="Manufacturer Name *"
              error={nameError || undefined}
              helperText="e.g. Cipla Ltd., Sun Pharma, Dr. Reddy's Laboratories"
            >
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError(null);
                }}
                placeholder="Enter manufacturer name"
                autoCapitalize="words"
                testID="manufacturer-name-input"
              />
            </FormField>

            {/* Active Status Toggle */}
            <View style={styles.activeCard}>
              <View style={styles.activeCardContent}>
                <View style={styles.activeCardHeaderRow}>
                  <Text style={styles.activeCardTitle}>Active Status</Text>
                  <View
                    style={[
                      styles.activeBadge,
                      active ? styles.activeBadgeOn : styles.activeBadgeOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activeBadgeText,
                        active ? styles.activeBadgeTextOn : styles.activeBadgeTextOff,
                      ]}
                    >
                      {active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeCardSubtitle}>
                  Deactivating prevents selecting this manufacturer in new medicines.
                </Text>
              </View>
              <View style={styles.activeSwitchWrapper}>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle active status"
                  testID="manufacturer-active-switch"
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.footerCancelBtn}
              testID="manufacturer-cancel-btn"
            />
            <Button
              title={isEditing ? 'Save Changes' : 'Create Manufacturer'}
              variant="primary"
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.footerSubmitBtn}
              testID="manufacturer-submit-btn"
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
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    flex: 1,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.md,
  },
  activeCardContent: {
    flex: 1,
    minWidth: 200,
  },
  activeCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeCardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  activeBadgeOn: {
    backgroundColor: '#ECFDF5',
  },
  activeBadgeOff: {
    backgroundColor: '#F1F5F9',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  activeBadgeTextOn: {
    color: colors.primary,
  },
  activeBadgeTextOff: {
    color: colors.textMuted,
  },
  activeCardSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  activeSwitchWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerCancelBtn: {
    minWidth: 80,
  },
  footerSubmitBtn: {
    minWidth: 120,
  },
});
