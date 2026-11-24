import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  Icon,
  LoadingIndicator,
} from '../../components';
import { useAuth } from '../../features/auth';
import { dealService } from '../../services/dealService';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { DealStatus, PublicDeal } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatScheme } from '../../utils/commercial.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DealsRouteProp = RouteProp<RootStackParamList, 'Deals'>;

type StatusTab = 'ALL' | 'PENDING' | 'RECEIVED';
type SortOption = 'date_desc' | 'date_asc' | 'med_asc' | 'mr_asc';

function formatDealDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export const DealsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DealsRouteProp>();
  const { isAdmin } = useAuth();

  // Optional route params to filter by medicine or MR
  const [filterMedicineId, setFilterMedicineId] = useState<string | undefined>(
    route.params?.medicineId,
  );
  const [filterMrId, setFilterMrId] = useState<string | undefined>(
    route.params?.mrId,
  );
  const filterMedicineName = route.params?.medicineName;
  const filterMrName = route.params?.mrName;

  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [showSortModal, setShowSortModal] = useState<boolean>(false);

  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    received: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const requestSeqRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDeals = useCallback(
    async (showLoadingSpinner: boolean = true) => {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }

      const requestSeq = ++requestSeqRef.current;

      if (showLoadingSpinner) {
        setIsLoading(true);
      }
      setError(null);

      try {
        let sortBy: 'dealDate' | 'medicineName' | 'mrName' = 'dealDate';
        let sortOrder: 'asc' | 'desc' = 'desc';

        if (sortOption === 'date_asc') {
          sortBy = 'dealDate';
          sortOrder = 'asc';
        } else if (sortOption === 'med_asc') {
          sortBy = 'medicineName';
          sortOrder = 'asc';
        } else if (sortOption === 'mr_asc') {
          sortBy = 'mrName';
          sortOrder = 'asc';
        }

        const result = await dealService.listDeals({
          medicineId: filterMedicineId,
          mrId: filterMrId,
          status: activeTab,
          search: debouncedSearchQuery.trim() || undefined,
          sortBy,
          sortOrder,
          limit: 100,
        });

        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          setDeals(result.deals || []);
          if (result.summary) {
            setSummary(result.summary);
          }
        }
      } catch (err) {
        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          const msg =
            err instanceof Error ? err.message : 'Failed to load medicine deals.';
          setError(msg);
        }
      } finally {
        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [isAdmin, filterMedicineId, filterMrId, activeTab, debouncedSearchQuery, sortOption],
  );

  useFocusEffect(
    useCallback(() => {
      fetchDeals();
    }, [fetchDeals]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDeals(false);
  }, [fetchDeals]);

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Cannot Call', `Unable to dial ${phone}.`);
    });
  };

  const handleToggleStatus = async (deal: PublicDeal) => {
    const nextStatus: DealStatus =
      deal.status === 'PENDING' ? 'RECEIVED' : 'PENDING';
    const actionLabel =
      nextStatus === 'RECEIVED' ? 'Mark as Received' : 'Revert to Pending';

    Alert.alert(
      actionLabel,
      `Are you sure you want to change status to "${nextStatus}" for this deal (${deal.medicine.name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const updated = await dealService.updateDealStatus(
                deal.id,
                nextStatus,
              );
              setDeals((prev) =>
                prev.map((d) => (d.id === deal.id ? updated.deal : d)),
              );
              // Update local summary
              setSummary((prev) => {
                if (deal.status === 'PENDING' && nextStatus === 'RECEIVED') {
                  return {
                    ...prev,
                    pending: Math.max(0, prev.pending - 1),
                    received: prev.received + 1,
                  };
                }
                if (deal.status === 'RECEIVED' && nextStatus === 'PENDING') {
                  return {
                    ...prev,
                    received: Math.max(0, prev.received - 1),
                    pending: prev.pending + 1,
                  };
                }
                return prev;
              });
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

  const clearEntityFilters = () => {
    setFilterMedicineId(undefined);
    setFilterMrId(undefined);
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Medicine Deals',
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

  return (
    <AppScreen
      headerProps={{
        title: 'Medicine Deals',
        subtitle: 'Agreed commercial settlements with MRs',
        showBack: true,
        onBack: () => navigation.goBack(),
        rightIcon: 'add',
        onRightPress: () =>
          navigation.navigate('AddDeal', {
            prefillMedicineId: filterMedicineId,
            prefillMrId: filterMrId,
          }),
      }}
      scrollable={false}
      contentContainerStyle={styles.container}
    >
      {/* Active Filter Banner if filtered by medicine or MR */}
      {(filterMedicineId || filterMrId) && (
        <View style={styles.activeFilterBanner}>
          <View style={styles.activeFilterContent}>
            <Icon name="filter" size={14} color="#15803D" />
            <Text style={styles.activeFilterText} numberOfLines={1}>
              Filtered by:{' '}
              <Text style={styles.activeFilterBold}>
                {filterMedicineName || filterMrName || 'Selected Item'}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={clearEntityFilters}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearFilterText}>Show All</Text>
            <Icon name="close" size={12} color="#15803D" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs Row: All, Pending, Received */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'ALL' && styles.tabButtonTextActive,
            ]}
          >
            All ({summary.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'PENDING' && styles.tabButtonActivePending,
          ]}
          onPress={() => setActiveTab('PENDING')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'PENDING' && styles.tabButtonTextPending,
            ]}
          >
            Pending ({summary.pending})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'RECEIVED' && styles.tabButtonActiveReceived,
          ]}
          onPress={() => setActiveTab('RECEIVED')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'RECEIVED' && styles.tabButtonTextReceived,
            ]}
          >
            Received ({summary.received})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Sort Controls */}
      <View style={styles.searchAndSortRow}>
        <View style={styles.searchWrapper}>
          <Icon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine, MR, scheme..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.7}
          accessibilityLabel="Sort deals"
        >
          <Icon name="sort" size={18} color="#15803D" />
        </TouchableOpacity>
      </View>

      {/* Deal List Content */}
      {isLoading && !isRefreshing ? (
        <LoadingIndicator message="Loading medicine deals..." />
      ) : error ? (
        <ErrorState
          title="Failed to load deals"
          message={error}
          onRetry={() => fetchDeals()}
        />
      ) : deals.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No deals found"
          description={
            searchQuery
              ? `No deals matching "${searchQuery}".`
              : activeTab === 'PENDING'
                ? 'Great! There are no outstanding pending medicine deliveries.'
                : activeTab === 'RECEIVED'
                  ? 'No received deals recorded yet.'
                  : 'No medicine deals recorded yet. Add a deal made with an MR.'
          }
          actionTitle="+ Add Deal"
          onAction={() =>
            navigation.navigate('AddDeal', {
              prefillMedicineId: filterMedicineId,
              prefillMrId: filterMrId,
            })
          }
          style={styles.emptyStateContainer}
        />
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {deals.map((deal) => {
            const isPending = deal.status === 'PENDING';
            const isReceived = deal.status === 'RECEIVED';
            const isCancelled = deal.status === 'CANCELLED';
            const effectivePhone = deal.mrPhoneSnapshot || deal.mr.phone;

            return (
              <Card key={deal.id} style={styles.dealCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('DealDetails', { dealId: deal.id })
                  }
                >
                  {/* Card Header: Medicine Name + Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.medTitleContainer}>
                      <Text style={styles.medicineName} numberOfLines={2}>
                        {deal.medicine.name}
                      </Text>
                      {deal.medicine.manufacturer ? (
                        <Text style={styles.manufacturerName} numberOfLines={1}>
                          {deal.medicine.manufacturer.name}
                        </Text>
                      ) : null}
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        isPending && styles.statusBadgePending,
                        isReceived && styles.statusBadgeReceived,
                        isCancelled && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                      ]}
                      testID={`deal-status-badge-${deal.id}`}
                    >
                      <Icon
                        name={isPending ? 'time' : isCancelled ? 'close' : 'check'}
                        size={12}
                        color={isPending ? '#B45309' : isCancelled ? '#B91C1C' : '#15803D'}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isPending && styles.statusBadgeTextPending,
                          isReceived && styles.statusBadgeTextReceived,
                          isCancelled && { color: '#B91C1C' },
                        ]}
                      >
                        {isPending ? 'Pending Delivery' : isCancelled ? 'Cancelled' : 'Received'}
                      </Text>
                    </View>
                  </View>

                  {/* MR Details & Deal Date Row */}
                  <View style={styles.metaRow}>
                    <View style={styles.mrInfo}>
                      <Icon name="person" size={14} color="#64748B" />
                      <Text style={styles.mrNameText} numberOfLines={1}>
                        {deal.mr.name}
                        {deal.mr.company ? ` (${deal.mr.company})` : ''}
                      </Text>
                    </View>

                    <View style={styles.dateInfo}>
                      <Icon name="calendar" size={13} color="#94A3B8" />
                      <Text style={styles.dateText}>
                        {formatDealDate(deal.dealDate)}
                      </Text>
                    </View>
                  </View>

                  {/* Commercial Settlement Highlight Bar */}
                  <View style={styles.commercialBar}>
                    {/* MRP */}
                    <View style={styles.commercialMetric}>
                      <Text style={styles.metricLabel}>AGREED MRP</Text>
                      <Text style={styles.metricValueBold}>
                        ₹{Number(deal.agreedMrp).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    {/* Scheme */}
                    <View style={styles.commercialMetric}>
                      <Text style={styles.metricLabel}>SCHEME</Text>
                      <View style={styles.schemePill}>
                        <Icon name="tag" size={11} color="#92400E" />
                        <Text style={styles.schemePillText}>
                          {formatScheme(deal.agreedScheme)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricDivider} />

                    {/* Bill Discount */}
                    <View style={styles.commercialMetric}>
                      <Text style={styles.metricLabel}>DISCOUNT</Text>
                      <Text style={[styles.metricValueBold, styles.discountText]}>
                        {Number(deal.agreedBillDiscount).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {/* Notes Preview if available */}
                  {deal.notes ? (
                    <Text style={styles.notesPreview} numberOfLines={1}>
                      Note: {deal.notes}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* Card Actions Footer */}
                <View style={styles.cardFooter}>
                  {/* Status Toggle Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionPill,
                      isPending ? styles.actionPillMarkReceived : styles.actionPillRevert,
                    ]}
                    onPress={() => handleToggleStatus(deal)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={isPending ? 'check' : 'time'}
                      size={13}
                      color={isPending ? '#15803D' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.actionPillText,
                        isPending
                          ? styles.actionPillTextReceived
                          : styles.actionPillTextRevert,
                      ]}
                    >
                      {isPending ? 'Mark Received' : 'Revert to Pending'}
                    </Text>
                  </TouchableOpacity>

                  {/* Contact MR Phone Action */}
                  {effectivePhone ? (
                    <TouchableOpacity
                      style={styles.callActionButton}
                      onPress={() => handleCall(effectivePhone)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Call ${deal.mr.name}`}
                    >
                      <Icon name="phone" size={13} color="#15803D" />
                      <Text style={styles.callActionText}>Call MR</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* View Details Chevron */}
                  <TouchableOpacity
                    style={styles.detailsChevronButton}
                    onPress={() =>
                      navigation.navigate('DealDetails', { dealId: deal.id })
                    }
                  >
                    <Text style={styles.detailsChevronText}>Details</Text>
                    <Icon name="chevron-right" size={13} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Floating Add Deal Button */}
      <FloatingActionButton
        onPress={() =>
          navigation.navigate('AddDeal', {
            prefillMedicineId: filterMedicineId,
            prefillMrId: filterMrId,
          })
        }
        testID="add-deal-fab"
      />

      {/* Sort Options Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Medicine Deals</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { id: 'date_desc', label: 'Deal Date (Newest first)' },
              { id: 'date_asc', label: 'Deal Date (Oldest first)' },
              { id: 'med_asc', label: 'Medicine Name (A to Z)' },
              { id: 'mr_asc', label: 'MR Name (A to Z)' },
            ].map((option) => {
              const isSelected = sortOption === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOptionItem,
                    isSelected && styles.sortOptionItemSelected,
                  ]}
                  onPress={() => {
                    setSortOption(option.id as SortOption);
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      isSelected && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Icon name="check" size={16} color="#15803D" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  activeFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: fontSizes.xs,
    color: '#065F46',
  },
  activeFilterBold: {
    fontWeight: fontWeights.bold,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  clearFilterText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#065F46',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabButtonActivePending: {
    backgroundColor: '#FEF3C7',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabButtonActiveReceived: {
    backgroundColor: '#DCFCE7',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
  },
  tabButtonTextPending: {
    color: '#B45309',
    fontWeight: fontWeights.bold,
  },
  tabButtonTextReceived: {
    color: '#15803D',
    fontWeight: fontWeights.bold,
  },
  searchAndSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: fontSizes.sm,
    color: '#0F172A',
    paddingVertical: 0,
  },
  sortButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  emptyStateContainer: {
    marginTop: 40,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  medTitleContainer: {
    flex: 1,
  },
  medicineName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    lineHeight: 20,
  },
  manufacturerName: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeReceived: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextReceived: {
    color: '#15803D',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  mrNameText: {
    fontSize: fontSizes.xs,
    color: '#475569',
    fontWeight: fontWeights.medium,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: fontSizes.xs,
    color: '#94A3B8',
  },
  commercialBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  commercialMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValueBold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  schemePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  schemePillText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  discountText: {
    color: '#059669',
  },
  notesPreview: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  actionPillMarkReceived: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  actionPillRevert: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  actionPillTextReceived: {
    color: '#15803D',
  },
  actionPillTextRevert: {
    color: '#64748B',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  callActionText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  detailsChevronButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  detailsChevronText: {
    fontSize: fontSizes.xs,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  sortOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sortOptionItemSelected: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
  },
  sortOptionText: {
    fontSize: fontSizes.sm,
    color: '#334155',
  },
  sortOptionTextSelected: {
    color: '#15803D',
    fontWeight: fontWeights.bold,
  },
});
