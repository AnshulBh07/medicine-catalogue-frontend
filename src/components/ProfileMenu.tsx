import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontWeights, theme } from '../theme';
import type { PublicUser } from '../types/models';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  user: PublicUser | null;
  isAdmin: boolean;
  onNavigateMyAccount?: () => void;
  onNavigateSettings?: () => void;
  onNavigateAdminPanel?: () => void;
  onSignOut: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DRAWER_WIDTH = 280;

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  visible,
  onClose,
  user,
  isAdmin,
  onNavigateMyAccount,
  onNavigateSettings,
  onNavigateAdminPanel,
  onSignOut,
  style,
  testID = 'profile-menu',
}) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const animValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      animValue.setValue(0);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // When menu opens on web, blur active element so aria-hidden does not trap focus
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (
          activeEl &&
          activeEl !== document.body &&
          typeof activeEl.blur === 'function'
        ) {
          activeEl.blur();
        }
      }
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
        }
      });
    }
  }, [visible, animValue]);

  const handleClose = () => {
    onClose();
  };

  const handleMyAccount = () => {
    onClose();
    if (onNavigateMyAccount) {
      onNavigateMyAccount();
    }
  };

  const handleSettings = () => {
    onClose();
    if (onNavigateSettings) {
      onNavigateSettings();
    }
  };

  const handleAdminPanel = () => {
    onClose();
    if (onNavigateAdminPanel) {
      onNavigateAdminPanel();
    }
  };

  const handleSignOut = () => {
    onClose();
    onSignOut();
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  const roleDisplay = isAdmin
    ? 'Administrator'
    : user?.role === 'EMPLOYEE'
      ? 'Staff Member'
      : 'Catalogue Staff';

  if (!modalVisible && !visible) return null;

  // Drawer slides horizontally from right (+DRAWER_WIDTH -> 0)
  const drawerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
    extrapolate: 'clamp',
  });

  // Scrim fades in independently (0 -> 1)
  const scrimOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      testID={testID}
    >
      <View style={styles.modalContainer}>
        {/* Full-screen dark scrim fading in independently */}
        <Animated.View
          style={[styles.backdrop, { opacity: scrimOpacity }]}
          renderToHardwareTextureAndroid={true}
          needsOffscreenAlphaCompositing={true}
          testID={`${testID}-backdrop-container`}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close account menu"
            testID={`${testID}-backdrop`}
          />
        </Animated.View>

        {/* Side Drawer Menu Card sliding horizontally from right */}
        <Animated.View
          style={[
            styles.menuCard,
            {
              transform: [{ translateX: drawerTranslateX }],
            },
            style,
          ]}
          renderToHardwareTextureAndroid={true}
          testID={`${testID}-content`}
        >
          {/* Drawer Top Header: Logo/Title & Close Button */}
          <View style={styles.drawerTopBar}>
            <View style={styles.drawerBrandGroup}>
              <View style={styles.drawerBrandIcon}>
                <Icon name="person" size={16} color={colors.primary} />
              </View>
              <Text style={styles.drawerBrandTitle}>Account & Settings</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={styles.drawerCloseButton}
            >
              <Icon name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* User Header Section */}
          <View style={styles.userHeader}>
            <Avatar
              imageUrl={user?.profileImageUrl}
              initials={initials}
              size="sm"
              colorVariant="green"
              testID={`${testID}-user-avatar`}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name ?? 'User'}
              </Text>
              <Text style={styles.userRole} numberOfLines={1}>
                {roleDisplay}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Standard Menu Items */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleMyAccount}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="My Account"
            testID={`${testID}-item-my-account`}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="person" size={16} color="#2563EB" />
            </View>
            <Text style={styles.menuItemLabel}>My Account</Text>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSettings}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            testID={`${testID}-item-settings`}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
              <Icon name="settings" size={16} color="#475569" />
            </View>
            <Text style={styles.menuItemLabel}>Settings</Text>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>

          {/* Role-based Admin Section (ONLY for ADMIN users) */}
          {isAdmin ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleAdminPanel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Admin Panel"
                testID={`${testID}-item-admin-panel`}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="shield" size={16} color="#059669" />
                </View>
                <Text style={styles.menuItemLabel}>Admin Panel</Text>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.divider} />

          {/* Sign Out Item */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            testID={`${testID}-item-sign-out`}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="logout" size={16} color="#DC2626" />
            </View>
            <Text style={[styles.menuItemLabel, styles.signOutLabel]}>Sign Out</Text>
            <Icon name="chevron-right" size={14} color="#FCA5A5" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  menuCard: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    maxWidth: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderLeftWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: Platform.OS === 'web' ? 20 : 48,
    paddingBottom: 24,
    paddingHorizontal: 14,
    ...theme.shadows.lg,
    elevation: 16,
    ...Platform.select({
      web: {
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.18)',
      },
    }),
  },
  drawerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerBrandIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBrandTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  drawerCloseButton: {
    padding: 4,
    borderRadius: 6,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarInitials: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: '#085444',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  userRole: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    gap: 9,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: '#0F172A',
    flex: 1,
  },
  signOutLabel: {
    color: '#DC2626',
    fontWeight: fontWeights.semibold,
  },
});
