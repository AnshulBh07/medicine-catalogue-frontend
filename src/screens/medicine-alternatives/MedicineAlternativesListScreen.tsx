import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  ConfirmDialog,
  EmptyState,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { medicineAlternativeService } from '../../services/medicineAlternativeService';
import { colors, fontWeights, spacing } from '../../theme';
import type { PublicAlternativeGroup } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MedicineAlternativesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  const [alternatives, setAlternatives] = useState<PublicAlternativeGroup[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeItemForMenu, setActiveItemForMenu] = useState<PublicAlternativeGroup | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PublicAlternativeGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlternatives = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const data = await medicineAlternativeService.listAlternatives();
      setAlternatives(data);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const skipInitialFocusRef = React.useRef(true);

  useEffect(() => {
    skipInitialFocusRef.current = true;
    void fetchAlternatives();
  }, [fetchAlternatives]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      if (skipInitialFocusRef.current) {
        skipInitialFocusRef.current = false;
        return;
      }
      void fetchAlternatives(true);
    });
    return unsubscribe;
  }, [navigation, fetchAlternatives]);

  // Client-side search filtering
  const filteredAlternatives = useMemo(() => {
    if (!search.trim()) return alternatives;
    const q = search.trim().toLowerCase();
    return alternatives.filter((item) => {
      const sourceName = item.sourceMedicine.name.toLowerCase();
      const sourceComp = item.sourceMedicine.compositionText.toLowerCase();
      const altMatch = item.alternatives.some(
        (alt) =>
          alt.medicine.name.toLowerCase().includes(q) ||
          alt.medicine.compositionText.toLowerCase().includes(q),
      );
      return sourceName.includes(q) || sourceComp.includes(q) || altMatch;
    });
  }, [alternatives, search]);

  const handleEdit = (group: PublicAlternativeGroup) => {
    setActiveItemForMenu(null);
    navigation.navigate('AddEditAlternative', {
      sourceMedicineId: group.sourceMedicine.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await medicineAlternativeService.deleteAlternatives(itemToDelete.sourceMedicine.id);
      setAlternatives((prev) =>
        prev.filter((item) => item.sourceMedicine.id !== itemToDelete.sourceMedicine.id),
      );
      setItemToDelete(null);
    } catch {
      // Error handling
    } finally {
      setIsDeleting(false);
    }
  };

  const formatSubtitle = (comp: string, form: string) => {
    const capitalizedForm = form ? form.charAt(0).toUpperCase() + form.slice(1).toLowerCase() : '';
    if (comp && capitalizedForm) {
      if (comp.toLowerCase().includes(capitalizedForm.toLowerCase())) {
        return comp;
      }
      return `${comp} ${capitalizedForm}`;
    }
    return comp || capitalizedForm;
  };

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Medicine Alternatives',
        subtitle: 'Approved alternatives for medicines',
        showBack: true,
        onBack: () => navigation.goBack(),
        rightAction: isAdmin ? (
          <TouchableOpacity
            style={styles.addHeaderButton}
            onPress={() => navigation.navigate('AddEditAlternative')}
            testID="add-alternative-button"
            accessibilityRole="button"
            accessibilityLabel="Add Alternative"
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addHeaderButtonText}>Add Alternative</Text>
          </TouchableOpacity>
        ) : undefined,
      }}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search medicine name..."
            testID="search-alternatives-input"
          />
        </View>

        {isLoading ? (
          <LoadingIndicator message="Loading medicine alternatives..." />
        ) : filteredAlternatives.length === 0 ? (
          <EmptyState
            title={search ? 'No Alternatives Found' : 'No Medicine Alternatives'}
            description={
              search
                ? `No alternatives match "${search}".`
                : 'No approved medicine alternatives have been configured yet.'
            }
            actionTitle={isAdmin && !search ? '+ Add Alternative' : undefined}
            onAction={
              isAdmin && !search
                ? () => navigation.navigate('AddEditAlternative')
                : undefined
            }
          />
        ) : (
          <FlatList
            data={filteredAlternatives}
            keyExtractor={(item) => item.sourceMedicine.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void fetchAlternatives(true)}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card} testID={`alternative-card-${item.sourceMedicine.id}`}>
                <View style={styles.cardMainRow}>
                  {/* DO NOT USE Container */}
                  <View style={styles.doNotUseBox}>
                    <View style={styles.boxHeaderRow}>
                      <View style={styles.banIconBadge}>
                        <Icon name="ban" size={13} color="#EF4444" />
                      </View>
                      <Text style={styles.doNotUseTag}>DO NOT USE</Text>
                    </View>
                    <Text
                      style={styles.medicineName}
                      numberOfLines={2}
                      testID={`source-med-name-${item.sourceMedicine.id}`}
                    >
                      {item.sourceMedicine.name}
                    </Text>
                    <Text style={styles.medicineSubtitle} numberOfLines={2}>
                      {formatSubtitle(
                        item.sourceMedicine.compositionText,
                        item.sourceMedicine.form,
                      )}
                    </Text>
                  </View>

                  {/* Arrow Connector */}
                  <View style={styles.arrowContainer}>
                    <Icon name="arrow-forward" size={18} color="#94A3B8" />
                  </View>

                  {/* USE INSTEAD Container */}
                  <View style={styles.useInsteadBox}>
                    <View style={styles.boxHeaderRow}>
                      <Icon name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={styles.useInsteadTag}>USE INSTEAD</Text>
                    </View>

                    <View style={styles.alternativesList}>
                      {item.alternatives.map((alt, idx) => (
                        <View
                          key={alt.id}
                          style={[
                            styles.alternativeItemRow,
                            idx > 0 && styles.alternativeItemRowSpacing,
                          ]}
                          testID={`target-med-${alt.medicine.id}`}
                        >
                          <View style={styles.greenBullet} />
                          <View style={styles.altTextContainer}>
                            <Text style={styles.altMedicineName} numberOfLines={2}>
                              {alt.medicine.name}
                            </Text>
                            <Text style={styles.altMedicineSubtitle} numberOfLines={2}>
                              {formatSubtitle(
                                alt.medicine.compositionText,
                                alt.medicine.form,
                              )}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Action Menu (Admin only) */}
                  {isAdmin ? (
                    <TouchableOpacity
                      style={styles.actionMenuButton}
                      onPress={() => setActiveItemForMenu(item)}
                      testID={`action-menu-trigger-${item.sourceMedicine.id}`}
                      accessibilityRole="button"
                      accessibilityLabel="Options"
                    >
                      <Icon name="ellipsis-vertical" size={18} color="#64748B" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}

        {/* Action Menu Modal */}
        <Modal
          visible={!!activeItemForMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveItemForMenu(null)}
          testID="alternative-actions-modal"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveItemForMenu(null)}
            accessibilityRole="button"
            accessibilityLabel="Close options"
          >
            <View style={styles.menuDialog}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {activeItemForMenu?.sourceMedicine.name}
              </Text>
              <Text style={styles.menuSubtitle}>Manage Approved Alternatives</Text>

              <TouchableOpacity
                style={styles.menuActionItem}
                onPress={() => activeItemForMenu && handleEdit(activeItemForMenu)}
                testID="edit-alternative-action"
              >
                <Icon name="edit" size={18} color={colors.primary} />
                <Text style={styles.menuActionText}>Edit Alternatives</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuActionItem, styles.destructiveActionItem]}
                onPress={() => {
                  const target = activeItemForMenu;
                  setActiveItemForMenu(null);
                  if (target) setItemToDelete(target);
                }}
                testID="delete-alternative-action"
              >
                <Icon name="delete" size={18} color="#EF4444" />
                <Text style={styles.menuDestructiveText}>Delete Alternatives</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={() => setActiveItemForMenu(null)}
              >
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          visible={!!itemToDelete}
          title="Delete Approved Alternatives"
          message={`Are you sure you want to remove the approved alternatives for "${itemToDelete?.sourceMedicine.name}"? This action will notify all users.`}
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive
          loading={isDeleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setItemToDelete(null)}
          testID="confirm-delete-alternative-dialog"
        />
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  searchContainer: {
    paddingVertical: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  addHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  addHeaderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doNotUseBox: {
    flex: 1.1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    minHeight: 110,
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  banIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doNotUseTag: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#111827',
    marginBottom: 3,
  },
  medicineSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  arrowContainer: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useInsteadBox: {
    flex: 1.35,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    minHeight: 110,
  },
  useInsteadTag: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
    letterSpacing: 0.3,
  },
  alternativesList: {
    marginTop: 2,
  },
  alternativeItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alternativeItemRowSpacing: {
    marginTop: 8,
  },
  greenBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginTop: 6,
    marginRight: 6,
  },
  altTextContainer: {
    flex: 1,
  },
  altMedicineName: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#111827',
  },
  altMedicineSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 15,
  },
  actionMenuButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuDialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.md,
  },
  menuActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  menuActionText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  destructiveActionItem: {
    backgroundColor: '#FEF2F2',
  },
  menuDestructiveText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#EF4444',
  },
  menuCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    color: colors.textMuted,
  },
});
