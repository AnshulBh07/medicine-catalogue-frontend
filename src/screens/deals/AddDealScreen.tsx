import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { AppScreen, Card, ErrorState, Icon } from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import { dealService } from '../../services/dealService';
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { PublicMedicine, PublicMr } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatScheme } from '../../utils/commercial.utils';
import { parseValidDealDateIso } from '../../utils/deal-date.utils';
import { SelectionBottomSheetModal } from './SelectionBottomSheetModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddDealRouteProp = RouteProp<RootStackParamList, 'AddDeal'>;

interface SelectedMrType {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
}

export const AddDealScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddDealRouteProp>();
  const { isAdmin } = useAuth();

  const prefillMedicineId = route.params?.prefillMedicineId;
  const prefillMrId = route.params?.prefillMrId;
  const createdMedicineId = route.params?.createdMedicineId;
  const createdMrId = route.params?.createdMrId;

  // Selected Entities
  const [selectedMedicine, setSelectedMedicine] = useState<PublicMedicine | null>(null);
  const [selectedMr, setSelectedMr] = useState<SelectedMrType | null>(null);

  // Form Fields
  const [dealDateStr, setDealDateStr] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [agreedMrp, setAgreedMrp] = useState<string>('');
  const [agreedScheme, setAgreedScheme] = useState<string>('');
  const [agreedBillDiscount, setAgreedBillDiscount] = useState<string>('');
  const [mrPhoneSnapshot, setMrPhoneSnapshot] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<'PENDING' | 'RECEIVED'>('PENDING');
  const [notes, setNotes] = useState<string>('');

  // Refs to protect user-entered form data from being overwritten during commercial prefilling
  const agreedMrpRef = useRef(agreedMrp);
  agreedMrpRef.current = agreedMrp;

  const agreedSchemeRef = useRef(agreedScheme);
  agreedSchemeRef.current = agreedScheme;

  const agreedBillDiscountRef = useRef(agreedBillDiscount);
  agreedBillDiscountRef.current = agreedBillDiscount;

  const selectedMrRef = useRef(selectedMr);
  selectedMrRef.current = selectedMr;

  const mrPhoneSnapshotRef = useRef(mrPhoneSnapshot);
  mrPhoneSnapshotRef.current = mrPhoneSnapshot;

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pendingDealWarning, setPendingDealWarning] = useState<string | null>(null);

  // Modal Pickers State
  const [showMedicinePicker, setShowMedicinePicker] = useState<boolean>(false);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState<string>('');
  const [availableMedicines, setAvailableMedicines] = useState<PublicMedicine[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState<boolean>(false);

  const [showMrPicker, setShowMrPicker] = useState<boolean>(false);
  const [mrSearchQuery, setMrSearchQuery] = useState<string>('');
  const [availableMrs, setAvailableMrs] = useState<PublicMr[]>([]);
  const [isLoadingMrs, setIsLoadingMrs] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // When MR is chosen
  const handleSelectMr = useCallback((mr: SelectedMrType) => {
    setSelectedMr(mr);
    setShowMrPicker(false);
    if (mr.phone && !mrPhoneSnapshotRef.current) {
      setMrPhoneSnapshot(mr.phone);
    }
  }, []);

  // When medicine is chosen, prefill commercial details if available without overwriting user-entered values
  const handleSelectMedicine = useCallback(async (medicine: PublicMedicine) => {
    setSelectedMedicine(medicine);
    setShowMedicinePicker(false);

    // If medicine already has an associated MR and none is chosen yet, auto-select MR
    if (!selectedMrRef.current && medicine.mr) {
      handleSelectMr(medicine.mr);
    }

    // Try to fetch current commercial details to prefill for convenience
    try {
      const commRes = await apiClient.get<{
        commercialDetails?: {
          mrp?: number;
          scheme?: unknown;
          discountPercent?: number;
        };
      }>(`/medicines/${medicine.id}/commercial-details`);

      if (commRes?.commercialDetails) {
        const cd = commRes.commercialDetails;
        if (cd.mrp !== undefined && !agreedMrpRef.current) {
          setAgreedMrp(String(cd.mrp));
        }
        if (cd.scheme !== undefined && !agreedSchemeRef.current) {
          const formatted = formatScheme(cd.scheme);
          if (formatted !== 'None') {
            setAgreedScheme(formatted);
          }
        }
        if (cd.discountPercent !== undefined && !agreedBillDiscountRef.current) {
          setAgreedBillDiscount(String(cd.discountPercent));
        }
      }
    } catch {
      // commercial details endpoint may 404 if not yet set for medicine, which is normal
    }
  }, [handleSelectMr]);

  // Load medicines list for picker
  const loadMedicinesForPicker = useCallback(async (query: string = '') => {
    setIsLoadingMedicines(true);
    try {
      const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
      const res = await apiClient.get<{ medicines: PublicMedicine[] }>(
        `/medicines?limit=50${searchParam}`,
      );
      if (isMountedRef.current) {
        setAvailableMedicines(res.medicines || []);
      }
    } catch {
      if (isMountedRef.current) {
        setAvailableMedicines([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMedicines(false);
      }
    }
  }, []);

  // Load MRs list for picker
  const loadMrsForPicker = useCallback(async (query: string = '') => {
    setIsLoadingMrs(true);
    try {
      const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
      const res = await apiClient.get<{ mrs: PublicMr[] }>(
        `/mrs?limit=50${searchParam}`,
      );
      if (isMountedRef.current) {
        setAvailableMrs(res.mrs || []);
      }
    } catch {
      if (isMountedRef.current) {
        setAvailableMrs([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMrs(false);
      }
    }
  }, []);

  // Fetch initial prefill entities if route params were passed
  useEffect(() => {
    const loadPrefillData = async () => {
      if (prefillMedicineId) {
        try {
          const res = await apiClient.get<{ medicine: PublicMedicine }>(
            `/medicines/${prefillMedicineId}`,
          );
          if (isMountedRef.current && res.medicine) {
            void handleSelectMedicine(res.medicine);
          }
        } catch {
          // ignore
        }
      }

      if (prefillMrId) {
        try {
          const res = await apiClient.get<{ mr: PublicMr }>(`/mrs/${prefillMrId}`);
          if (isMountedRef.current && res.mr) {
            handleSelectMr(res.mr);
          }
        } catch {
          // ignore
        }
      }
    };

    void loadPrefillData();
  }, [prefillMedicineId, prefillMrId, handleSelectMedicine, handleSelectMr]);

  const handledCreatedMedicineIdRef = useRef<string | null>(null);
  const handledCreatedMrIdRef = useRef<string | null>(null);

  // Automatically select newly created medicine upon return from AddMedicine flow
  useEffect(() => {
    if (!createdMedicineId) {
      handledCreatedMedicineIdRef.current = null;
      return;
    }
    if (handledCreatedMedicineIdRef.current === createdMedicineId) {
      return;
    }
    handledCreatedMedicineIdRef.current = createdMedicineId;

    let isSubscribed = true;
    const loadCreatedMedicine = async () => {
      try {
        const res = await apiClient.get<{ medicine: PublicMedicine }>(
          `/medicines/${createdMedicineId}`,
        );
        if (isSubscribed && isMountedRef.current && res.medicine) {
          await handleSelectMedicine(res.medicine);
          void loadMedicinesForPicker('');
        }
      } catch {
        // ignore
      } finally {
        if (isSubscribed) {
          navigation.setParams({ createdMedicineId: undefined });
        }
      }
    };

    void loadCreatedMedicine();

    return () => {
      isSubscribed = false;
    };
  }, [createdMedicineId, handleSelectMedicine, loadMedicinesForPicker, navigation]);

  // Automatically select newly created MR upon return from AddMr flow
  useEffect(() => {
    if (!createdMrId) {
      handledCreatedMrIdRef.current = null;
      return;
    }
    if (handledCreatedMrIdRef.current === createdMrId) {
      return;
    }
    handledCreatedMrIdRef.current = createdMrId;

    let isSubscribed = true;
    const loadCreatedMr = async () => {
      try {
        const res = await apiClient.get<{ mr: PublicMr }>(`/mrs/${createdMrId}`);
        if (isSubscribed && isMountedRef.current && res.mr) {
          handleSelectMr(res.mr);
          void loadMrsForPicker('');
        }
      } catch {
        // ignore
      } finally {
        if (isSubscribed) {
          navigation.setParams({ createdMrId: undefined });
        }
      }
    };

    void loadCreatedMr();

    return () => {
      isSubscribed = false;
    };
  }, [createdMrId, handleSelectMr, loadMrsForPicker, navigation]);

  // Check for duplicate pending deal warning whenever medicine and MR are both chosen
  useEffect(() => {
    if (!selectedMedicine || !selectedMr) {
      setPendingDealWarning(null);
      return;
    }

    let isSubscribed = true;

    const checkPending = async () => {
      try {
        const res = await dealService.checkPendingDeal(
          selectedMedicine.id,
          selectedMr.id,
        );
        if (isSubscribed && res.hasPendingDeal && res.deal) {
          const dateStr = res.deal.dealDate.split('T')[0];
          setPendingDealWarning(
            `Notice: An active pending deal already exists for ${selectedMedicine.name} with ${selectedMr.name} (recorded on ${dateStr}, Scheme: ${formatScheme(res.deal.agreedScheme)}). You can still save if this is a new agreement.`,
          );
        } else if (isSubscribed) {
          setPendingDealWarning(null);
        }
      } catch {
        // ignore warning check error
      }
    };

    void checkPending();

    return () => {
      isSubscribed = false;
    };
  }, [selectedMedicine, selectedMr]);

  const openMedicinePicker = () => {
    setShowMedicinePicker(true);
    setMedicineSearchQuery('');
    void loadMedicinesForPicker('');
  };

  const openMrPicker = () => {
    setShowMrPicker(true);
    setMrSearchQuery('');
    void loadMrsForPicker('');
  };

  const validateAndSave = async () => {
    if (!selectedMedicine) {
      Alert.alert('Required Field', 'Please select a medicine.');
      return;
    }

    if (!selectedMr) {
      Alert.alert('Required Field', 'Please select a Medical Representative (MR).');
      return;
    }

    const mrpNum = parseFloat(agreedMrp);
    if (isNaN(mrpNum) || mrpNum <= 0) {
      Alert.alert('Invalid MRP', 'Please enter a valid Maximum Retail Price (MRP).');
      return;
    }

    const schemeTrimmed = agreedScheme.trim();
    if (!schemeTrimmed) {
      Alert.alert(
        'Required Field',
        'Please enter the agreed trade scheme (e.g. 10+3, 9+1, or None).',
      );
      return;
    }

    const discountNum = parseFloat(agreedBillDiscount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      Alert.alert(
        'Invalid Discount',
        'Please enter a valid bill discount percentage between 0 and 100.',
      );
      return;
    }

    let parsedDealDateIso: string | undefined;
    if (dealDateStr.trim()) {
      const validIso = parseValidDealDateIso(dealDateStr);
      if (!validIso) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid deal date in YYYY-MM-DD format (e.g. 2026-08-31).',
        );
        return;
      }
      parsedDealDateIso = validIso;
    }

    setIsSaving(true);
    try {
      const res = await dealService.createDeal({
        medicineId: selectedMedicine.id,
        mrId: selectedMr.id,
        dealDate: parsedDealDateIso,
        agreedMrp: mrpNum,
        agreedScheme: schemeTrimmed,
        agreedBillDiscount: discountNum,
        mrPhoneSnapshot: mrPhoneSnapshot.trim() || undefined,
        status: deliveryStatus,
        notes: notes.trim() || undefined,
      });

      if (res.warning) {
        Alert.alert('Deal Saved', res.warning, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create deal.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Add Medicine Deal',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Recording new medicine deals is restricted to ADMIN accounts only."
          testID="deals-access-restricted"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Add Medicine Deal',
        subtitle: 'Record commercial agreement with MR',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning Banner if pending deal exists */}
          {pendingDealWarning ? (
            <View style={styles.warningBanner}>
              <Icon name="warning" size={16} color="#B45309" />
              <Text style={styles.warningBannerText}>{pendingDealWarning}</Text>
            </View>
          ) : null}

          {/* Section: Entity Selection */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>SELECT MEDICINE & MR</Text>

            {/* Medicine Selector */}
            <Text style={styles.inputLabel}>
              Medicine <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.entitySelectorBox,
                selectedMedicine && styles.entitySelectorBoxSelected,
              ]}
              onPress={openMedicinePicker}
              activeOpacity={0.7}
              testID="deal-select-medicine-btn"
            >
              <View style={styles.entitySelectorIconBox}>
                <Icon
                  name="medicines"
                  size={18}
                  color={selectedMedicine ? '#15803D' : '#94A3B8'}
                />
              </View>
              <View style={styles.entitySelectorTextCol}>
                <Text
                  style={[
                    styles.entitySelectorTitle,
                    !selectedMedicine && styles.entitySelectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedMedicine
                    ? selectedMedicine.name
                    : 'Tap to select medicine...'}
                </Text>
                {selectedMedicine && selectedMedicine.manufacturer ? (
                  <Text style={styles.entitySelectorSubtitle}>
                    {selectedMedicine.manufacturer.name} • {selectedMedicine.form}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>

            {/* MR Selector */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              Medical Representative (MR) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.entitySelectorBox,
                selectedMr && styles.entitySelectorBoxSelected,
              ]}
              onPress={openMrPicker}
              activeOpacity={0.7}
              testID="deal-select-mr-btn"
            >
              <View
                style={[
                  styles.entitySelectorIconBox,
                  { backgroundColor: selectedMr ? '#F3E8FF' : '#F1F5F9' },
                ]}
              >
                <Icon
                  name="person"
                  size={18}
                  color={selectedMr ? '#7C3AED' : '#94A3B8'}
                />
              </View>
              <View style={styles.entitySelectorTextCol}>
                <Text
                  style={[
                    styles.entitySelectorTitle,
                    !selectedMr && styles.entitySelectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedMr ? selectedMr.name : 'Tap to select representative...'}
                </Text>
                {selectedMr && (
                  <Text style={styles.entitySelectorSubtitle}>
                    {selectedMr.company || 'Medical Representative'}
                    {selectedMr.phone ? ` • ${selectedMr.phone}` : ''}
                  </Text>
                )}
              </View>
              <Icon name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </Card>

          {/* Section: Agreed Commercial Terms */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>AGREED COMMERCIAL SETTLEMENT</Text>

            {/* Agreed MRP */}
            <Text style={styles.inputLabel}>
              Agreed MRP (₹) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 255.00"
              placeholderTextColor="#94A3B8"
              value={agreedMrp}
              onChangeText={setAgreedMrp}
              keyboardType="decimal-pad"
              testID="deal-mrp-input"
            />

            {/* Agreed Scheme */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Agreed Scheme <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 10+3, 9+1, or None"
              placeholderTextColor="#94A3B8"
              value={agreedScheme}
              onChangeText={setAgreedScheme}
              autoCapitalize="characters"
              testID="deal-scheme-input"
            />
            <Text style={styles.fieldHint}>
              Free strips or bonus units settled with the representative.
            </Text>

            {/* Bill Discount */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Agreed Bill Discount (%) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 5.0"
              placeholderTextColor="#94A3B8"
              value={agreedBillDiscount}
              onChangeText={setAgreedBillDiscount}
              keyboardType="decimal-pad"
              testID="deal-discount-input"
            />
          </Card>

          {/* Section: Follow-up & Delivery */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>FOLLOW-UP & DELIVERY STATUS</Text>

            {/* MR Phone Snapshot */}
            <Text style={styles.inputLabel}>MR Contact Phone (for follow-up)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor="#94A3B8"
              value={mrPhoneSnapshot}
              onChangeText={setMrPhoneSnapshot}
              keyboardType="phone-pad"
              testID="deal-phone-input"
            />
            <Text style={styles.fieldHint}>
              Saved with this deal for follow-up even if the MR changes numbers later.
            </Text>

            {/* Delivery Status Selector */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Delivery Status
            </Text>
            <View style={styles.statusToggleGroup}>
              <TouchableOpacity
                style={[
                  styles.statusOptionButton,
                  deliveryStatus === 'PENDING' && styles.statusOptionPendingActive,
                ]}
                onPress={() => setDeliveryStatus('PENDING')}
              >
                <Icon
                  name="time"
                  size={14}
                  color={deliveryStatus === 'PENDING' ? '#B45309' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    deliveryStatus === 'PENDING' && styles.statusOptionTextPending,
                  ]}
                >
                  Pending Delivery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOptionButton,
                  deliveryStatus === 'RECEIVED' && styles.statusOptionReceivedActive,
                ]}
                onPress={() => setDeliveryStatus('RECEIVED')}
              >
                <Icon
                  name="check"
                  size={14}
                  color={deliveryStatus === 'RECEIVED' ? '#15803D' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    deliveryStatus === 'RECEIVED' && styles.statusOptionTextReceived,
                  ]}
                >
                  Medicine Received
                </Text>
              </TouchableOpacity>
            </View>

            {/* Deal Date */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Date Deal Settled (YYYY-MM-DD)
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              value={dealDateStr}
              onChangeText={setDealDateStr}
            />

            {/* Notes */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="Any specific commercial terms or delivery instructions..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={validateAndSave}
            disabled={isSaving}
            activeOpacity={0.8}
            testID="save-deal-btn"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Record Medicine Deal</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Medicine Picker Modal */}
      <SelectionBottomSheetModal
        visible={showMedicinePicker}
        onClose={() => setShowMedicinePicker(false)}
        testID="medicine-picker-modal"
      >
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Medicine</Text>
          <TouchableOpacity onPress={() => setShowMedicinePicker(false)}>
            <Icon name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerSearchRow}>
          <Icon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.pickerSearchInput}
            placeholder="Search medicine name..."
            placeholderTextColor="#94A3B8"
            value={medicineSearchQuery}
            onChangeText={(text) => {
              setMedicineSearchQuery(text);
              void loadMedicinesForPicker(text);
            }}
            autoFocus
          />
        </View>

        {isLoadingMedicines ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator size="small" color="#15803D" />
            <Text style={styles.pickerLoadingText}>Searching medicines...</Text>
          </View>
        ) : availableMedicines.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>No medicines found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.pickerList}
            keyboardShouldPersistTaps="handled"
          >
            {availableMedicines.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.pickerItem}
                onPress={() => handleSelectMedicine(med)}
                testID={`picker-med-${med.id}`}
              >
                <View style={styles.pickerItemIconBox}>
                  <Icon name="medicines" size={16} color="#15803D" />
                </View>
                <View style={styles.pickerItemTextCol}>
                  <Text style={styles.pickerItemTitle}>{med.name}</Text>
                  <Text style={styles.pickerItemSubtitle}>
                    {med.manufacturer?.name || 'Unknown Manufacturer'} •{' '}
                    {med.form}
                  </Text>
                </View>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {/* Divider */}
        <View style={styles.pickerDivider} />

        {/* + Create New Medicine */}
        <TouchableOpacity
          style={styles.pickerCreateButton}
          onPress={() => {
            setShowMedicinePicker(false);
            navigation.navigate('AddMedicine', { returnDealParams: true });
          }}
          activeOpacity={0.7}
          testID="picker-create-medicine-btn"
        >
          <View style={styles.pickerCreateIconBox}>
            <Icon name="plus" size={16} color="#15803D" />
          </View>
          <Text style={styles.pickerCreateButtonText}>+ Create New Medicine</Text>
          <Icon name="chevron-right" size={14} color="#15803D" />
        </TouchableOpacity>
      </SelectionBottomSheetModal>

      {/* MR Picker Modal */}
      <SelectionBottomSheetModal
        visible={showMrPicker}
        onClose={() => setShowMrPicker(false)}
        testID="mr-picker-modal"
      >
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Representative (MR)</Text>
          <TouchableOpacity onPress={() => setShowMrPicker(false)}>
            <Icon name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerSearchRow}>
          <Icon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.pickerSearchInput}
            placeholder="Search MR name or company..."
            placeholderTextColor="#94A3B8"
            value={mrSearchQuery}
            onChangeText={(text) => {
              setMrSearchQuery(text);
              void loadMrsForPicker(text);
            }}
            autoFocus
          />
        </View>

        {isLoadingMrs ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={styles.pickerLoadingText}>
              Searching representatives...
            </Text>
          </View>
        ) : availableMrs.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>No representatives found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.pickerList}
            keyboardShouldPersistTaps="handled"
          >
            {availableMrs.map((mr) => (
              <TouchableOpacity
                key={mr.id}
                style={styles.pickerItem}
                onPress={() => handleSelectMr(mr)}
                testID={`picker-mr-${mr.id}`}
              >
                <View
                  style={[
                    styles.pickerItemIconBox,
                    { backgroundColor: '#F3E8FF' },
                  ]}
                >
                  <Icon name="person" size={16} color="#7C3AED" />
                </View>
                <View style={styles.pickerItemTextCol}>
                  <Text style={styles.pickerItemTitle}>{mr.name}</Text>
                  <Text style={styles.pickerItemSubtitle}>
                    {mr.company || 'Medical Representative'}
                    {mr.phone ? ` • ${mr.phone}` : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Divider */}
        <View style={styles.pickerDivider} />

        {/* + Create New Representative */}
        <TouchableOpacity
          style={[
            styles.pickerCreateButton,
            { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
          ]}
          onPress={() => {
            setShowMrPicker(false);
            navigation.navigate('AddMr', { returnDealParams: true });
          }}
          activeOpacity={0.7}
          testID="picker-create-mr-btn"
        >
          <View
            style={[
              styles.pickerCreateIconBox,
              { backgroundColor: '#F3E8FF' },
            ]}
          >
            <Icon name="plus" size={16} color="#7C3AED" />
          </View>
          <Text
            style={[
              styles.pickerCreateButtonText,
              { color: '#7C3AED' },
            ]}
          >
            + Create New Representative
          </Text>
          <Icon name="chevron-right" size={14} color="#7C3AED" />
        </TouchableOpacity>
      </SelectionBottomSheetModal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  warningBannerText: {
    fontSize: fontSizes.xs,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  cardHeaderTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSizes.sm,
    color: '#0F172A',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  entitySelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  entitySelectorBoxSelected: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  entitySelectorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entitySelectorTextCol: {
    flex: 1,
  },
  entitySelectorTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  entitySelectorPlaceholder: {
    fontWeight: fontWeights.normal,
    color: '#94A3B8',
  },
  entitySelectorSubtitle: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginTop: 1,
  },
  statusToggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  statusOptionPendingActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusOptionReceivedActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusOptionText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: '#64748B',
  },
  statusOptionTextPending: {
    color: '#B45309',
    fontWeight: fontWeights.bold,
  },
  statusOptionTextReceived: {
    color: '#15803D',
    fontWeight: fontWeights.bold,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: 4,
    shadowColor: '#15803D',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pickerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: spacing.sm,
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: fontSizes.sm,
    color: '#0F172A',
    paddingVertical: 0,
  },
  pickerLoading: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLoadingText: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginTop: 8,
  },
  pickerEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: fontSizes.sm,
    color: '#94A3B8',
  },
  pickerList: {
    maxHeight: 350,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  pickerItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemTextCol: {
    flex: 1,
  },
  pickerItemTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  pickerItemSubtitle: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginTop: 2,
  },
  pickerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  pickerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    marginTop: 2,
  },
  pickerCreateIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCreateButtonText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#15803D',
  },
});
