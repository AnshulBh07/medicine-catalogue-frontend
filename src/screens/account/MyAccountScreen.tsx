import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Avatar,
  Card,
  ConfirmDialog,
  Icon,
} from '../../components';
import { useAuth } from '../../features/auth';
import { userProfileService } from '../../services/user-profile.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MyAccountScreen: React.FC = () => {
  const { user, isAdmin, updateUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'U';
  const roleDisplay = isAdmin ? 'Administrator' : 'Catalogue Staff';

  const handleConfirmRemoveImage = async () => {
    try {
      setIsRemoving(true);
      setErrorMessage(null);
      const updatedUser = await userProfileService.removeProfileImage();
      await updateUser(updatedUser);
      setShowRemoveDialog(false);
      setSuccessMessage('Profile picture removed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove profile picture';
      setErrorMessage(msg);
      setShowRemoveDialog(false);
      Alert.alert('Error', msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  return (
    <AppScreen
      scrollable={false}
      headerProps={{
        title: 'My Account',
        subtitle: 'Profile and account details',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      contentContainerStyle={styles.screenContent}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {errorMessage ? (
          <View style={styles.errorBanner} testID="account-error-banner">
            <Icon name="warning" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBanner} testID="account-success-banner">
            <Icon name="check" size={16} color="#059669" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* User Profile Card */}
        <Card style={styles.profileCard} testID="my-account-profile-card">
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={styles.avatarTouchable}
              testID="account-avatar-touchable"
            >
              <Avatar
                imageUrl={user?.profileImageUrl}
                initials={initials}
                size="xl"
                colorVariant="teal"
                testID="account-user-avatar"
              />
              <View
                style={styles.cameraBadge}
                testID="account-avatar-camera-badge"
              >
                <Icon name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.userName} numberOfLines={1}>
            {user?.name ?? 'admin'}
          </Text>

          <View style={styles.roleRow}>
            <Text style={styles.roleText}>{roleDisplay}</Text>
            {isAdmin ? <Icon name="shield-outline" size={14} color={colors.primary} /> : null}
          </View>
        </Card>

        {/* Account Details Card */}
        <Card style={styles.detailsCard} testID="account-details-card">
          <Text style={styles.sectionHeading}>Account Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Icon name="users" size={16} color="#059669" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name ?? 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Icon name="email" size={16} color="#2563EB" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email ?? 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Icon name="phone" size={16} color="#7C3AED" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{user?.phone ?? 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Icon name="shield" size={16} color="#D97706" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Role & Permissions</Text>
              <Text style={styles.detailValue}>{roleDisplay}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Icon name="time" size={16} color="#64748B" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
            testID="edit-profile-button"
          >
            <Icon name="edit" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Remove Profile Picture button - ONLY when user has an image */}
          {user?.profileImageUrl ? (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setShowRemoveDialog(true)}
              activeOpacity={0.8}
              disabled={isRemoving}
              accessibilityRole="button"
              accessibilityLabel="Remove Profile Picture"
              testID="remove-profile-picture-button"
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Icon name="delete" size={16} color="#DC2626" />
                  <Text style={styles.removeImageButtonText}>Remove Profile Picture</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* Remove Picture Confirmation Modal Dialog */}
      <ConfirmDialog
        visible={showRemoveDialog}
        title="Remove Profile Picture"
        message="Remove your profile picture?"
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleConfirmRemoveImage}
        onCancel={() => setShowRemoveDialog(false)}
        testID="remove-avatar-dialog"
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  scrollContainer: {
    paddingVertical: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  successText: {
    flex: 1,
    color: '#059669',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
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
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarTouchable: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    pointerEvents: 'none',
    ...theme.shadows.sm,
    elevation: 3,
  },
  userName: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: fontWeights.semibold,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...theme.shadows.sm,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: fontWeights.bold,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  removeImageButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: fontWeights.semibold,
  },
});
