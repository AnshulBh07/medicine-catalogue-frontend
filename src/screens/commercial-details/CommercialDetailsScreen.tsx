import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppScreen,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../theme';
import type { PublicMedicine } from '../../types/models';
import { CommercialDetailsModal } from './CommercialDetailsModal';

type CommercialFilter = 'all' | 'has_commercials' | 'missing_commercials';

export const CommercialDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();

  const [medicines, setMedicines] = useState<PublicMedicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<CommercialFilter>('all');

  // Selected Medicine Modal
  const [selectedMedicine, setSelectedMedicine] = useState<PublicMedicine | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchMedicines = useCallback(async (query: string) => {
    if (!isMountedRef.current) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.append('search', query.trim());
      }
      params.append('limit', '50');

      const url = `/medicines?${params.toString()}`;
      const response = await apiClient.get<{ medicines: PublicMedicine[] }>(url);

      if (isMountedRef.current) {
        if (response && Array.isArray(response.medicines)) {
          setMedicines(response.medicines);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch medicines';
        setErrorMessage(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchMedicines(search);
    }
  }, [fetchMedicines, isAdmin, search]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchMedicines(text);
    }, 250);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMedicines(search);
  };

  const handleSelectMedicine = (med: PublicMedicine) => {
    setSelectedMedicine(med);
    setIsModalVisible(true);
  };

  // Filtered Medicines list
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const hasCommercial = med.mrp !== null && med.mrp !== undefined;
      if (filter === 'has_commercials') return hasCommercial;
      if (filter === 'missing_commercials') return !hasCommercial;
      return true;
    });
  }, [medicines, filter]);

  const stats = useMemo(() => {
    const total = medicines.length;
    const withCommercial = medicines.filter((m) => m.mrp !== null && m.mrp !== undefined).length;
    const missing = total - withCommercial;
    return { total, withCommercial, missing };
  }, [medicines]);

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Commercial Details',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Commercial pricing details, purchase rates and trade schemes are strictly restricted to ADMIN accounts only."
          testID="commercial-access-restricted"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      headerProps={{
        title: 'Commercial Details',
        subtitle: 'Confidential Pricing & Schemes',
        showBack: true,
        onBack: () => navigation.goBack(),
        rightAction: <Badge label="Admin Only" variant="admin" />,
      }}
      scrollable={false}
    >
      {/* 1. Search Bar */}
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search medicines by name or manufacturer..."
        testID="commercial-search-input"
        style={styles.searchBar}
      />

      {/* 2. Filter Chips */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          onPress={() => setFilter('all')}
          testID="filter-all-commercial"
        >
          <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
            All Medicines ({stats.total})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'has_commercials' && styles.filterPillActive]}
          onPress={() => setFilter('has_commercials')}
          testID="filter-has-commercial"
        >
          <Text
            style={[
              styles.filterPillText,
              filter === 'has_commercials' && styles.filterPillTextActive,
            ]}
          >
            Commercial Added ({stats.withCommercial})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'missing_commercials' && styles.filterPillActive]}
          onPress={() => setFilter('missing_commercials')}
          testID="filter-missing-commercial"
        >
          <Text
            style={[
              styles.filterPillText,
              filter === 'missing_commercials' && styles.filterPillTextActive,
            ]}
          >
            Missing ({stats.missing})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Medicines List */}
      <View style={styles.listWrapper}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading catalogue commercial records...</Text>
          </View>
        ) : errorMessage ? (
          <ErrorState
            title="Failed to Load"
            message={errorMessage}
            onRetry={handleRefresh}
            style={styles.errorState}
          />
        ) : filteredMedicines.length === 0 ? (
          <EmptyState
            icon="medicine"
            title="No Medicines Found"
            description={
              search.trim()
                ? `No medicines matching "${search}"`
                : 'No medicines match the selected commercial filter.'
            }
            style={styles.emptyState}
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
            {filteredMedicines.map((med) => {
              const hasCommercial = med.mrp !== null && med.mrp !== undefined;
              return (
                <Card
                  key={med.id}
                  style={styles.medicineCard}
                  testID={`commercial-med-card-${med.id}`}
                >
                  <TouchableOpacity
                    style={styles.cardTouchArea}
                    onPress={() => handleSelectMedicine(med)}
                    activeOpacity={0.7}
                    testID={`commercial-med-item-${med.id}`}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.medTitleContainer}>
                        <View style={styles.medIconCircle}>
                          <Icon name="capsule" size={16} color="#059669" />
                        </View>
                        <View style={styles.medTitleCol}>
                          <Text style={styles.medName} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <Text style={styles.medManufacturer} numberOfLines={1}>
                            {med.manufacturer?.name || 'Unknown Manufacturer'}
                          </Text>
                        </View>
                      </View>

                      {/* Commercial Status Badge */}
                      <View
                        style={[
                          styles.commercialStatusBadge,
                          hasCommercial
                            ? styles.commercialStatusBadgeAdded
                            : styles.commercialStatusBadgeMissing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.commercialStatusText,
                            hasCommercial
                              ? styles.commercialStatusTextAdded
                              : styles.commercialStatusTextMissing,
                          ]}
                        >
                          {hasCommercial ? `MRP ₹${Number(med.mrp).toFixed(2)}` : 'Missing Rates'}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata & Scheme Row */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.formPackRow}>
                        <View style={styles.formTag}>
                          <Text style={styles.formTagText}>{med.form}</Text>
                        </View>
                        <Text style={styles.packText}>
                          {med.packQuantity} {med.packUnit.toLowerCase()}
                        </Text>
                      </View>

                      <View style={styles.actionHintRow}>
                        <Text style={styles.actionHintText}>
                          {hasCommercial ? 'View / Edit Pricing' : 'Add Pricing'}
                        </Text>
                        <Icon name="chevron-right" size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 4. Commercial Details Modal */}
      <CommercialDetailsModal
        visible={isModalVisible}
        medicine={selectedMedicine}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedMedicine(null);
        }}
        onSuccess={() => {
          fetchMedicines(search);
        }}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: spacing.xs,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  filterPillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  listWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  errorState: {
    marginTop: spacing.xl,
  },
  emptyState: {
    marginTop: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + 20,
    gap: spacing.sm,
  },
  medicineCard: {
    padding: 0,
    overflow: 'hidden',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  cardTouchArea: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  medIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medTitleCol: {
    flex: 1,
  },
  medName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  medManufacturer: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  commercialStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  commercialStatusBadgeAdded: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  commercialStatusBadgeMissing: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  commercialStatusText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  commercialStatusTextAdded: {
    color: '#047857',
  },
  commercialStatusTextMissing: {
    color: '#B45309',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  formPackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  formTagText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  packText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionHintText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});
