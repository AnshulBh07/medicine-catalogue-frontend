import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, EmptyState, Icon } from '../../components';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { PublicManufacturer } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

export interface ManufacturerDetailsModalProps {
  visible: boolean;
  manufacturerId: string | null;
  initialManufacturer?: PublicManufacturer | null;
  onClose: () => void;
  onEdit?: (manufacturer: PublicManufacturer) => void;
  onDelete?: (manufacturer: PublicManufacturer) => void;
  isAdmin?: boolean;
}

export const ManufacturerDetailsModal: React.FC<ManufacturerDetailsModalProps> = ({
  visible,
  manufacturerId,
  initialManufacturer,
  onClose,
  onEdit,
  onDelete,
  isAdmin = false,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [manufacturer, setManufacturer] = useState<PublicManufacturer | null>(
    initialManufacturer || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !manufacturerId) {
      setManufacturer(null);
      setError(null);
      return;
    }

    if (initialManufacturer && initialManufacturer.id === manufacturerId) {
      setManufacturer(initialManufacturer);
    }

    setIsLoading(true);
    setError(null);

    apiClient
      .get<{ manufacturer: PublicManufacturer }>(
        `/manufacturers/${manufacturerId}?includeInactive=true`,
      )
      .then((res) => {
        if (res && res.manufacturer) {
          setManufacturer(res.manufacturer);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load manufacturer details';
        setError(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [visible, manufacturerId, initialManufacturer]);

  const handleMedicinePress = (medicineId: string) => {
    onClose();
    navigation.navigate('MedicineDetails', { id: medicineId });
  };

  const medicines = manufacturer?.medicines || [];
  const medicinesCount = manufacturer?.medicinesCount ?? medicines.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="manufacturer-details-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close manufacturer details modal"
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="manufacturers" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.modalTitle} numberOfLines={1} testID="mfg-details-name">
                  {manufacturer?.name || 'Manufacturer Details'}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      manufacturer?.active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        manufacturer?.active
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {manufacturer?.active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                  <View style={styles.medCountBadge}>
                    <Icon name="capsule" size={12} color="#059669" />
                    <Text style={styles.medCountBadgeText} testID="mfg-details-med-count">
                      {medicinesCount} {medicinesCount === 1 ? 'Medicine' : 'Medicines'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close details modal"
              testID="close-mfg-details-btn"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && !manufacturer ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading manufacturer details...</Text>
              </View>
            ) : error && !manufacturer ? (
              <View style={styles.errorContainer}>
                <Icon name="warning" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : manufacturer ? (
              <>
                {/* Admin Quick Action Bar */}
                {isAdmin ? (
                  <View style={styles.adminActionBar}>
                    <TouchableOpacity
                      style={styles.adminEditBtn}
                      onPress={() => {
                        onClose();
                        if (onEdit) onEdit(manufacturer);
                      }}
                      testID="mfg-details-edit-btn"
                    >
                      <Icon name="edit" size={15} color={colors.primary} />
                      <Text style={styles.adminEditBtnText}>Edit Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.adminDeleteBtn}
                      onPress={() => {
                        onClose();
                        if (onDelete) onDelete(manufacturer);
                      }}
                      testID="mfg-details-delete-btn"
                    >
                      <Icon name="delete" size={15} color={colors.error} />
                      <Text style={styles.adminDeleteBtnText}>
                        {medicinesCount > 0 ? 'Deactivate' : 'Delete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Associated Medicines Section */}
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                      <Icon name="capsule" size={16} color={colors.primary} />
                      <Text style={styles.sectionTitle}>Associated Medicines</Text>
                    </View>
                    <Text style={styles.sectionCountText}>
                      {medicines.length} {medicines.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>

                  {isLoading ? (
                    <View style={styles.inlineLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.inlineLoadingText}>Updating medicine list...</Text>
                    </View>
                  ) : null}

                  {medicines.length > 0 ? (
                    <View style={styles.medicinesList} testID="mfg-medicines-list">
                      {medicines.map((med) => (
                        <TouchableOpacity
                          key={med.id}
                          style={styles.medicineCard}
                          onPress={() => handleMedicinePress(med.id)}
                          activeOpacity={0.7}
                          testID={`mfg-med-card-${med.id}`}
                        >
                          <View style={styles.medicineCardLeft}>
                            <View style={styles.medicineIconCircle}>
                              <Icon name="capsule" size={14} color="#059669" />
                            </View>
                            <View style={styles.medicineInfo}>
                              <Text style={styles.medicineName} numberOfLines={1}>
                                {med.name}
                              </Text>
                              {med.composition?.displayText ? (
                                <Text style={styles.medicineComp} numberOfLines={1}>
                                  {med.composition.displayText}
                                </Text>
                              ) : null}
                              <View style={styles.medicineMetaRow}>
                                <View style={styles.formTag}>
                                  <Text style={styles.formTagText}>{med.form}</Text>
                                </View>
                                <Text style={styles.medicinePackText}>
                                  {med.packQuantity} {med.packUnit}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.medicineCardRight}>
                            <View
                              style={[
                                styles.medStatusDot,
                                med.active ? styles.medStatusDotActive : styles.medStatusDotInactive,
                              ]}
                            />
                            <Icon name="chevron-right" size={16} color={colors.textMuted} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Card style={styles.emptyCard} testID="mfg-no-medicines-card">
                      <EmptyState
                        icon="capsule"
                        title="No Associated Medicines"
                        description="This manufacturer currently has no medicines registered in the catalogue."
                      />
                    </Card>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button
              title="Close"
              variant="outline"
              onPress={onClose}
              style={styles.footerCloseBtn}
              testID="mfg-details-close-btn"
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
    maxWidth: 540,
    maxHeight: '88%',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: colors.primary,
  },
  statusBadgeTextInactive: {
    color: colors.textMuted,
  },
  medCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  medCountBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error,
    flex: 1,
  },
  adminActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  adminEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
  },
  adminEditBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  adminDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
  },
  adminDeleteBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.error,
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCountText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  inlineLoadingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  medicinesList: {
    gap: spacing.xs,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  medicineCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  medicineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  medicineComp: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  medicineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  formTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  formTagText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  medicinePackText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  medicineCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  medStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  medStatusDotActive: {
    backgroundColor: '#10B981',
  },
  medStatusDotInactive: {
    backgroundColor: '#94A3B8',
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerCloseBtn: {
    minWidth: 90,
  },
});
