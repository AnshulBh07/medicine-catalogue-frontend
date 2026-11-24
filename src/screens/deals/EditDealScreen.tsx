import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen, Card, ErrorState, Icon, LoadingIndicator } from '../../components';
import { useAuth } from '../../features/auth';
import { dealService } from '../../services/dealService';
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type { DealStatus, PublicDeal } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { formatScheme } from '../../utils/commercial.utils';
import { parseValidDealDateIso } from '../../utils/deal-date.utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditDealRouteProp = RouteProp<RootStackParamList, 'EditDeal'>;

export const EditDealScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditDealRouteProp>();
  const { dealId } = route.params;
  const { isAdmin } = useAuth();

  const [deal, setDeal] = useState<PublicDeal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [agreedMrp, setAgreedMrp] = useState<string>('');
  const [agreedScheme, setAgreedScheme] = useState<string>('');
  const [agreedBillDiscount, setAgreedBillDiscount] = useState<string>('');
  const [mrPhoneSnapshot, setMrPhoneSnapshot] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<DealStatus>('PENDING');
  const [dealDateStr, setDealDateStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDeal = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await dealService.getDealById(dealId);
      if (isMountedRef.current && res.deal) {
        const d = res.deal;
        setDeal(d);
        setAgreedMrp(String(d.agreedMrp));
        setAgreedScheme(formatScheme(d.agreedScheme));
        setAgreedBillDiscount(String(d.agreedBillDiscount));
        setMrPhoneSnapshot(d.mrPhoneSnapshot || '');
        setDeliveryStatus(d.status);
        setDealDateStr(d.dealDate.split('T')[0]);
        setNotes(d.notes || '');
      }
    } catch (err) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load deal.';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dealId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    void loadDeal();
  }, [isAdmin, loadDeal]);

  const validateAndSave = async () => {
    if (!deal) return;

    const mrpNum = parseFloat(agreedMrp);
    if (isNaN(mrpNum) || mrpNum <= 0) {
      Alert.alert('Invalid MRP', 'Please enter a valid MRP.');
      return;
    }

    const schemeTrimmed = agreedScheme.trim();
    if (!schemeTrimmed) {
      Alert.alert('Required Field', 'Please enter the agreed trade scheme.');
      return;
    }

    const discountNum = parseFloat(agreedBillDiscount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      Alert.alert('Invalid Discount', 'Please enter a valid discount percentage (0 - 100).');
      return;
    }

    let parsedDealDateIso: string | undefined;
    if (dealDateStr.trim()) {
      const validIso = parseValidDealDateIso(dealDateStr);
      if (!validIso) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid deal date in YYYY-MM-DD format (e.g. 2026-08-31).',
        );
        return;
      }
      parsedDealDateIso = validIso;
    }

    setIsSaving(true);
    try {
      await dealService.updateDeal(deal.id, {
        agreedMrp: mrpNum,
        agreedScheme: schemeTrimmed,
        agreedBillDiscount: discountNum,
        mrPhoneSnapshot: mrPhoneSnapshot.trim() || null,
        status: deliveryStatus,
        dealDate: parsedDealDateIso,
        notes: notes.trim() || null,
      });

      Alert.alert('Deal Updated', 'The agreed deal has been successfully updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update deal.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit Deal',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="Editing medicine deals is restricted to ADMIN accounts only."
          testID="deals-access-restricted"
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit Deal',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading deal details..." />
      </AppScreen>
    );
  }

  if (error || !deal) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit Deal',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Deal Not Found"
          message={error || 'Could not load deal details.'}
          onRetry={loadDeal}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Edit Medicine Deal',
        subtitle: `${deal.medicine.name} • ${deal.mr.name}`,
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Linked Entities Display */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>ASSOCIATED ENTITIES</Text>
            <View style={styles.entityRow}>
              <View style={styles.entityIconBox}>
                <Icon name="medicines" size={16} color="#15803D" />
              </View>
              <View style={styles.entityTextCol}>
                <Text style={styles.entityLabel}>Medicine</Text>
                <Text style={styles.entityValueBold}>{deal.medicine.name}</Text>
              </View>
            </View>

            <View style={[styles.entityRow, { marginTop: 10 }]}>
              <View style={[styles.entityIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Icon name="person" size={16} color="#7C3AED" />
              </View>
              <View style={styles.entityTextCol}>
                <Text style={styles.entityLabel}>Medical Representative (MR)</Text>
                <Text style={styles.entityValueBold}>
                  {deal.mr.name}
                  {deal.mr.company ? ` (${deal.mr.company})` : ''}
                </Text>
              </View>
            </View>
          </Card>

          {/* Section: Commercial Terms */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>AGREED COMMERCIAL SETTLEMENT</Text>

            {/* Agreed MRP */}
            <Text style={styles.inputLabel}>Agreed MRP (₹) *</Text>
            <TextInput
              style={styles.textInput}
              value={agreedMrp}
              onChangeText={setAgreedMrp}
              keyboardType="decimal-pad"
              testID="edit-deal-mrp-input"
            />

            {/* Agreed Scheme */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Agreed Trade Scheme *
            </Text>
            <TextInput
              style={styles.textInput}
              value={agreedScheme}
              onChangeText={setAgreedScheme}
              autoCapitalize="characters"
              testID="edit-deal-scheme-input"
            />

            {/* Bill Discount */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Agreed Bill Discount (%) *
            </Text>
            <TextInput
              style={styles.textInput}
              value={agreedBillDiscount}
              onChangeText={setAgreedBillDiscount}
              keyboardType="decimal-pad"
              testID="edit-deal-discount-input"
            />
          </Card>

          {/* Section: Delivery & Details */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>DELIVERY & FOLLOW-UP</Text>

            {/* MR Phone Snapshot */}
            <Text style={styles.inputLabel}>MR Phone Snapshot</Text>
            <TextInput
              style={styles.textInput}
              value={mrPhoneSnapshot}
              onChangeText={setMrPhoneSnapshot}
              keyboardType="phone-pad"
              placeholder="Representative phone number"
              placeholderTextColor="#94A3B8"
            />

            {/* Delivery Status */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Delivery Status
            </Text>
            <View style={styles.statusToggleGroup}>
              <TouchableOpacity
                style={[
                  styles.statusOptionButton,
                  deliveryStatus === 'PENDING' && styles.statusOptionPendingActive,
                ]}
                onPress={() => setDeliveryStatus('PENDING')}
              >
                <Icon
                  name="time"
                  size={14}
                  color={deliveryStatus === 'PENDING' ? '#B45309' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    deliveryStatus === 'PENDING' && styles.statusOptionTextPending,
                  ]}
                >
                  Pending Delivery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOptionButton,
                  deliveryStatus === 'RECEIVED' && styles.statusOptionReceivedActive,
                ]}
                onPress={() => setDeliveryStatus('RECEIVED')}
              >
                <Icon
                  name="check"
                  size={14}
                  color={deliveryStatus === 'RECEIVED' ? '#15803D' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusOptionText,
                    deliveryStatus === 'RECEIVED' && styles.statusOptionTextReceived,
                  ]}
                >
                  Medicine Received
                </Text>
              </TouchableOpacity>
            </View>

            {/* Deal Date */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Date Settled (YYYY-MM-DD)
            </Text>
            <TextInput
              style={styles.textInput}
              value={dealDateStr}
              onChangeText={setDealDateStr}
            />

            {/* Notes */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={validateAndSave}
            disabled={isSaving}
            activeOpacity={0.8}
            testID="update-deal-btn"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  cardHeaderTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: borderRadius.md,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: 10,
  },
  entityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityTextCol: {
    flex: 1,
  },
  entityLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: fontWeights.medium,
  },
  entityValueBold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSizes.sm,
    color: '#0F172A',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  statusToggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  statusOptionPendingActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusOptionReceivedActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusOptionText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: '#64748B',
  },
  statusOptionTextPending: {
    color: '#B45309',
    fontWeight: fontWeights.bold,
  },
  statusOptionTextReceived: {
    color: '#15803D',
    fontWeight: fontWeights.bold,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginTop: 4,
    shadowColor: '#15803D',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
