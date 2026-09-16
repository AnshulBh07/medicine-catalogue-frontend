import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
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
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontSizes, fontWeights, spacing, theme } from '../../theme';
import type { PublicManufacturer } from '../../types/models';
import { ManufacturerDetailsModal } from './ManufacturerDetailsModal';
import { ManufacturerFormModal } from './ManufacturerFormModal';

type ActiveFilter = 'active' | 'inactive' | 'all';
type MedicineCountFilter = 'all' | 'has_medicines' | 'no_medicines';
type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'oldest'
  | 'medicines_high'
  | 'medicines_low';

const SORT_OPTIONS: Array<{ key: SortOption; label: string; icon: string }> = [
  { key: 'name_asc', label: 'Name (A to Z)', icon: 'alphabetical' },
  { key: 'name_desc', label: 'Name (Z to A)', icon: 'alphabetical-variant' },
  { key: 'newest', label: 'Newest First', icon: 'clock-outline' },
  { key: 'oldest', label: 'Oldest First', icon: 'history' },
  { key: 'medicines_high', label: 'Medicines Count (High to Low)', icon: 'capsule' },
  { key: 'medicines_low', label: 'Medicines Count (Low to High)', icon: 'capsule' },
];

export const ManufacturersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();

  const [manufacturers, setManufacturers] = useState<PublicManufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filters & Sort
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [medFilter, setMedFilter] = useState<MedicineCountFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  // Details Modal
  const [selectedMfgForDetails, setSelectedMfgForDetails] = useState<PublicManufacturer | null>(
    null,
  );
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);

  // Add / Edit Modal
  const [selectedMfgForEdit, setSelectedMfgForEdit] = useState<PublicManufacturer | null>(null);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);

  // Delete / Deactivate state
  const [targetMfg, setTargetMfg] = useState<PublicManufacturer | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchManufacturers = useCallback(
    async (
      searchQuery: string,
      status: ActiveFilter,
      medicinesFilter: MedicineCountFilter,
      sort: SortOption,
    ) => {
      try {
        if (isMountedRef.current) {
          setIsLoading(true);
          setErrorMessage(null);
        }

        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }
        if (status !== 'all') {
          params.append('active', status);
        } else {
          params.append('active', 'all');
          params.append('includeInactive', 'true');
        }

        if (medicinesFilter === 'has_medicines') {
          params.append('hasMedicines', 'true');
        } else if (medicinesFilter === 'no_medicines') {
          params.append('hasMedicines', 'false');
        }

        params.append('sortBy', sort);

        const url = `/manufacturers?${params.toString()}`;
        const response = await apiClient.get<{ manufacturers: PublicManufacturer[] }>(url);

        if (isMountedRef.current) {
          if (response && Array.isArray(response.manufacturers)) {
            setManufacturers(response.manufacturers);
          }
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch manufacturers';
          setErrorMessage(msg);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchManufacturers(search, activeFilter, medFilter, sortOption);
  }, [fetchManufacturers, activeFilter, medFilter, sortOption]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchManufacturers(text, activeFilter, medFilter, sortOption);
    }, 200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchManufacturers(search, activeFilter, medFilter, sortOption);
  };

  const handleCardPress = (item: PublicManufacturer) => {
    setSelectedMfgForDetails(item);
    setIsDetailsModalVisible(true);
  };

  const handleOpenAddModal = () => {
    setSelectedMfgForEdit(null);
    setIsFormModalVisible(true);
  };

  const handleOpenEditModal = (item: PublicManufacturer) => {
    setSelectedMfgForEdit(item);
    setIsFormModalVisible(true);
  };

  const handleFormSuccess = () => {
    fetchManufacturers(search, activeFilter, medFilter, sortOption);
  };

  const handleDeletePress = (item: PublicManufacturer) => {
    setTargetMfg(item);
    const count = item.medicinesCount ?? 0;
    if (count > 0) {
      setIsDeactivateConfirmOpen(true);
    } else {
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!targetMfg || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.delete(`/manufacturers/${targetMfg.id}?permanent=true`);
      setIsDeleteConfirmOpen(false);
      setTargetMfg(null);
      fetchManufacturers(search, activeFilter, medFilter, sortOption);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete manufacturer';
      Alert.alert('Cannot Delete Manufacturer', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!targetMfg || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/manufacturers/${targetMfg.id}`, { active: false });
      setIsDeactivateConfirmOpen(false);
      setTargetMfg(null);
      fetchManufacturers(search, activeFilter, medFilter, sortOption);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate manufacturer';
      Alert.alert('Error', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = manufacturers.length;
    const active = manufacturers.filter((m) => m.active).length;
    const inactive = total - active;
    const withMeds = manufacturers.filter((m) => (m.medicinesCount ?? 0) > 0).length;
    return { total, active, inactive, withMeds };
  }, [manufacturers]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((s) => s.key === sortOption)?.label || 'Name (A to Z)',
    [sortOption],
  );

  return (
    <AppScreen
      headerProps={{
        title: 'Manufacturers',
        subtitle: 'Pharmaceutical Producers',
        showBack: true,
        onBack: () => navigation.goBack(),
        rightIcon: 'filter',
        onRightPress: () => setIsSortModalVisible(true),
      }}
      scrollable={false}
    >
      {/* 1. Search Bar */}
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search manufacturers by name..."
        testID="mfg-search-input"
        style={styles.searchBar}
      />

      {/* 2. Filters & Sort Row */}
      <View style={styles.toolbarContainer}>
        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'active' && styles.filterPillActive]}
            onPress={() => setActiveFilter('active')}
            testID="filter-active-mfg"
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'active' && styles.filterPillTextActive,
              ]}
            >
              Active ({stats.active})
            </Text>
          </TouchableOpacity>

          {isAdmin ? (
            <>
              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'inactive' && styles.filterPillActive]}
                onPress={() => setActiveFilter('inactive')}
                testID="filter-inactive-mfg"
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'inactive' && styles.filterPillTextActive,
                  ]}
                >
                  Inactive ({stats.inactive})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                onPress={() => setActiveFilter('all')}
                testID="filter-all-mfg"
              >
                <Text
                  style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}
                >
                  All Status ({stats.total})
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {/* Medicine Count Filter */}
          <View style={styles.filterDivider} />

          <TouchableOpacity
            style={[styles.filterPill, medFilter === 'all' && styles.filterPillActive]}
            onPress={() => setMedFilter('all')}
            testID="filter-meds-all"
          >
            <Text
              style={[styles.filterPillText, medFilter === 'all' && styles.filterPillTextActive]}
            >
              All Meds
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, medFilter === 'has_medicines' && styles.filterPillActive]}
            onPress={() => setMedFilter('has_medicines')}
            testID="filter-has-meds"
          >
            <Text
              style={[
                styles.filterPillText,
                medFilter === 'has_medicines' && styles.filterPillTextActive,
              ]}
            >
              Has Medicines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, medFilter === 'no_medicines' && styles.filterPillActive]}
            onPress={() => setMedFilter('no_medicines')}
            testID="filter-no-meds"
          >
            <Text
              style={[
                styles.filterPillText,
                medFilter === 'no_medicines' && styles.filterPillTextActive,
              ]}
            >
              No Medicines
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sort Trigger Button */}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setIsSortModalVisible(true)}
          activeOpacity={0.7}
          testID="mfg-sort-btn"
        >
          <Icon name="sort" size={14} color={colors.primary} />
          <Text style={styles.sortButtonText} numberOfLines={1}>
            {activeSortLabel}
          </Text>
          <Icon name="chevron-down" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 3. List Content */}
      <View style={styles.listWrapper}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <LoadingIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading manufacturers...</Text>
          </View>
        ) : errorMessage ? (
          <ErrorState
            title="Failed to Load"
            message={errorMessage}
            onRetry={handleRefresh}
            style={styles.errorState}
          />
        ) : manufacturers.length === 0 ? (
          <EmptyState
            icon="manufacturers"
            title="No Manufacturers Found"
            description={
              search.trim()
                ? `No manufacturers matching "${search}"`
                : 'No pharmaceutical producers available in catalogue.'
            }
            actionTitle={isAdmin ? 'Add Manufacturer' : undefined}
            onAction={isAdmin ? handleOpenAddModal : undefined}
            style={styles.emptyState}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollListContent}
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
            {manufacturers.map((item) => {
              const medCount = item.medicinesCount ?? 0;
              return (
                <Card
                  key={item.id}
                  style={styles.manufacturerCard}
                  testID={`mfg-card-${item.id}`}
                >
                  <TouchableOpacity
                    style={styles.cardClickArea}
                    onPress={() => handleCardPress(item)}
                    activeOpacity={0.7}
                    testID={`mfg-item-${item.id}`}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTitleContainer}>
                        <View style={styles.mfgIconCircle}>
                          <Icon name="manufacturers" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.titleColumn}>
                          <Text style={styles.mfgName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.mfgSubtitle}>Pharmaceutical Producer</Text>
                        </View>
                      </View>

                      {/* Badges */}
                      <View style={styles.cardBadges}>
                        <View
                          style={[
                            styles.statusBadge,
                            item.active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              item.active
                                ? styles.statusBadgeTextActive
                                : styles.statusBadgeTextInactive,
                            ]}
                          >
                            {item.active ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Stats & Actions Row */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.medCountTag}>
                        <Icon name="capsule" size={12} color="#059669" />
                        <Text style={styles.medCountTagText}>
                          {medCount} {medCount === 1 ? 'Medicine' : 'Medicines'}
                        </Text>
                      </View>

                      {/* Admin actions or Tap details hint */}
                      {isAdmin ? (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(item);
                            }}
                            accessibilityLabel={`Edit ${item.name}`}
                            testID={`edit-mfg-${item.id}`}
                          >
                            <Icon name="edit" size={15} color={colors.primary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionIconBtn, styles.deleteActionBtn]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeletePress(item);
                            }}
                            accessibilityLabel={`Delete or deactivate ${item.name}`}
                            testID={`delete-mfg-${item.id}`}
                          >
                            <Icon name="delete" size={15} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.viewDetailsRow}>
                          <Text style={styles.viewDetailsText}>View Details</Text>
                          <Icon name="chevron-right" size={14} color={colors.textSecondary} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 4. Floating Action Button for Admin */}
      {isAdmin ? (
        <FloatingActionButton
          onPress={handleOpenAddModal}
          accessibilityLabel="Add Manufacturer"
          testID="add-manufacturer-fab"
        />
      ) : null}

      {/* 5. Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
        testID="mfg-sort-modal"
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsSortModalVisible(false)}
          />
          <View style={styles.sortModalCard}>
            <View style={styles.sortModalHeader}>
              <View style={styles.sortModalTitleRow}>
                <Icon name="sort" size={18} color={colors.primary} />
                <Text style={styles.sortModalTitle}>Sort Manufacturers</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSortModalVisible(false)}
                style={styles.closeSortBtn}
                testID="close-sort-modal-btn"
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sortOptionsList}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortOption === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortOptionItem,
                      isSelected && styles.sortOptionItemSelected,
                    ]}
                    onPress={() => {
                      setSortOption(opt.key);
                      setIsSortModalVisible(false);
                    }}
                    testID={`sort-opt-${opt.key}`}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        isSelected && styles.sortOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected ? (
                      <Icon name="check" size={16} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Manufacturer Details Modal */}
      <ManufacturerDetailsModal
        visible={isDetailsModalVisible}
        manufacturerId={selectedMfgForDetails?.id || null}
        initialManufacturer={selectedMfgForDetails}
        onClose={() => {
          setIsDetailsModalVisible(false);
          setSelectedMfgForDetails(null);
        }}
        onEdit={(mfg) => handleOpenEditModal(mfg)}
        onDelete={(mfg) => handleDeletePress(mfg)}
        isAdmin={isAdmin}
      />

      {/* 7. Add / Edit Modal */}
      <ManufacturerFormModal
        visible={isFormModalVisible}
        manufacturer={selectedMfgForEdit}
        onClose={() => {
          setIsFormModalVisible(false);
          setSelectedMfgForEdit(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* 8. Safe Deactivate Dialog for Used Manufacturer */}
      <ConfirmDialog
        visible={isDeactivateConfirmOpen}
        title="Manufacturer In Use"
        message={`"${targetMfg?.name}" is associated with ${targetMfg?.medicinesCount ?? 0} medicine(s) in the catalogue. It cannot be permanently deleted.\n\nWould you like to deactivate this manufacturer instead?`}
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          setIsDeactivateConfirmOpen(false);
          setTargetMfg(null);
        }}
        loading={isActionLoading}
        isDestructive={false}
        testID="deactivate-mfg-dialog"
      />

      {/* 9. Permanent Delete Dialog for Unused Manufacturer */}
      <ConfirmDialog
        visible={isDeleteConfirmOpen}
        title="Delete Manufacturer?"
        message={`Are you sure you want to permanently delete "${targetMfg?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setTargetMfg(null);
        }}
        loading={isActionLoading}
        isDestructive={true}
        testID="delete-mfg-dialog"
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: spacing.xs,
  },
  toolbarContainer: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
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
  filterDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginHorizontal: spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  sortButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    maxWidth: 220,
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
  scrollListContent: {
    paddingBottom: spacing.xxl + 40,
    gap: spacing.sm,
  },
  manufacturerCard: {
    padding: 0,
    overflow: 'hidden',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  cardClickArea: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  mfgIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  mfgName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  mfgSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: colors.primary,
  },
  statusBadgeTextInactive: {
    color: colors.textMuted,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  medCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  medCountTagText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionBtn: {
    backgroundColor: '#FEF2F2',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
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
  sortModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sortModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortModalTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  closeSortBtn: {
    padding: spacing.xs,
  },
  sortOptionsList: {
    padding: spacing.sm,
    gap: 4,
  },
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  sortOptionItemSelected: {
    backgroundColor: '#ECFDF5',
  },
  sortOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  sortOptionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
});
