import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../theme';
import type { MedicinePackUnit, PublicManufacturer, PublicMr, PublicSalt } from '../types/models';
import { Button } from './Button';
import { DropdownSelect } from './DropdownSelect';
import { DualRangeSlider } from './DualRangeSlider';
import { Icon } from './Icon';

export interface SaltStrengthFilterItem {
  id: string; // unique row id for keys
  saltId: string;
  saltName: string;
  strength: string;
}

export interface AdvancedCatalogueFilters {
  manufacturerId: string | null;
  saltCriteria: SaltStrengthFilterItem[];
  packQuantity: string;
  packUnit: MedicinePackUnit | null;
  recommendedAgeGroup: string;
  prescriptionRequired: 'ALL' | 'YES' | 'NO';
  minPrice: string;
  maxPrice: string;
  mrId: string | null;
}

export const INITIAL_ADVANCED_FILTERS: AdvancedCatalogueFilters = {
  manufacturerId: null,
  saltCriteria: [],
  packQuantity: '',
  packUnit: null,
  recommendedAgeGroup: '',
  prescriptionRequired: 'ALL',
  minPrice: '',
  maxPrice: '',
  mrId: null,
};

// Standard Pack Units supported by MedicinePackUnit schema
const PACK_UNIT_OPTIONS: Array<{ label: string; value: MedicinePackUnit | null }> = [
  { label: 'All Units', value: null },
  { label: 'Tablet', value: 'TABLET' },
  { label: 'Capsule', value: 'CAPSULE' },
  { label: 'Bottle', value: 'BOTTLE' },
  { label: 'Tube', value: 'TUBE' },
  { label: 'Sachet', value: 'SACHET' },
  { label: 'Vial', value: 'VIAL' },
  { label: 'Ampoule', value: 'AMPULE' },
  { label: 'ML', value: 'ML' },
  { label: 'MG', value: 'MG' },
  { label: 'G', value: 'G' },
  { label: 'Piece', value: 'PIECE' },
  { label: 'Other', value: 'OTHER' },
];

// Reference catalogue salts with typical strengths
const CATALOGUE_SALTS_DATA: Array<{ name: string; strengths: string[] }> = [
  { name: 'Paracetamol', strengths: ['125 mg', '250 mg', '500 mg', '650 mg', '1000 mg'] },
  { name: 'Caffeine', strengths: ['30 mg', '65 mg', '100 mg'] },
  { name: 'Amoxicillin', strengths: ['125 mg', '250 mg', '500 mg', '875 mg', '1000 mg'] },
  { name: 'Clavulanic Acid', strengths: ['31.25 mg', '62.5 mg', '125 mg'] },
  { name: 'Cetirizine', strengths: ['2.5 mg', '5 mg', '10 mg'] },
  { name: 'Omeprazole', strengths: ['10 mg', '20 mg', '40 mg'] },
  { name: 'Ibuprofen', strengths: ['100 mg', '200 mg', '400 mg', '600 mg', '800 mg'] },
  { name: 'Diclofenac', strengths: ['25 mg', '50 mg', '75 mg', '100 mg'] },
  { name: 'Azithromycin', strengths: ['100 mg', '250 mg', '500 mg'] },
  { name: 'Metformin', strengths: ['500 mg', '850 mg', '1000 mg'] },
  { name: 'Atorvastatin', strengths: ['10 mg', '20 mg', '40 mg', '80 mg'] },
  { name: 'Pantoprazole', strengths: ['20 mg', '40 mg'] },
  { name: 'Domperidone', strengths: ['10 mg', '30 mg'] },
  { name: 'Dextromethorphan', strengths: ['5 mg', '10 mg', '15 mg', '30 mg'] },
  { name: 'Chlorpheniramine', strengths: ['2 mg', '4 mg'] },
];

const AGE_GROUP_OPTIONS = [
  'All Ages',
  'Adults',
  'Children',
  'Pediatric',
  'Adults and children over 6',
  'Adults and children over 12',
  'Elderly',
];

export interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: AdvancedCatalogueFilters;
  onApply: (filters: AdvancedCatalogueFilters) => void;
  manufacturers?: PublicManufacturer[];
  mrs?: PublicMr[];
  salts?: PublicSalt[];
  minPriceLimit?: number;
  maxPriceLimit?: number;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  manufacturers = [],
  mrs = [],
  salts = [],
  minPriceLimit = 0,
  maxPriceLimit = 5000,
}) => {
  const [draft, setDraft] = useState<AdvancedCatalogueFilters>(filters);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const sliderMin = minPriceLimit;
  const sliderMax = maxPriceLimit;
  const sliderStep =
    sliderMax <= 500 ? 5 : sliderMax <= 1000 ? 10 : sliderMax <= 5000 ? 25 : 50;

  const currentLow = draft.minPrice ? parseFloat(draft.minPrice) : sliderMin;
  const currentHigh = draft.maxPrice ? parseFloat(draft.maxPrice) : sliderMax;

  const handlePriceRangeChange = (low: number, high: number) => {
    setDraft((prev) => ({
      ...prev,
      minPrice: low === sliderMin ? '' : String(low),
      maxPrice: high === sliderMax ? '' : String(high),
    }));
  };

  // Sync draft when opened
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setOpenDropdown(null);
      // Clean up focus on web
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl !== document.body && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
      }
    }
  }, [visible, filters]);

  // Combine DB salts with reference catalogue salts
  const availableSalts: string[] = Array.from(
    new Set([
      ...salts.map((s) => s.name),
      ...CATALOGUE_SALTS_DATA.map((s) => s.name),
    ]),
  ).sort();

  const getStrengthsForSalt = (saltName: string): string[] => {
    const found = CATALOGUE_SALTS_DATA.find(
      (s) => s.name.toLowerCase() === saltName.toLowerCase(),
    );
    if (found) return found.strengths;
    return ['5 mg', '10 mg', '20 mg', '50 mg', '100 mg', '250 mg', '500 mg', '650 mg', '1000 mg'];
  };

  // Add paired Salt + Strength row
  const handleAddSaltRow = () => {
    const newId = `salt-row-${Date.now()}-${draft.saltCriteria.length}`;
    setDraft((prev) => ({
      ...prev,
      saltCriteria: [
        ...prev.saltCriteria,
        { id: newId, saltId: '', saltName: '', strength: '' },
      ],
    }));
  };

  // Remove paired Salt + Strength row
  const handleRemoveSaltRow = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      saltCriteria: prev.saltCriteria.filter((_, i) => i !== index),
    }));
    setOpenDropdown(null);
  };

  // Update paired Salt + Strength row
  const handleUpdateSaltRow = (
    index: number,
    field: 'saltName' | 'strength',
    value: string,
  ) => {
    setDraft((prev) => {
      const updated = [...prev.saltCriteria];
      if (field === 'saltName') {
        const saltObj = salts.find((s) => s.name.toLowerCase() === value.toLowerCase());
        updated[index] = {
          ...updated[index],
          saltName: value,
          saltId: saltObj ? saltObj.id : value,
          // Reset strength if salt changed
          strength: '',
        };
      } else {
        updated[index] = {
          ...updated[index],
          strength: value,
        };
      }
      return { ...prev, saltCriteria: updated };
    });
    setOpenDropdown(null);
  };

  const handleResetAll = () => {
    setDraft(INITIAL_ADVANCED_FILTERS);
    setOpenDropdown(null);
  };

  const handleApply = () => {
    // Filter out empty salt rows
    const cleanedSaltCriteria = draft.saltCriteria.filter(
      (s) => s.saltName.trim().length > 0,
    );
    onApply({
      ...draft,
      saltCriteria: cleanedSaltCriteria,
    });
    onClose();
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Full-screen backdrop sibling: tapping closes modal */}
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filter popup backdrop"
          testID="advanced-filters-backdrop"
        />

        {/* Modal Sheet Container: Non-interactive View */}
        <View style={styles.modalContainer} testID="advanced-filter-popup">
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.filterIconCircle}>
                    <Icon name="filter" size={16} color="#085444" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Catalogue Filters</Text>
                    <Text style={styles.modalSubtitle}>
                      Refine medicine catalogue criteria
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close filters popup"
                  testID="close-advanced-filters-button"
                >
                  <Icon name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Filters Body */}
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Manufacturer Filter */}
                <View
                  style={[
                    styles.filterSection,
                    { zIndex: openDropdown === 'mfg' ? 100 : 10 },
                  ]}
                >
                  <DropdownSelect
                    label="1. Manufacturer"
                    placeholder="All Manufacturers"
                    options={[
                      { label: 'All Manufacturers', value: null },
                      ...manufacturers.map((mfg) => ({
                        label: mfg.name,
                        value: mfg.id,
                      })),
                    ]}
                    selectedValue={draft.manufacturerId}
                    onSelect={(val) => {
                      setDraft((p) => ({ ...p, manufacturerId: val }));
                      setOpenDropdown(null);
                    }}
                    isOpen={openDropdown === 'mfg'}
                    onToggle={() => toggleDropdown('mfg')}
                    testID="filter-manufacturer-select"
                  />
                </View>

                {/* 2. Salt + Strength Paired Criteria (AND Behavior) */}
                <View
                  style={[
                    styles.filterSection,
                    {
                      zIndex:
                        openDropdown?.startsWith('salt-') ||
                        openDropdown?.startsWith('strength-')
                          ? 100
                          : 9,
                    },
                  ]}
                >
                  <View style={styles.saltHeaderRow}>
                    <Text style={styles.sectionLabel}>2. Salt & Strength</Text>
                    <Text style={styles.andBadge}>AND MATCH</Text>
                  </View>
                  <Text style={styles.fieldHelpText}>
                    Medicine must contain ALL specified paired salts and strengths.
                  </Text>

                  {draft.saltCriteria.map((item, index) => {
                    const strengthsForThisSalt = getStrengthsForSalt(item.saltName);
                    const saltDropdownKey = `salt-${index}`;
                    const strengthDropdownKey = `strength-${index}`;
                    const isSaltOpen = openDropdown === saltDropdownKey;
                    const isStrengthOpen = openDropdown === strengthDropdownKey;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.saltCriterionCard,
                          {
                            zIndex: isSaltOpen || isStrengthOpen ? 50 : 1,
                          },
                        ]}
                      >
                        <View style={styles.saltRowInputs}>
                          {/* Salt Selector */}
                          <View style={styles.saltCol}>
                            <DropdownSelect
                              label="Salt"
                              placeholder="Select Salt"
                              options={availableSalts.map((s) => ({
                                label: s,
                                value: s,
                              }))}
                              selectedValue={item.saltName || null}
                              onSelect={(val) => {
                                handleUpdateSaltRow(index, 'saltName', val || '');
                              }}
                              isOpen={isSaltOpen}
                              onToggle={() => toggleDropdown(saltDropdownKey)}
                              size="small"
                              maxHeight={160}
                              testID={`salt-select-${index}`}
                            />
                          </View>

                          {/* Strength Selector */}
                          <View style={styles.strengthCol}>
                            <DropdownSelect
                              label="Strength"
                              placeholder="Any Strength"
                              options={[
                                { label: 'Any Strength', value: '' },
                                ...strengthsForThisSalt.map((str) => ({
                                  label: str,
                                  value: str,
                                })),
                              ]}
                              selectedValue={item.strength || ''}
                              onSelect={(val) => {
                                handleUpdateSaltRow(index, 'strength', val || '');
                              }}
                              isOpen={isStrengthOpen}
                              onToggle={() => {
                                if (item.saltName) {
                                  toggleDropdown(strengthDropdownKey);
                                }
                              }}
                              disabled={!item.saltName}
                              size="small"
                              maxHeight={160}
                              testID={`strength-select-${index}`}
                            />
                          </View>

                          {/* Remove Row Button [ × ] */}
                          <TouchableOpacity
                            style={styles.removeRowButton}
                            onPress={() => handleRemoveSaltRow(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove salt row ${index + 1}`}
                            testID={`remove-salt-row-${index}`}
                          >
                            <Icon name="close" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* + Add Salt Button */}
                  <TouchableOpacity
                    style={styles.addSaltButton}
                    onPress={handleAddSaltRow}
                    activeOpacity={0.7}
                    testID="add-salt-row-button"
                  >
                    <Icon name="add" size={14} color="#085444" />
                    <Text style={styles.addSaltButtonText}>+ Add Salt & Strength</Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Pack Quantity Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionLabel}>3. Pack Quantity</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 10, 14, 15, 100"
                    placeholderTextColor="#94A3B8"
                    value={draft.packQuantity}
                    onChangeText={(val) =>
                      setDraft((p) => ({ ...p, packQuantity: val.replace(/[^0-9]/g, '') }))
                    }
                    keyboardType="numeric"
                    testID="filter-pack-quantity-input"
                  />
                </View>

                {/* 4. Pack Unit Filter */}
                <View
                  style={[
                    styles.filterSection,
                    { zIndex: openDropdown === 'packUnit' ? 100 : 7 },
                  ]}
                >
                  <DropdownSelect<MedicinePackUnit | null>
                    label="4. Pack Unit"
                    placeholder="All Units"
                    options={PACK_UNIT_OPTIONS}
                    selectedValue={draft.packUnit}
                    onSelect={(val) => {
                      setDraft((p) => ({ ...p, packUnit: val }));
                      setOpenDropdown(null);
                    }}
                    isOpen={openDropdown === 'packUnit'}
                    onToggle={() => toggleDropdown('packUnit')}
                    maxHeight={180}
                    testID="filter-pack-unit-select"
                  />
                </View>

                {/* 5. Recommended Age Group Filter */}
                <View
                  style={[
                    styles.filterSection,
                    { zIndex: openDropdown === 'ageGroup' ? 100 : 6 },
                  ]}
                >
                  <DropdownSelect<string>
                    label="5. Recommended Age Group"
                    placeholder="All Age Groups"
                    options={AGE_GROUP_OPTIONS.map((age) => ({
                      label: age,
                      value: age === 'All Ages' ? '' : age,
                    }))}
                    selectedValue={draft.recommendedAgeGroup}
                    onSelect={(val) => {
                      setDraft((p) => ({
                        ...p,
                        recommendedAgeGroup: val || '',
                      }));
                      setOpenDropdown(null);
                    }}
                    isOpen={openDropdown === 'ageGroup'}
                    onToggle={() => toggleDropdown('ageGroup')}
                    testID="filter-age-group-select"
                  />
                </View>

                {/* 6. Prescription Required Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionLabel}>6. Prescription Required</Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        draft.prescriptionRequired === 'ALL' && styles.segmentButtonActive,
                      ]}
                      onPress={() =>
                        setDraft((p) => ({ ...p, prescriptionRequired: 'ALL' }))
                      }
                      testID="filter-prescription-all"
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          draft.prescriptionRequired === 'ALL' &&
                            styles.segmentButtonTextActive,
                        ]}
                      >
                        All
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        draft.prescriptionRequired === 'YES' && styles.segmentButtonActive,
                      ]}
                      onPress={() =>
                        setDraft((p) => ({ ...p, prescriptionRequired: 'YES' }))
                      }
                      testID="filter-prescription-yes"
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          draft.prescriptionRequired === 'YES' &&
                            styles.segmentButtonTextActive,
                        ]}
                      >
                        Rx Only (Yes)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        draft.prescriptionRequired === 'NO' && styles.segmentButtonActive,
                      ]}
                      onPress={() =>
                        setDraft((p) => ({ ...p, prescriptionRequired: 'NO' }))
                      }
                      testID="filter-prescription-no"
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          draft.prescriptionRequired === 'NO' &&
                            styles.segmentButtonTextActive,
                        ]}
                      >
                        OTC (No)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 7. Price Range (MRP) Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionLabel}>7. Price Range (MRP)</Text>
                  <DualRangeSlider
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    lowValue={currentLow}
                    highValue={currentHigh}
                    onChange={handlePriceRangeChange}
                    testID="filter-price-range-slider"
                  />
                </View>

                {/* 8. Medical Representative (MR) Filter */}
                <View
                  style={[
                    styles.filterSection,
                    {
                      marginBottom: spacing.xl,
                      zIndex: openDropdown === 'mr' ? 100 : 3,
                    },
                  ]}
                >
                  <DropdownSelect
                    label="8. Medical Representative (MR)"
                    placeholder="All MRs"
                    options={[
                      { label: 'All MRs', value: null },
                      ...mrs.map((mr) => ({
                        label: `${mr.name}${mr.company ? ` (${mr.company})` : ''}`,
                        value: mr.id,
                      })),
                    ]}
                    selectedValue={draft.mrId}
                    onSelect={(val) => {
                      setDraft((p) => ({ ...p, mrId: val }));
                      setOpenDropdown(null);
                    }}
                    isOpen={openDropdown === 'mr'}
                    onToggle={() => toggleDropdown('mr')}
                    openDirection="up"
                    maxHeight={180}
                    testID="filter-mr-select"
                  />
                </View>
              </ScrollView>

              {/* Sticky Footer with Reset and Apply buttons */}
              <View style={styles.modalFooter}>
                <Button
                  title="Reset All"
                  variant="ghost"
                  size="md"
                  onPress={handleResetAll}
                  style={styles.resetButton}
                  testID="reset-advanced-filters-button"
                />
                <Button
                  title="Apply Filters"
                  variant="primary"
                  size="md"
                  onPress={handleApply}
                  style={styles.applyButton}
                  testID="apply-advanced-filters-button"
                />
              </View>
            </View>
          </View>
        </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '88%',
    minHeight: '60%',
    display: 'flex',
    flexDirection: 'column',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: fontSizes.base,
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
    borderRadius: borderRadius.full,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.base,
    position: 'relative',
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#1E293B',
    marginBottom: spacing.xs,
  },
  fieldHelpText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  saltHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  andBadge: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#085444',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  saltCriterionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  saltRowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  saltCol: {
    flex: 1.2,
  },
  strengthCol: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  removeRowButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  addSaltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#085444',
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    marginTop: spacing.xxs,
    backgroundColor: '#F0FDF4',
    gap: 4,
  },
  addSaltButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#085444',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    ...theme.shadows.sm,
  },
  segmentButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  segmentButtonTextActive: {
    color: '#085444',
    fontWeight: fontWeights.bold,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1.5,
  },
});
