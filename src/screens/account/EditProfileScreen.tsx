import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Avatar,
  Card,
  FormField,
  Icon,
  TextInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import {
  uploadProfileImage,
  type SelectedMedicineImage,
} from '../../services/image-upload.service';
import { userProfileService } from '../../services/user-profile.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EditProfileScreen: React.FC = () => {
  const { user, isAdmin, updateUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [selectedImage, setSelectedImage] = useState<SelectedMedicineImage | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (user && !initializedRef.current) {
      setName(user.name);
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
      initializedRef.current = true;
    }
  }, [user]);

  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : 'U';
  const roleDisplay = isAdmin ? 'Administrator' : 'Catalogue Staff';

  // Compute preview URL
  const previewImageUrl = removeExistingImage
    ? null
    : selectedImage?.uri ?? user?.profileImageUrl ?? null;

  const handlePickImage = async () => {
    try {
      setGeneralError(null);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted && !permissionResult.canAskAgain && Platform.OS !== 'web') {
        setGeneralError('Permission to access photo gallery was denied. Please allow gallery access in device settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Format validation
        const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
          setGeneralError('Unsupported image format. Please select a JPEG, PNG, or WebP image.');
          return;
        }

        // Size validation (10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          setGeneralError('Image size exceeds maximum limit of 10MB. Please choose a smaller photo.');
          return;
        }

        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64 || null,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || null,
          fileSize: asset.fileSize || null,
          width: asset.width || null,
          height: asset.height || null,
        });
        setRemoveExistingImage(false);
      }
    } catch (err) {
      console.warn('Profile image picker error:', err);
      setGeneralError('Failed to open image gallery. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedImage(null);
    setRemoveExistingImage(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required';
    } else if (trimmedName.length > 100) {
      errors.name = 'Full name must be 100 characters or less';
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      if (trimmedPhone.length < 7 || trimmedPhone.length > 20) {
        errors.phone = 'Phone number must be between 7 and 20 digits';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl: string | null | undefined = undefined;

      if (selectedImage) {
        try {
          const uploadRes = await uploadProfileImage(selectedImage);
          finalImageUrl = uploadRes.publicUrl;
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed';
          setGeneralError(`Image Upload Failed: ${msg}. Please try again.`);
          setIsSubmitting(false);
          return;
        }
      } else if (removeExistingImage) {
        finalImageUrl = null;
      }

      const updatedUser = await userProfileService.updateProfile({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        profileImageUrl: finalImageUrl,
      });

      await updateUser(updatedUser);

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      headerProps={{
        title: 'Edit Profile',
        subtitle: 'Update your personal details',
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
            <View style={styles.errorBanner} testID="edit-profile-error-banner">
              <Icon name="warning" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Profile Picture Card */}
          <Card style={styles.avatarCard} testID="edit-avatar-card">
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={styles.avatarTouchable}
              testID="profile-image-picker"
            >
              <Avatar
                imageUrl={previewImageUrl}
                initials={initials}
                size="xl"
                colorVariant="teal"
                testID="edit-profile-avatar"
              />
              <View style={styles.cameraOverlay} testID="camera-overlay-badge">
                <Icon name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarButtonsRow}>
              <TouchableOpacity
                style={styles.choosePhotoButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Choose photo from gallery"
                testID="choose-photo-button"
              >
                <Icon name="image" size={15} color={colors.primary} />
                <Text style={styles.choosePhotoButtonText}>
                  {previewImageUrl ? 'Change Photo' : 'Choose Photo'}
                </Text>
              </TouchableOpacity>

              {previewImageUrl ? (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  testID="remove-photo-button"
                >
                  <Icon name="delete" size={14} color="#DC2626" />
                  <Text style={styles.removePhotoButtonText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>

          {/* Edit Form Card */}
          <Card style={styles.formCard} testID="edit-profile-form-card">
            <FormField label="Full Name *" error={fieldErrors.name} required>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                placeholder="Enter your full name"
                autoCapitalize="words"
                testID="edit-profile-name-input"
              />
            </FormField>

            <FormField label="Email Address" error={fieldErrors.email}>
              <TextInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="edit-profile-email-input"
              />
            </FormField>

            <FormField label="Phone Number" error={fieldErrors.phone}>
              <TextInput
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (fieldErrors.phone) {
                    setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }
                }}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                testID="edit-profile-phone-input"
              />
            </FormField>

            {/* Non-editable Role Information */}
            <View style={styles.readOnlyRoleBox} testID="readonly-role-box">
              <View style={styles.roleHeaderRow}>
                <Icon name="shield" size={15} color="#065F46" />
                <Text style={styles.roleBoxLabel}>Role & Permissions (Managed by Admin)</Text>
              </View>
              <Text style={styles.roleBoxValue}>{roleDisplay}</Text>
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
              testID="save-profile-button"
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
              testID="cancel-profile-button"
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
    paddingBottom: 24,
  },
  keyboardContainer: {
    flex: 1,
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
  avatarCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 14,
  },
  cameraOverlay: {
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
  avatarButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choosePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  choosePhotoButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  removePhotoButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  formCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  readOnlyRoleBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleBoxLabel: {
    fontSize: 11.5,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  roleBoxValue: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...theme.shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: fontWeights.bold,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: fontWeights.semibold,
  },
});
