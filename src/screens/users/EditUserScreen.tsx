import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  FormField,
  Icon,
  LoadingIndicator,
  TextInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { userAdminService } from '../../services/user-admin.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { PublicUser, UserRole } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditUserRouteProp = RouteProp<RootStackParamList, 'EditUser'>;

export const EditUserScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditUserRouteProp>();
  const { user: currentAdmin, isAdmin } = useAuth();
  const userId = route.params?.id;

  const [initialUser, setInitialUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [active, setActive] = useState(true);
  const [monthlySalary, setMonthlySalary] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSelf = currentAdmin?.id === userId;

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await userAdminService.getUser(userId);
      setInitialUser(data);
      setName(data.name);
      setEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setRole(data.role);
      setActive(data.active);
      setMonthlySalary(
        data.monthlySalary !== null && data.monthlySalary !== undefined
          ? String(data.monthlySalary)
          : '',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load user details';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAdmin) {
      fetchUser();
    }
  }, [fetchUser, isAdmin]);

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit User',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="User administration is restricted to ADMIN accounts only."
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit User',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading user account..." />
      </AppScreen>
    );
  }

  if (fetchError || !initialUser) {
    return (
      <AppScreen
        headerProps={{
          title: 'Edit User',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="User Not Found"
          message={fetchError || 'The user account could not be found.'}
          onRetry={fetchUser}
        />
      </AppScreen>
    );
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail && !trimmedPhone) {
      errors.email = 'Either email address or phone number is required';
      errors.phone = 'Either phone number or email address is required';
    }

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (password && password.length < 8) {
      errors.password = 'New password must be at least 8 characters';
    } else if (password && password.length > 128) {
      errors.password = 'Password cannot exceed 128 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError(null);

      await userAdminService.updateUser(initialUser.id, {
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        phone: phone.trim() ? phone.trim() : null,
        role: isSelf ? undefined : role,
        active: isSelf ? undefined : active,
        password: password.trim() ? password : undefined,
        monthlySalary: monthlySalary.trim() ? Number(monthlySalary.replace(/[^0-9.]/g, '')) : null,
      });

      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      setGeneralError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'Edit User',
        subtitle: `Editing: ${initialUser.name}`,
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      contentContainerStyle={styles.screenContent}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {generalError ? (
            <View style={styles.errorBanner} testID="edit-user-error-banner">
              <Icon name="warning" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <Card style={styles.formCard} testID="edit-user-form-card">
            <FormField label="Full Name *" error={fieldErrors.name} required>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Full Name"
                autoCapitalize="words"
                testID="edit-user-name-input"
              />
            </FormField>

            <FormField label="Email Address" error={fieldErrors.email}>
              <TextInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="edit-user-email-input"
              />
            </FormField>

            <FormField label="Phone Number" error={fieldErrors.phone}>
              <TextInput
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                testID="edit-user-phone-input"
              />
            </FormField>

            <FormField
              label="Reset Password (Optional)"
              error={fieldErrors.password}
              helperText="Leave empty to keep the user's current password."
            >
              <TextInput
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Enter new password (min 8 chars)"
                secureTextEntry
                autoCapitalize="none"
                testID="edit-user-password-input"
              />
            </FormField>

            <FormField
              label="Monthly Fixed Salary (₹)"
              error={fieldErrors.monthlySalary}
              helperText="Monthly fixed salary used for employee attendance payroll calculations."
            >
              <TextInput
                value={monthlySalary}
                onChangeText={(val) => {
                  setMonthlySalary(val);
                  if (fieldErrors.monthlySalary) setFieldErrors((prev) => ({ ...prev, monthlySalary: '' }));
                }}
                placeholder="e.g. 25000"
                keyboardType="numeric"
                testID="edit-user-salary-input"
              />
            </FormField>

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionLabel}>Account Role</Text>
              {isSelf ? (
                <View style={styles.selfDisabledNotice}>
                  <Icon name="shield" size={14} color="#059669" />
                  <Text style={styles.selfDisabledText}>
                    You cannot change your own Administrator role.
                  </Text>
                </View>
              ) : (
                <View style={styles.roleSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      role === 'EMPLOYEE' ? styles.roleOptionSelected : null,
                    ]}
                    onPress={() => setRole('EMPLOYEE')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Select Staff Employee role"
                    testID="edit-user-role-employee"
                  >
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        role === 'EMPLOYEE' ? styles.roleTitleSelected : null,
                      ]}
                    >
                      Staff Employee
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      role === 'ADMIN' ? styles.roleOptionAdminSelected : null,
                    ]}
                    onPress={() => setRole('ADMIN')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Select Administrator role"
                    testID="edit-user-role-admin"
                  >
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        role === 'ADMIN' ? styles.roleTitleAdminSelected : null,
                      ]}
                    >
                      Administrator
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Account Status Selection */}
            <View style={styles.statusSection}>
              <Text style={styles.roleSectionLabel}>Account Status</Text>
              {isSelf ? (
                <View style={styles.selfDisabledNotice}>
                  <Icon name="warning" size={14} color="#059669" />
                  <Text style={styles.selfDisabledText}>
                    You cannot deactivate your currently active session.
                  </Text>
                </View>
              ) : (
                <View style={styles.statusSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusOptionCard,
                      active ? styles.statusOptionActive : null,
                    ]}
                    onPress={() => setActive(true)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Set status to Active"
                    testID="edit-user-status-active"
                  >
                    <Text
                      style={[
                        styles.statusOptionTitle,
                        active ? styles.statusActiveTitle : null,
                      ]}
                    >
                      Active Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusOptionCard,
                      !active ? styles.statusOptionInactive : null,
                    ]}
                    onPress={() => setActive(false)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Set status to Inactive"
                    testID="edit-user-status-inactive"
                  >
                    <Text
                      style={[
                        styles.statusOptionTitle,
                        !active ? styles.statusInactiveTitle : null,
                      ]}
                    >
                      Inactive Account
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
              onPress={handleUpdateUser}
              activeOpacity={0.8}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
              testID="edit-user-submit-button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="edit-user-cancel-button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  formCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  roleSection: {
    marginTop: 8,
    marginBottom: 14,
  },
  statusSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  roleSectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#1E293B',
    marginBottom: 8,
  },
  selfDisabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  selfDisabledText: {
    fontSize: fontSizes.xs,
    color: '#475569',
    fontWeight: fontWeights.medium,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  roleOptionSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.primary,
  },
  roleOptionAdminSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  roleOptionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleTitleAdminSelected: {
    color: '#7C3AED',
  },
  statusSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOptionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statusOptionActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  statusOptionInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  statusOptionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  statusActiveTitle: {
    color: '#065F46',
  },
  statusInactiveTitle: {
    color: '#DC2626',
  },
  actionsContainer: {
    gap: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...theme.shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
