import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  ErrorState,
  Icon,
  LoadingIndicator,
} from '../../components';
import { shortageService } from '../../services/shortageService';
import { colors, fontWeights, theme } from '../../theme';
import type { ShortageItem, ShortageStatus, ShortageUnit } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import {
  SHORTAGE_UNITS,
  formatShortageQuantity,
  formatShortageUnit,
} from '../../utils/shortage.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailsRouteProp = RouteProp<RootStackParamList, 'ShortageDetails'>;

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

const QUICK_QUANTITIES = [1, 5, 10, 20, 50];

function getUtcTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  const todayStr = getUtcTodayStr();
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  const formatted = `${d} ${MONTH_NAMES[m]} ${y}`;
  return dateStr === todayStr ? `${formatted} (Today)` : formatted;
}

function formatAddedTimestamp(isoStr: string): string {
  try {
    const dt = new Date(isoStr);
    const day = dt.getUTCDate();
    const month = MONTH_NAMES[dt.getUTCMonth()].slice(0, 3);
    const year = dt.getUTCFullYear();
    let hours = dt.getUTCHours();
    const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return isoStr;
  }
}

export const ShortageDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailsRouteProp>();

  const shortageId = route.params?.shortageId || '';

  const [item, setItem] = useState<ShortageItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  const [showEditQtyModal, setShowEditQtyModal] = useState<boolean>(false);
  const [editQtyValue, setEditQtyValue] = useState<string>('1');
  const [editUnitValue, setEditUnitValue] = useState<ShortageUnit>('PACK');
  const [editNoteValue, setEditNoteValue] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const isMountedRef = React.useRef<boolean>(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDetails = useCallback(
    async (isRefresh = false) => {
      if (!shortageId) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }
      try {
        if (isMountedRef.current) {
          if (isRefresh) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }
          setError(null);
        }
        const res = await shortageService.getShortageItemById(shortageId);
        if (!isMountedRef.current) return;
        setItem(res.shortageItem);
        setEditQtyValue(String(res.shortageItem.quantity));
        setEditUnitValue(res.shortageItem.unit || 'PACK');
        setEditNoteValue(res.shortageItem.note || '');
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Failed to load shortage item details';
        setError(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [shortageId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails]),
  );

  const handleCallMr = async (phone: string | null | undefined) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'This MR does not have a phone number registered.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (supported || Platform.OS !== 'web') {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert('Cannot Place Call', `Dialer not supported on this device: ${phone}`);
      }
    } catch {
      Alert.alert('Phone Call', `Phone number: ${phone}`);
    }
  };

  const handleStatusTransition = async () => {
    if (!item || isUpdatingStatus) return;

    let newStatus: ShortageStatus = 'ORDERED';
    if (item.status === 'PENDING') {
      newStatus = 'ORDERED';
    } else if (item.status === 'ORDERED') {
      newStatus = 'COMPLETED';
    } else if (item.status === 'COMPLETED') {
      newStatus = 'PENDING';
    }

    try {
      setIsUpdatingStatus(true);
      const res = await shortageService.patchShortageItem(item.id, {
        status: newStatus,
      });
      setItem(res.shortageItem);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!item) return;

    try {
      setIsRemoving(true);
      await shortageService.deleteShortageItem(item.id);
      setShowRemoveModal(false);
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove shortage item';
      Alert.alert('Error', msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSaveQuantityAndNote = async () => {
    if (!item) return;

    const numericQty = parseInt(editQtyValue, 10);
    if (isNaN(numericQty) || numericQty <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be greater than zero.');
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await shortageService.patchShortageItem(item.id, {
        quantity: numericQty,
        unit: editUnitValue,
        note: editNoteValue.trim() || null,
      });
      setItem(res.shortageItem);
      setShowEditQtyModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update quantity';
      Alert.alert('Error', msg);
    } finally {
      setIsSavingEdit(false);
    }
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

  if (isLoading && !isRefreshing) {
    return (
      <AppScreen
        headerProps={{
          title: 'Medicine Details',
          subtitle: 'Shortage item information',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
        contentContainerStyle={styles.screenContainer}
      >
        <LoadingIndicator message="Loading medicine details..." />
      </AppScreen>
    );
  }

  if (error || !item) {
    return (
      <AppScreen
        headerProps={{
          title: 'Medicine Details',
          subtitle: 'Shortage item information',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
        contentContainerStyle={styles.screenContainer}
      >
        <ErrorState
          title="Failed to Load Details"
          message={error || 'Shortage item not found.'}
          onRetry={() => fetchDetails()}
        />
      </AppScreen>
    );
  }

  const { medicine, createdBy } = item;
  const mr = medicine.mr;

  const formattedQuantity = formatShortageQuantity(item.quantity, item.unit);

  const mrInitials = mr?.name
    ? mr.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MR';

  const statusActionLabel =
    item.status === 'PENDING'
      ? 'Mark Ordered'
      : item.status === 'ORDERED'
        ? 'Mark Completed'
        : 'Mark Pending';

  const statusActionIcon =
    item.status === 'PENDING' ? 'cube' : item.status === 'ORDERED' ? 'check' : 'time';

  const statusActionStyle =
    item.status === 'PENDING'
      ? styles.actionBtnBlue
      : item.status === 'ORDERED'
        ? styles.actionBtnGreen
        : styles.actionBtnAmber;

  const statusActionTextStyle =
    item.status === 'PENDING'
      ? styles.actionBtnTextBlue
      : item.status === 'ORDERED'
        ? styles.actionBtnTextGreen
        : styles.actionBtnTextAmber;

  return (
    <AppScreen
      headerProps={{
        title: 'Medicine Details',
        subtitle: 'Shortage item information',
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
            onRefresh={() => fetchDetails(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Medicine Overview Card */}
        <Card style={styles.topOverviewCard} testID="shortage-details-overview-card">
          <View style={styles.topCardRow}>
            <View style={styles.imageContainer}>
              {medicine.imageUrl ? (
                <Image
                  source={{ uri: medicine.imageUrl }}
                  style={styles.medicineImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="capsule" size={26} color="#059669" />
                </View>
              )}
            </View>

            <View style={styles.topCardInfo}>
              <Text style={styles.topMedName}>{medicine.name}</Text>
              <Text style={styles.topMedManufacturer}>{medicine.manufacturer.name}</Text>
              <View style={styles.qtyBox}>
                <Text style={styles.topQtyLabel}>Quantity to order</Text>
                <Text style={styles.topQtyValue}>
                  {formattedQuantity}
                </Text>
              </View>
            </View>

            <View style={styles.topCardRight}>{renderStatusBadge(item.status)}</View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.topMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Added on</Text>
              <Text style={styles.metaValue}>{formatAddedTimestamp(item.createdAt)}</Text>
            </View>
            <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>Added by</Text>
              <Text style={styles.metaValue}>{createdBy?.name || 'Staff'}</Text>
            </View>
          </View>
        </Card>

        {/* Section 1: Shortage Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="clipboard" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>Shortage Information</Text>
          </View>

          <Card style={styles.infoCard}>
            {/* Shortage Date */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="calendar" size={16} color="#64748B" />
                <Text style={styles.infoRowLabel}>Shortage Date</Text>
              </View>
              <Text style={styles.infoRowValue}>{formatDateDisplay(item.date)}</Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Status */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="tag" size={16} color="#64748B" />
                <Text style={styles.infoRowLabel}>Status</Text>
              </View>
              {renderStatusBadge(item.status)}
            </View>

            <View style={styles.rowDivider} />

            {/* Quantity */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="cube" size={16} color="#64748B" />
                <Text style={styles.infoRowLabel}>Quantity</Text>
              </View>
              <Text style={styles.infoRowValueBold}>
                {formattedQuantity}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            {/* Note */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Icon name="document-text" size={16} color="#64748B" />
                <Text style={styles.infoRowLabel}>Note</Text>
              </View>
              <Text style={[styles.infoRowValue, !item.note && styles.infoRowValueMuted]}>
                {item.note || 'None'}
              </Text>
            </View>
          </Card>
        </View>

        {/* Section 2: Medical Representative */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="person" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>Medical Representative</Text>
          </View>

          {mr ? (
            <Card style={styles.mrCard} testID="shortage-details-mr-card">
              <View style={styles.mrTopRow}>
                <View style={styles.mrAvatarCircle}>
                  <Text style={styles.mrAvatarText}>{mrInitials}</Text>
                </View>

                <View style={styles.mrInfoCol}>
                  <Text style={styles.mrName}>{mr.name}</Text>
                  <Text style={styles.mrCompany}>{mr.company || medicine.manufacturer.name}</Text>
                  <View style={styles.verifiedBadge}>
                    <Icon name="shield" size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Verified MR</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mrPhoneRow}>
                <View style={styles.mrPhoneLeft}>
                  <Icon name="phone" size={16} color="#059669" />
                  <Text style={styles.mrPhoneText}>{mr.phone || 'No phone number'}</Text>
                </View>

                {mr.phone ? (
                  <TouchableOpacity
                    style={styles.callMrBtn}
                    onPress={() => handleCallMr(mr.phone)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Call MR ${mr.name}`}
                    testID="shortage-details-call-mr-btn"
                  >
                    <Icon name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.callMrBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.callInfoBanner}>
                <Icon name="info" size={16} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.callInfoBannerText}>
                    Tapping Call will open your phone dialer
                  </Text>
                  <Text style={styles.callInfoBannerSubText}>
                    No calls will be made automatically
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card style={styles.noMrCard} testID="shortage-details-no-mr-card">
              <Icon name="person" size={24} color="#94A3B8" />
              <Text style={styles.noMrText}>No medical representative assigned</Text>
            </Card>
          )}
        </View>

        {/* Section 3: About Medicine */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="capsule" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>About Medicine</Text>
          </View>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.tableLabel}>Salt / Composition</Text>
              <Text style={styles.tableValue} numberOfLines={2}>
                {medicine.composition?.displayText || 'Not specified'}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.tableLabel}>Form</Text>
              <Text style={styles.tableValue}>{medicine.form}</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.tableLabel}>Manufacturer</Text>
              <Text style={styles.tableValue}>{medicine.manufacturer?.name || 'Not specified'}</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.tableLabel}>Pack Size</Text>
              <Text style={styles.tableValue}>
                {medicine.packQuantity} {medicine.packUnit}
              </Text>
            </View>
          </Card>
        </View>

        {/* Bottom 3 Action Buttons */}
        <View style={styles.bottomActionsRow}>
          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeActionBtn}
            onPress={() => setShowRemoveModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Remove Shortage Item"
            testID="shortage-details-remove-btn"
          >
            <Icon name="delete" size={16} color="#DC2626" />
            <Text style={styles.removeActionBtnText}>Remove</Text>
          </TouchableOpacity>

          {/* Status Button */}
          <TouchableOpacity
            style={[styles.statusActionBtn, statusActionStyle]}
            onPress={handleStatusTransition}
            activeOpacity={0.7}
            disabled={isUpdatingStatus}
            accessibilityRole="button"
            accessibilityLabel={statusActionLabel}
            testID="shortage-details-status-btn"
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Icon name={statusActionIcon} size={16} color={statusActionTextStyle.color} />
                <Text style={[styles.statusActionBtnText, statusActionTextStyle]}>
                  {statusActionLabel}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Edit Quantity Button */}
          <TouchableOpacity
            style={styles.editQtyActionBtn}
            onPress={() => setShowEditQtyModal(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit Quantity"
            testID="shortage-details-edit-qty-btn"
          >
            <Icon name="edit" size={16} color="#059669" />
            <Text style={styles.editQtyActionBtnText}>Edit Qty</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRemoveModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.removeIconCircle}>
              <Icon name="delete" size={28} color="#DC2626" />
            </View>

            <Text style={styles.removeModalTitle}>Remove from Shortage?</Text>
            <Text style={styles.removeModalDesc}>
              Remove <Text style={{ fontWeight: fontWeights.bold }}>{medicine.name}</Text> from{' '}
              {formatDateDisplay(item.date)}'s shortage list?
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRemoveModal(false)}
                disabled={isRemoving}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDangerBtn}
                onPress={handleConfirmRemove}
                disabled={isRemoving}
                activeOpacity={0.8}
                testID="confirm-remove-btn"
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerBtnText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Quantity Modal */}
      <Modal
        visible={showEditQtyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditQtyModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEditQtyModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Quantity & Note</Text>
              <TouchableOpacity
                onPress={() => setShowEditQtyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quantity input */}
            <Text style={styles.editModalLabel}>Quantity</Text>
            <View style={styles.editQtyInputRow}>
              <TextInput
                style={styles.editQtyInput}
                keyboardType="numeric"
                value={editQtyValue}
                onChangeText={(t) => setEditQtyValue(t.replace(/[^0-9]/g, ''))}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                testID="edit-qty-input"
              />
              <View style={styles.unitBadge}>
                <Text style={styles.editQtyUnitText}>
                  {formatShortageUnit(parseInt(editQtyValue, 10) || 1, editUnitValue)}
                </Text>
              </View>
            </View>

            {/* Quick Pills */}
            <View style={styles.editQuickPillRow}>
              {QUICK_QUANTITIES.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.editQuickPill,
                    editQtyValue === String(q) && styles.editQuickPillActive,
                  ]}
                  onPress={() => setEditQtyValue(String(q))}
                  activeOpacity={0.7}
                  testID={`edit-quick-qty-${q}`}
                >
                  <Text
                    style={[
                      styles.editQuickPillText,
                      editQtyValue === String(q) && styles.editQuickPillTextActive,
                    ]}
                  >
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Unit Selector */}
            <Text style={[styles.editModalLabel, { marginTop: 10 }]}>Order Unit</Text>
            <View style={styles.editUnitChipsRow}>
              {SHORTAGE_UNITS.map((u) => {
                const isSelected = editUnitValue === u.value;
                return (
                  <TouchableOpacity
                    key={u.value}
                    style={[styles.editUnitChip, isSelected && styles.editUnitChipActive]}
                    onPress={() => setEditUnitValue(u.value)}
                    activeOpacity={0.7}
                    testID={`edit-unit-chip-${u.value.toLowerCase()}`}
                  >
                    <Text
                      style={[
                        styles.editUnitChipText,
                        isSelected && styles.editUnitChipTextActive,
                      ]}
                    >
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note input */}
            <Text style={[styles.editModalLabel, { marginTop: 12 }]}>Note (Optional)</Text>
            <TextInput
              style={styles.editNoteInput}
              placeholder="Add any note..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              maxLength={150}
              value={editNoteValue}
              onChangeText={(t) => setEditNoteValue(t)}
              textAlignVertical="top"
              testID="edit-qty-note-input"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditQtyModal(false)}
                disabled={isSavingEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveQuantityAndNote}
                disabled={isSavingEdit}
                activeOpacity={0.8}
                testID="save-edit-qty-btn"
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  topOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  topCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
  topCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  topMedName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  topMedManufacturer: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topQtyLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  topQtyValue: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  topCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#059669',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: fontWeights.medium,
  },
  infoRowValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: fontWeights.semibold,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoRowValueBold: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: fontWeights.bold,
  },
  infoRowValueMuted: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  tableLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  tableValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: fontWeights.semibold,
    flex: 1.4,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  mrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  mrTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mrAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mrAvatarText: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#15803D',
  },
  mrInfoCol: {
    flex: 1,
  },
  mrName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  mrCompany: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#059669',
  },
  mrPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mrPhoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mrPhoneText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  callMrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  callMrBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  callInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  callInfoBannerText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#166534',
  },
  callInfoBannerSubText: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  noMrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noMrText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  removeActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...theme.shadows.sm,
  },
  removeActionBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#DC2626',
  },
  statusActionBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...theme.shadows.sm,
  },
  actionBtnBlue: {
    borderColor: '#93C5FD',
  },
  actionBtnGreen: {
    borderColor: '#86EFAC',
  },
  actionBtnAmber: {
    borderColor: '#FDE68A',
  },
  statusActionBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  actionBtnTextBlue: {
    color: '#2563EB',
  },
  actionBtnTextGreen: {
    color: '#059669',
  },
  actionBtnTextAmber: {
    color: '#D97706',
  },
  editQtyActionBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...theme.shadows.sm,
  },
  editQtyActionBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#059669',
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
  removeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  removeModalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  removeModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  modalDangerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerBtnText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  editModalLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginBottom: 6,
  },
  editQtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  editQtyInput: {
    flex: 1,
    minWidth: 50,
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    paddingVertical: 0,
  },
  unitBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 0,
  },
  editQtyUnitText: {
    fontSize: 12.5,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  editUnitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  editUnitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editUnitChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  editUnitChipText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: '#475569',
  },
  editUnitChipTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  editQuickPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  editQuickPill: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editQuickPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  editQuickPillText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  editQuickPillTextActive: {
    color: '#059669',
    fontWeight: fontWeights.bold,
  },
  editNoteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 56,
  },
});