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
import type { CompositionImpactReport, PublicComposition } from '../../types/models';
import { CompositionFormModal } from './CompositionFormModal';

type ActiveFilter = 'active' | 'inactive' | 'all';

export const CompositionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();

  const [compositions, setCompositions] = useState<PublicComposition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

  // Add / Edit Modal state
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [selectedCompositionForEdit, setSelectedCompositionForEdit] = useState<PublicComposition | null>(null);

  // Delete & Dependency Dialog state
  const [targetComposition, setTargetComposition] = useState<PublicComposition | null>(null);
  const [targetImpact, setTargetImpact] = useState<CompositionImpactReport | null>(null);
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

  const fetchCompositions = useCallback(async (searchQuery: string, filter: ActiveFilter) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (filter === 'all' || filter === 'inactive') {
        params.append('includeInactive', 'true');
      }

      const url = `/compositions?${params.toString()}`;
      const response = await apiClient.get<{ compositions: PublicComposition[] }>(url);

      if (isMountedRef.current) {
        if (response && Array.isArray(response.compositions)) {
          let filtered = response.compositions;
          if (filter === 'inactive') {
            filtered = filtered.filter((c) => !c.active);
          } else if (filter === 'active') {
            filtered = filtered.filter((c) => c.active);
          }
          setCompositions(filtered);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch compositions';
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
    fetchCompositions(search, activeFilter);
  }, [fetchCompositions, activeFilter]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCompositions(text, activeFilter);
    }, 200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCompositions(search, activeFilter);
  };

  const handleOpenAddModal = () => {
    setSelectedCompositionForEdit(null);
    setIsFormModalVisible(true);
  };

  const handleOpenEditModal = (item: PublicComposition) => {
    setSelectedCompositionForEdit(item);
    setIsFormModalVisible(true);
  };

  const handleFormSuccess = () => {
    fetchCompositions(search, activeFilter);
  };

  const handleDeletePress = async (item: PublicComposition) => {
    setTargetComposition(item);
    setIsActionLoading(true);
    try {
      const res = await apiClient.get<{ impact: CompositionImpactReport }>(
        `/compositions/${item.id}/impact`,
      );
      const impact = res.impact;
      setTargetImpact(impact);

      if (impact.medicinesCount > 0) {
        setIsDependencyDialogOpen(true);
      } else {
        setIsUnusedConfirmDialogOpen(true);
      }
    } catch {
      if ((item.medicinesCount ?? 0) > 0) {
        setIsDependencyDialogOpen(true);
      } else {
        setIsUnusedConfirmDialogOpen(true);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Hard Delete Unused Composition
  const handleConfirmHardDelete = async () => {
    if (!targetComposition || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.delete(`/compositions/${targetComposition.id}`);
      setIsUnusedConfirmDialogOpen(false);
      setTargetComposition(null);
      setTargetImpact(null);
      fetchCompositions(search, activeFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete composition';
      Alert.alert('Cannot Delete Composition', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Safe Deactivate Used Composition
  const handleConfirmDeactivate = async () => {
    if (!targetComposition || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await apiClient.patch(`/compositions/${targetComposition.id}`, { active: false });
      setIsDependencyDialogOpen(false);
      setTargetComposition(null);
      setTargetImpact(null);
      fetchCompositions(search, activeFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate composition';
      Alert.alert('Error', msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = compositions.length;
    const active = compositions.filter((c) => c.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [compositions]);

  return (
    <AppScreen
      headerProps={{
        title: 'Compositions',
        subtitle: 'Multi-Salt Chemical Formulas',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
    >
      {/* 1. Search Bar */}
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search formulas by salt or ingredient..."
        testID="composition-search-input"
        style={styles.searchBar}
      />

      {/* 2. Filter & Stats Bar */}
      <View style={styles.toolbarRow}>
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'active' && styles.filterPillActive]}
            onPress={() => setActiveFilter('active')}
            testID="filter-active-compositions"
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
                testID="filter-inactive-compositions"
              >
                <Text style={[styles.filterPillText, activeFilter === 'inactive' && styles.filterPillTextActive]}>
                  Inactive ({stats.inactive})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                onPress={() => setActiveFilter('all')}
                testID="filter-all-compositions"
              >
                <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                  All ({stats.total})
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <Text style={styles.totalCountText}>
          {compositions.length} {compositions.length === 1 ? 'Formula' : 'Formulas'}
        </Text>
      </View>

      {/* 3. Compositions List */}
      {isLoading ? (
        <LoadingIndicator message="Loading chemical compositions..." />
      ) : errorMessage && compositions.length === 0 ? (
        <ErrorState
          title="Error Loading Compositions"
          message={errorMessage}
          onRetry={() => fetchCompositions(search, activeFilter)}
        />
      ) : compositions.length === 0 ? (
        <EmptyState
          title="No Compositions Found"
          description={
            search
              ? `No compositions matching "${search}".`
              : activeFilter === 'inactive'
              ? 'There are no inactive compositions.'
              : 'No chemical compositions registered yet.'
          }
          actionTitle={isAdmin && !search ? 'Add Composition' : undefined}
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
            {compositions.map((item) => {
              const inUse = (item.medicinesCount ?? 0) > 0;
              return (
                <View
                  key={item.id}
                  style={[styles.compCard, !item.active && styles.compCardInactive]}
                  testID={`composition-card-${item.id}`}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIconCircle}>
                        <Icon name="compositions" size={16} color={item.active ? colors.primary : colors.textMuted} />
                      </View>
                      <Text style={[styles.compDisplayText, !item.active && styles.textInactive]} numberOfLines={2}>
                        {item.displayText}
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

                    {/* Breakdown of Salts */}
                    {item.compositionSalts && item.compositionSalts.length > 0 ? (
                      <View style={styles.saltsBreakdownRow}>
                        {item.compositionSalts.map((cs) => (
                          <View key={cs.id} style={styles.saltChip}>
                            <Text style={styles.saltChipText}>
                              {cs.salt?.name || 'Salt'} • {cs.amount} {cs.unit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Hierarchy Stats Tags */}
                    <View style={styles.metaRow}>
                      <View style={styles.statTag}>
                        <Icon name="medicines" size={11} color="#059669" />
                        <Text style={styles.statTagText}>
                          {item.medicinesCount ?? 0} {item.medicinesCount === 1 ? 'Medicine' : 'Medicines'} linked
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
                        accessibilityLabel={`Edit ${item.displayText}`}
                        testID={`edit-composition-${item.id}`}
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
                        accessibilityLabel={inUse ? `Dependency protected: Delete or Deactivate ${item.displayText}` : `Delete ${item.displayText}`}
                        testID={`delete-composition-${item.id}`}
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

      {/* Floating Action Button (Add Composition) */}
      {isAdmin ? (
        <FloatingActionButton
          onPress={handleOpenAddModal}
          accessibilityLabel="Add Composition"
          testID="add-composition-fab"
        />
      ) : null}

      {/* Add / Edit Composition Modal */}
      {isFormModalVisible ? (
        <CompositionFormModal
          visible={isFormModalVisible}
          composition={selectedCompositionForEdit}
          onClose={() => setIsFormModalVisible(false)}
          onSuccess={handleFormSuccess}
        />
      ) : null}

      {/* 1. Unused Composition Hard Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={isUnusedConfirmDialogOpen}
        title="Delete Composition?"
        message={
          targetComposition
            ? `Formula "${targetComposition.displayText}" is not currently linked to any medicines and can be safely removed permanently.`
            : 'This composition formula is unused and can be safely removed.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={isActionLoading}
        onConfirm={handleConfirmHardDelete}
        onCancel={() => {
          setIsUnusedConfirmDialogOpen(false);
          setTargetComposition(null);
          setTargetImpact(null);
        }}
        testID="confirm-delete-composition-dialog"
      />

      {/* 2. Used Composition Dependency-Aware Deactivation Dialog */}
      <ConfirmDialog
        visible={isDependencyDialogOpen}
        title="Cannot Delete Composition"
        message={
          targetComposition
            ? `This formula is currently used by ${targetImpact?.medicinesCount ?? targetComposition.medicinesCount ?? 0} medicine(s).\n\nDeleting it would break existing catalogue records. You can deactivate this composition instead so it cannot be selected for new medicines while preserving existing catalogue records.`
            : 'This composition formula is currently in use and cannot be deleted. You can deactivate it instead.'
        }
        confirmText="Deactivate"
        cancelText="Cancel"
        isDestructive={false}
        loading={isActionLoading}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => {
          setIsDependencyDialogOpen(false);
          setTargetComposition(null);
          setTargetImpact(null);
        }}
        testID="dependency-dialog-composition"
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
  compCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compCardInactive: {
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
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compDisplayText: {
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
  saltsBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  saltChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saltChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: fontWeights.medium,
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
