import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  Icon,
} from '../../components';
import { apiClient } from '../../services/api-client';
import { shortageService } from '../../services/shortageService';
import { fontWeights, theme } from '../../theme';
import type { PublicMedicine, ShortageUnit } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import {
  SHORTAGE_UNITS,
  formatShortageUnit,
} from '../../utils/shortage.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddShortageRouteProp = RouteProp<RootStackParamList, 'AddShortageMedicine'>;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const QUICK_QUANTITIES = [1, 5, 10, 20, 50];

function getUtcTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  const todayStr = getUtcTodayStr();
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  const formatted = `${d} ${MONTH_NAMES[m]} ${y}`;
  return dateStr === todayStr ? `${formatted} (Today)` : formatted;
}

export const AddShortageMedicineScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddShortageRouteProp>();

  const targetDate = route.params?.date || getUtcTodayStr();
  const isPastDate = targetDate < getUtcTodayStr();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [medicinesList, setMedicinesList] = useState<PublicMedicine[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedMedicine, setSelectedMedicine] = useState<PublicMedicine | null>(null);

  const [quantity, setQuantity] = useState<string>('1');
  const [currentQuantity, setCurrentQuantity] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<ShortageUnit>('PACK');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isMountedRef = React.useRef<boolean>(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMedicines = useCallback(async (search = '') => {
    try {
      if (isMountedRef.current) setIsSearching(true);
      const isSearch = Boolean(search.trim());
      const query = isSearch
        ? `?search=${encodeURIComponent(search.trim())}&limit=10`
        : '?limit=4';
      const response = await apiClient.get<{ medicines: PublicMedicine[] }>(`/medicines${query}`);
      if (!isMountedRef.current) return;
      const list = response.medicines || [];
      setMedicinesList(isSearch ? list : list.slice(0, 4));
    } catch {
      if (!isMountedRef.current) return;
      setMedicinesList([]);
    } finally {
      if (isMountedRef.current) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines(searchQuery);
  }, [fetchMedicines, searchQuery]);

  const handleSelectMedicine = (med: PublicMedicine) => {
    setSelectedMedicine(med);
    setFormError(null);
  };

  const handleQuickQuantity = (qty: number) => {
    setQuantity(String(qty));
  };

  const handleDecrementQuantity = () => {
    const current = parseInt(quantity, 10);
    if (isNaN(current) || current <= 1) {
      setQuantity('1');
    } else {
      setQuantity(String(current - 1));
    }
  };

  const handleIncrementQuantity = () => {
    const current = parseInt(quantity, 10);
    if (isNaN(current) || current < 1) {
      setQuantity('1');
    } else {
      setQuantity(String(current + 1));
    }
  };

  const handleQuickCurrentQuantity = (qty: number) => {
    setCurrentQuantity(String(qty));
  };

  const handleDecrementCurrentQuantity = () => {
    const current = parseInt(currentQuantity, 10);
    if (isNaN(current) || current <= 1) {
      setCurrentQuantity('1');
    } else {
      setCurrentQuantity(String(current - 1));
    }
  };

  const handleIncrementCurrentQuantity = () => {
    const current = parseInt(currentQuantity, 10);
    if (isNaN(current) || current < 1) {
      setCurrentQuantity('1');
    } else {
      setCurrentQuantity(String(current + 1));
    }
  };

  const handleSubmit = async () => {
    if (isPastDate) {
      setFormError('Shortages cannot be added for past dates.');
      return;
    }

    if (!selectedMedicine) {
      setFormError('Please select a medicine to add to the shortage notebook.');
      return;
    }

    const numericQty = parseInt(quantity, 10);
    if (isNaN(numericQty) || numericQty <= 0) {
      setFormError('Please enter a valid quantity greater than zero.');
      return;
    }

    let numericCurrentQty: number | undefined = undefined;
    if (currentQuantity.trim()) {
      const parsed = parseInt(currentQuantity, 10);
      if (isNaN(parsed) || parsed < 0) {
        setFormError('Please enter a valid current quantity (0 or greater).');
        return;
      }
      numericCurrentQty = parsed;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await shortageService.createShortageItem({
        medicineId: selectedMedicine.id,
        date: targetDate,
        quantity: numericQty,
        currentQuantity: numericCurrentQty,
        unit: selectedUnit,
        note: note.trim() || null,
      });

      navigation.goBack();
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to add medicine to shortage list';

      setFormError(errorMessage);
      Alert.alert('Cannot Add Medicine', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericQtyVal = parseInt(quantity, 10) || 1;
  const unitLabel = formatShortageUnit(numericQtyVal, selectedUnit);
  const numericCurrentQtyVal = parseInt(currentQuantity, 10) || 1;
  const currentUnitLabel = formatShortageUnit(numericCurrentQtyVal, selectedUnit);

  return (
    <AppScreen
      headerProps={{
        title: 'Add Medicine to Shortage',
        subtitle: 'Add a medicine and quantity to order',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
      contentContainerStyle={styles.screenContainer}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Top Shortage Date Card */}
          <Card style={styles.dateCard} testID="add-shortage-date-card">
            <View style={styles.dateLeft}>
              <Icon name="calendar" size={20} color="#059669" />
              <View>
                <Text style={styles.dateLabel}>Shortage Date</Text>
                <Text style={styles.dateValue}>{formatDateDisplay(targetDate)}</Text>
              </View>
            </View>
          </Card>

          {/* Past Date Warning Banner */}
          {isPastDate ? (
            <View style={styles.warningBanner} testID="add-shortage-past-date-banner">
              <Icon name="warning" size={18} color="#D97706" />
              <Text style={styles.warningBannerText}>
                This is a past date. Adding medicines to past dates is not permitted.
              </Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {formError ? (
            <View style={styles.errorBanner}>
              <Icon name="warning" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          {/* Section 1: Select Medicine */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Medicine</Text>

            {/* If a medicine is selected, show selected state */}
            {selectedMedicine ? (
              <Card style={styles.selectedMedicineCard} testID="add-shortage-selected-card">
                <View style={styles.selectedMedLeft}>
                  <View style={styles.imageContainer}>
                    {selectedMedicine.imageUrl ? (
                      <Image
                        source={{ uri: selectedMedicine.imageUrl }}
                        style={styles.medicineImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon name="capsule" size={22} color="#059669" />
                      </View>
                    )}
                  </View>
                  <View style={styles.selectedMedInfo}>
                    <Text style={styles.selectedMedName} numberOfLines={1}>
                      {selectedMedicine.name}
                    </Text>
                    <Text style={styles.selectedMedManufacturer} numberOfLines={1}>
                      {selectedMedicine.manufacturer?.name}
                    </Text>
                    <View style={styles.selectedTag}>
                      <Icon name="check" size={12} color="#059669" />
                      <Text style={styles.selectedTagText}>Selected</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.changeMedBtn}
                  onPress={() => setSelectedMedicine(null)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Change selected medicine"
                  testID="add-shortage-change-med-btn"
                >
                  <Text style={styles.changeMedBtnText}>Change</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <>
                {/* Search Bar */}
                <View style={styles.searchInputWrapper}>
                  <Icon name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search medicine by name, salt or company..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text)}
                    testID="add-shortage-search-input"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Popular / Search Results List */}
                <View style={styles.resultsContainer}>
                  <View style={styles.resultsHeaderRow}>
                    <Text style={styles.resultsHeaderText}>
                      {searchQuery.trim() ? 'SEARCH RESULTS' : 'POPULAR MEDICINES'}
                    </Text>
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : null}
                  </View>

                  {medicinesList.length === 0 && !isSearching ? (
                    <View style={styles.noResultsBox}>
                      <Text style={styles.noResultsText}>
                        {searchQuery
                          ? `No medicines found matching "${searchQuery}"`
                          : 'No medicines found.'}
                      </Text>
                    </View>
                  ) : (
                    medicinesList.map((med) => (
                      <TouchableOpacity
                        key={med.id}
                        style={styles.medicinePickerRow}
                        onPress={() => handleSelectMedicine(med)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${med.name}`}
                        testID={`add-shortage-med-${med.id}`}
                      >
                        <View style={styles.imageContainer}>
                          {med.imageUrl ? (
                            <Image
                              source={{ uri: med.imageUrl }}
                              style={styles.medicineImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.imagePlaceholder}>
                              <Icon name="capsule" size={20} color="#059669" />
                            </View>
                          )}
                        </View>

                        <View style={styles.pickerRowCenter}>
                          <Text style={styles.pickerMedName} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <Text style={styles.pickerMedManufacturer} numberOfLines={1}>
                            {med.manufacturer?.name}
                          </Text>
                        </View>

                        <View style={styles.pickerAddCircle}>
                          <Icon name="add" size={18} color="#059669" />
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            )}
          </View>

          {/* Section 2: Quantities & Order Unit */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantities & Order Unit</Text>

            {/* Field 1: Current Quantity */}
            <Card style={styles.quantityCard}>
              <Text style={styles.inputLabel}>Current Quantity (Available)</Text>
              <View style={styles.quantityInputRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleDecrementCurrentQuantity}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease current quantity"
                  testID="shortage-current-qty-decrement"
                >
                  <Icon name="minus" size={16} color="#059669" />
                </TouchableOpacity>

                <View style={styles.quantityIconWrapper}>
                  <Icon name="cube" size={18} color="#059669" />
                </View>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={currentQuantity}
                  onChangeText={(text) => setCurrentQuantity(text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 12"
                  placeholderTextColor="#94A3B8"
                  testID="add-shortage-current-qty-input"
                  textAlign="center"
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleIncrementCurrentQuantity}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Increase current quantity"
                  testID="shortage-current-qty-increment"
                >
                  <Icon name="plus" size={16} color="#059669" />
                </TouchableOpacity>

                <View style={styles.unitBadge}>
                  <Text style={styles.quantityUnitText}>{currentUnitLabel}</Text>
                </View>
              </View>
            </Card>

            {/* Quick Pills for Current Quantity */}
            <View style={styles.quickQtyRow}>
              {QUICK_QUANTITIES.map((qty) => {
                const isSelected = currentQuantity === String(qty);
                return (
                  <TouchableOpacity
                    key={qty}
                    style={[styles.quickQtyPill, isSelected && styles.quickQtyPillActive]}
                    onPress={() => handleQuickCurrentQuantity(qty)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Current quantity ${qty}`}
                    testID={`current-quick-qty-${qty}`}
                  >
                    <Text
                      style={[
                        styles.quickQtyPillText,
                        isSelected && styles.quickQtyPillTextActive,
                      ]}
                    >
                      {qty}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Field 2: Quantity to Order */}
            <Card style={[styles.quantityCard, { marginTop: 12 }]}>
              <Text style={styles.inputLabel}>Quantity to Order</Text>
              <View style={styles.quantityInputRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleDecrementQuantity}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  testID="shortage-qty-decrement"
                >
                  <Icon name="minus" size={16} color="#059669" />
                </TouchableOpacity>

                <View style={styles.quantityIconWrapper}>
                  <Icon name="cube" size={18} color="#059669" />
                </View>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
                  placeholder="1"
                  placeholderTextColor="#94A3B8"
                  testID="add-shortage-qty-input"
                  textAlign="center"
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleIncrementQuantity}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  testID="shortage-qty-increment"
                >
                  <Icon name="plus" size={16} color="#059669" />
                </TouchableOpacity>

                <View style={styles.unitBadge}>
                  <Text style={styles.quantityUnitText}>{unitLabel}</Text>
                </View>
              </View>
            </Card>

            {/* Quick Quantity Pills */}
            <View style={styles.quickQtyRow}>
              {QUICK_QUANTITIES.map((qty) => {
                const isSelected = quantity === String(qty);
                return (
                  <TouchableOpacity
                    key={qty}
                    style={[styles.quickQtyPill, isSelected && styles.quickQtyPillActive]}
                    onPress={() => handleQuickQuantity(qty)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Quantity ${qty}`}
                    testID={`quick-qty-${qty}`}
                  >
                    <Text
                      style={[
                        styles.quickQtyPillText,
                        isSelected && styles.quickQtyPillTextActive,
                      ]}
                    >
                      {qty}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selectable Order Units */}
            <Text style={styles.unitSelectLabel}>Select Order Unit</Text>
            <View style={styles.unitChipsRow}>
              {SHORTAGE_UNITS.map((u) => {
                const isSelected = selectedUnit === u.value;
                return (
                  <TouchableOpacity
                    key={u.value}
                    style={[styles.unitChip, isSelected && styles.unitChipActive]}
                    onPress={() => setSelectedUnit(u.value)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Select unit ${u.label}`}
                    testID={`unit-chip-${u.value.toLowerCase()}`}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        isSelected && styles.unitChipTextActive,
                      ]}
                    >
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3: Note (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note (Optional)</Text>
            <Card style={styles.noteCard}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add any note..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                maxLength={150}
                value={note}
                onChangeText={(text) => setNote(text)}
                textAlignVertical="top"
                testID="add-shortage-note-input"
              />
              <View style={styles.charCountRow}>
                <Text style={styles.charCountText}>{note.length}/150</Text>
              </View>
            </Card>
          </View>

          {/* Section 4: Bottom Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="add-shortage-cancel-btn"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedMedicine || isSubmitting || isPastDate) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!selectedMedicine || isSubmitting || isPastDate}
              accessibilityRole="button"
              accessibilityLabel="Add to Shortage"
              testID="add-shortage-submit-btn"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Add to Shortage</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#64748B',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: fontWeights.medium,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B45309',
    fontWeight: fontWeights.medium,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...theme.shadows.sm,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  resultsHeaderText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  noResultsBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  medicinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  imageContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  medicineImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  pickerRowCenter: {
    flex: 1,
    marginRight: 8,
  },
  pickerMedName: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
    marginBottom: 2,
  },
  pickerMedManufacturer: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerAddCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMedicineCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  selectedMedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  selectedMedInfo: {
    flex: 1,
  },
  selectedMedName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    marginBottom: 2,
  },
  selectedMedManufacturer: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 4,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedTagText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  changeMedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  changeMedBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  quantityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    flex: 1,
    minWidth: 50,
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    paddingVertical: 4,
  },
  unitBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 0,
  },
  quantityUnitText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  unitSelectLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  unitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  unitChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  unitChipText: {
    fontSize: 12.5,
    fontWeight: fontWeights.medium,
    color: '#475569',
  },
  unitChipTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  quickQtyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickQtyPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  quickQtyPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  quickQtyPillText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  quickQtyPillTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  noteInput: {
    fontSize: 14,
    color: '#0F172A',
    minHeight: 64,
    paddingTop: 0,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#475569',
  },
  submitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...theme.shadows.sm,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});