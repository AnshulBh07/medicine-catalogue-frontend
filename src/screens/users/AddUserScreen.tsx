import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Card,
  ErrorState,
  FormField,
  Icon,
  TextInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { userAdminService } from '../../services/user-admin.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { UserRole } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AddUserScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [monthlySalary, setMonthlySalary] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'Create User',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="Access Restricted"
          message="User creation is restricted to ADMIN accounts only."
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

    if (!password) {
      errors.password = 'Initial password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (password.length > 128) {
      errors.password = 'Password cannot exceed 128 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError(null);

      await userAdminService.createUser({
        name: name.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        phone: phone.trim() ? phone.trim() : null,
        password,
        role,
        monthlySalary: monthlySalary.trim() ? Number(monthlySalary.replace(/[^0-9.]/g, '')) : null,
      });

      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      setGeneralError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      headerProps={{
        title: 'Create User',
        subtitle: 'New Staff or Administrator Account',
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
            <View style={styles.errorBanner} testID="create-user-error-banner">
              <Icon name="warning" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <Card style={styles.formCard} testID="create-user-form-card">
            <FormField label="Full Name *" error={fieldErrors.name} required>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Dr. Rajesh Sharma"
                autoCapitalize="words"
                testID="create-user-name-input"
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
                testID="create-user-email-input"
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
                testID="create-user-phone-input"
              />
            </FormField>

            <FormField label="Initial Password *" error={fieldErrors.password} required>
              <TextInput
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Minimum 8 characters"
                secureTextEntry
                autoCapitalize="none"
                testID="create-user-password-input"
              />
            </FormField>

            <FormField
              label="Monthly Fixed Salary (₹)"
              error={fieldErrors.monthlySalary}
              helperText="Monthly salary used for employee attendance payroll calculations."
            >
              <TextInput
                value={monthlySalary}
                onChangeText={(val) => {
                  setMonthlySalary(val);
                  if (fieldErrors.monthlySalary) setFieldErrors((prev) => ({ ...prev, monthlySalary: '' }));
                }}
                placeholder="e.g. 25000"
                keyboardType="numeric"
                testID="create-user-salary-input"
              />
            </FormField>

            {/* Role Selector */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionLabel}>Account Role *</Text>
              <View style={styles.roleSelectorRow}>
                {/* Employee Option */}
                <TouchableOpacity
                  style={[
                    styles.roleOptionCard,
                    role === 'EMPLOYEE' ? styles.roleOptionSelected : null,
                  ]}
                  onPress={() => setRole('EMPLOYEE')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Select Staff Employee role"
                  testID="create-user-role-employee"
                >
                  <View style={styles.roleOptionHeader}>
                    <Icon
                      name="users"
                      size={18}
                      color={role === 'EMPLOYEE' ? colors.primary : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        role === 'EMPLOYEE' ? styles.roleTitleSelected : null,
                      ]}
                    >
                      Staff Employee
                    </Text>
                  </View>
                  <Text style={styles.roleOptionDesc}>
                    Can view & manage medicines, MRs, compositions, and batches.
                  </Text>
                </TouchableOpacity>

                {/* Admin Option */}
                <TouchableOpacity
                  style={[
                    styles.roleOptionCard,
                    role === 'ADMIN' ? styles.roleOptionAdminSelected : null,
                  ]}
                  onPress={() => setRole('ADMIN')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Select Administrator role"
                  testID="create-user-role-admin"
                >
                  <View style={styles.roleOptionHeader}>
                    <Icon
                      name="crown"
                      size={18}
                      color={role === 'ADMIN' ? '#7C3AED' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        role === 'ADMIN' ? styles.roleTitleAdminSelected : null,
                      ]}
                    >
                      Administrator
                    </Text>
                  </View>
                  <Text style={styles.roleOptionDesc}>
                    Full access including User Administration & commercial pricing.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
              onPress={handleCreateUser}
              activeOpacity={0.8}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Create User"
              testID="create-user-submit-button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Create User</Text>
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
              testID="create-user-cancel-button"
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
    marginBottom: 6,
  },
  roleSectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#1E293B',
    marginBottom: 10,
  },
  roleSelectorRow: {
    gap: 10,
  },
  roleOptionCard: {
    padding: 14,
    borderRadius: 12,
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
  roleOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleOptionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleTitleAdminSelected: {
    color: '#7C3AED',
  },
  roleOptionDesc: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    lineHeight: 16,
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
