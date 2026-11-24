import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
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
  Card,
  ErrorState,
  Icon,
  LoadingIndicator,
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

type MrDetailsRouteProp = RouteProp<RootStackParamList, 'MrDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MrDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MrDetailsRouteProp>();
  const { id } = route.params;
  const { isAdmin } = useAuth();

  const [mr, setMr] = useState<PublicMr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMrDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await apiClient.get<{ mr: PublicMr }>(`/mrs/${id}`);
      if (isMountedRef.current) {
        if (response && response.mr) {
          setMr(response.mr);
        } else {
          setErrorMessage('Medical representative not found');
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load MR details';
        setErrorMessage(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  const skipInitialFocusRef = useRef(true);

  useEffect(() => {
    skipInitialFocusRef.current = true;
    void fetchMrDetails();
  }, [fetchMrDetails]);

  // Refresh on subsequent focus in case it was edited or medicines changed
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      if (skipInitialFocusRef.current) {
        skipInitialFocusRef.current = false;
        return;
      }
      void fetchMrDetails();
    });
    return unsubscribe;
  }, [navigation, fetchMrDetails]);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`).catch(() => {});
  };

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: 'Representative Profile',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading representative profile..." />
      </AppScreen>
    );
  }

  if (errorMessage || !mr) {
    return (
      <AppScreen
        headerProps={{
          title: 'Representative Profile',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Representative Not Found"
          message={errorMessage || 'The requested representative could not be loaded.'}
          onRetry={fetchMrDetails}
        />
      </AppScreen>
    );
  }

  const initials = mr.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const medicines = mr.medicines || [];

  return (
    <AppScreen
      headerProps={{
        title: mr.name,
        subtitle: mr.company || 'Medical Representative',
        showBack: true,
        onBack: () => navigation.goBack(),
        rightIcon: isAdmin ? 'edit' : undefined,
        onRightPress: isAdmin ? () => navigation.navigate('EditMr', { id: mr.id }) : undefined,
      }}
      scrollable={false}
      contentContainerStyle={styles.staticAppScreenContent}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="mr-details-screen"
      >
        {/* 1. Main Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            {/* Circular Initials Avatar */}
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.nameText} numberOfLines={2}>
                {mr.name}
              </Text>
              <Text style={styles.companyText} numberOfLines={2}>
                {mr.company || 'Independent Representative'}
              </Text>
              <View style={[styles.statusPill, !mr.active && styles.statusPillInactive]}>
                <View style={[styles.statusDot, !mr.active && styles.statusDotInactive]} />
                <Text style={[styles.statusText, !mr.active && styles.statusTextInactive]}>
                  {mr.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Action Buttons Row: Call, Email, Edit */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.callActionButton,
                !mr.phone && styles.actionButtonDisabled,
              ]}
              onPress={() => mr.phone && handleCall(mr.phone)}
              disabled={!mr.phone}
              accessibilityRole="button"
              accessibilityLabel={`Call ${mr.name}`}
              testID="mr-details-call-button"
            >
              <Icon name="phone" size={16} color={colors.primary} />
              <Text style={styles.callActionButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.emailActionButton,
                !mr.email && styles.actionButtonDisabled,
              ]}
              onPress={() => mr.email && handleEmail(mr.email)}
              disabled={!mr.email}
              accessibilityRole="button"
              accessibilityLabel={`Email ${mr.name}`}
              testID="mr-details-email-button"
            >
              <Icon name="email" size={16} color="#2563EB" />
              <Text style={styles.emailActionButtonText}>Email</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.editActionButton]}
                onPress={() => navigation.navigate('EditMr', { id: mr.id })}
                accessibilityRole="button"
                accessibilityLabel="Edit Profile"
                testID="mr-details-edit-button"
              >
                <Icon name="edit" size={16} color="#FFFFFF" />
                <Text style={styles.editActionButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* 2. Contact & Company Details Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconContainer}>
              <Icon name="person" size={16} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>CONTACT & COMPANY DETAILS</Text>
          </View>

          {/* Phone Number */}
          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconContainer, styles.phoneIconBg]}>
              <Icon name="phone" size={18} color={colors.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              {mr.phone ? (
                <TouchableOpacity onPress={() => handleCall(mr.phone!)}>
                  <Text style={styles.detailPhoneValue}>{mr.phone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.detailValueMuted}>Not provided</Text>
              )}
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconContainer, styles.emailIconBg]}>
              <Icon name="email" size={18} color="#2563EB" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Email Address</Text>
              {mr.email ? (
                <TouchableOpacity onPress={() => handleEmail(mr.email!)}>
                  <Text style={styles.detailEmailValue}>
                    {mr.email}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.detailValueMuted}>Not provided</Text>
              )}
            </View>
          </View>

          {/* Company / Manufacturer (Refined Typography) */}
          <View style={styles.detailItemRow}>
            <View style={[styles.detailIconContainer, styles.companyIconBg]}>
              <Icon name="building" size={18} color="#7E22CE" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Company / Manufacturer</Text>
              <Text style={styles.detailCompanyValue}>
                {mr.company || 'Independent Representative'}
              </Text>
            </View>
          </View>

          {/* Notes & Territory Coverage (if present) */}
          {mr.notes ? (
            <View style={[styles.detailItemRow, styles.detailItemLast]}>
              <View style={[styles.detailIconContainer, styles.notesIconBg]}>
                <Icon name="pricetag" size={18} color="#D97706" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Notes & Territory Coverage</Text>
                <Text style={styles.detailNotesValue}>{mr.notes}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* 3. Associated Medicines Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionIconContainer}>
                <Icon name="medicines" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>ASSOCIATED MEDICINES</Text>
            </View>
            <View style={styles.medicineCountBadge}>
              <Text style={styles.medicineCountBadgeText}>{medicines.length}</Text>
            </View>
          </View>

          {medicines.length > 0 ? (
            <View style={styles.medicinesListContainer}>
              <View style={styles.medicineList}>
                {medicines.slice(0, 5).map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.medicineItem}
                    onPress={() => navigation.navigate('MedicineDetails', { id: med.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${med.name}`}
                    testID={`mr-medicine-item-${med.id}`}
                  >
                    <View style={styles.medicineItemMain}>
                      <Text style={styles.medicineItemName} numberOfLines={1}>
                        {med.name}
                      </Text>
                      <Text style={styles.medicineItemMfg} numberOfLines={1}>
                        {med.form} • {med.manufacturer?.name || 'Unknown'}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ))}

                {medicines.length > 5 ? (
                  <TouchableOpacity
                    style={styles.moreMedicinesRow}
                    onPress={() =>
                      navigation.navigate('ManageMrMedicines', { mrId: mr.id, mrName: mr.name })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View all ${medicines.length} assigned medicines`}
                    testID="mr-view-all-medicines-button"
                  >
                    <Text style={styles.moreMedicinesText}>
                      + {medicines.length - 5} more medicines
                    </Text>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {isAdmin ? (
                <TouchableOpacity
                  style={styles.manageMedicinesButton}
                  onPress={() =>
                    navigation.navigate('ManageMrMedicines', { mrId: mr.id, mrName: mr.name })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Manage Medicines"
                  testID="mr-manage-medicines-button"
                >
                  <Icon name="add" size={16} color={colors.primary} />
                  <Text style={styles.manageMedicinesButtonText}>Manage Medicines</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            /* Rich Green-Tinted Empty State matching reference */
            <View style={styles.emptyMedicinesCard}>
              <View style={styles.emptyIllustrationWrapper}>
                <Text style={styles.sparkleTopLeft}>✦</Text>
                <Text style={styles.sparkleTopRight}>✦</Text>
                <Text style={styles.sparkleBottomLeft}>✦</Text>
                <View style={styles.emptyIconCircle}>
                  <Icon name="medicines" size={24} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.emptyMedicinesText}>
                No medicines assigned to this representative.
              </Text>

              {isAdmin ? (
                <TouchableOpacity
                  style={styles.manageMedicinesButton}
                  onPress={() =>
                    navigation.navigate('ManageMrMedicines', { mrId: mr.id, mrName: mr.name })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Manage Medicines"
                  testID="mr-manage-medicines-button"
                >
                  <Icon name="add" size={16} color={colors.primary} />
                  <Text style={styles.manageMedicinesButtonText}>Manage Medicines</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </Card>

        {/* Medicine Deals Card (Admin Only) */}
        {isAdmin ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={styles.sectionIconContainer}>
                  <Icon name="pricetag" size={16} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>MEDICINE DEALS</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageMedicinesButton}
              onPress={() =>
                navigation.navigate('Deals', {
                  mrId: mr.id,
                  mrName: mr.name,
                })
              }
              accessibilityRole="button"
              accessibilityLabel="View Deals with this MR"
              testID="mr-view-deals-button"
            >
              <Icon name="tag" size={16} color={colors.primary} />
              <Text style={styles.manageMedicinesButtonText}>
                View Deals with this Representative
              </Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* 4. Tip Banner Card matching reference */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconCircle}>
            <Icon name="info" size={15} color="#2563EB" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipDescription}>
              Assign medicines to track which products this representative promotes and manages.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  staticAppScreenContent: {
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.md, // 12px outer horizontal padding for wider cards
    paddingTop: spacing.md, // 12px top padding
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },

  // 1. Profile Card Styles
  profileCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
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
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      } as object,
    }),
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#008060',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  companyText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#008060',
    marginTop: 2,
    lineHeight: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusPillInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusDotInactive: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: fontWeights.semibold,
    color: '#065F46',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    height: 40,
  },
  callActionButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  callActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  emailActionButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emailActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#2563EB',
  },
  editActionButton: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },

  // 2. Section Card Styles
  sectionCard: {
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
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
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      } as object,
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medicineCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  medicineCountBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },

  // Contact Details List Items
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  detailItemLast: {
    paddingBottom: 0,
  },
  detailIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneIconBg: {
    backgroundColor: '#ECFDF5',
  },
  emailIconBg: {
    backgroundColor: '#EFF6FF',
  },
  companyIconBg: {
    backgroundColor: '#F3E8FF',
  },
  notesIconBg: {
    backgroundColor: '#FEF3C7',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  detailPhoneValue: {
    fontSize: 14.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  detailEmailValue: {
    fontSize: 13.5,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  detailCompanyValue: {
    fontSize: 13.5,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  detailNotesValue: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  detailValueMuted: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // 3. Associated Medicines
  medicinesListContainer: {
    gap: spacing.sm,
  },
  medicineList: {
    gap: 6,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medicineItemMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  medicineItemName: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  medicineItemMfg: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreMedicinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  moreMedicinesText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  viewAllText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },

  // Empty State matching reference
  emptyMedicinesCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  emptyIllustrationWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: 6,
    left: 2,
    fontSize: 10,
    color: '#10B981',
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 2,
    right: 6,
    fontSize: 11,
    color: '#10B981',
  },
  sparkleBottomLeft: {
    position: 'absolute',
    bottom: 8,
    right: 2,
    fontSize: 9,
    color: '#10B981',
  },
  emptyMedicinesText: {
    fontSize: 13.5,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  manageMedicinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  manageMedicinesButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // 4. Tip Banner Card matching reference
  tipCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#1E3A8A',
  },
  tipDescription: {
    fontSize: 12,
    color: '#3B4861',
    lineHeight: 17,
    marginTop: 2,
  },
});
