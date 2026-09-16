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
import { Button, Card, FormField, Icon, TextInput } from '../../components';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { PublicBatch, PublicCommercialDetails, PublicMedicine } from '../../types/models';
import { calculateCommercialMetrics, formatScheme } from '../../utils/commercial.utils';

export interface CommercialDetailsModalProps {
  visible: boolean;
  medicine: PublicMedicine | null;
  onClose: () => void;
  onSuccess?: (details: PublicCommercialDetails) => void;
}

export const CommercialDetailsModal: React.FC<CommercialDetailsModalProps> = ({
  visible,
  medicine,
  onClose,
  onSuccess,
}) => {
  const [details, setDetails] = useState<PublicCommercialDetails | null>(null);
  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PublicBatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [purchaseRate, setPurchaseRate] = useState<string>('');
  const [mrp, setMrp] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [gstPercent, setGstPercent] = useState<string>('0');
  const [scheme, setScheme] = useState<string>('');
  const [privateNotes, setPrivateNotes] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadCommercialData = async () => {
    if (!medicine?.id) return;
    setIsLoading(true);
    setFormError(null);

    try {
      const [commRes, batchesRes] = await Promise.all([
        apiClient
          .get<{ commercialDetails: PublicCommercialDetails }>(
            `/medicines/${medicine.id}/commercial-details`,
          )
          .catch(() => null),
        apiClient
          .get<{ batches: PublicBatch[] }>(
            `/batches?medicineId=${medicine.id}`,
          )
          .catch(() => null),
      ]);

      if (batchesRes && Array.isArray(batchesRes.batches)) {
        setBatches(batchesRes.batches);
      } else {
        setBatches([]);
      }

      if (commRes && commRes.commercialDetails) {
        const cd = commRes.commercialDetails;
        setDetails(cd);
        setPurchaseRate(String(cd.purchaseRate));
        setMrp(String(cd.mrp));
        setDiscountPercent(String(cd.discountPercent));
        setGstPercent(String(cd.gstPercent ?? 0));
        setScheme(formatScheme(cd.scheme) === 'None' ? '' : formatScheme(cd.scheme));
        setPrivateNotes(cd.privateNotes || '');
      } else {
        setDetails(null);
        setPurchaseRate('');
        setMrp(medicine.mrp ? String(medicine.mrp) : '');
        setDiscountPercent('0');
        setGstPercent('0');
        setScheme('');
        setPrivateNotes('');
        setIsEditing(true); // Automatically enter edit mode if no commercial details exist
      }
    } catch {
      setDetails(null);
      setPurchaseRate('');
      setMrp(medicine.mrp ? String(medicine.mrp) : '');
      setDiscountPercent('0');
      setGstPercent('0');
      setScheme('');
      setPrivateNotes('');
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !medicine?.id) {
      setDetails(null);
      setBatches([]);
      setSelectedBatch(null);
      setIsEditing(false);
      setFormError(null);
      return;
    }

    loadCommercialData();
  }, [visible, medicine?.id, medicine?.mrp]);

  const numPurchase = parseFloat(purchaseRate) || 0;
  const numMrp = parseFloat(mrp) || 0;
  const numDiscount = parseFloat(discountPercent) || 0;
  const numGst = parseFloat(gstPercent) || 0;

  const metrics = calculateCommercialMetrics(numPurchase, numMrp, numDiscount, scheme, numGst);

  const handleEditBatch = (batch: PublicBatch) => {
    setSelectedBatch(batch);
    const comm = batch.commercialDetails;
    if (comm) {
      setPurchaseRate(String(comm.purchaseRate));
      setMrp(String(comm.mrp));
      setDiscountPercent(String(comm.discountPercent));
      setGstPercent(String(comm.gstPercent ?? 0));
      setScheme(formatScheme(comm.scheme) === 'None' ? '' : formatScheme(comm.scheme));
      setPrivateNotes(comm.privateNotes || '');
    } else {
      setPurchaseRate('');
      setMrp(medicine?.mrp ? String(medicine.mrp) : '');
      setDiscountPercent('0');
      setGstPercent('0');
      setScheme('');
      setPrivateNotes('');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!medicine?.id) return;

    if (!purchaseRate.trim() || isNaN(Number(purchaseRate)) || Number(purchaseRate) < 0) {
      setFormError('Valid purchase rate is required');
      return;
    }
    if (!mrp.trim() || isNaN(Number(mrp)) || Number(mrp) <= 0) {
      setFormError('Valid MRP is required');
      return;
    }
    if (isNaN(Number(discountPercent)) || Number(discountPercent) < 0 || Number(discountPercent) > 100) {
      setFormError('Discount percent must be between 0 and 100');
      return;
    }
    if (isNaN(Number(gstPercent)) || Number(gstPercent) < 0 || Number(gstPercent) > 100) {
      setFormError('GST percent must be between 0 and 100');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      purchaseRate: Number(purchaseRate),
      mrp: Number(mrp),
      discountPercent: Number(discountPercent) || 0,
      gstPercent: Number(gstPercent) || 0,
      scheme: scheme.trim() ? scheme.trim() : null,
      privateNotes: privateNotes.trim() ? privateNotes.trim() : null,
    };

    try {
      let savedDetails: PublicCommercialDetails;
      if (selectedBatch?.id) {
        const res = await apiClient.patch<{ commercialDetails: PublicCommercialDetails }>(
          `/batches/${selectedBatch.id}/commercial-details`,
          payload,
        ).catch(async () => {
          return apiClient.post<{ commercialDetails: PublicCommercialDetails }>(
            `/batches/${selectedBatch.id}/commercial-details`,
            payload,
          );
        });
        savedDetails = res.commercialDetails;
      } else if (details?.id) {
        const res = await apiClient.patch<{ commercialDetails: PublicCommercialDetails }>(
          `/medicines/${medicine.id}/commercial-details`,
          payload,
        );
        savedDetails = res.commercialDetails;
      } else {
        const res = await apiClient.post<{ commercialDetails: PublicCommercialDetails }>(
          `/medicines/${medicine.id}/commercial-details`,
          payload,
        );
        savedDetails = res.commercialDetails;
      }
      setDetails(savedDetails);
      setIsEditing(false);
      setSelectedBatch(null);
      if (onSuccess) onSuccess(savedDetails);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save commercial details';
      setFormError(msg);
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
      testID="commercial-details-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close commercial details modal"
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Icon name="tag" size={18} color="#D97706" />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {medicine?.name || 'Commercial Details'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {medicine?.manufacturer?.name} • Confidential Trade Pricing
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              testID="close-commercial-modal-btn"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching commercial pricing & schemes...</Text>
              </View>
            ) : isEditing ? (
              /* Edit / Create Form */
              <View style={styles.formContainer}>
                {selectedBatch ? (
                  <View style={styles.batchBanner}>
                    <Icon name="batches" size={14} color={colors.primary} />
                    <Text style={styles.batchBannerText}>
                      Editing Commercials for Batch: {selectedBatch.batchNumber} (Exp: {selectedBatch.expiryDate})
                    </Text>
                  </View>
                ) : null}

                {formError ? (
                  <View style={styles.errorBox} testID="commercial-form-error">
                    <Icon name="warning" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Rates Row */}
                <View style={styles.twoColumnRow}>
                  <View style={styles.flex1}>
                    <FormField label="Purchase Rate (₹) *" required>
                      <TextInput
                        value={purchaseRate}
                        onChangeText={setPurchaseRate}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        testID="commercial-purchase-rate-input"
                      />
                    </FormField>
                  </View>

                  <View style={styles.flex1}>
                    <FormField label="MRP (₹) *" required>
                      <TextInput
                        value={mrp}
                        onChangeText={setMrp}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        testID="commercial-mrp-input"
                      />
                    </FormField>
                  </View>
                </View>

                {/* Discount, GST & Scheme Row */}
                <View style={styles.twoColumnRow}>
                  <View style={styles.flex1}>
                    <FormField label="Discount (%)">
                      <TextInput
                        value={discountPercent}
                        onChangeText={setDiscountPercent}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        testID="commercial-discount-input"
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
                        testID="commercial-gst-input"
                      />
                    </FormField>
                  </View>
                </View>

                <FormField label="Scheme (e.g. 10+1)">
                  <TextInput
                    value={scheme}
                    onChangeText={setScheme}
                    placeholder="e.g. 10+1 or 5% Scheme"
                    testID="commercial-scheme-input"
                  />
                </FormField>

                {/* Live Margin Calculation Preview */}
                <Card style={styles.metricsCard}>
                  <Text style={styles.metricsCardTitle}>Calculated Trade Metrics</Text>
                  <View style={styles.metricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Net Selling</Text>
                      <Text style={styles.metricValue}>{metrics.formattedSellingPrice}</Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Est. Profit</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          metrics.isProfit ? styles.profitPositive : styles.profitNegative,
                        ]}
                      >
                        {metrics.formattedProfit}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricCol}>
                      <Text style={styles.metricLabel}>Margin %</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          metrics.isProfit ? styles.profitPositive : styles.profitNegative,
                        ]}
                      >
                        {metrics.formattedMargin}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Private Notes */}
                <FormField label="Private Admin Notes (Confidential)">
                  <TextInput
                    value={privateNotes}
                    onChangeText={setPrivateNotes}
                    placeholder="e.g. Supplier contact, special terms, bulk discounts..."
                    multiline
                    numberOfLines={3}
                    testID="commercial-private-notes-input"
                  />
                </FormField>
              </View>
            ) : details ? (
              /* View Details Screen */
              <View style={styles.readOnlyContainer}>
                {details.batch ? (
                  <View style={styles.batchBanner}>
                    <Icon name="batches" size={14} color={colors.primary} />
                    <Text style={styles.batchBannerText}>
                      CURRENT BATCH: {details.batch.batchNumber}
                      {details.batch.expiryDate ? ` (Exp: ${details.batch.expiryDate})` : ''}
                    </Text>
                  </View>
                ) : null}

                {/* Active Commercial Summary Card */}
                <Card style={styles.pricingCard}>
                  <View style={styles.pricingHeader}>
                    <Text style={styles.pricingSectionTitle}>Current Commercial Terms</Text>
                    <TouchableOpacity
                      style={styles.editPillBtn}
                      onPress={() => {
                        setSelectedBatch(null);
                        setIsEditing(true);
                      }}
                      testID="commercial-edit-btn"
                    >
                      <Icon name="edit" size={13} color={colors.primary} />
                      <Text style={styles.editPillBtnText}>Edit Commercials</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Purchase Rate</Text>
                    <Text style={styles.detailValueBold}>₹{Number(details.purchaseRate).toFixed(2)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Maximum Retail Price (MRP)</Text>
                    <Text style={styles.detailValueBold}>₹{Number(details.mrp).toFixed(2)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Discount Rate</Text>
                    <Text style={styles.detailValue}>{details.discountPercent}%</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GST Rate</Text>
                    <Text style={styles.detailValue} testID="commercial-gst-display">
                      {details.gstPercent ?? 0}%
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trade Scheme</Text>
                    <View style={styles.schemeTag}>
                      <Icon name="tag" size={12} color="#92400E" />
                      <Text style={styles.schemeTagText} testID="commercial-scheme-display">
                        {formatScheme(details.scheme)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRowLast}>
                    <Text style={styles.detailLabel}>Net Margin</Text>
                    <Text style={[styles.detailValueBold, styles.profitPositive]}>
                      {calculateCommercialMetrics(details.purchaseRate, details.mrp, details.discountPercent, details.scheme, details.gstPercent ?? 0).formattedMargin}
                    </Text>
                  </View>
                </Card>

                {/* Private Notes Card */}
                {details.privateNotes ? (
                  <Card style={styles.notesCard}>
                    <Text style={styles.notesTitle}>Confidential Notes</Text>
                    <Text style={styles.notesText}>{details.privateNotes}</Text>
                  </Card>
                ) : null}

                {/* Batch-Wise Commercial History Section */}
                {batches.length > 0 ? (
                  <View style={styles.batchHistorySection} testID="batch-wise-commercial-history">
                    <View style={styles.batchHistoryHeader}>
                      <Text style={styles.batchHistoryTitle}>Batch-Wise Commercial History</Text>
                      <Text style={styles.batchHistoryCount}>({batches.length} Batches)</Text>
                    </View>

                    {batches.map((b, idx) => {
                      const comm = b.commercialDetails;
                      const isLatest = idx === 0;
                      return (
                        <Card key={b.id} style={[styles.batchCard, isLatest && styles.latestBatchCard]}>
                          <View style={styles.batchCardTop}>
                            <View style={styles.batchNumberGroup}>
                              <Text style={styles.batchNumberText}>{b.batchNumber}</Text>
                              {isLatest ? (
                                <View style={styles.latestPill}>
                                  <Text style={styles.latestPillText}>Latest</Text>
                                </View>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              style={styles.batchEditBtn}
                              onPress={() => handleEditBatch(b)}
                              testID={`edit-batch-${b.id}`}
                            >
                              <Icon name="edit" size={12} color={colors.primary} />
                              <Text style={styles.batchEditBtnText}>Edit</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.batchDatesRow}>
                            <Text style={styles.batchDateText}>
                              Exp: {b.expiryDate} {b.manufacturingDate ? `• Mfg: ${b.manufacturingDate}` : ''}
                            </Text>
                          </View>

                          <View style={styles.batchCommercialRow}>
                            <Text style={styles.batchPriceText}>
                              MRP: <Text style={styles.boldText}>₹{comm?.mrp ? Number(comm.mrp).toFixed(2) : 'N/A'}</Text>
                            </Text>
                            <Text style={styles.batchPriceText}>
                              Purchase: <Text style={styles.boldText}>₹{comm?.purchaseRate ? Number(comm.purchaseRate).toFixed(2) : 'N/A'}</Text>
                            </Text>
                            <Text style={styles.batchSchemeText}>
                              Scheme: <Text style={styles.boldText}>{formatScheme(comm?.scheme)}</Text>
                            </Text>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                ) : null}

                {/* Metadata */}
                <View style={styles.metaRow}>
                  <Icon name="time" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    Last updated by {details.updatedBy?.name || 'Administrator'}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Button
              title={isEditing ? 'Cancel' : 'Close'}
              variant="ghost"
              onPress={isEditing && details ? () => { setIsEditing(false); setSelectedBatch(null); } : onClose}
              disabled={isSubmitting}
              style={styles.footerCancelBtn}
              testID="commercial-modal-cancel-btn"
            />
            {isEditing ? (
              <Button
                title={details || selectedBatch ? 'Save Changes' : 'Create Commercials'}
                variant="primary"
                onPress={handleSave}
                loading={isSubmitting}
                style={styles.footerSubmitBtn}
                testID="commercial-modal-save-btn"
              />
            ) : null}
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
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
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
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  formContainer: {
    gap: spacing.sm,
  },
  batchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  batchBannerText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  metricsCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    padding: spacing.md,
  },
  metricsCardTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  profitPositive: {
    color: '#059669',
  },
  profitNegative: {
    color: colors.error,
  },
  readOnlyContainer: {
    gap: spacing.base,
  },
  currentBatchBadgeRow: {
    marginBottom: spacing.xs,
  },
  currentBatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  currentBatchBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#1E40AF',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.sm,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pricingSectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  editPillBtnText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  detailLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  detailValueBold: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
  },
  schemeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  schemeTagText: {
    fontSize: fontSizes.xs,
    color: '#92400E',
    fontWeight: fontWeights.semibold,
  },
  notesCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    padding: spacing.md,
    gap: 4,
  },
  notesTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#92400E',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: fontSizes.xs,
    color: '#78350F',
    lineHeight: 18,
  },
  batchHistorySection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  batchHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchHistoryTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  batchHistoryCount: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  batchCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    gap: 4,
  },
  latestBatchCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
  },
  batchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchNumberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  batchNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  latestPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  latestPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#1E40AF',
  },
  batchEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  batchEditBtnText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  batchDatesRow: {
    flexDirection: 'row',
  },
  batchDateText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  batchCommercialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  batchPriceText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  batchSchemeText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
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
  footerCancelBtn: {
    minWidth: 80,
  },
  footerSubmitBtn: {
    minWidth: 140,
  },
});
