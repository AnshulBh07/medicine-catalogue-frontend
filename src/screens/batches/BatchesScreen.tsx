import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  AppScreen,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  FormField,
  Icon,
  MonthYearSelector,
  SearchInput,
  TextInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { PublicBatch, PublicMedicine } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatScheme } from '../../utils/commercial.utils';

type BatchesRouteProp = RouteProp<RootStackParamList, 'Batches'>;

export const BatchesScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BatchesRouteProp>();
  const { isAdmin } = useAuth();

  const medicineId = route.params?.medicineId;
  const medicineName = route.params?.medicineName;

  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [medicines, setMedicines] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add Batch Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState(medicineId || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [mrp, setMrp] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [gstPercent, setGstPercent] = useState('0');
  const [scheme, setScheme] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const endpoint = medicineId ? `/batches?medicineId=${medicineId}` : '/batches';
      const res = await apiClient.get<{ batches: PublicBatch[] }>(endpoint);
      if (res && Array.isArray(res.batches)) {
        setBatches(res.batches);
      } else {
        setBatches([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch batches';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [medicineId]);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await apiClient.get<{ medicines: PublicMedicine[] }>('/medicines?limit=100');
      if (res && Array.isArray(res.medicines)) {
        setMedicines(res.medicines);
        if (!selectedMedId && res.medicines.length > 0) {
          setSelectedMedId(res.medicines[0]!.id);
        }
      }
    } catch {
      // Ignore
    }
  }, [selectedMedId]);

  useEffect(() => {
    fetchBatches();
    if (isAdmin) {
      fetchMedicines();
    }
  }, [fetchBatches, fetchMedicines, isAdmin]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.trim().toLowerCase();
    return batches.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(q) ||
        b.medicine?.name.toLowerCase().includes(q),
    );
  }, [batches, search]);

  const handleOpenAddModal = () => {
    setSelectedMedId(medicineId || (medicines[0]?.id || ''));
    setBatchNumber(`BATCH-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`);
    setManufacturingDate(new Date().toISOString().split('T')[0] || '');
    setExpiryDate(
      new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
    );
    setMrp('');
    setPurchaseRate('');
    setDiscountPercent('0');
    setScheme('');
    setPrivateNotes('');
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateBatch = async () => {
    const medId = selectedMedId || medicineId;
    if (!medId) {
      setModalError('Please select a medicine');
      return;
    }
    if (!batchNumber.trim()) {
      setModalError('Batch number is required');
      return;
    }
    if (!expiryDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      setModalError('Expiry date is required in YYYY-MM-DD format');
      return;
    }
    if (manufacturingDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(manufacturingDate.trim())) {
      setModalError('Manufacturing date must be in YYYY-MM-DD format');
      return;
    }
    if (manufacturingDate.trim() && expiryDate.trim() <= manufacturingDate.trim()) {
      setModalError('Expiry date must be after manufacturing date');
      return;
    }

    if (isAdmin && mrp.trim()) {
      const numMrp = parseFloat(mrp);
      if (isNaN(numMrp) || numMrp < 0) {
        setModalError('MRP must be a valid number >= 0');
        return;
      }
    }

    setModalError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        medicineId: medId,
        batchNumber: batchNumber.trim(),
        manufacturingDate: manufacturingDate.trim() || null,
        expiryDate: expiryDate.trim(),
        ...(isAdmin && mrp.trim()
          ? {
              commercialDetails: {
                mrp: parseFloat(mrp),
                purchaseRate: purchaseRate.trim() ? parseFloat(purchaseRate) : 0,
                discountPercent: discountPercent.trim() ? parseFloat(discountPercent) : 0,
                gstPercent: gstPercent.trim() ? parseFloat(gstPercent) : 0,
                scheme: scheme.trim() ? { description: scheme.trim() } : null,
                privateNotes: privateNotes.trim() || null,
              },
            }
          : {}),
      };

      await apiClient.post('/batches', payload);
      setIsAddModalOpen(false);
      fetchBatches();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create batch';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await apiClient.delete(`/batches/${batchId}`);
      fetchBatches();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete batch';
      setErrorMessage(msg);
    }
  };

  return (
    <AppScreen
      headerProps={{
        title: medicineName ? `Batches: ${medicineName}` : 'Batches & Expiry',
        subtitle: medicineName ? 'Batch History & Stock' : 'All Medicine Batches',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search batch numbers or medicines..."
        testID="batches-search-input"
        style={styles.searchBar}
      />

      <View style={styles.listContainer}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        ) : errorMessage ? (
          <ErrorState
            title="Failed to load batches"
            message={errorMessage}
            onRetry={handleRefresh}
          />
        ) : filteredBatches.length === 0 ? (
          <EmptyState
            icon="batches"
            title="No Batches Found"
            description={
              search.trim()
                ? `No batches matching "${search}"`
                : 'No batches registered yet for this catalogue.'
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {filteredBatches.map((b) => {
              const comm = b.commercialDetails;
              const isExpired = new Date(b.expiryDate) < new Date();
              return (
                <Card key={b.id} style={styles.batchCard} testID={`batch-card-${b.id}`}>
                  <View style={styles.batchHeader}>
                    <View style={styles.batchHeaderLeft}>
                      <View style={styles.iconCircle}>
                        <Icon name="batches" size={16} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.batchNumberText}>{b.batchNumber}</Text>
                        <Text style={styles.medicineNameText}>{b.medicine?.name}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isExpired ? styles.statusBadgeExpired : styles.statusBadgeValid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isExpired ? styles.statusBadgeTextExpired : styles.statusBadgeTextValid,
                        ]}
                      >
                        {isExpired ? 'Expired' : 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.datesRow}>
                    <Text style={styles.dateLabel}>
                      Exp: <Text style={styles.dateValue}>{b.expiryDate}</Text>
                    </Text>
                    {b.manufacturingDate ? (
                      <Text style={styles.dateLabel}>
                        Mfg: <Text style={styles.dateValue}>{b.manufacturingDate}</Text>
                      </Text>
                    ) : null}
                  </View>

                  {isAdmin && comm ? (
                    <View style={styles.commercialRow}>
                      <View style={styles.commCol}>
                        <Text style={styles.commLabel}>MRP</Text>
                        <Text style={styles.commValueBold}>₹{Number(comm.mrp).toFixed(2)}</Text>
                      </View>
                      <View style={styles.commCol}>
                        <Text style={styles.commLabel}>Purchase</Text>
                        <Text style={styles.commValue}>₹{Number(comm.purchaseRate).toFixed(2)}</Text>
                      </View>
                      <View style={styles.commCol}>
                        <Text style={styles.commLabel}>Discount</Text>
                        <Text style={styles.commValue}>{comm.discountPercent}%</Text>
                      </View>
                      <View style={styles.commCol}>
                        <Text style={styles.commLabel}>GST</Text>
                        <Text style={styles.commValue} testID={`comm-gst-${b.id}`}>{comm.gstPercent ?? 0}%</Text>
                      </View>
                      {comm.scheme ? (
                        <View style={styles.commCol}>
                          <Text style={styles.commLabel}>Scheme</Text>
                          <Text style={styles.commValue}>{formatScheme(comm.scheme)}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {isAdmin ? (
                    <View style={styles.batchActions}>
                      <TouchableOpacity
                        style={styles.deleteBatchBtn}
                        onPress={() => handleDeleteBatch(b.id)}
                        testID={`delete-batch-${b.id}`}
                      >
                        <Icon name="delete" size={12} color={colors.error} />
                        <Text style={styles.deleteBatchBtnText}>Delete Batch</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>

      {isAdmin ? (
        <FloatingActionButton
          onPress={handleOpenAddModal}
          accessibilityLabel="Add Batch"
          testID="add-batch-fab"
        />
      ) : null}

      {/* Add Batch Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalOpen(false)}
        testID="add-batch-modal"
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsAddModalOpen(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Batch</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {modalError ? (
                <View style={styles.errorBox}>
                  <Icon name="warning" size={14} color={colors.error} />
                  <Text style={styles.errorText}>{modalError}</Text>
                </View>
              ) : null}

              {!medicineId && medicines.length > 0 ? (
                <FormField label="Medicine *">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medPillScroll}>
                    {medicines.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.medPill,
                          selectedMedId === m.id && styles.medPillActive,
                        ]}
                        onPress={() => setSelectedMedId(m.id)}
                      >
                        <Text
                          style={[
                            styles.medPillText,
                            selectedMedId === m.id && styles.medPillTextActive,
                          ]}
                        >
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </FormField>
              ) : null}

              <FormField label="Batch Number *">
                <TextInput
                  value={batchNumber}
                  onChangeText={setBatchNumber}
                  placeholder="e.g. BATCH-2026-004"
                  testID="new-batch-number-input"
                />
              </FormField>

              <View style={styles.twoCol}>
                <View style={styles.flex1}>
                  <MonthYearSelector
                    label="Mfg Date"
                    value={manufacturingDate}
                    onChange={(val) => setManufacturingDate(val || '')}
                    placeholder="Select Month & Year"
                    helperText="e.g. Jan 2026 (Optional)"
                    testID="new-batch-mfg-input"
                    modalTestID="new-batch-mfg-modal"
                  />
                </View>
                <View style={styles.flex1}>
                  <MonthYearSelector
                    label="Expiry Date *"
                    value={expiryDate}
                    onChange={(val) => setExpiryDate(val || '')}
                    placeholder="Select Month & Year"
                    helperText="e.g. Dec 2028"
                    required
                    testID="new-batch-exp-input"
                    modalTestID="new-batch-exp-modal"
                  />
                </View>
              </View>

              {isAdmin ? (
                <>
                  <Text style={styles.subheading}>Commercial Pricing (Optional)</Text>
                  <View style={styles.twoCol}>
                    <View style={styles.flex1}>
                      <FormField label="MRP (₹)">
                        <TextInput
                          value={mrp}
                          onChangeText={setMrp}
                          placeholder="e.g. 50.00"
                          keyboardType="decimal-pad"
                          testID="new-batch-mrp-input"
                        />
                      </FormField>
                    </View>
                    <View style={styles.flex1}>
                      <FormField label="Purchase Rate (₹)">
                        <TextInput
                          value={purchaseRate}
                          onChangeText={setPurchaseRate}
                          placeholder="e.g. 35.00"
                          keyboardType="decimal-pad"
                          testID="new-batch-purchase-input"
                        />
                      </FormField>
                    </View>
                  </View>

                  <View style={styles.twoCol}>
                    <View style={styles.flex1}>
                      <FormField label="Discount (%)">
                        <TextInput
                          value={discountPercent}
                          onChangeText={setDiscountPercent}
                          placeholder="0"
                          keyboardType="decimal-pad"
                          testID="new-batch-discount-input"
                        />
                      </FormField>
                    </View>
                    <View style={styles.flex1}>
                      <FormField label="GST (%)">
                        <TextInput
                          value={gstPercent}
                          onChangeText={setGstPercent}
                          placeholder="0"
                          keyboardType="decimal-pad"
                          testID="new-batch-gst-input"
                        />
                      </FormField>
                    </View>
                  </View>

                  <FormField label="Scheme">
                    <TextInput
                      value={scheme}
                      onChangeText={setScheme}
                      placeholder="e.g. 10 + 1"
                      testID="new-batch-scheme-input"
                    />
                  </FormField>

                  <FormField label="Private Notes">
                    <TextInput
                      value={privateNotes}
                      onChangeText={setPrivateNotes}
                      placeholder="Dealer terms / supplier notes"
                      multiline
                      numberOfLines={2}
                      testID="new-batch-notes-input"
                    />
                  </FormField>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              />
              <Button
                title="Create Batch"
                variant="primary"
                onPress={handleCreateBatch}
                loading={isSubmitting}
                testID="submit-create-batch-btn"
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: spacing.xs,
  },
  listContainer: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.xs,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  medicineNameText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeValid: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  statusBadgeTextValid: {
    color: '#15803D',
  },
  statusBadgeTextExpired: {
    color: '#B91C1C',
  },
  datesRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  dateValue: {
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  commercialRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: 4,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  commCol: {
    alignItems: 'flex-start',
  },
  commLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  commValue: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  commValueBold: {
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  deleteBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  deleteBatchBtnText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: fontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalBackdrop: {
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  modalScroll: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
  },
  medPillScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  medPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    marginRight: spacing.xs,
  },
  medPillActive: {
    backgroundColor: colors.primary,
  },
  medPillText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  medPillTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  subheading: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
});
