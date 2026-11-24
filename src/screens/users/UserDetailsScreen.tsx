import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Avatar,
  Badge,
  Card,
  ConfirmDialog,
  ErrorState,
  Icon,
  LoadingIndicator,
} from '../../components';
import { useAuth } from '../../features/auth';
import { userAdminService } from '../../services/user-admin.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { PublicUser } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserDetailsRouteProp = RouteProp<RootStackParamList, 'UserDetails'>;

export const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserDetailsRouteProp>();
  const { user: currentAdmin, isAdmin } = useAuth();
  const userId = route.params?.id;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog states
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const isSelf = currentAdmin?.id === userId;

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await userAdminService.getUser(userId);
      setUser(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load user details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAdmin) {
      fetchUserDetails();
    }
  }, [fetchUserDetails, isAdmin]);

  const handleToggleStatus = async () => {
    if (!user) return;
    if (isSelf && user.active) {
      Alert.alert('Protection Warning', 'You cannot deactivate your own administrator account.');
      setShowStatusDialog(false);
      return;
    }

    try {
      setIsProcessingAction(true);
      setActionMessage(null);
      const targetStatus = !user.active;
      const updated = await userAdminService.updateUserStatus(user.id, targetStatus);
      setUser(updated);
      setActionMessage({
        text: `User account successfully ${targetStatus ? 'activated' : 'deactivated'}.`,
        isError: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update account status';
      setActionMessage({ text: msg, isError: true });
    } finally {
      setIsProcessingAction(false);
      setShowStatusDialog(false);
    }
  };

  const handleToggleRole = async () => {
    if (!user) return;
    const targetRole = user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';

    if (isSelf && targetRole === 'EMPLOYEE') {
      Alert.alert('Protection Warning', 'You cannot demote your own account from Administrator.');
      setShowRoleDialog(false);
      return;
    }

    try {
      setIsProcessingAction(true);
      setActionMessage(null);
      const updated = await userAdminService.updateUserRole(user.id, targetRole);
      setUser(updated);
      setActionMessage({
        text: `User role successfully changed to ${targetRole}.`,
        isError: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role';
      setActionMessage({ text: msg, isError: true });
    } finally {
      setIsProcessingAction(false);
      setShowRoleDialog(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    if (isSelf) {
      Alert.alert('Protection Warning', 'You cannot delete your own administrator account.');
      setShowDeleteDialog(false);
      return;
    }

    try {
      setIsProcessingAction(true);
      setActionMessage(null);
      await userAdminService.deleteUser(user.id);
      setShowDeleteDialog(false);
      navigation.navigate('Users');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setActionMessage({ text: msg, isError: true });
      setShowDeleteDialog(false);
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'User Details',
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
          title: 'User Details',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <LoadingIndicator message="Loading user details..." />
      </AppScreen>
    );
  }

  if (error || !user) {
    return (
      <AppScreen
        headerProps={{
          title: 'User Details',
          showBack: true,
          onBack: () => navigation.goBack(),
        }}
      >
        <ErrorState
          title="User Not Found"
          message={error || 'The requested user could not be found.'}
          onRetry={fetchUserDetails}
        />
      </AppScreen>
    );
  }

  const initials = user.name.trim() ? user.name.trim().slice(0, 2).toUpperCase() : 'US';
  const isUserAdmin = user.role === 'ADMIN';
  const formattedCreated = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedUpdated = new Date(user.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'User Details',
        subtitle: isSelf ? 'Your Account (Admin Session)' : user.name,
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      contentContainerStyle={styles.screenContent}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {actionMessage ? (
          <View
            style={[
              styles.actionBanner,
              actionMessage.isError ? styles.actionBannerError : styles.actionBannerSuccess,
            ]}
            testID="user-details-banner"
          >
            <Icon
              name={actionMessage.isError ? 'warning' : 'check'}
              size={16}
              color={actionMessage.isError ? '#DC2626' : '#059669'}
            />
            <Text
              style={[
                styles.actionBannerText,
                actionMessage.isError ? styles.actionTextError : styles.actionTextSuccess,
              ]}
            >
              {actionMessage.text}
            </Text>
          </View>
        ) : null}

        {/* Profile Card */}
        <Card style={styles.profileCard} testID="user-details-profile-card">
          <Avatar
            imageUrl={user.profileImageUrl}
            initials={initials}
            size="xl"
            colorVariant={isUserAdmin ? 'purple' : 'blue'}
            testID="user-details-avatar"
          />

          <Text style={styles.profileName} numberOfLines={1}>
            {user.name}
          </Text>

          <View style={styles.badgeRow}>
            <Badge
              label={user.role}
              variant={isUserAdmin ? 'admin' : 'employee'}
              testID="user-details-role-badge"
            />

            <View
              style={[
                styles.statusBadge,
                user.active ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: user.active ? '#10B981' : '#94A3B8' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: user.active ? '#065F46' : '#64748B' },
                ]}
              >
                {user.active ? 'Active Account' : 'Inactive Account'}
              </Text>
            </View>
          </View>

          {isSelf ? (
            <View style={styles.selfNoticeBox}>
              <Icon name="shield" size={14} color="#047857" />
              <Text style={styles.selfNoticeText}>Currently Logged In Admin</Text>
            </View>
          ) : null}
        </Card>

        {/* Information Card */}
        <Card style={styles.infoCard} testID="user-details-info-card">
          <Text style={styles.cardHeading}>Account Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="email" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="phone" size={16} color="#7C3AED" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phone || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="commercial" size={16} color="#059669" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Monthly Fixed Salary</Text>
              <Text style={styles.infoValue}>
                {user.monthlySalary !== null && user.monthlySalary !== undefined
                  ? `₹${Number(user.monthlySalary).toLocaleString('en-IN')}`
                  : 'Not configured'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="shield" size={16} color="#D97706" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Role & Permissions</Text>
              <Text style={styles.infoValue}>
                {isUserAdmin ? 'Administrator (Full Access)' : 'Catalogue Staff (Standard Access)'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="time" size={16} color="#64748B" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Registered Since</Text>
              <Text style={styles.infoValue}>{formattedCreated}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="refresh" size={16} color="#64748B" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Last Profile Update</Text>
              <Text style={styles.infoValue}>{formattedUpdated}</Text>
            </View>
          </View>
        </Card>

        {/* Administration Actions Card */}
        <Card style={styles.actionsCard} testID="user-details-actions-card">
          <Text style={styles.cardHeading}>Account Actions</Text>

          {/* Edit User Button */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('EditUser', { id: user.id })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit User Details"
            testID="user-edit-button"
          >
            <Icon name="edit" size={16} color="#FFFFFF" />
            <Text style={styles.primaryActionButtonText}>Edit User Information</Text>
          </TouchableOpacity>

          {/* View Attendance Calendar (Employees only) */}
          {user.role === 'EMPLOYEE' ? (
            <TouchableOpacity
              style={styles.attendanceActionButton}
              onPress={() => navigation.navigate('AttendanceCalendar', { userId: user.id })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View Attendance Calendar"
              testID="user-view-attendance-button"
            >
              <Icon name="calendar" size={16} color="#059669" />
              <Text style={styles.attendanceActionText}>View Attendance Calendar</Text>
            </TouchableOpacity>
          ) : null}

          {/* Role Change Button */}
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              isSelf ? styles.actionButtonDisabled : null,
            ]}
            onPress={() => {
              if (isSelf) {
                Alert.alert('Protection Warning', 'You cannot change your own administrator role.');
              } else {
                setShowRoleDialog(true);
              }
            }}
            activeOpacity={0.7}
            disabled={isProcessingAction}
            accessibilityRole="button"
            accessibilityLabel={`Change role to ${isUserAdmin ? 'EMPLOYEE' : 'ADMIN'}`}
            testID="user-change-role-button"
          >
            <Icon name="shield" size={16} color="#4338CA" />
            <Text style={styles.secondaryActionText}>
              {isUserAdmin ? 'Change Role to Employee' : 'Promote to Administrator'}
            </Text>
          </TouchableOpacity>

          {/* Activate / Deactivate Button */}
          <TouchableOpacity
            style={[
              styles.statusActionButton,
              user.active ? styles.deactivateButton : styles.activateButton,
              isSelf ? styles.actionButtonDisabled : null,
            ]}
            onPress={() => {
              if (isSelf && user.active) {
                Alert.alert('Protection Warning', 'You cannot deactivate your own account.');
              } else {
                setShowStatusDialog(true);
              }
            }}
            activeOpacity={0.7}
            disabled={isProcessingAction}
            accessibilityRole="button"
            accessibilityLabel={user.active ? 'Deactivate User Account' : 'Activate User Account'}
            testID="user-toggle-status-button"
          >
            {isProcessingAction ? (
              <ActivityIndicator size="small" color={user.active ? '#DC2626' : '#059669'} />
            ) : (
              <>
                <Icon
                  name={user.active ? 'warning' : 'check'}
                  size={16}
                  color={user.active ? '#DC2626' : '#059669'}
                />
                <Text
                  style={[
                    styles.statusActionButtonText,
                    { color: user.active ? '#DC2626' : '#059669' },
                  ]}
                >
                  {user.active ? 'Deactivate Account' : 'Reactivate Account'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete User Button */}
          <TouchableOpacity
            style={[
              styles.deleteActionButton,
              isSelf ? styles.actionButtonDisabled : null,
            ]}
            onPress={() => {
              if (isSelf) {
                Alert.alert('Protection Warning', 'You cannot delete your own administrator account.');
              } else {
                setShowDeleteDialog(true);
              }
            }}
            activeOpacity={0.7}
            disabled={isProcessingAction || isSelf}
            accessibilityRole="button"
            accessibilityLabel="Delete User Account"
            testID="user-delete-button"
          >
            <Icon name="delete" size={16} color="#DC2626" />
            <Text style={styles.deleteActionButtonText}>Delete User Permanently</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        visible={showStatusDialog}
        title={user.active ? 'Deactivate Account' : 'Activate Account'}
        message={
          user.active
            ? `Are you sure you want to deactivate ${user.name}'s account? Inactive users cannot log in.`
            : `Are you sure you want to reactivate ${user.name}'s account? They will regain system access.`
        }
        confirmText={user.active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        isDestructive={user.active}
        onConfirm={handleToggleStatus}
        onCancel={() => setShowStatusDialog(false)}
        testID="user-status-confirm-dialog"
      />

      <ConfirmDialog
        visible={showRoleDialog}
        title="Change User Role"
        message={`Are you sure you want to change ${user.name}'s role to ${
          isUserAdmin ? 'EMPLOYEE' : 'ADMIN'
        }?`}
        confirmText="Confirm Role Change"
        cancelText="Cancel"
        onConfirm={handleToggleRole}
        onCancel={() => setShowRoleDialog(false)}
        testID="user-role-confirm-dialog"
      />

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete User Permanently"
        message={`Are you sure you want to delete ${user.name}? This action cannot be undone. If this user has recorded commercial pricing updates, please deactivate their account instead.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeleteUser}
        onCancel={() => setShowDeleteDialog(false)}
        testID="user-delete-confirm-dialog"
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
  },
  actionBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  actionBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  actionBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  actionTextSuccess: {
    color: '#059669',
  },
  actionTextError: {
    color: '#DC2626',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  selfNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    gap: 6,
  },
  selfNoticeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#065F46',
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  actionsCard: {
    padding: 16,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  cardHeading: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    color: '#0F172A',
    fontWeight: fontWeights.medium,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  primaryActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  attendanceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  attendanceActionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#059669',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  secondaryActionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#4338CA',
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  deactivateButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  activateButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteActionButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#DC2626',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});
