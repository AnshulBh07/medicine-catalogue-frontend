import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import type { PublicSalt, SaltImpactReport } from '../../types/models';

export interface SaltFormModalProps {
  visible: boolean;
  salt: PublicSalt | null; // null for Create, object for Edit
  onClose: () => void;
  onSuccess: (savedSalt: PublicSalt) => void;
}

export const SaltFormModal: React.FC<SaltFormModalProps> = ({
  visible,
  salt,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(salt);

  const [name, setName] = useState(salt ? salt.name : '');
  const [description, setDescription] = useState(salt?.description || '');
  const [active, setActive] = useState(salt ? salt.active : true);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impactReport, setImpactReport] = useState<SaltImpactReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAffectedDetails, setShowAffectedDetails] = useState(false);

  useEffect(() => {
    if (salt?.id) {
      setIsLoadingImpact(true);
      apiClient
        .get<{ impact: SaltImpactReport }>(`/salts/${salt.id}/impact`)
        .then((res) => {
          setImpactReport(res.impact);
        })
        .catch(() => {
          setImpactReport(null);
        })
        .finally(() => {
          setIsLoadingImpact(false);
        });
    }
  }, [salt?.id]);

  const handleSubmit = async () => {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
      setNameError('Salt name is required');
      return;
    }
    setNameError(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isEditing && salt) {
        const response = await apiClient.patch<{ salt: PublicSalt }>(`/salts/${salt.id}`, {
          name: trimmedName,
          description: description.trim() || null,
          active,
        });
        onSuccess(response.salt);
      } else {
        const response = await apiClient.post<{ salt: PublicSalt }>('/salts', {
          name: trimmedName,
          description: description.trim() || null,
        });
        onSuccess(response.salt);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save active salt';
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
      testID="salt-form-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close salt modal"
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="salts" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Active Salt' : 'Add Active Salt'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing
                    ? 'Update API molecule details and synchronization'
                    : 'Register a new active pharmaceutical ingredient'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Impact Warning Banner when Editing */}
            {isEditing && impactReport && (impactReport.compositionsCount > 0 || impactReport.medicinesCount > 0) ? (
              <View style={styles.impactWarningBox}>
                <View style={styles.impactHeader}>
                  <Icon name="info" size={16} color="#D97706" />
                  <Text style={styles.impactTitle}>Hierarchy Propagation Notice</Text>
                </View>
                <Text style={styles.impactBody}>
                  Renaming this salt will automatically update{' '}
                  <Text style={styles.impactBold}>{impactReport.compositionsCount} composition(s)</Text>{' '}
                  and propagate to{' '}
                  <Text style={styles.impactBold}>{impactReport.medicinesCount} medicine(s)</Text>.
                </Text>

                <TouchableOpacity
                  style={styles.toggleAffectedRow}
                  onPress={() => setShowAffectedDetails((p) => !p)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleAffectedText}>
                    {showAffectedDetails ? 'Hide affected records' : 'View affected records'}
                  </Text>
                  <Icon
                    name={showAffectedDetails ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#B45309"
                  />
                </TouchableOpacity>

                {showAffectedDetails ? (
                  <View style={styles.affectedListContainer}>
                    {impactReport.compositions.length > 0 ? (
                      <View style={styles.affectedSection}>
                        <Text style={styles.affectedSectionTitle}>Compositions:</Text>
                        {impactReport.compositions.map((comp) => (
                          <Text key={comp.id} style={styles.affectedItemText} numberOfLines={1}>
                            • {comp.displayText}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {impactReport.medicines.length > 0 ? (
                      <View style={styles.affectedSection}>
                        <Text style={styles.affectedSectionTitle}>Medicines:</Text>
                        {impactReport.medicines.map((med) => (
                          <Text key={med.id} style={styles.affectedItemText} numberOfLines={1}>
                            • {med.name}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {isLoadingImpact ? (
              <View style={styles.impactLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.impactLoadingText}>Checking dependency impact...</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Icon name="warning" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Salt Name Input */}
            <FormField
              label="Salt / API Name *"
              error={nameError || undefined}
              helperText="e.g. Paracetamol, Amoxicillin Trihydrate, Amlodipine Besylate"
            >
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError(null);
                }}
                placeholder="Enter salt or chemical name"
                autoCapitalize="words"
                testID="salt-name-input"
              />
            </FormField>

            {/* Salt Description / Category Textarea */}
            <FormField
              label="Description / Category"
              helperText="Optional pharmacological notes or therapeutic category"
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Dihydropyridine calcium channel blocker"
                multiline
                numberOfLines={3}
                testID="salt-description-input"
              />
            </FormField>

            {/* Active Toggle for Edit */}
            {isEditing ? (
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
                    Deactivating prevents selecting this salt in new medicines.
                  </Text>
                </View>
                <View style={styles.activeSwitchWrapper}>
                  <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel="Toggle active status"
                    testID="salt-active-switch"
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.footerCancelBtn}
              testID="salt-cancel-btn"
            />
            <Button
              title={isEditing ? 'Save Changes' : 'Create Salt'}
              variant="primary"
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.footerSubmitBtn}
              testID="salt-submit-btn"
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
  impactWarningBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  impactTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  impactBody: {
    fontSize: fontSizes.sm,
    color: '#78350F',
    lineHeight: 18,
  },
  impactBold: {
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  toggleAffectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  toggleAffectedText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#B45309',
    textDecorationLine: 'underline',
  },
  affectedListContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: 6,
  },
  affectedSection: {
    gap: 2,
  },
  affectedSectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#78350F',
    textTransform: 'uppercase',
  },
  affectedItemText: {
    fontSize: 12,
    color: '#92400E',
    paddingLeft: 4,
  },
  impactLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  impactLoadingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
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
