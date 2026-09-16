import React, { useEffect, useMemo, useState } from 'react';
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
import { Button, DropdownSelect, FormField, Icon, TextInput } from '../../components';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { CompositionImpactReport, CompositionSaltUnit, PublicComposition, PublicSalt } from '../../types/models';

const UNIT_OPTIONS: Array<{ label: string; value: CompositionSaltUnit }> = [
  { label: 'MG (Milligrams)', value: 'MG' },
  { label: 'MCG (Micrograms)', value: 'MCG' },
  { label: 'G (Grams)', value: 'G' },
  { label: 'ML (Milliliters)', value: 'ML' },
  { label: 'IU (International Units)', value: 'IU' },
  { label: '% (Percentage)', value: 'PERCENT' },
  { label: 'OTHER', value: 'OTHER' },
];

export interface SaltRowState {
  saltId?: string;
  name: string;
  amount: string;
  unit: CompositionSaltUnit;
}

export interface CompositionFormModalProps {
  visible: boolean;
  composition: PublicComposition | null; // null for Create, object for Edit
  onClose: () => void;
  onSuccess: (savedComposition: PublicComposition) => void;
}

export const CompositionFormModal: React.FC<CompositionFormModalProps> = ({
  visible,
  composition,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(composition);

  const [description, setDescription] = useState(composition?.description || '');
  const [active, setActive] = useState(composition ? composition.active : true);
  const [saltRows, setSaltRows] = useState<SaltRowState[]>(
    composition?.compositionSalts && composition.compositionSalts.length > 0
      ? composition.compositionSalts.map((cs) => ({
          saltId: cs.salt.id,
          name: cs.salt.name,
          amount: String(cs.amount),
          unit: cs.unit,
        }))
      : [{ name: '', amount: '', unit: 'MG' }],
  );

  const [availableSalts, setAvailableSalts] = useState<PublicSalt[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impactReport, setImpactReport] = useState<CompositionImpactReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAffectedMedicines, setShowAffectedMedicines] = useState(false);

  useEffect(() => {
    // Fetch available salts for suggestions
    apiClient
      .get<{ salts: PublicSalt[] }>('/salts?active=active')
      .then((res) => {
        if (res && Array.isArray(res.salts)) {
          setAvailableSalts(res.salts);
        }
      })
      .catch(() => {});

    if (composition?.id) {
      setIsLoadingImpact(true);
      apiClient
        .get<{ impact: CompositionImpactReport }>(`/compositions/${composition.id}/impact`)
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
  }, [composition?.id]);

  const handleAddSaltRow = () => {
    setSaltRows((prev) => [...prev, { name: '', amount: '', unit: 'MG' }]);
  };

  const handleRemoveSaltRow = (index: number) => {
    setSaltRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSaltRow = (
    index: number,
    field: keyof SaltRowState,
    value: string | CompositionSaltUnit,
  ) => {
    setSaltRows((prev) => {
      const copy = [...prev];
      if (field === 'name') {
        const matchingSalt = availableSalts.find(
          (s) => s.name.toLowerCase() === String(value).trim().toLowerCase(),
        );
        copy[index] = {
          ...copy[index],
          name: String(value),
          saltId: matchingSalt ? matchingSalt.id : undefined,
        };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  // Live Canonical Formula Preview
  const liveFormulaPreview = useMemo(() => {
    const validRows = saltRows
      .filter((r) => r.name.trim() && !isNaN(parseFloat(r.amount)) && parseFloat(r.amount) > 0)
      .map((r) => ({
        name: r.name.trim(),
        amount: parseFloat(r.amount),
        unit: r.unit,
      }));

    if (validRows.length === 0) return 'e.g. Amoxicillin 500 MG + Clavulanic Acid 125 MG';

    const sorted = [...validRows].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );

    return sorted.map((s) => `${s.name} ${s.amount} ${s.unit}`).join(' + ');
  }, [saltRows]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validate rows
    if (saltRows.length === 0) {
      setErrorMessage('At least one active salt row is required');
      return;
    }

    const payloadSalts: Array<{ saltId?: string; name?: string; amount: number; unit: CompositionSaltUnit }> = [];
    const seenNames = new Set<string>();

    for (let i = 0; i < saltRows.length; i++) {
      const row = saltRows[i];
      const trimmedName = row.name.trim().replace(/\s+/g, ' ');
      const amountNum = parseFloat(row.amount);

      if (!trimmedName) {
        setErrorMessage(`Salt name is required for row #${i + 1}`);
        return;
      }
      if (isNaN(amountNum) || amountNum <= 0) {
        setErrorMessage(`Valid amount (> 0) is required for salt '${trimmedName}'`);
        return;
      }

      const lowerName = trimmedName.toLowerCase();
      if (seenNames.has(lowerName)) {
        setErrorMessage(`Duplicate salt '${trimmedName}' in formula. Each salt must be unique.`);
        return;
      }
      seenNames.add(lowerName);

      payloadSalts.push({
        saltId: row.saltId,
        name: trimmedName,
        amount: amountNum,
        unit: row.unit,
      });
    }

    setIsSubmitting(true);

    try {
      if (isEditing && composition) {
        const response = await apiClient.patch<{ composition: PublicComposition }>(
          `/compositions/${composition.id}`,
          {
            salts: payloadSalts,
            description: description.trim() || null,
            active,
          },
        );
        onSuccess(response.composition);
      } else {
        const response = await apiClient.post<{ composition: PublicComposition }>('/compositions', {
          salts: payloadSalts,
          description: description.trim() || null,
        });
        onSuccess(response.composition);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save composition';
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
      testID="composition-form-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close composition modal"
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="compositions" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Composition Formula' : 'Add Composition'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing
                    ? 'Modify shared chemical formula & strength ratios'
                    : 'Build a multi-salt formulation with canonical ordering'}
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
            {isEditing && impactReport && impactReport.medicinesCount > 0 ? (
              <View style={styles.impactWarningBox}>
                <View style={styles.impactHeader}>
                  <Icon name="info" size={16} color="#D97706" />
                  <Text style={styles.impactTitle}>Shared Formula Impact Warning</Text>
                </View>
                <Text style={styles.impactBody}>
                  Modifying this composition will update the chemical formula shown for all{' '}
                  <Text style={styles.impactBold}>{impactReport.medicinesCount} linked medicine(s)</Text>.
                </Text>

                <TouchableOpacity
                  style={styles.toggleAffectedRow}
                  onPress={() => setShowAffectedMedicines((p) => !p)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleAffectedText}>
                    {showAffectedMedicines ? 'Hide linked medicines' : 'View linked medicines'}
                  </Text>
                  <Icon
                    name={showAffectedMedicines ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#B45309"
                  />
                </TouchableOpacity>

                {showAffectedMedicines ? (
                  <View style={styles.affectedListContainer}>
                    {impactReport.medicines.map((med) => (
                      <Text key={med.id} style={styles.affectedItemText} numberOfLines={1}>
                        • {med.name}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {isLoadingImpact ? (
              <View style={styles.impactLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.impactLoadingText}>Checking linked medicines...</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Icon name="warning" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Live Canonical Preview Banner */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Canonical Formula Preview</Text>
              <Text style={styles.previewFormulaText}>{liveFormulaPreview}</Text>
            </View>

            {/* Active Salts Multi-Row Builder */}
            <View style={styles.saltsSectionHeader}>
              <Text style={styles.sectionTitle}>Active Pharmaceutical Ingredients</Text>
              <Text style={styles.sectionSubtitle}>
                Add one or more APIs with exact strength dosage amounts
              </Text>
            </View>

            <View style={styles.saltRowsList}>
              {saltRows.map((row, index) => {
                return (
                  <View key={`salt-row-${index}`} style={styles.saltRowCard}>
                    <View style={styles.saltRowHeader}>
                      <Text style={styles.saltRowIndexText}>Salt #{index + 1}</Text>
                      {saltRows.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => handleRemoveSaltRow(index)}
                          style={styles.removeRowButton}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove Salt #${index + 1}`}
                          testID={`remove-salt-row-${index}`}
                        >
                          <Icon name="delete" size={14} color={colors.error} />
                          <Text style={styles.removeRowText}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Salt Name Input */}
                    <FormField label="Salt / Molecule Name *">
                      <TextInput
                        value={row.name}
                        onChangeText={(text) => handleUpdateSaltRow(index, 'name', text)}
                        placeholder="e.g. Paracetamol, Amoxicillin"
                        autoCapitalize="words"
                        testID={`salt-row-name-${index}`}
                      />
                    </FormField>

                    {/* Amount & Unit Inlined */}
                    <View style={styles.amountUnitRow}>
                      <View style={styles.amountField}>
                        <FormField label="Strength Amount *">
                          <TextInput
                            value={row.amount}
                            onChangeText={(text) => handleUpdateSaltRow(index, 'amount', text)}
                            placeholder="e.g. 500"
                            keyboardType="numeric"
                            testID={`salt-row-amount-${index}`}
                          />
                        </FormField>
                      </View>

                      <View style={styles.unitField}>
                        <DropdownSelect
                          label="Unit *"
                          placeholder="Unit"
                          options={UNIT_OPTIONS}
                          selectedValue={row.unit}
                          onSelect={(val) => {
                            handleUpdateSaltRow(index, 'unit', (val as CompositionSaltUnit) || 'MG');
                            setOpenDropdown(null);
                          }}
                          isOpen={openDropdown === `unit-${index}`}
                          onToggle={() => setOpenDropdown((prev) => (prev === `unit-${index}` ? null : `unit-${index}`))}
                          testID={`salt-row-unit-${index}`}
                          maxHeight={160}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Add Another Salt Button */}
              <TouchableOpacity
                style={styles.addSaltButton}
                onPress={handleAddSaltRow}
                accessibilityRole="button"
                accessibilityLabel="Add another salt"
                testID="add-salt-row-btn"
                activeOpacity={0.7}
              >
                <Icon name="add" size={16} color={colors.primary} />
                <Text style={styles.addSaltButtonText}>Add Another Salt to Formula</Text>
              </TouchableOpacity>
            </View>

            {/* Composition Description / Therapeutic Class Textarea */}
            <FormField
              label="Composition Description / Therapeutic Class"
              helperText="Optional formulation summary or medical remarks"
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Dual-action broad spectrum antibiotic combination"
                multiline
                numberOfLines={3}
                testID="composition-description-input"
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
                    Deactivating prevents selecting this formula for new medicines.
                  </Text>
                </View>
                <View style={styles.activeSwitchWrapper}>
                  <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{ false: '#CBD5E1', true: colors.primary }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel="Toggle active status"
                    testID="composition-active-switch"
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
              testID="composition-cancel-btn"
            />
            <Button
              title={isEditing ? 'Save Changes' : 'Create Composition'}
              variant="primary"
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.footerSubmitBtn}
              testID="composition-submit-btn"
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
    maxWidth: 560,
    maxHeight: '92%',
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
    backgroundColor: '#F3E8FF',
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
    gap: spacing.md,
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
    gap: 4,
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
  previewBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  previewFormulaText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#14532D',
  },
  saltsSectionHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  saltRowsList: {
    gap: spacing.sm,
  },
  saltRowCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  saltRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saltRowIndexText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#475569',
    textTransform: 'uppercase',
  },
  removeRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  removeRowText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.semibold,
  },
  amountUnitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountField: {
    flex: 1,
  },
  unitField: {
    flex: 1,
  },
  addSaltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: colors.primary,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  addSaltButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
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
    minWidth: 140,
  },
});
