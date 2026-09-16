import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { borderRadius, colors, fontWeights, spacing } from '../../theme';
import type { PublicSalt, SaltImpactReport } from '../../types/models';
import { SaltFormModal } from './SaltFormModal';

type ActiveFilter = 'active' | 'inactive' | 'all';

export const SaltsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();

  const [salts, setSalts] = useState<PublicSalt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

  // Add / Edit Modal state
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedSaltForEdit, setSelectedSaltForEdit] = useState<PublicSalt | null>(null);

  // Delete & Dependency Dialog state
  const [targetSalt, setTargetSalt] = useState<PublicSalt | null>(null);
  const [targetImpact, setTargetImpact] = useState<SaltImpactReport | null>(null);
  const [isUnusedConfirmDialogOpen, setIsUnusedConfirmDialogOpen] = useState(false);
  const [isDependencyDialogOpen, setIsDependencyDialogOpen] = useState(false);
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

  const fetchSalts = useCallback(async (searchQuery: string, filter: ActiveFilter) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('active', filter);

      const url = `/salts?${params.toString()}`;
      const response = await apiClient.get<{ salts: PublicSalt[] }>(url);

      if (isMountedRef.current) {
        if (response && Array.isArray(response.salts)) {
          setSalts(response.salts);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch active salts';
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
    fetchSalts(search, activeFilter);
  }, [fetchSalts, activeFilter]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchSalts(text, activeFilter);
    }, 200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalts(search, activeFilter);
  };

  const handleOpenAddModal = () => {
    setSelectedSaltForEdit(null);
    setIsFormModalVisible(true);
  };

  const handleOpenEditModal = (item: PublicSalt) => {
    setSelectedSaltForEdit(item);
    setIsFormModalVisible(true);
  };

  const handleFormSuccess = () => {
    fetchSalts(search, activeFilter);
  };

  const handleDeletePress = async (item: PublicSalt) => {
    setTargetSalt(item);
    setIsActionLoading(true);
    try {
      const res = await apiClient.get<{ impact: SaltImpactReport }>(`/salts/${item.id}/impact`);
      const impact = res.impact;
      setTargetImpact(impact);

      if (impact.compositionsCount > 0 || impact.medicinesCount > 0) {
        setIsDependencyDialogOpen(true);
      } else {
        setIsUnusedConfirmDialogOpen(true);
      }
    } catch {
      // Fallback to direct count inspection
      if ((item.compositionsCount ?? 0) > 0 || (item.medicinesCount ?? 0) > 0) {
        setIsDependencyDialogOpen(true);
      } else {
        setIsUnusedConfirmDialogOpen(true);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Hard Delete Unused Salt
  const handleConfirmHardDelete = async () => {
    if (!targetSalt || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.delete(`/salts/${targetSalt.id}`);
      setIsUnusedConfirmDialogOpen(false);
      setTargetSalt(null);
      setTargetImpact(null);
      fetchSalts(search, activeFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete salt';
      Alert.alert('Cannot Delete Salt', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Safe Deactivate Used Salt
  const handleConfirmDeactivate = async () => {
    if (!targetSalt || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/salts/${targetSalt.id}`, { active: false });
      setIsDependencyDialogOpen(false);
      setTargetSalt(null);
      setTargetImpact(null);
      fetchSalts(search, activeFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate salt';
      Alert.alert('Error', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = salts.length;
    const active = salts.filter((s) => s.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [salts]);

  return (
    <AppScreen
      headerProps={{
        title: 'Active Salts',
        subtitle: 'Active Pharmaceutical Ingredients (APIs)',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
    >
      {/* 1. Search Bar */}
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search active salts by name..."
        testID="salt-search-input"
        style={styles.searchBar}
      />

      {/* 2. Filter & Stats Bar */}
      <View style={styles.toolbarRow}>
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'active' && styles.filterPillActive]}
            onPress={() => setActiveFilter('active')}
            testID="filter-active-salts"
          >
            <Text style={[styles.filterPillText, activeFilter === 'active' && styles.filterPillTextActive]}>
              Active ({stats.active})
            </Text>
          </TouchableOpacity>

          {isAdmin ? (
            <>
              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'inactive' && styles.filterPillActive]}
                onPress={() => setActiveFilter('inactive')}
                testID="filter-inactive-salts"
              >
                <Text style={[styles.filterPillText, activeFilter === 'inactive' && styles.filterPillTextActive]}>
                  Inactive ({stats.inactive})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                onPress={() => setActiveFilter('all')}
                testID="filter-all-salts"
              >
                <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                  All ({stats.total})
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <Text style={styles.totalCountText}>
          {salts.length} {salts.length === 1 ? 'Salt' : 'Salts'}
        </Text>
      </View>

      {/* 3. Salt List */}
      {isLoading ? (
        <LoadingIndicator message="Loading active salts..." />
      ) : errorMessage && salts.length === 0 ? (
        <ErrorState
          title="Error Loading Salts"
          message={errorMessage}
          onRetry={() => fetchSalts(search, activeFilter)}
        />
      ) : salts.length === 0 ? (
        <EmptyState
          title="No Salts Found"
          description={
            search
              ? `No active salts matching "${search}".`
              : activeFilter === 'inactive'
              ? 'There are no inactive salts.'
              : 'No active pharmaceutical ingredients registered yet.'
          }
          actionTitle={isAdmin && !search ? 'Add Active Salt' : undefined}
          onAction={isAdmin && !search ? handleOpenAddModal : undefined}
        />
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.cardsGrid}>
            {salts.map((item) => {
              const inUse = (item.compositionsCount ?? 0) > 0 || (item.medicinesCount ?? 0) > 0;
              return (
                <View
                  key={item.id}
                  style={[styles.saltCard, !item.active && styles.saltCardInactive]}
                  testID={`salt-card-${item.id}`}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconCircle}>
                        <Icon name="salts" size={16} color={item.active ? colors.primary : colors.textMuted} />
                      </View>
                      <Text style={[styles.saltName, !item.active && styles.textInactive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {!item.active ? (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      ) : null}
                    </View>

                    {item.description ? (
                      <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">
                        {item.description}
                      </Text>
                    ) : null}

                    {/* Hierarchy Stats Badges */}
                    <View style={styles.metaRow}>
                      <View style={styles.statTag}>
                        <Icon name="compositions" size={11} color="#0284C7" />
                        <Text style={styles.statTagText}>
                          {item.compositionsCount ?? 0} {item.compositionsCount === 1 ? 'Composition' : 'Compositions'}
                        </Text>
                      </View>

                      <View style={styles.statTag}>
                        <Icon name="medicines" size={11} color="#059669" />
                        <Text style={styles.statTagText}>
                          {item.medicinesCount ?? 0} {item.medicinesCount === 1 ? 'Medicine' : 'Medicines'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions Column (Edit / Delete for Admin) */}
                  {isAdmin ? (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleOpenEditModal(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${item.name}`}
                        testID={`edit-salt-${item.id}`}
                        activeOpacity={0.7}
                      >
                        <Icon name="edit" size={15} color="#475569" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionIconButton,
                          styles.deleteIconButton,
                          inUse && styles.deleteIconButtonProtected,
                        ]}
                        onPress={() => handleDeletePress(item)}
                        accessibilityRole="button"
                        accessibilityLabel={inUse ? `Dependency protected: Delete or Deactivate ${item.name}` : `Delete ${item.name}`}
                        testID={`delete-salt-${item.id}`}
                        activeOpacity={0.7}
                      >
                        <Icon name={inUse ? 'warning' : 'delete'} size={15} color={inUse ? '#D97706' : colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Floating Action Button (Add Salt) */}
      {isAdmin ? (
        <FloatingActionButton
          onPress={handleOpenAddModal}
          accessibilityLabel="Add Active Salt"
          testID="add-salt-fab"
        />
      ) : null}

      {/* Add / Edit Salt Modal */}
      {isFormModalVisible ? (
        <SaltFormModal
          visible={isFormModalVisible}
          salt={selectedSaltForEdit}
          onClose={() => setIsFormModalVisible(false)}
          onSuccess={handleFormSuccess}
        />
      ) : null}

      {/* 1. Unused Salt Hard Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={isUnusedConfirmDialogOpen}
        title={targetSalt ? `Delete "${targetSalt.name}"?` : 'Delete Salt?'}
        message={
          targetSalt
            ? `"${targetSalt.name}" is not currently used by any compositions or medicines and can be safely removed permanently.`
            : 'This salt is unused and can be safely removed.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={isActionLoading}
        onConfirm={handleConfirmHardDelete}
        onCancel={() => {
          setIsUnusedConfirmDialogOpen(false);
          setTargetSalt(null);
          setTargetImpact(null);
        }}
        testID="confirm-delete-salt-dialog"
      />

      {/* 2. Used Salt Dependency-Aware Deactivation Dialog */}
      <ConfirmDialog
        visible={isDependencyDialogOpen}
        title={targetSalt ? `Cannot Delete "${targetSalt.name}"` : 'Cannot Delete Salt'}
        message={
          targetSalt
            ? `This salt is currently used by:\n\n• ${targetImpact?.compositionsCount ?? targetSalt.compositionsCount ?? 0} composition(s)\n• ${targetImpact?.medicinesCount ?? targetSalt.medicinesCount ?? 0} medicine(s)\n\nDeleting it would break existing catalogue relationships. You can deactivate this salt instead so it cannot be selected for new medicines while preserving existing catalogue records.`
            : 'This salt is currently in use and cannot be deleted. You can deactivate it instead.'
        }
        confirmText="Deactivate"
        cancelText="Cancel"
        isDestructive={false}
        loading={isActionLoading}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          setIsDependencyDialogOpen(false);
          setTargetSalt(null);
          setTargetImpact(null);
        }}
        testID="dependency-dialog-salt"
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    height: 42,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeights.semibold,
  },
  totalCountText: {
    fontSize: 11.5,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl + 40,
  },
  cardsGrid: {
    gap: 8,
  },
  saltCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saltCardInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.85,
  },
  cardMain: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saltName: {
    fontSize: 14.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  textInactive: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  inactiveBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: fontWeights.medium,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteIconButtonProtected: {
    backgroundColor: '#FEF3C7',
  },
});
