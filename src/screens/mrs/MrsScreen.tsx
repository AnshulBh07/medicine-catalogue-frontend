import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  EmptyState,
  ErrorState,
  FilterButton,
  FloatingActionButton,
  Icon,
  INITIAL_MR_FILTERS,
  LoadingIndicator,
  MrFilterModal,
  MrSortModal,
  SearchInput,
  type MrFilters,
  type MrSortField,
  type MrSortOrder,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { PublicMr } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PastelPalette {
  bg: string;
  text: string;
}

const PASTEL_PALETTES: PastelPalette[] = [
  { bg: '#DCFCE7', text: '#15803D' }, // Light Green
  { bg: '#DBEAFE', text: '#1D4ED8' }, // Light Blue
  { bg: '#F3E8FF', text: '#7E22CE' }, // Light Purple
  { bg: '#FEF3C7', text: '#B45309' }, // Light Amber/Orange
  { bg: '#CCFBF1', text: '#0F766E' }, // Light Teal
  { bg: '#FFE4E6', text: '#BE123C' }, // Light Rose
  { bg: '#E0E7FF', text: '#4338CA' }, // Light Indigo
  { bg: '#FFEDD5', text: '#C2410C' }, // Light Orange
];

const getPastelForName = (name: string): PastelPalette => {
  if (!name) return PASTEL_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
};

const getMrInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const MrsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  // State
  const [search, setSearch] = useState('');
  const [mrs, setMrs] = useState<PublicMr[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Sorting State
  const [filters, setFilters] = useState<MrFilters>(INITIAL_MR_FILTERS);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<MrSortField>('name');
  const [sortOrder, setSortOrder] = useState<MrSortOrder>('asc');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // Fetch MR list from server
  const fetchMrs = useCallback(
    async (
      searchQuery: string = search,
      currentFilters: MrFilters = filters,
      currentSortBy: MrSortField = sortBy,
      currentSortOrder: MrSortOrder = sortOrder,
    ) => {
      try {
        setErrorMessage(null);
        const params = new URLSearchParams();

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        if (currentFilters.company.trim()) {
          params.append('company', currentFilters.company.trim());
        }

        if (currentFilters.includeInactive) {
          params.append('includeInactive', 'true');
        }

        params.append('sortBy', currentSortBy);
        params.append('sortOrder', currentSortOrder);

        const response = await apiClient.get<{ mrs: PublicMr[] }>(`/mrs?${params.toString()}`);
        if (isMountedRef.current) {
          if (response && Array.isArray(response.mrs)) {
            setMrs(response.mrs);
          } else {
            setMrs([]);
          }
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to load representatives';
          setErrorMessage(msg);
          setMrs([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    },
    [search, filters, sortBy, sortOrder],
  );

  // Initial load
  useEffect(() => {
    fetchMrs(search, filters, sortBy, sortOrder);
  }, [filters, sortBy, sortOrder]);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchMrs();
    });
    return unsubscribe;
  }, [navigation, fetchMrs]);

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchMrs(text, filters, sortBy, sortOrder);
    }, 200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMrs(search, filters, sortBy, sortOrder);
  };

  // Client-side filtering for Contact filter (`HAS_PHONE`, `HAS_EMAIL`)
  const displayedMrs = useMemo(() => {
    return mrs.filter((mr) => {
      if (filters.contact === 'HAS_PHONE' && !mr.phone?.trim()) return false;
      if (filters.contact === 'HAS_EMAIL' && !mr.email?.trim()) return false;
      return true;
    });
  }, [mrs, filters.contact]);

  // Available unique companies for filter recommendations
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    mrs.forEach((m) => {
      if (m.company?.trim()) set.add(m.company.trim());
    });
    return Array.from(set);
  }, [mrs]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.company.trim()) count++;
    if (filters.contact !== 'ALL') count++;
    if (filters.includeInactive) count++;
    return count;
  }, [filters]);

  const isNonDefaultSort = sortBy !== 'name' || sortOrder !== 'asc';

  const handleApplyFilters = (newFilters: MrFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_MR_FILTERS);
    setSearch('');
  };

  const handleApplySort = (newSortBy: MrSortField, newSortOrder: MrSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  return (
    <AppScreen
      headerProps={{
        title: 'MR Registry',
        subtitle: 'Medical Representatives Directory',
      }}
      scrollable={false}
    >
      {/* 1. Full-Width Search Bar */}
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search MR, medicine, phone, email or company..."
        testID="mr-search-input"
        style={styles.searchBar}
      />

      {/* 2. Action Toolbar: Count summary on Left, Filter & Sort Actions on Right */}
      <View style={styles.toolbarRow}>
        <View style={styles.countSummary}>
          <Text style={styles.countSummaryText}>
            {displayedMrs.length} {displayedMrs.length === 1 ? 'Representative' : 'Representatives'}
          </Text>
        </View>

        <View style={styles.toolbarActions}>
          <FilterButton
            variant="pill"
            activeCount={activeFilterCount}
            onPress={() => setIsFilterModalVisible(true)}
            testID="open-mr-filter-modal-button"
            style={styles.filterPill}
          />
          <TouchableOpacity
            style={[
              styles.sortPill,
              isNonDefaultSort && styles.sortPillActive,
            ]}
            onPress={() => setIsSortModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sort Medical Representatives${isNonDefaultSort ? `, active: ${sortBy} ${sortOrder}` : ''}`}
            testID="open-mr-sort-modal-button"
            activeOpacity={0.7}
          >
            <Icon
              name="sort"
              size={14}
              color={isNonDefaultSort ? colors.textInverse : colors.textSecondary}
            />
            <Text
              style={[
                styles.sortPillText,
                isNonDefaultSort && styles.sortPillTextActive,
              ]}
            >
              Sort
            </Text>
            {isNonDefaultSort ? <View style={styles.sortActiveDot} /> : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Active Filter Chips Bar */}
      {activeFilterCount > 0 ? (
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {filters.company ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Company: {filters.company}</Text>
                <TouchableOpacity
                  onPress={() => setFilters((p) => ({ ...p, company: '' }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="remove-mr-company-chip"
                >
                  <Icon name="close" size={11} color="#064E3B" />
                </TouchableOpacity>
              </View>
            ) : null}

            {filters.contact !== 'ALL' ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {filters.contact === 'HAS_PHONE' ? 'Has Phone' : 'Has Email'}
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters((p) => ({ ...p, contact: 'ALL' }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="remove-mr-contact-chip"
                >
                  <Icon name="close" size={11} color="#064E3B" />
                </TouchableOpacity>
              </View>
            ) : null}

            {filters.includeInactive ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Include Inactive</Text>
                <TouchableOpacity
                  onPress={() => setFilters((p) => ({ ...p, includeInactive: false }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="remove-mr-inactive-chip"
                >
                  <Icon name="close" size={11} color="#064E3B" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={handleResetFilters}
              testID="clear-all-mr-chips"
            >
              <Text style={styles.clearAllChipText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      {/* 4. Main Content Area */}
      {isLoading ? (
        <LoadingIndicator message="Loading medical representatives..." />
      ) : errorMessage && displayedMrs.length === 0 ? (
        <ErrorState
          title="Error Loading Representatives"
          message={errorMessage}
          onRetry={() => fetchMrs(search, filters, sortBy, sortOrder)}
        />
      ) : displayedMrs.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No Representatives Found"
          description={
            search || activeFilterCount > 0
              ? 'Try adjusting your search query or removing filters.'
              : 'No medical representatives registered yet. Tap + to add one.'
          }
          actionTitle={search || activeFilterCount > 0 ? 'Reset Filters' : 'Add Representative'}
          onAction={
            search || activeFilterCount > 0
              ? handleResetFilters
              : () => navigation.navigate('AddMr')
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          testID="mr-list-scroll"
        >
          <View style={styles.cardsList}>
            {displayedMrs.map((item) => {
              const initials = getMrInitials(item.name);
              const pastel = getPastelForName(item.name || item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.mrCard}
                  onPress={() => navigation.navigate('MrDetails', { id: item.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                  testID={`mr-card-${item.id}`}
                  activeOpacity={0.7}
                >
                  {/* Compact Initials Avatar (38px) */}
                  <View style={[styles.avatarCircle, { backgroundColor: pastel.bg }]}>
                    <Text style={[styles.avatarText, { color: pastel.text }]}>
                      {initials}
                    </Text>
                  </View>

                  {/* Main Information Column */}
                  <View style={styles.cardMain}>
                    <Text style={styles.mrNameText} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>

                    {item.company ? (
                      <Text style={styles.mrCompanyText} numberOfLines={1} ellipsizeMode="tail">
                        {item.company}
                      </Text>
                    ) : null}

                    {/* Metadata Row: Phone & Medicine Count (NO email) */}
                    <View style={styles.metaRow}>
                      {item.phone ? (
                        <View style={styles.phoneItem}>
                          <View style={styles.phoneIconCircle}>
                            <Icon name="phone" size={10} color="#059669" />
                          </View>
                          <Text style={styles.phoneText} numberOfLines={1} ellipsizeMode="tail">
                            {item.phone}
                          </Text>
                        </View>
                      ) : null}

                      {item.medicinesCount !== undefined && item.medicinesCount > 0 ? (
                        <View style={styles.medCountTag}>
                          <Icon name="medicines" size={10} color="#047857" />
                          <Text style={styles.medCountText}>
                            {item.medicinesCount} {item.medicinesCount === 1 ? 'Med' : 'Meds'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Right Column: Status Badge & Chevron */}
                  <View style={styles.cardRightColumn}>
                    {!item.active ? (
                      <View style={styles.inactiveBadge}>
                        <View style={styles.inactiveDot} />
                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                      </View>
                    ) : (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                    <Icon name="chevron-right" size={15} color="#94A3B8" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button to Add MR */}
      <FloatingActionButton
        onPress={() => navigation.navigate('AddMr')}
        accessibilityLabel="Add Medical Representative"
        testID="add-mr-fab"
      />

      {/* Advanced Filter Modal */}
      <MrFilterModal
        visible={isFilterModalVisible}
        filters={filters}
        isAdmin={isAdmin}
        availableCompanies={availableCompanies}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onClose={() => setIsFilterModalVisible(false)}
      />

      {/* Sort Modal */}
      <MrSortModal
        visible={isSortModalVisible}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onApply={handleApplySort}
        onClose={() => setIsSortModalVisible(false)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    height: 42,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  countSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countSummaryText: {
    fontSize: 11.5,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.full,
  },
  sortPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortPillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sortPillTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeights.semibold,
  },
  sortActiveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#FDE047',
  },
  chipsContainer: {
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#064E3B',
    lineHeight: 14,
  },
  clearAllChip: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  clearAllChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.error,
    lineHeight: 14,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
  },
  cardsList: {
    gap: 6,
  },
  mrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      } as object,
    }),
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    lineHeight: 17,
  },
  cardMain: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  mrNameText: {
    fontSize: 14.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  mrCompanyText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
    marginTop: 1,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  phoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneText: {
    fontSize: 11.5,
    fontWeight: fontWeights.medium,
    color: '#475569',
    lineHeight: 16,
  },
  medCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  medCountText: {
    fontSize: 10.5,
    fontWeight: fontWeights.semibold,
    color: '#166534',
    lineHeight: 14,
  },
  cardRightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#10B981',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: '#065F46',
    lineHeight: 13,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inactiveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#EF4444',
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: '#991B1B',
    lineHeight: 13,
  },
});
