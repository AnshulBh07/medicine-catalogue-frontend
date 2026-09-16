import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  AutocompleteInput,
  Card,
  ConfirmDialog,
  FormField,
  Icon,
  LoadingIndicator,
  MedicinePickerModal,
  PrimaryButton,
  TextInput,
} from '../../components';
import { apiClient, ApiError } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../theme';
import type { PublicManufacturer, PublicMedicine, PublicMr } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface MrFormProps {
  mode: 'create' | 'edit';
  mrId?: string;
  onSuccess?: (mr: PublicMr) => void;
  onDeleteSuccess?: () => void;
  onCancel?: () => void;
}

export const MrForm: React.FC<MrFormProps> = ({
  mode,
  mrId,
  onSuccess,
  onDeleteSuccess,
  onCancel,
}) => {
  const navigation = useNavigation<NavigationProp>();

  // Form Fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Persisted state for edit mode & deletion
  const [persistedMr, setPersistedMr] = useState<PublicMr | null>(null);

  // Autocomplete Recommendations for Company
  const [mfgRecommendations, setMfgRecommendations] = useState<PublicManufacturer[]>([]);
  const [isLoadingMfg, setIsLoadingMfg] = useState(false);
  const [isMfgOpen, setIsMfgOpen] = useState(false);
  const mfgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Input ref for next field focus
  const phoneInputRef = useRef<RNTextInput | null>(null);

  // Associated Medicines selection for create mode
  const [selectedMedicines, setSelectedMedicines] = useState<PublicMedicine[]>([]);
  const [isMedicinePickerOpen, setIsMedicinePickerOpen] = useState(false);

  // UI / Async State
  const [isLoadingInitial, setIsLoadingInitial] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (mfgSearchTimer.current) clearTimeout(mfgSearchTimer.current);
    };
  }, []);

  // Load existing MR in edit mode
  useEffect(() => {
    const loadMrData = async () => {
      if (mode !== 'edit' || !mrId) return;

      try {
        setIsLoadingInitial(true);
        setGeneralError(null);

        const response = await apiClient.get<{ mr: PublicMr }>(`/mrs/${mrId}`);
        if (response && response.mr && isMountedRef.current) {
          const mr = response.mr;
          setPersistedMr(mr);
          setName(mr.name || '');
          setCompany(mr.company || '');
          setPhone(mr.phone || '');
          setEmail(mr.email || '');
          setNotes(mr.notes || '');
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to load MR record';
          setGeneralError(msg);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingInitial(false);
        }
      }
    };

    loadMrData();
  }, [mode, mrId]);

  // Company autocomplete search
  const searchManufacturers = (query: string) => {
    if (mfgSearchTimer.current) {
      clearTimeout(mfgSearchTimer.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setMfgRecommendations([]);
      setIsLoadingMfg(false);
      return;
    }

    setIsLoadingMfg(true);
    mfgSearchTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ manufacturers: PublicManufacturer[] }>(
          `/manufacturers?search=${encodeURIComponent(trimmed)}`,
        );
        if (isMountedRef.current && res && Array.isArray(res.manufacturers)) {
          setMfgRecommendations(res.manufacturers);
        }
      } catch {
        if (isMountedRef.current) {
          setMfgRecommendations([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingMfg(false);
        }
      }
    }, 150);
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Representative name is required.';
    } else if (name.trim().length > 150) {
      errors.name = 'Name cannot exceed 150 characters.';
    }

    if (phone.trim() && phone.trim().length < 7) {
      errors.phone = 'Phone number must be at least 7 characters.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() ? email.trim().toLowerCase() : null,
      notes: notes.trim() || null,
      ...(mode === 'create' && selectedMedicines.length > 0
        ? {
            medicineIds: selectedMedicines.map((m) => m.id),
            allowReassign: true,
          }
        : {}),
    };

    try {
      let savedMr: PublicMr;
      if (mode === 'create') {
        const res = await apiClient.post<{ mr: PublicMr }>('/mrs', payload);
        savedMr = res.mr;
      } else {
        const res = await apiClient.patch<{ mr: PublicMr }>(`/mrs/${mrId}`, payload);
        savedMr = res.mr;
      }

      setIsDirty(false);

      if (onSuccess) {
        onSuccess(savedMr);
      } else if (mode === 'create') {
        navigation.navigate('MrDetails', { id: savedMr.id });
      } else {
        navigation.navigate('MrDetails', { id: savedMr.id });
      }
    } catch (err: unknown) {
      const apiCode = (err as { code?: string })?.code;
      const apiMsg = (err as { message?: string })?.message;

      if (err instanceof ApiError || apiCode) {
        if (apiCode === 'DUPLICATE_MR') {
          setGeneralError('A medical representative with conflicting details already exists.');
        } else if (apiCode === 'ASSIGNMENT_CONFLICT') {
          setGeneralError(
            apiMsg ||
              'One or more selected medicines are already assigned to another representative.',
          );
        } else if (apiCode === 'VALIDATION_ERROR') {
          setGeneralError(apiMsg || 'Validation error from server. Please review your entries.');
        } else {
          setGeneralError(apiMsg || `Failed to ${mode} MR. Please try again.`);
        }
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setGeneralError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteMr = async () => {
    if (!mrId || isDeleting) return;

    setIsDeleting(true);
    setGeneralError(null);

    try {
      await apiClient.delete(`/mrs/${mrId}`);
      setShowDeleteDialog(false);
      setIsDirty(false);

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigation.navigate('MRs');
      }
    } catch (err: unknown) {
      setShowDeleteDialog(false);
      const apiCode = (err as { code?: string })?.code;
      const apiMsg = (err as { message?: string })?.message;

      if (err instanceof ApiError || apiCode) {
        if (apiCode === 'MR_NOT_FOUND' || (err as ApiError).statusCode === 404) {
          setGeneralError('Medical representative was not found or has already been deleted.');
          setTimeout(() => {
            navigation.navigate('MRs');
          }, 1200);
        } else if (apiCode === 'FORBIDDEN' || (err as ApiError).statusCode === 403) {
          setGeneralError('You do not have permission to delete this medical representative.');
        } else {
          setGeneralError(apiMsg || 'Failed to delete medical representative. Please try again.');
        }
      } else {
        const msg =
          err instanceof Error ? err.message : 'An unexpected error occurred while deleting.';
        setGeneralError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  const handleBackPress = () => {
    if (isDirty && !isSubmitting) {
      setShowDiscardDialog(true);
    } else if (onCancel) {
      onCancel();
    } else {
      navigation.goBack();
    }
  };

  if (isLoadingInitial) {
    return (
      <AppScreen
        headerProps={{
          title: mode === 'create' ? 'Add Representative' : 'Edit Representative',
          showBack: true,
          onBack: handleBackPress,
        }}
      >
        <LoadingIndicator message="Loading representative details..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      headerProps={{
        title: mode === 'create' ? 'Add Representative' : 'Edit Representative',
        subtitle: mode === 'create' ? 'Register Medical Representative' : 'Modify MR Profile',
        showBack: true,
        onBack: handleBackPress,
      }}
      scrollable={true}
      contentContainerStyle={styles.scrollContent}
    >
      {generalError ? (
        <View style={styles.errorBanner} testID="mr-form-error-banner">
          <Icon name="warning" size={18} color={colors.error} />
          <Text style={styles.errorBannerText}>{generalError}</Text>
        </View>
      ) : null}

          <Card style={styles.card}>
            <Text style={styles.sectionHeader}>Representative Information</Text>

            {/* Name */}
            <FormField
              label="Full Name *"
              error={fieldErrors.name}
              helperText="Primary contact name of the representative"
            >
              <TextInput
                placeholder="e.g. Ravi Kumar"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  markDirty();
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                testID="input-mr-name"
                editable={!isSubmitting && !isDeleting}
              />
            </FormField>

            {/* Company / Manufacturer Autocomplete */}
            <View style={styles.fieldWrapper}>
              <AutocompleteInput
                label="Company / Manufacturer"
                value={company}
                onChangeText={(val) => {
                  setCompany(val);
                  markDirty();
                  searchManufacturers(val);
                }}
                recommendations={mfgRecommendations.map((m) => ({ id: m.id, name: m.name }))}
                onSelectRecommendation={(rec) => {
                  setCompany(rec.name);
                  markDirty();
                  setIsMfgOpen(false);
                }}
                isOpen={isMfgOpen}
                onOpenChange={setIsMfgOpen}
                placeholder="e.g. Acme Pharma Ltd."
                isLoading={isLoadingMfg}
                testID="input-mr-company"
                nextInputRef={phoneInputRef}
              />
            </View>

            {/* Phone */}
            <FormField
              label="Phone Number"
              error={fieldErrors.phone}
              helperText="Mobile or work contact number"
            >
              <TextInput
                ref={phoneInputRef}
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  markDirty();
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                }}
                keyboardType="phone-pad"
                testID="input-mr-phone"
                editable={!isSubmitting && !isDeleting}
              />
            </FormField>

            {/* Email */}
            <FormField
              label="Email Address"
              error={fieldErrors.email}
              helperText="Official communication email"
            >
              <TextInput
                placeholder="e.g. ravi.kumar@acmepharma.com"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  markDirty();
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-mr-email"
                editable={!isSubmitting && !isDeleting}
              />
            </FormField>

            {/* Notes */}
            <FormField
              label="Notes & Territory Coverage"
              helperText="Coverage areas, visiting schedule, distributor links, etc."
            >
              <TextInput
                placeholder="e.g. Visits clinic Tuesdays and Thursdays. Covers North region."
                value={notes}
                onChangeText={(val) => {
                  setNotes(val);
                  markDirty();
                }}
                multiline
                numberOfLines={3}
                testID="input-mr-notes"
                editable={!isSubmitting && !isDeleting}
              />
            </FormField>
          </Card>

          {/* Associated Medicines (Optional) - Create Mode */}
          {mode === 'create' ? (
            <Card style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleLeft}>
                  <View style={styles.sectionIconContainer}>
                    <Icon name="medicines" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>ASSOCIATED MEDICINES</Text>
                </View>
                <View style={styles.medicineCountBadge} testID="associated-medicines-count-badge">
                  <Text style={styles.medicineCountBadgeText}>{selectedMedicines.length}</Text>
                </View>
              </View>

              {selectedMedicines.length === 0 ? (
                <View style={styles.emptyMedicinesSection}>
                  <Text style={styles.emptyMedicinesHelperText}>
                    Select medicines handled by this MR (optional)
                  </Text>
                  <TouchableOpacity
                    style={styles.addMedicinesOutlineButton}
                    onPress={() => setIsMedicinePickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add Medicines"
                    testID="add-associated-medicines-button"
                    disabled={isSubmitting || isDeleting}
                  >
                    <Icon name="add" size={16} color={colors.primary} />
                    <Text style={styles.addMedicinesOutlineButtonText}>+ Add Medicines</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.selectedMedicinesContainer}>
                  <View style={styles.selectedMedicinesList}>
                    {selectedMedicines.map((med) => (
                      <View
                        key={med.id}
                        style={styles.selectedMedicineRow}
                        testID={`selected-mr-medicine-${med.id}`}
                      >
                        <View style={styles.selectedMedicineInfo}>
                          <Text style={styles.selectedMedicineName} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <Text style={styles.selectedMedicineMeta} numberOfLines={1}>
                            {med.form}
                            {med.manufacturer?.name ? ` • ${med.manufacturer.name}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeMedicineButton}
                          onPress={() => {
                            setSelectedMedicines((prev) => prev.filter((m) => m.id !== med.id));
                            markDirty();
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${med.name}`}
                          testID={`remove-selected-medicine-${med.id}`}
                          disabled={isSubmitting || isDeleting}
                        >
                          <Icon name="close" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.addMoreMedicinesButton}
                    onPress={() => setIsMedicinePickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add Another Medicine"
                    testID="add-more-medicines-button"
                    disabled={isSubmitting || isDeleting}
                  >
                    <Icon name="add" size={15} color={colors.primary} />
                    <Text style={styles.addMoreMedicinesButtonText}>+ Add Another Medicine</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ) : null}

          {/* Submit Action */}
          <View style={styles.footer}>
            <PrimaryButton
              title={
                isSubmitting
                  ? mode === 'create'
                    ? 'Adding Representative...'
                    : 'Saving Changes...'
                  : mode === 'create'
                  ? 'Add Representative'
                  : 'Save Changes'
              }
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isDeleting}
              size="lg"
              testID={mode === 'create' ? 'submit-add-mr-button' : 'submit-edit-mr-button'}
            />
          </View>

          {/* Destructive Delete Action (Edit Mode Only) */}
          {mode === 'edit' && mrId ? (
            <View style={styles.deleteSection}>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (isSubmitting || isDeleting) && styles.deleteButtonDisabled,
                ]}
                onPress={() => setShowDeleteDialog(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete Medical Representative"
                disabled={isSubmitting || isDeleting}
                testID="delete-mr-button"
              >
                <Icon name="delete" size={18} color="#DC2626" />
                <Text style={styles.deleteButtonText}>Delete Representative</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Discard Changes Dialog */}
          <ConfirmDialog
            visible={showDiscardDialog}
            title="Discard Changes?"
            message="You have unsaved changes on this representative profile. Are you sure you want to discard them?"
            confirmText="Discard Changes"
            cancelText="Keep Editing"
            isDestructive={true}
            onConfirm={() => {
              setShowDiscardDialog(false);
              if (onCancel) onCancel();
              else navigation.goBack();
            }}
            onCancel={() => setShowDiscardDialog(false)}
            testID="discard-mr-dialog"
          />

          {/* Delete MR Dialog */}
          <ConfirmDialog
            visible={showDeleteDialog}
            title="Delete Representative"
            message={`Do you want to delete ${persistedMr?.name || name || 'this representative'}?`}
            confirmText="Delete"
            cancelText="Cancel"
            isDestructive={true}
            loading={isDeleting}
            onConfirm={handleDeleteMr}
            onCancel={() => {
              if (!isDeleting) setShowDeleteDialog(false);
            }}
            testID="delete-mr-dialog"
            confirmTestID="confirm-delete-mr-button"
            cancelTestID="cancel-delete-mr-button"
          />

          {/* Medicine Picker Modal for Create Mode */}
          {mode === 'create' ? (
            <MedicinePickerModal
              visible={isMedicinePickerOpen}
              initialSelected={selectedMedicines}
              onApply={(meds) => {
                setSelectedMedicines(meds);
                markDirty();
              }}
              onClose={() => setIsMedicinePickerOpen(false)}
              testID="mr-medicine-picker-modal"
            />
          ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    padding: spacing.base,
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'visible',
  },
  sectionHeader: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medicineCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  medicineCountBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  emptyMedicinesSection: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emptyMedicinesHelperText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  addMedicinesOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  addMedicinesOutlineButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  selectedMedicinesContainer: {
    gap: spacing.sm,
  },
  selectedMedicinesList: {
    gap: 6,
  },
  selectedMedicineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedMedicineInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  selectedMedicineName: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  selectedMedicineMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeMedicineButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreMedicinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.base,
    marginTop: 4,
  },
  addMoreMedicinesButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  fieldWrapper: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: fontWeights.medium,
  },
  footer: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minWidth: 200,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#DC2626',
  },
});
