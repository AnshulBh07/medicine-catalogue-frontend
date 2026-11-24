import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Button,
  Card,
  ErrorState,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import { medicineAlternativeService } from '../../services/medicineAlternativeService';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../theme';
import type { PublicMedicine } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddEditAlternativeRouteProp = RouteProp<RootStackParamList, 'AddEditAlternative'>;

export const AddEditAlternativeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddEditAlternativeRouteProp>();
  const { isAdmin } = useAuth();

  const sourceMedicineId = route.params?.sourceMedicineId;
  const isEditMode = !!sourceMedicineId;

  // Form State
  const [sourceMedicine, setSourceMedicine] = useState<PublicMedicine | null>(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode && isAdmin);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Picker Modal State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'source' | 'alternative'>('source');
  const [catalogueMedicines, setCatalogueMedicines] = useState<PublicMedicine[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  const isMountedRef = useRef(true);
  const pickerRequestSeqRef = useRef(0);
  const pickerAbortRef = useRef<AbortController | null>(null);
  const pickerSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pickerSearchTimerRef.current) clearTimeout(pickerSearchTimerRef.current);
      pickerAbortRef.current?.abort();
    };
  }, []);

  // Fetch catalogue medicines for picker with stale response cancellation
  const loadCatalogueMedicines = useCallback(async (query = '') => {
    const requestSeq = ++pickerRequestSeqRef.current;
    pickerAbortRef.current?.abort();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    pickerAbortRef.current = controller;

    try {
      setIsPickerLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('search', query.trim());
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get<{ medicines: PublicMedicine[] }>(
        `/medicines${queryString}`,
        controller ? { signal: controller.signal } : undefined,
      );
      if (isMountedRef.current && requestSeq === pickerRequestSeqRef.current && res?.medicines) {
        setCatalogueMedicines(res.medicines);
      }
    } catch {
      // Graceful fallback (including aborted stale requests)
    } finally {
      if (isMountedRef.current && requestSeq === pickerRequestSeqRef.current) {
        setIsPickerLoading(false);
      }
    }
  }, []);

  // Load existing data in edit mode
  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    if (!sourceMedicineId) {
      if (route.params?.initialSourceMedicine) {
        setSourceMedicine(route.params.initialSourceMedicine);
      }
      return;
    }

    const loadExistingGroup = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [sourceMedRes, groupStatus] = await Promise.all([
          apiClient.get<{ medicine: PublicMedicine }>(`/medicines/${sourceMedicineId}`),
          medicineAlternativeService.getByMedicineId(sourceMedicineId),
        ]);

        if (sourceMedRes?.medicine) {
          setSourceMedicine(sourceMedRes.medicine);
        }

        if (groupStatus?.doNotUse) {
          // Fetch full medicine objects for alternatives
          const altMeds: PublicMedicine[] = [];
          for (const item of groupStatus.doNotUse.alternatives) {
            try {
              const medRes = await apiClient.get<{ medicine: PublicMedicine }>(
                `/medicines/${item.medicine.id}`,
              );
              if (medRes?.medicine) {
                altMeds.push(medRes.medicine);
              }
            } catch {
              // Fallback with summary data
              altMeds.push({
                id: item.medicine.id,
                name: item.medicine.name,
                form: item.medicine.form,
                packQuantity: item.medicine.packQuantity,
                packUnit: item.medicine.packUnit as any,
                active: item.medicine.active,
                composition: {
                  id: '',
                  displayText: item.medicine.compositionText,
                },
                manufacturer: { id: '', name: '' },
                shortDescription: null,
                imageUrl: null,
                uses: null,
                recommendedAgeGroup: null,
                directions: null,
                warnings: null,
                storageInstructions: null,
                barcode: null,
                prescriptionRequired: false,
                mr: null,
                createdAt: '',
                updatedAt: '',
              });
            }
          }
          setSelectedAlternatives(altMeds);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load alternative data';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    };

    void loadExistingGroup();
  }, [sourceMedicineId, route.params?.initialSourceMedicine]);

  const openPicker = (mode: 'source' | 'alternative') => {
    setPickerMode(mode);
    setPickerSearch('');
    setPickerModalVisible(true);
    void loadCatalogueMedicines('');
  };

  const handleSelectMedicineFromPicker = (medicine: PublicMedicine) => {
    if (pickerMode === 'source') {
      // Validate that source is not already in selected alternatives
      if (selectedAlternatives.some((a) => a.id === medicine.id)) {
        Alert.alert('Invalid Selection', 'This medicine is already in the approved alternatives list.');
        return;
      }
      setSourceMedicine(medicine);
      setPickerModalVisible(false);
    } else {
      // Validate that alternative is not source
      if (sourceMedicine && sourceMedicine.id === medicine.id) {
        Alert.alert('Invalid Selection', 'A medicine cannot be an alternative to itself.');
        return;
      }
      // Validate duplicate
      if (selectedAlternatives.some((a) => a.id === medicine.id)) {
        Alert.alert('Already Selected', 'This medicine is already in the alternatives list.');
        return;
      }
      setSelectedAlternatives((prev) => [...prev, medicine]);
      setPickerModalVisible(false);
    }
  };

  const handleRemoveAlternative = (id: string) => {
    setSelectedAlternatives((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setErrorMessage(null);

    if (!sourceMedicine) {
      setErrorMessage('Please select a restricted medicine (DO NOT USE).');
      return;
    }

    if (selectedAlternatives.length === 0) {
      setErrorMessage('Please select at least one approved alternative medicine (USE INSTEAD).');
      return;
    }

    const alternativeIds = selectedAlternatives.map((a) => a.id);

    try {
      setIsSaving(true);
      if (isEditMode) {
        await medicineAlternativeService.updateAlternatives(sourceMedicine.id, {
          alternativeMedicineIds: alternativeIds,
        });
      } else {
        await medicineAlternativeService.createAlternatives({
          sourceMedicineId: sourceMedicine.id,
          alternativeMedicineIds: alternativeIds,
        });
      }

      navigation.goBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save medicine alternatives';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter medicines inside the modal picker
  const filteredPickerMedicines = useMemo(() => {
    return catalogueMedicines.filter((m) => {
      // Don't show inactive medicines
      if (m.active === false) return false;

      // In alternative mode, exclude current source medicine & already selected alternatives
      if (pickerMode === 'alternative') {
        if (sourceMedicine && m.id === sourceMedicine.id) return false;
        if (selectedAlternatives.some((a) => a.id === m.id)) return false;
      }

      // In source mode, exclude already selected alternatives
      if (pickerMode === 'source') {
        if (selectedAlternatives.some((a) => a.id === m.id)) return false;
      }

      if (!pickerSearch.trim()) return true;
      const q = pickerSearch.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.composition?.displayText?.toLowerCase().includes(q)
      );
    });
  }, [catalogueMedicines, pickerMode, sourceMedicine, selectedAlternatives, pickerSearch]);

  const formatSubtitle = (comp?: string, form?: string) => {
    const capitalizedForm = form ? form.charAt(0).toUpperCase() + form.slice(1).toLowerCase() : '';
    if (comp && capitalizedForm) {
      if (comp.toLowerCase().includes(capitalizedForm.toLowerCase())) {
        return comp;
      }
      return `${comp} ${capitalizedForm}`;
    }
    return comp || capitalizedForm || '';
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: isEditMode ? 'Edit Alternatives' : 'Add Alternative',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Managing medicine alternatives is restricted to ADMIN accounts only."
          testID="alternatives-access-restricted"
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: isEditMode ? 'Edit Alternatives' : 'Add Alternative',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading details..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: isEditMode ? 'Edit Alternatives' : 'Add Alternative',
        subtitle: 'Configure approved replacements',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Error banner */}
        {errorMessage ? (
          <View style={styles.errorBanner} testID="alternative-form-error">
            <Icon name="warning" size={16} color="#EF4444" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* SECTION 1: DO NOT USE Medicine */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>1. Restricted Medicine</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Specify the medicine that should NOT be used.
          </Text>

          {sourceMedicine ? (
            <View style={styles.selectedSourceCard} testID="selected-source-medicine-card">
              <View style={styles.sourceCardHeaderRow}>
                <View style={styles.banBadge}>
                  <Icon name="ban" size={14} color="#EF4444" />
                </View>
                <Text style={styles.doNotUseLabel}>DO NOT USE</Text>
                {!isEditMode ? (
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => openPicker('source')}
                    testID="change-source-medicine-btn"
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.selectedMedicineName} testID="selected-source-name">
                {sourceMedicine.name}
              </Text>
              <Text style={styles.selectedMedicineSubtitle}>
                {formatSubtitle(sourceMedicine.composition?.displayText, sourceMedicine.form)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectSourceTrigger}
              onPress={() => openPicker('source')}
              testID="select-source-medicine-trigger"
            >
              <View style={styles.triggerIconContainer}>
                <Icon name="ban" size={20} color="#EF4444" />
              </View>
              <View style={styles.triggerTextContainer}>
                <Text style={styles.triggerTitle}>Select Restricted Medicine</Text>
                <Text style={styles.triggerSubtitle}>Choose the medicine to mark as DO NOT USE</Text>
              </View>
              <Icon name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Arrow Down Divider */}
        <View style={styles.arrowDividerContainer}>
          <View style={styles.arrowCircle}>
            <Icon name="chevron-down" size={18} color="#64748B" />
          </View>
        </View>

        {/* SECTION 2: USE INSTEAD Alternatives */}
        <View style={styles.section}>
          <View style={styles.alternativesHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>2. Approved Alternatives</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Select the approved medicine(s) to use instead.
              </Text>
            </View>
          </View>

          {selectedAlternatives.length > 0 ? (
            <View style={styles.alternativesContainer}>
              <View style={styles.useInsteadHeader}>
                <Icon name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={styles.useInsteadLabel}>USE INSTEAD</Text>
              </View>

              {selectedAlternatives.map((alt) => (
                <View
                  key={alt.id}
                  style={styles.alternativeCardItem}
                  testID={`selected-alt-item-${alt.id}`}
                >
                  <View style={styles.greenBullet} />
                  <View style={styles.altTextCol}>
                    <Text style={styles.altNameText}>{alt.name}</Text>
                    <Text style={styles.altSubText}>
                      {formatSubtitle(alt.composition?.displayText, alt.form)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeAltButton}
                    onPress={() => handleRemoveAlternative(alt.id)}
                    testID={`remove-alt-${alt.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${alt.name}`}
                  >
                    <Icon name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {/* Add Another Alternative Button */}
          <TouchableOpacity
            style={styles.addAlternativeButton}
            onPress={() => openPicker('alternative')}
            testID="add-alternative-trigger"
          >
            <Icon name="plus" size={16} color="#047857" />
            <Text style={styles.addAlternativeButtonText}>
              {selectedAlternatives.length > 0
                ? '+ Add Another Alternative'
                : '+ Select Approved Alternative'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <View style={styles.actionRow}>
          <Button
            title={isSaving ? 'Saving...' : isEditMode ? 'Update Alternatives' : 'Save Alternatives'}
            variant="primary"
            size="lg"
            loading={isSaving}
            disabled={isSaving || !sourceMedicine || selectedAlternatives.length === 0}
            onPress={() => void handleSave()}
            testID="save-alternatives-button"
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>

      {/* Medicine Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
        testID="medicine-picker-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {pickerMode === 'source'
                    ? 'Select Restricted Medicine'
                    : 'Select Approved Alternative'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {pickerMode === 'source'
                    ? 'Mark this medicine as DO NOT USE'
                    : 'Choose an alternative medicine to recommend'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setPickerModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <SearchInput
                value={pickerSearch}
                onChangeText={(t) => {
                  setPickerSearch(t);
                  if (pickerSearchTimerRef.current) {
                    clearTimeout(pickerSearchTimerRef.current);
                  }
                  if (!t.trim()) {
                    void loadCatalogueMedicines('');
                    return;
                  }
                  pickerSearchTimerRef.current = setTimeout(() => {
                    void loadCatalogueMedicines(t);
                  }, 300);
                }}
                placeholder="Search medicine name..."
                testID="picker-search-input"
              />
            </View>

            {isPickerLoading ? (
              <View style={styles.pickerLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.pickerLoadingText}>Searching catalogue...</Text>
              </View>
            ) : filteredPickerMedicines.length === 0 ? (
              <View style={styles.pickerEmptyContainer}>
                <Text style={styles.pickerEmptyText}>
                  {pickerSearch
                    ? `No available medicines found for "${pickerSearch}"`
                    : 'No available medicines'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.pickerList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerListContent}
              >
                {filteredPickerMedicines.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.pickerItem}
                    onPress={() => handleSelectMedicineFromPicker(med)}
                    testID={`picker-item-${med.id}`}
                  >
                    <View style={styles.pickerItemTextCol}>
                      <Text style={styles.pickerItemName}>{med.name}</Text>
                      <Text style={styles.pickerItemSubtitle}>
                        {formatSubtitle(med.composition?.displayText, med.form)}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: fontWeights.medium,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  selectSourceTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: spacing.md,
  },
  triggerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  triggerTextContainer: {
    flex: 1,
  },
  triggerTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  triggerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  selectedSourceCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 14,
  },
  sourceCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  banBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  doNotUseLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#DC2626',
    letterSpacing: 0.3,
    flex: 1,
  },
  changeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  changeButtonText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#DC2626',
  },
  selectedMedicineName: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#111827',
  },
  selectedMedicineSubtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 3,
  },
  arrowDividerContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativesHeaderRow: {
    marginBottom: spacing.xs,
  },
  alternativesContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  useInsteadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  useInsteadLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
    letterSpacing: 0.3,
  },
  alternativeCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  greenBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  altTextCol: {
    flex: 1,
  },
  altNameText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#111827',
  },
  altSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  removeAltButton: {
    padding: 6,
  },
  addAlternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 12,
  },
  addAlternativeButtonText: {
    fontSize: 13.5,
    fontWeight: fontWeights.semibold,
    color: '#047857',
  },
  actionRow: {
    marginTop: spacing.lg,
  },
  submitBtn: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    paddingTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
  },
  modalSearchBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerList: {
    flex: 1,
  },
  pickerListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemTextCol: {
    flex: 1,
    marginRight: 8,
  },
  pickerItemName: {
    fontSize: 14.5,
    fontWeight: fontWeights.semibold,
    color: '#111827',
  },
  pickerItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pickerLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  pickerLoadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  pickerEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pickerEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
