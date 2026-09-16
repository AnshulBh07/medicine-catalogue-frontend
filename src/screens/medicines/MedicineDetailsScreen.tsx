import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
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
  Badge,
  Card,
  ErrorState,
  Icon,
  LoadingIndicator,
  MedicineThumbnailPlaceholder,
  SectionHeader,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
  theme,
} from '../../theme';
import type { PublicCommercialDetails, PublicMedicine } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { calculateCommercialMetrics, formatBatchExpiryDate, formatScheme } from '../../utils/commercial.utils';
import { CommercialDetailsModal } from '../commercial-details/CommercialDetailsModal';

type MedicineDetailsRouteProp = RouteProp<RootStackParamList, 'MedicineDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Reference fallback dataset for offline/mock parity
const SAMPLE_MEDICINES: Record<string, PublicMedicine> = {
  'med-1': {
    id: 'med-1',
    name: 'Paracetamol 500mg Tablet',
    composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Analgesic / Antipyretic',
    imageUrl: null,
    uses: 'Pain relief and fever reduction',
    recommendedAgeGroup: 'Adults and children over 12',
    directions: 'Take 1-2 tablets every 4-6 hours as needed',
    warnings: 'Do not exceed 4g in 24 hours',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-2': {
    id: 'med-2',
    name: 'Amoxicillin 500mg Capsule',
    composition: { id: 'comp-2', displayText: 'Amoxicillin 500mg' },
    form: 'CAPSULE',
    packQuantity: 15,
    packUnit: 'CAPSULE',
    shortDescription: 'Antibiotic',
    imageUrl: null,
    uses: 'Bacterial infections',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule 3 times daily',
    warnings: 'Complete full course of antibiotics',
    storageInstructions: 'Store in a dry place',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-3': {
    id: 'med-3',
    name: 'Cetirizine 10mg Tablet',
    composition: { id: 'comp-3', displayText: 'Cetirizine 10mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Antihistamine',
    imageUrl: null,
    uses: 'Allergies and hay fever',
    recommendedAgeGroup: 'Adults and children over 6',
    directions: 'Take 1 tablet daily',
    warnings: 'May cause drowsiness',
    storageInstructions: 'Store below 30°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-4': {
    id: 'med-4',
    name: 'Omeprazole 20mg Capsule',
    composition: { id: 'comp-4', displayText: 'Omeprazole 20mg' },
    form: 'CAPSULE',
    packQuantity: 14,
    packUnit: 'CAPSULE',
    shortDescription: 'Anti-ulcer',
    imageUrl: null,
    uses: 'Acid reflux and stomach ulcers',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule before breakfast',
    warnings: 'Swallow whole with water',
    storageInstructions: 'Store in original blister',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-5': {
    id: 'med-5',
    name: 'Ibuprofen 400mg Tablet',
    composition: { id: 'comp-5', displayText: 'Ibuprofen 400mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'NSAID',
    imageUrl: null,
    uses: 'Inflammation and pain relief',
    recommendedAgeGroup: 'Adults',
    directions: 'Take with food or milk',
    warnings: 'Avoid if stomach ulcers present',
    storageInstructions: 'Keep in a cool dry place',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-6': {
    id: 'med-6',
    name: 'Amlodipine 5mg Tablet',
    composition: { id: 'comp-6', displayText: 'Amlodipine 5mg' },
    form: 'TABLET',
    packQuantity: 30,
    packUnit: 'TABLET',
    shortDescription: 'Calcium Channel Blocker',
    imageUrl: null,
    uses: 'High blood pressure and angina',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 tablet once daily',
    warnings: 'Monitor blood pressure regularly',
    storageInstructions: 'Protect from light',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-7': {
    id: 'med-7',
    name: 'Atorvastatin 10mg Tablet',
    composition: { id: 'comp-7', displayText: 'Atorvastatin 10mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Lipid Lowering Agent',
    imageUrl: null,
    uses: 'Cholesterol management',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 tablet at night',
    warnings: 'Avoid excessive grapefruit juice',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-8': {
    id: 'med-8',
    name: 'Panadol Extra 500mg/65mg Tablet',
    composition: { id: 'comp-8', displayText: 'Paracetamol 500mg + Caffeine 65mg' },
    form: 'TABLET',
    packQuantity: 20,
    packUnit: 'TABLET',
    shortDescription: 'Dual Action Analgesic',
    imageUrl: null,
    uses: 'Severe headache and migraine relief',
    recommendedAgeGroup: 'Adults and children over 12',
    directions: 'Take 1-2 tablets every 4-6 hours',
    warnings: 'Contains caffeine. Do not exceed 8 tablets daily',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

export const MedicineDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MedicineDetailsRouteProp>();
  const { id } = route.params;
  const { isAdmin } = useAuth();

  const [medicine, setMedicine] = useState<PublicMedicine | null>(null);
  const [commercialDetails, setCommercialDetails] = useState<PublicCommercialDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);

  const fetchMedicineDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const medicinePromise = apiClient.get<{ medicine: PublicMedicine }>(`/medicines/${id}`);
      const commercialPromise = isAdmin
        ? apiClient
            .get<{ commercialDetails: PublicCommercialDetails }>(
              `/medicines/${id}/commercial-details`,
            )
            .catch(() => null)
        : Promise.resolve(null);

      const [medResponse, commResponse] = await Promise.all([medicinePromise, commercialPromise]);

      if (medResponse && medResponse.medicine) {
        setMedicine(medResponse.medicine);
      } else if (SAMPLE_MEDICINES[id]) {
        setMedicine(SAMPLE_MEDICINES[id]);
      } else {
        setErrorMessage('Medicine record not found.');
      }

      if (commResponse && commResponse.commercialDetails) {
        setCommercialDetails(commResponse.commercialDetails);
      } else {
        setCommercialDetails(null);
      }
    } catch {
      // Fallback to sample data if matching ID is available
      if (SAMPLE_MEDICINES[id]) {
        setMedicine(SAMPLE_MEDICINES[id]);
      } else {
        setErrorMessage('Unable to load medicine details. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchMedicineDetails();
  }, [fetchMedicineDetails]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchMedicineDetails();
    });
    return unsubscribe;
  }, [navigation, fetchMedicineDetails]);

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: 'Medicine Details',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading medicine details..." />
      </AppScreen>
    );
  }

  if (errorMessage || !medicine) {
    return (
      <AppScreen
        headerProps={{
          title: 'Medicine Details',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Medicine Not Found"
          message={errorMessage || 'The requested medicine could not be loaded.'}
          onRetry={fetchMedicineDetails}
        />
      </AppScreen>
    );
  }

  const commercialMetrics = commercialDetails
    ? calculateCommercialMetrics(
        commercialDetails.purchaseRate,
        commercialDetails.mrp,
        commercialDetails.discountPercent,
        commercialDetails.scheme,
        commercialDetails.gstPercent ?? 0,
      )
    : null;

  return (
    <AppScreen
      headerProps={{
        title: medicine.name,
        subtitle: `${medicine.form} • ${medicine.packQuantity} ${medicine.packUnit.toLowerCase()}`,
        showBack: true,
        onBack: () => navigation.goBack(),
        rightIcon: 'edit',
        onRightPress: () => navigation.navigate('EditMedicine', { id: medicine.id }),
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Packaging Image Hero */}
        <View style={styles.imageHeroCard}>
          {medicine.imageUrl ? (
            <Image
              source={{ uri: medicine.imageUrl }}
              style={styles.heroImage}
              resizeMode="contain"
              accessibilityLabel={`${medicine.name} packaging image`}
              testID="medicine-details-image"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <MedicineThumbnailPlaceholder width={140} height={100} />
              <Text style={styles.placeholderText}>Packaging image not provided</Text>
            </View>
          )}
        </View>

        {/* Commercial & Pricing Details (Admin Only) */}
        {isAdmin ? (
          <View testID="medicine-details-commercial-section">
            <View style={styles.sectionHeaderRow}>
              <SectionHeader title="Commercial & Pricing Details" />
              <TouchableOpacity
                style={styles.editCommercialBtn}
                onPress={() => setIsCommercialModalOpen(true)}
                testID="edit-commercial-details-trigger"
              >
                <Icon name="tag" size={13} color={colors.primary} />
                <Text style={styles.editCommercialBtnText}>
                  {commercialDetails ? 'Edit Rates' : 'Add Rates'}
                </Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.card}>
              {commercialDetails ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Purchase Rate</Text>
                    <Text style={styles.valueBold} testID="commercial-purchase-rate">
                      ₹{Number(commercialDetails.purchaseRate).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Maximum Retail Price (MRP)</Text>
                    <Text style={styles.valueBold} testID="commercial-mrp">
                      ₹{Number(commercialDetails.mrp).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Discount Rate</Text>
                    <Text style={styles.value} testID="commercial-discount">
                      {commercialDetails.discountPercent}%
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>GST Rate</Text>
                    <Text style={styles.value} testID="commercial-gst">
                      {commercialDetails.gstPercent ?? 0}%
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Trade Scheme</Text>
                    <View style={styles.schemeTag}>
                      <Icon name="tag" size={12} color="#92400E" />
                      <Text style={styles.schemeTagText} testID="commercial-scheme">
                        {formatScheme(commercialDetails.scheme)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Net Margin</Text>
                    <Text style={[styles.valueBold, styles.profitPositive]} testID="commercial-margin">
                      {commercialMetrics?.formattedMargin}
                    </Text>
                  </View>

                  {commercialDetails.batch ? (
                    <View style={styles.row}>
                      <Text style={styles.label}>Current Batch</Text>
                      <Text style={styles.batchValue} testID="commercial-batch-number">
                        {commercialDetails.batch.batchNumber}
                        {commercialDetails.batch.expiryDate
                          ? ` (Exp: ${formatBatchExpiryDate(commercialDetails.batch.expiryDate)})`
                          : ''}
                      </Text>
                    </View>
                  ) : null}

                  {commercialDetails.privateNotes ? (
                    <View style={styles.rowLast}>
                      <Text style={styles.label}>Confidential Notes</Text>
                      <Text style={styles.valueMonospace}>{commercialDetails.privateNotes}</Text>
                    </View>
                  ) : null}

                  <View style={styles.viewBatchesRow}>
                    <TouchableOpacity
                      style={styles.viewBatchesBtn}
                      onPress={() =>
                        navigation.navigate('Deals', {
                          medicineId: medicine.id,
                          medicineName: medicine.name,
                        })
                      }
                      testID="view-medicine-deals-btn"
                    >
                      <Icon name="tag" size={14} color={colors.primary} />
                      <Text style={styles.viewBatchesBtnText}>View Medicine Deals</Text>
                      <Icon name="chevron-right" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.viewBatchesRow}>
                    <TouchableOpacity
                      style={styles.viewBatchesBtn}
                      onPress={() =>
                        navigation.navigate('Batches', {
                          medicineId: medicine.id,
                          medicineName: medicine.name,
                        })
                      }
                      testID="view-all-batches-btn"
                    >
                      <Icon name="batches" size={14} color={colors.primary} />
                      <Text style={styles.viewBatchesBtnText}>View All Batches & Stock</Text>
                      <Icon name="chevron-right" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCommercialBox}>
                  <Text style={styles.emptyCommercialText}>
                    No commercial pricing or trade scheme added for this medicine.
                  </Text>
                  <TouchableOpacity
                    style={styles.addRatesButton}
                    onPress={() => setIsCommercialModalOpen(true)}
                  >
                    <Text style={styles.addRatesButtonText}>+ Add Commercial Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </View>
        ) : null}

        {/* Overview & Identification */}
        <SectionHeader title="Product Overview" />
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Medicine Name</Text>
            <Text style={styles.valueBold} testID="medicine-details-name">
              {medicine.name}
            </Text>
          </View>

          {medicine.shortDescription ? (
            <View style={styles.row}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{medicine.shortDescription}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>Dosage Form</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={medicine.form}
                variant={medicine.form === 'TABLET' ? 'success' : 'primary'}
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Pack Size</Text>
            <Text style={styles.value}>
              {medicine.packQuantity} {medicine.packUnit.toLowerCase()}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Prescription</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={medicine.prescriptionRequired ? 'Rx Required' : 'OTC'}
                variant={medicine.prescriptionRequired ? 'warning' : 'secondary'}
              />
            </View>
          </View>

          {medicine.barcode ? (
            <View style={styles.rowLast}>
              <Text style={styles.label}>Barcode</Text>
              <Text style={styles.valueMonospace}>{medicine.barcode}</Text>
            </View>
          ) : null}
        </Card>

        {/* Composition & Manufacturer */}
        <SectionHeader title="Formulary & Production" />
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Composition</Text>
            <Text style={styles.value}>
              {medicine.composition?.displayText || 'Standard Formulation'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Manufacturer</Text>
            <Text style={styles.value}>
              {medicine.manufacturer?.name || 'Unknown Producer'}
            </Text>
          </View>

          {medicine.mr ? (
            <View style={styles.rowLast}>
              <Text style={styles.label}>Medical Rep (MR)</Text>
              <Text style={styles.value}>
                {medicine.mr.name} {medicine.mr.phone ? `(${medicine.mr.phone})` : ''}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Clinical & Usage Information */}
        {medicine.uses ||
        medicine.directions ||
        medicine.warnings ||
        medicine.storageInstructions ? (
          <>
            <SectionHeader title="Clinical & Safety Information" />
            <Card style={styles.card}>
              {medicine.uses ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Indications / Uses</Text>
                  <Text style={styles.value}>{medicine.uses}</Text>
                </View>
              ) : null}

              {medicine.directions ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Directions</Text>
                  <Text style={styles.value}>{medicine.directions}</Text>
                </View>
              ) : null}

              {medicine.warnings ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Warnings & Precautions</Text>
                  <Text style={styles.valueWarning}>{medicine.warnings}</Text>
                </View>
              ) : null}

              {medicine.storageInstructions ? (
                <View style={styles.rowLast}>
                  <Text style={styles.label}>Storage</Text>
                  <Text style={styles.value}>{medicine.storageInstructions}</Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>

      {/* Commercial Details Modal */}
      {isAdmin ? (
        <CommercialDetailsModal
          visible={isCommercialModalOpen}
          medicine={medicine}
          onClose={() => setIsCommercialModalOpen(false)}
          onSuccess={(saved) => {
            setCommercialDetails(saved);
          }}
        />
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  imageHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 180,
    ...theme.shadows.sm,
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  placeholderText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editCommercialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  editCommercialBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  card: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
    textAlign: 'right',
    flex: 1.5,
  },
  batchValue: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
    textAlign: 'right',
    flex: 1.8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  valueBold: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
    textAlign: 'right',
    flex: 1.5,
  },
  valueMonospace: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  valueWarning: {
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: fontWeights.medium,
    textAlign: 'right',
    flex: 1.5,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  profitPositive: {
    color: '#15803D',
  },
  emptyCommercialBox: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyCommercialText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addRatesButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  addRatesButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  viewBatchesRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  viewBatchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  viewBatchesBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    flex: 1,
    marginLeft: 6,
  },
});
