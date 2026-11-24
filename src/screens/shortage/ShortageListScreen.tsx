import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
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
  Icon,
  LoadingIndicator,
} from '../../components';
import { shortageService } from '../../services/shortageService';
import { colors, fontWeights, theme } from '../../theme';
import type { DailyShortageResult, ShortageItem, ShortageStatus } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatShortageQuantity } from '../../utils/shortage.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ShortageListRouteProp = RouteProp<RootStackParamList, 'ShortageNotebook'>;

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

function getUtcTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): { formatted: string; subtitle: string; isToday: boolean } {
  const todayStr = getUtcTodayStr();
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  const formatted = `${d} ${MONTH_NAMES[m]} ${y}`;
  const isToday = dateStr === todayStr;
  const subtitle = isToday ? 'Today' : new Date(Date.UTC(y, m, d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

  return { formatted, subtitle, isToday };
}

function shiftDateByDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const newYear = dt.getUTCFullYear();
  const newMonth = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const newDay = String(dt.getUTCDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

export const ShortageListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ShortageListRouteProp>();

  const [selectedDate, setSelectedDate] = useState<string>(
    route.params?.initialDate || getUtcTodayStr(),
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [data, setData] = useState<DailyShortageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Month Picker modal state
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);

  const isMountedRef = React.useRef<boolean>(true);
  const requestSeqRef = React.useRef<number>(0);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchShortages = useCallback(
    async (isRefresh = false) => {
      const requestSeq = ++requestSeqRef.current;
      try {
        if (isMountedRef.current) {
          if (isRefresh) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }
          setError(null);
        }
        const result = await shortageService.getDailyShortages(
          selectedDate,
          debouncedSearchQuery.trim() || undefined,
        );
        if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;
        setData(result);
      } catch (err) {
        if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;
        const msg = err instanceof Error ? err.message : 'Failed to load shortage list';
        setError(msg);
      } finally {
        if (isMountedRef.current && requestSeq === requestSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [selectedDate, debouncedSearchQuery],
  );

  useFocusEffect(
    useCallback(() => {
      fetchShortages();
    }, [fetchShortages]),
  );

  const { formatted, subtitle, isToday } = useMemo(
    () => formatDateDisplay(selectedDate),
    [selectedDate],
  );

  const pendingItems = useMemo(
    () => (data?.items || []).filter((item) => item.status === 'PENDING'),
    [data?.items],
  );

  const orderedItems = useMemo(
    () => (data?.items || []).filter((item) => item.status === 'ORDERED'),
    [data?.items],
  );

  const completedItems = useMemo(
    () => (data?.items || []).filter((item) => item.status === 'COMPLETED'),
    [data?.items],
  );

  const summary = data?.summary || { total: 0, pending: 0, ordered: 0, completed: 0 };

  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftDateByDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => shiftDateByDays(prev, 1));
  };

  const handleJumpToToday = () => {
    setSelectedDate(getUtcTodayStr());
    setShowDatePickerModal(false);
  };

  const renderStatusBadge = (status: ShortageStatus) => {
    let badgeText = 'Pending';
    let badgeStyle = styles.badgePending;
    let textStyle = styles.badgeTextPending;

    if (status === 'ORDERED') {
      badgeText = 'Ordered';
      badgeStyle = styles.badgeOrdered;
      textStyle = styles.badgeTextOrdered;
    } else if (status === 'COMPLETED') {
      badgeText = 'Completed';
      badgeStyle = styles.badgeCompleted;
      textStyle = styles.badgeTextCompleted;
    }

    return (
      <View style={[styles.statusBadge, badgeStyle]}>
        <Text style={[styles.statusBadgeText, textStyle]}>{badgeText}</Text>
      </View>
    );
  };

  const renderMedicineCard = (item: ShortageItem) => {
    const isOrderedOrCompleted = item.status === 'ORDERED' || item.status === 'COMPLETED';
    const qtyLabel = isOrderedOrCompleted ? 'Qty ordered' : 'Qty to order';
    const formattedQty = formatShortageQuantity(item.quantity, item.unit);
    const addedByName = item.createdBy?.name ? `Added by ${item.createdBy.name}` : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.medicineCard}
        onPress={() => navigation.navigate('ShortageDetails', { shortageId: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.medicine.name}, ${formattedQty}, ${item.status}`}
        testID={`shortage-item-${item.id}`}
      >
        {/* Left Medicine Image */}
        <View style={styles.imageContainer}>
          {item.medicine.imageUrl ? (
            <Image
              source={{ uri: item.medicine.imageUrl }}
              style={styles.medicineImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="capsule" size={24} color="#059669" />
            </View>
          )}
        </View>

        {/* Center Details */}
        <View style={styles.cardCenter}>
          <Text style={styles.medicineName} numberOfLines={1}>
            {item.medicine.name}
          </Text>
          <Text style={styles.manufacturerName} numberOfLines={1}>
            {item.medicine.manufacturer.name}
          </Text>
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>{qtyLabel}</Text>
            <Text
              style={[
                styles.qtyValue,
                item.status === 'ORDERED'
                  ? styles.qtyOrderedValue
                  : item.status === 'COMPLETED'
                    ? styles.qtyCompletedValue
                    : styles.qtyPendingValue,
              ]}
            >
              {formattedQty}
            </Text>
          </View>
          {addedByName ? (
            <Text style={styles.addedByText} numberOfLines={1}>
              {addedByName}
            </Text>
          ) : null}
        </View>

        {/* Right Status Badge and Chevron */}
        <View style={styles.cardRight}>
          {renderStatusBadge(item.status)}
          <Icon name="chevron-right" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  const isPastDate = selectedDate < getUtcTodayStr();

  return (
    <AppScreen
      headerProps={{
        title: 'Daily Shortage Notebook',
        subtitle: "Today's medicines to order",
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
      contentContainerStyle={styles.screenContainer}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchShortages(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Date Navigation Bar */}
        <Card style={styles.dateCard} testID="shortage-date-card">
          <TouchableOpacity
            style={styles.dateNavArrow}
            onPress={handlePrevDay}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Previous Day"
            testID="shortage-date-prev"
          >
            <Icon name="chevron-left" size={20} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setShowDatePickerModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select Date"
          >
            <View style={styles.dateHeaderRow}>
              <Icon name="calendar" size={18} color="#059669" />
              <Text style={styles.dateMainText}>{formatted}</Text>
            </View>
            <Text style={[styles.dateSubText, isToday && styles.dateSubTextToday]}>
              {subtitle}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateNavArrow}
            onPress={handleNextDay}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Next Day"
            testID="shortage-date-next"
          >
            <Icon name="chevron-right" size={20} color="#475569" />
          </TouchableOpacity>
        </Card>

        {/* 4 Summary Counters */}
        <View style={styles.statsRow}>
          {/* Total Items */}
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>
              {summary.total}
            </Text>
            <View style={styles.statLabelRow}>
              <Icon name="document-text" size={14} color="#059669" />
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </Card>

          {/* Pending */}
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>
              {summary.pending}
            </Text>
            <View style={styles.statLabelRow}>
              <Icon name="time" size={14} color="#D97706" />
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </Card>

          {/* Ordered */}
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2563EB' }]}>
              {summary.ordered}
            </Text>
            <View style={styles.statLabelRow}>
              <Icon name="cube" size={14} color="#2563EB" />
              <Text style={styles.statLabel}>Ordered</Text>
            </View>
          </Card>

          {/* Completed */}
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {summary.completed}
            </Text>
            <View style={styles.statLabelRow}>
              <Icon name="check" size={14} color="#10B981" />
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </Card>
        </View>

        {/* Search Bar & Add Medicine Button */}
        <View style={styles.searchAndAddRow}>
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicine..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              returnKeyType="search"
              testID="shortage-search-input"
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

          {!isPastDate && (
            <TouchableOpacity
              style={styles.addMedicineBtn}
              onPress={() => navigation.navigate('AddShortageMedicine', { date: selectedDate })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add Medicine"
              testID="shortage-add-btn"
            >
              <Icon name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addMedicineBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content Body */}
        {isLoading && !isRefreshing ? (
          <LoadingIndicator message="Loading shortage notebook..." />
        ) : error ? (
          <ErrorState
            title="Failed to load shortage list"
            message={error}
            onRetry={() => fetchShortages()}
          />
        ) : (data?.items || []).length === 0 ? (
          <EmptyState
            icon="📋"
            title="No shortage items"
            description={
              searchQuery
                ? `No medicines match "${searchQuery}" for this date.`
                : isPastDate
                  ? `No medicines were recorded on the shortage list for ${formatted}.`
                  : `No medicines have been added to the shortage list for ${formatted}.`
            }
            actionTitle={isPastDate ? undefined : '+ Add Medicine'}
            onAction={isPastDate ? undefined : () => navigation.navigate('AddShortageMedicine', { date: selectedDate })}
            style={{ marginTop: 24 }}
          />
        ) : (
          <View style={styles.groupsContainer}>
            {/* PENDING SECTION */}
            {pendingItems.length > 0 && (
              <View style={styles.statusGroup}>
                <View style={styles.groupHeaderRow}>
                  <Text style={[styles.groupTitle, { color: '#D97706' }]}>
                    PENDING ({pendingItems.length})
                  </Text>
                </View>
                {pendingItems.map(renderMedicineCard)}
              </View>
            )}

            {/* ORDERED SECTION */}
            {orderedItems.length > 0 && (
              <View style={styles.statusGroup}>
                <View style={styles.groupHeaderRow}>
                  <Text style={[styles.groupTitle, { color: '#2563EB' }]}>
                    ORDERED ({orderedItems.length})
                  </Text>
                </View>
                {orderedItems.map(renderMedicineCard)}
              </View>
            )}

            {/* COMPLETED SECTION */}
            {completedItems.length > 0 && (
              <View style={styles.statusGroup}>
                <View style={styles.groupHeaderRow}>
                  <Text style={[styles.groupTitle, { color: '#059669' }]}>
                    COMPLETED ({completedItems.length})
                  </Text>
                </View>
                {completedItems.map(renderMedicineCard)}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Date Picker / Quick Jump Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePickerModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shortage Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePickerModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.modalOptionBtn, isToday && styles.modalOptionBtnActive]}
                onPress={handleJumpToToday}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={20} color={isToday ? '#059669' : '#475569'} />
                <Text
                  style={[styles.modalOptionText, isToday && styles.modalOptionTextActive]}
                >
                  Today ({formatDateDisplay(getUtcTodayStr()).formatted})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOptionBtn}
                onPress={() => {
                  setSelectedDate(shiftDateByDays(getUtcTodayStr(), -1));
                  setShowDatePickerModal(false);
                }}
                activeOpacity={0.7}
              >
                <Icon name="time" size={20} color="#475569" />
                <Text style={styles.modalOptionText}>
                  Yesterday ({formatDateDisplay(shiftDateByDays(getUtcTodayStr(), -1)).formatted})
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDatePickerModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerCalendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  dateNavArrow: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  dateSubText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: '#64748B',
    marginTop: 2,
  },
  dateSubTextToday: {
    color: '#059669',
    fontWeight: fontWeights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    marginBottom: 4,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#64748B',
  },
  searchAndAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  addMedicineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 4,
    ...theme.shadows.sm,
  },
  addMedicineBtnText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  groupsContainer: {
    gap: 16,
  },
  statusGroup: {
    gap: 8,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  cardCenter: {
    flex: 1,
    marginRight: 8,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  manufacturerName: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  addedByText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: fontWeights.medium,
  },
  qtyValue: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  qtyPendingValue: {
    color: '#059669',
  },
  qtyOrderedValue: {
    color: '#2563EB',
  },
  qtyCompletedValue: {
    color: '#10B981',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeTextPending: {
    color: '#B45309',
  },
  badgeOrdered: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  badgeTextOrdered: {
    color: '#1D4ED8',
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  badgeTextCompleted: {
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  modalBody: {
    gap: 10,
    marginBottom: 16,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  modalOptionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    color: '#334155',
  },
  modalOptionTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  modalCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
});