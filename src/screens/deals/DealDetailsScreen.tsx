import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  ErrorState,
  Icon,
  LoadingIndicator,
  SectionHeader,
} from '../../components';
import { useAuth } from '../../features/auth';
import { dealService } from '../../services/dealService';
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { DealStatus, PublicDeal } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatScheme } from '../../utils/commercial.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DealDetailsRouteProp = RouteProp<RootStackParamList, 'DealDetails'>;

function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
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
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export const DealDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DealDetailsRouteProp>();
  const { dealId } = route.params;
  const { isAdmin } = useAuth();

  const [deal, setDeal] = useState<PublicDeal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDealDetails = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await dealService.getDealById(dealId);
      if (isMountedRef.current) {
        setDeal(res.deal);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const msg =
          err instanceof Error ? err.message : 'Failed to load deal details.';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dealId]);

  useFocusEffect(
    useCallback(() => {
      fetchDealDetails();
    }, [fetchDealDetails]),
  );

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Cannot Call', `Unable to dial ${phone}.`);
    });
  };

  const handleEmail = (email?: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Cannot Email', `Unable to send email to ${email}.`);
    });
  };

  const handleToggleStatus = async () => {
    if (!deal) return;
    const nextStatus: DealStatus =
      deal.status === 'PENDING' ? 'RECEIVED' : 'PENDING';
    const actionText =
      nextStatus === 'RECEIVED' ? 'Mark as Received' : 'Revert to Pending';

    Alert.alert(
      actionText,
      `Change status of this agreement to "${nextStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const res = await dealService.updateDealStatus(deal.id, nextStatus);
              setDeal(res.deal);
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'Failed to update status.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handleDeleteDeal = () => {
    if (!deal) return;
    Alert.alert(
      'Delete Medicine Deal?',
      'Are you sure you want to permanently delete this deal record? The associated Medicine and MR will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Deal',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await dealService.deleteDeal(deal.id);
              navigation.goBack();
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'Failed to delete deal.';
              Alert.alert('Error', msg);
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Deal Agreement',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Medicine deals and agreed commercial terms are restricted to ADMIN accounts only."
          testID="deals-access-restricted"
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: 'Deal Agreement',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading deal agreement..." />
      </AppScreen>
    );
  }

  if (error || !deal) {
    return (
      <AppScreen
        headerProps={{
          title: 'Deal Agreement',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Deal Not Found"
          message={error || 'This medicine deal could not be loaded.'}
          onRetry={fetchDealDetails}
        />
      </AppScreen>
    );
  }

  const isPending = deal.status === 'PENDING';
  const effectivePhone = deal.mrPhoneSnapshot || deal.mr.phone;

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Deal Agreement',
        subtitle: `Settled on ${formatFullDate(deal.dealDate)}`,
        showBack: true,
        onBack: () => navigation.goBack(),
        rightIcon: 'edit',
        onRightPress: () => navigation.navigate('EditDeal', { dealId: deal.id }),
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Header Banner */}
        <Card
          style={[
            styles.statusBannerCard,
            isPending
              ? styles.statusBannerPending
              : deal.status === 'CANCELLED'
                ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                : styles.statusBannerReceived,
          ]}
        >
          <View style={styles.statusBannerLeft}>
            <View
              style={[
                styles.statusIconCircle,
                isPending
                  ? styles.statusIconCirclePending
                  : deal.status === 'CANCELLED'
                    ? { backgroundColor: '#FEE2E2' }
                    : styles.statusIconCircleReceived,
              ]}
            >
              <Icon
                name={isPending ? 'time' : deal.status === 'CANCELLED' ? 'close' : 'check'}
                size={20}
                color={isPending ? '#B45309' : deal.status === 'CANCELLED' ? '#B91C1C' : '#15803D'}
              />
            </View>
            <View style={styles.statusBannerTextCol}>
              <Text
                style={[
                  styles.statusBannerTitle,
                  isPending
                    ? styles.statusBannerTitlePending
                    : deal.status === 'CANCELLED'
                      ? { color: '#B91C1C' }
                      : styles.statusBannerTitleReceived,
                ]}
              >
                {isPending
                  ? 'Delivery Pending'
                  : deal.status === 'CANCELLED'
                    ? 'Deal Cancelled'
                    : 'Medicine Received'}
              </Text>
              <Text style={styles.statusBannerSubtitle}>
                {isPending
                  ? 'Awaiting delivery by representative'
                  : deal.status === 'CANCELLED'
                    ? 'This deal was cancelled'
                    : 'Fulfillment confirmed'}
              </Text>
            </View>
          </View>

          {isPending ? (
            <TouchableOpacity
              style={[styles.statusToggleButton, styles.statusToggleReceived]}
              onPress={handleToggleStatus}
              activeOpacity={0.8}
            >
              <Text style={[styles.statusToggleText, styles.statusToggleTextReceived]}>
                Mark Received
              </Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* Section 1: Agreed Commercial Settlement (Prominent) */}
        <SectionHeader title="AGREED COMMERCIAL TERMS" />
        <Card style={styles.termsCard}>
          <View style={styles.termsRow}>
            {/* MRP */}
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>AGREED MRP</Text>
              <Text style={styles.termValueBold}>
                ₹{Number(deal.agreedMrp).toFixed(2)}
              </Text>
              <Text style={styles.termHint}>Agreed retail price</Text>
            </View>

            {/* Scheme */}
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>TRADE SCHEME</Text>
              <View style={styles.schemeTagLarge}>
                <Icon name="tag" size={14} color="#92400E" />
                <Text style={styles.schemeTagLargeText}>
                  {formatScheme(deal.agreedScheme)}
                </Text>
              </View>
              <Text style={styles.termHint}>Agreed bonus / free units</Text>
            </View>

            {/* Bill Discount */}
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>BILL DISCOUNT</Text>
              <Text style={[styles.termValueBold, styles.discountGreen]}>
                {Number(deal.agreedBillDiscount).toFixed(2)}%
              </Text>
              <Text style={styles.termHint}>Agreed trade margin</Text>
            </View>
          </View>

          <View style={styles.snapshotNotice}>
            <Icon name="shield" size={14} color="#059669" />
            <Text style={styles.snapshotNoticeText}>
              Permanent historical record: these agreed commercial values remain
              constant even if medicine MRP or formulary rates change.
            </Text>
          </View>
        </Card>

        {/* Section 2: Medicine Information */}
        <SectionHeader title="MEDICINE INFORMATION" />
        <Card style={styles.infoCard}>
          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="medicines" size={18} color="#059669" />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Medicine Name</Text>
              <Text style={styles.detailValueBold}>{deal.medicine.name}</Text>
            </View>
          </View>

          {deal.medicine.manufacturer ? (
            <View style={styles.detailItemRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="building" size={18} color="#2563EB" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Manufacturer</Text>
                <Text style={styles.detailValue}>
                  {deal.medicine.manufacturer.name}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#F8FAFC' }]}>
              <Icon name="cube" size={18} color="#64748B" />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Packaging / Form</Text>
              <Text style={styles.detailValue}>
                {deal.medicine.packQuantity} {deal.medicine.packUnit} •{' '}
                {deal.medicine.form}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.entityLinkButton}
            onPress={() =>
              navigation.navigate('MedicineDetails', { id: deal.medicineId })
            }
          >
            <Icon name="medicines" size={14} color="#15803D" />
            <Text style={styles.entityLinkButtonText}>Open Medicine Details</Text>
            <Icon name="chevron-right" size={14} color="#15803D" />
          </TouchableOpacity>
        </Card>

        {/* Section 3: Representative (MR) Information */}
        <SectionHeader title="MEDICAL REPRESENTATIVE (MR)" />
        <Card style={styles.infoCard}>
          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Icon name="person" size={18} color="#7C3AED" />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Representative</Text>
              <Text style={styles.detailValueBold}>
                {deal.mr.name}
                {deal.mr.company ? ` • ${deal.mr.company}` : ''}
              </Text>
            </View>
          </View>

          {effectivePhone ? (
            <View style={styles.detailItemRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="phone" size={18} color="#059669" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>
                  Contact Phone {deal.mrPhoneSnapshot ? '(Captured at Deal)' : ''}
                </Text>
                <Text style={styles.detailValuePhone}>{effectivePhone}</Text>
              </View>
              <TouchableOpacity
                style={styles.quickCallButton}
                onPress={() => handleCall(effectivePhone)}
                activeOpacity={0.7}
              >
                <Icon name="call" size={14} color="#FFFFFF" />
                <Text style={styles.quickCallText}>Call</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailItemRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Icon name="phone" size={18} color="#94A3B8" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Contact Phone</Text>
                <Text style={styles.detailValueMuted}>No phone provided</Text>
              </View>
            </View>
          )}

          {deal.mr.email ? (
            <View style={styles.detailItemRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="email" size={18} color="#2563EB" />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{deal.mr.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.quickEmailButton}
                onPress={() => handleEmail(deal.mr.email)}
                activeOpacity={0.7}
              >
                <Icon name="email" size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.entityLinkButton}
            onPress={() => navigation.navigate('MrDetails', { id: deal.mrId })}
          >
            <Icon name="person" size={14} color="#15803D" />
            <Text style={styles.entityLinkButtonText}>Open Representative Profile</Text>
            <Icon name="chevron-right" size={14} color="#15803D" />
          </TouchableOpacity>
        </Card>

        {/* Section 4: Notes & Metadata */}
        <SectionHeader title="AGREEMENT METADATA & NOTES" />
        <Card style={styles.infoCard}>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataCol}>
              <Text style={styles.metadataLabel}>DATE SETTLED</Text>
              <Text style={styles.metadataValue}>
                {formatFullDate(deal.dealDate)}
              </Text>
            </View>
            <View style={styles.metadataCol}>
              <Text style={styles.metadataLabel}>RECORDED BY</Text>
              <Text style={styles.metadataValue}>
                {deal.createdBy ? deal.createdBy.name : 'Staff / Admin'}
              </Text>
            </View>
          </View>

          {deal.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>TERMS & PRIVATE NOTES</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{deal.notes}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Action Buttons: Edit & Delete */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditDeal', { dealId: deal.id })}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Deal Agreement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteDeal}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <Icon name="delete" size={16} color="#DC2626" />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting...' : 'Delete Deal Record'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  statusBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusBannerPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusBannerReceived: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconCirclePending: {
    backgroundColor: '#FEF3C7',
  },
  statusIconCircleReceived: {
    backgroundColor: '#DCFCE7',
  },
  statusBannerTextCol: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  statusBannerTitlePending: {
    color: '#B45309',
  },
  statusBannerTitleReceived: {
    color: '#15803D',
  },
  statusBannerSubtitle: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginTop: 2,
  },
  statusToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  statusToggleReceived: {
    backgroundColor: '#15803D',
  },
  statusTogglePending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  statusToggleText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  statusToggleTextReceived: {
    color: '#FFFFFF',
  },
  statusToggleTextPending: {
    color: '#475569',
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  termBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  termLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  termValueBold: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  discountGreen: {
    color: '#059669',
  },
  schemeTagLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  schemeTagLargeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  termHint: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  snapshotNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    marginTop: 12,
  },
  snapshotNoticeText: {
    fontSize: fontSizes.xs,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    color: '#334155',
  },
  detailValueBold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  detailValuePhone: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  detailValueMuted: {
    fontSize: fontSizes.sm,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  quickCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  quickCallText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  quickEmailButton: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: borderRadius.md,
  },
  entityLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginTop: 10,
  },
  entityLinkButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
    flex: 1,
    marginLeft: 8,
  },
  metadataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  metadataCol: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: fontSizes.sm,
    color: '#1E293B',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    marginBottom: 6,
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 10,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: '#334155',
    lineHeight: 20,
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  deleteButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#DC2626',
  },
});
