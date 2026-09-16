import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppLogo,
  AppScreen,
  Avatar,
  ConfirmDialog,
  Icon,
  type IconName,
  LastUpdatedGraphic,
  LeafWatermarkGraphic,
  PharmacyShelfGraphic,
  ProfileMenu,
  SectionHeader,
} from '../../components';
import { apiClient } from '../../services/api-client';
import { useAuth } from '../../features/auth';
import { borderRadius, fontWeights } from '../../theme';
import type {
  PublicComposition,
  PublicManufacturer,
  PublicMedicine,
  PublicMr,
} from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

interface RecentActivityItem {
  id: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

interface RecentItem {
  id: string;
  type: 'medicine' | 'mr' | 'manufacturer';
  title: string;
  subtitle: string;
  tag: string;
  tagStyle: 'green' | 'purple';
  icon: IconName;
  iconBg: string;
  iconColor: string;
  initials?: string;
  createdAt: string;
  onPress: () => void;
}

function formatActivityTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'Recently';
  }
}

export const DashboardScreen: React.FC = () => {
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [recentItems, setRecentItems] = useState<RecentItem[]>([
    {
      id: 'default-med-1',
      type: 'medicine',
      title: 'Becosules Z Capsule',
      subtitle: 'Multivitamin with Zinc',
      tag: 'Medicine',
      tagStyle: 'green',
      icon: 'medicines',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      createdAt: '2026-01-01T00:00:00.000Z',
      onPress: () => navigation.navigate('MainTabs', { screen: 'MedicinesTab' }),
    },
    {
      id: 'default-med-2',
      type: 'medicine',
      title: 'Ascoril D Plus Syrup 100ml',
      subtitle: 'Dry Cough Relief Syrup',
      tag: 'Medicine',
      tagStyle: 'green',
      icon: 'medicines',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      createdAt: '2026-01-01T00:00:00.000Z',
      onPress: () => navigation.navigate('MainTabs', { screen: 'MedicinesTab' }),
    },
    {
      id: 'default-med-3',
      type: 'medicine',
      title: 'Benadryl Cough Syrup 100ml',
      subtitle: 'Antihistamine Cough Formula',
      tag: 'Medicine',
      tagStyle: 'green',
      icon: 'medicines',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      createdAt: '2026-01-01T00:00:00.000Z',
      onPress: () => navigation.navigate('MainTabs', { screen: 'MedicinesTab' }),
    },
  ]);

  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([
    {
      id: 'activity-1',
      icon: 'plus',
      iconBg: '#E6F7ED',
      iconColor: '#10B981',
      title: 'Added new medicine',
      subtitle: 'Paracetamol 650mg',
      timestamp: '10:24 AM',
    },
    {
      id: 'activity-2',
      icon: 'edit',
      iconBg: '#F3E8FF',
      iconColor: '#8B5CF6',
      title: 'Updated composition',
      subtitle: 'Amoxicillin + Clavulanic Acid',
      timestamp: 'Yesterday',
    },
    {
      id: 'activity-3',
      icon: 'document-text',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      title: 'Added manufacturer',
      subtitle: 'Cipla Ltd.',
      timestamp: '25 Apr 2025',
    },
  ]);

  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Today, 10:36 AM');

  const fetchRecentlyAdded = useCallback(async () => {
    try {
      const [medRes, mrRes, mfgRes, compRes] = await Promise.allSettled([
        apiClient.get<{ medicines: PublicMedicine[] }>('/medicines?sortBy=createdAt&sortOrder=desc'),
        apiClient.get<{ mrs: PublicMr[] }>('/mrs?sortBy=createdAt&sortOrder=desc&limit=5'),
        apiClient.get<{ manufacturers: PublicManufacturer[] }>('/manufacturers?sortBy=newest'),
        apiClient.get<{ compositions: PublicComposition[] }>('/compositions?limit=5'),
      ]);

      const items: RecentItem[] = [];

      if (medRes.status === 'fulfilled' && Array.isArray(medRes.value?.medicines)) {
        for (const med of medRes.value.medicines) {
          items.push({
            id: `med-${med.id}`,
            type: 'medicine',
            title: med.name,
            subtitle: med.shortDescription || med.uses || (med.composition ? med.composition.displayText : 'Medicine'),
            tag: 'Medicine',
            tagStyle: 'green',
            icon: 'medicines',
            iconBg: '#FEE2E2',
            iconColor: '#EF4444',
            createdAt: med.createdAt,
            onPress: () => navigation.navigate('MedicineDetails', { id: med.id }),
          });
        }
      }

      if (mrRes.status === 'fulfilled' && Array.isArray(mrRes.value?.mrs)) {
        for (const mr of mrRes.value.mrs) {
          const initials = mr.name
            ? mr.name
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'MR';
          items.push({
            id: `mr-${mr.id}`,
            type: 'mr',
            title: `${mr.name} (MR)`,
            subtitle: mr.company || 'Medical Representative',
            tag: 'MR',
            tagStyle: 'purple',
            icon: 'person',
            iconBg: '#EDE9FE',
            iconColor: '#7C3AED',
            initials,
            createdAt: mr.createdAt,
            onPress: () => navigation.navigate('MrDetails', { id: mr.id }),
          });
        }
      }

      if (mfgRes.status === 'fulfilled' && Array.isArray(mfgRes.value?.manufacturers)) {
        for (const mfg of mfgRes.value.manufacturers) {
          items.push({
            id: `mfg-${mfg.id}`,
            type: 'manufacturer',
            title: mfg.name,
            subtitle: 'Pharmaceutical Company',
            tag: 'Manufacturer',
            tagStyle: 'green',
            icon: 'manufacturers',
            iconBg: '#D1FAE5',
            iconColor: '#059669',
            createdAt: mfg.createdAt,
            onPress: () => navigation.navigate('Manufacturers'),
          });
        }
      }

      if (items.length > 0) {
        items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecentItems(items.slice(0, 3));
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        setLastUpdatedText(`Today, ${formattedHours}:${minutes} ${ampm}`);
      }

      // Dynamically populate recent activities using real data from server if available
      const activities: RecentActivityItem[] = [];
      if (medRes.status === 'fulfilled' && Array.isArray(medRes.value?.medicines) && medRes.value.medicines.length > 0) {
        const topMed = medRes.value.medicines[0];
        activities.push({
          id: `act-med-${topMed.id}`,
          icon: 'plus',
          iconBg: '#E6F7ED',
          iconColor: '#10B981',
          title: 'Added new medicine',
          subtitle: topMed.name,
          timestamp: formatActivityTime(topMed.createdAt),
        });
      }
      if (compRes.status === 'fulfilled' && Array.isArray(compRes.value?.compositions) && compRes.value.compositions.length > 0) {
        const topComp = compRes.value.compositions[0];
        activities.push({
          id: `act-comp-${topComp.id}`,
          icon: 'edit',
          iconBg: '#F3E8FF',
          iconColor: '#8B5CF6',
          title: 'Updated composition',
          subtitle: topComp.displayText,
          timestamp: formatActivityTime(topComp.updatedAt || topComp.createdAt),
        });
      }
      if (mfgRes.status === 'fulfilled' && Array.isArray(mfgRes.value?.manufacturers) && mfgRes.value.manufacturers.length > 0) {
        const topMfg = mfgRes.value.manufacturers[0];
        activities.push({
          id: `act-mfg-${topMfg.id}`,
          icon: 'document-text',
          iconBg: '#E0F2FE',
          iconColor: '#0284C7',
          title: 'Added manufacturer',
          subtitle: topMfg.name,
          timestamp: formatActivityTime(topMfg.createdAt),
        });
      }
      if (activities.length > 0) {
        setRecentActivities(activities);
      }
    } catch {
      // Keep existing items if fetch fails
    }
  }, [navigation]);

  // Keep user profile data and recently added items in sync whenever returning to Dashboard
  useFocusEffect(
    useCallback(() => {
      void refreshUser();
      void fetchRecentlyAdded();
    }, [refreshUser, fetchRecentlyAdded]),
  );

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const quickActions: QuickActionItem[] = [
    {
      id: 'shortage',
      title: 'Shortage Notes',
      subtitle: 'Daily orders\nand notes',
      icon: 'clipboard',
      iconBg: '#E6F7ED',
      iconColor: '#10B981',
      onPress: () => navigation.navigate('ShortageNotebook'),
    },
    ...(isAdmin
      ? [
          {
            id: 'deals',
            title: 'Medicine Deals',
            subtitle: 'Agreed MR schemes\nand delivery',
            icon: 'pricetag',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            onPress: () => navigation.navigate('Deals' as never),
          } as QuickActionItem,
        ]
      : []),
    {
      id: 'medicines',
      title: 'Medicines',
      subtitle: 'View and manage\nmedicines',
      icon: 'medicines',
      iconBg: '#E6F7ED',
      iconColor: '#10B981',
      onPress: () => navigation.navigate('MainTabs', { screen: 'MedicinesTab' }),
    },
    {
      id: 'mrs',
      title: 'MR Registry',
      subtitle: 'Manage\nrepresentatives',
      icon: 'mr-registry',
      iconBg: '#F3E8FF',
      iconColor: '#8B5CF6',
      onPress: () => navigation.navigate('MainTabs', { screen: 'MrsTab' }),
    },
    {
      id: 'manufacturers',
      title: 'Manufacturers',
      subtitle: 'Company\ninformation',
      icon: 'manufacturers',
      iconBg: '#E0F7F6',
      iconColor: '#0D9488',
      onPress: () => navigation.navigate('Manufacturers'),
    },
    {
      id: 'compositions',
      title: 'Compositions',
      subtitle: 'Active ingredients\nand compositions',
      icon: 'compositions',
      iconBg: '#F5E8FF',
      iconColor: '#A855F7',
      onPress: () => navigation.navigate('Compositions'),
    },
    {
      id: 'salts',
      title: 'Salts',
      subtitle: 'Salt information\nand mapping',
      icon: 'salts',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      onPress: () => navigation.navigate('Salts'),
    },
  ];

  const handleToggleProfileMenu = () => {
    setShowProfileMenu((prev) => !prev);
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

  const todayFormatted = (() => {
    const d = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  })();

  return (
    <AppScreen
      backgroundColor="#F8FAFC"
      headerContainerStyle={styles.headerContainer}
      headerProps={{
        title: 'A.P. PHARMACY',
        subtitle: 'Medicine Catalogue System',
        titleStyle: styles.headerTitle,
        subtitleStyle: styles.headerSubtitle,
        leftAction: <AppLogo size={46} variant="inverse" testID="dashboard-header-logo" />,
        rightAction: (
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.notificationButton}
            >
              <Icon name="notifications" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerDivider} />

            <TouchableOpacity
              onPress={handleToggleProfileMenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Account menu"
              style={styles.headerAvatarButton}
              testID="dashboard-avatar-button"
            >
              <Avatar
                imageUrl={user?.profileImageUrl}
                initials={initials}
                size="md"
                colorVariant="green"
                testID="dashboard-header-avatar"
              />
            </TouchableOpacity>
          </View>
        ),
      }}
      contentContainerStyle={styles.screenContent}
    >
      {/* Top Background Curve decoration */}
      <View style={styles.topCurveBackground} />

      {/* 1. Welcome Card matching Reference Image 1 */}
      <View style={styles.welcomeCard}>
        {/* Top row: Left greeting, username, badge; Right medicine illustration */}
        <View style={styles.welcomeTopRow}>
          <View style={styles.welcomeLeftCol}>
            <Text style={styles.welcomeGreeting}>Welcome back,</Text>
            <Text style={styles.welcomeUserName} numberOfLines={1}>
              {user?.name ?? 'admin'}
            </Text>

            <View style={styles.roleBadgeContainer}>
              <Icon name="shield-outline" size={13} color="#1B6A53" />
              <Text style={styles.roleBadgeText}>
                {isAdmin ? 'Administrator' : 'Catalogue Staff'}
              </Text>
            </View>
          </View>

          <View style={styles.welcomeIllustrationCol}>
            <PharmacyShelfGraphic width={140} height={100} />
          </View>
        </View>

        {/* Bottom row: Left slogan; Right weather & date */}
        <View style={styles.welcomeBottomRow}>
          <Text style={styles.welcomeSlogan}>
            Manage medicines. Serve better.
          </Text>

          <View style={styles.weatherDateRow}>
            <Icon name="sunny" size={20} color="#EAB308" />
            <View style={styles.weatherDateCol}>
              <Text style={styles.weatherDateText}>{todayFormatted}</Text>
              <Text style={styles.weatherSubtext}>Have a productive day!</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Quick Actions Grid (Reference 1) */}
      <SectionHeader
        title="Quick Actions"
        actionTitle="View All"
        actionIcon="arrow-forward"
        onAction={() => navigation.navigate('MainTabs', { screen: 'MoreTab' })}
        style={styles.sectionHeader}
      />
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickCard}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: action.iconBg }]}>
              <Icon name={action.icon} size={22} color={action.iconColor} />
            </View>
            <View style={styles.quickCardTextArea}>
              <Text style={styles.quickCardTitle} numberOfLines={1}>
                {action.title}
              </Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={2}>
                {action.subtitle}
              </Text>
            </View>
            <View style={styles.quickCardArrowCircle}>
              <Icon name="chevron-right" size={11} color="#15803D" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. Recent Activity Section (Reference 1) */}
      <SectionHeader
        icon="time"
        title="Recent Activity"
        actionTitle="View All"
        actionIcon="arrow-forward"
        onAction={() => navigation.navigate('MainTabs', { screen: 'MedicinesTab' })}
        style={styles.sectionHeader}
      />
      <View style={styles.recentActivityCard}>
        {recentActivities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            {index > 0 && <View style={styles.cardDivider} />}
            <View style={styles.recentActivityRow}>
              <View style={[styles.recentActivityIconCircle, { backgroundColor: activity.iconBg }]}>
                <Icon name={activity.icon} size={16} color={activity.iconColor} />
              </View>
              <View style={styles.recentActivityBody}>
                <Text style={styles.recentActivityTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text style={styles.recentActivitySubtitle} numberOfLines={1}>
                  {activity.subtitle}
                </Text>
              </View>
              <Text style={styles.recentActivityTime}>{activity.timestamp}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* 4. Admin Operations Section (Reference 2) */}
      {isAdmin ? (
        <>
          <SectionHeader
            icon="settings"
            title="Admin Operations"
            actionTitle="View All"
            actionIcon="arrow-forward"
            onAction={() => navigation.navigate('Users')}
            style={styles.sectionHeader}
          />
          {/* Full width Attendance & Salary Card */}
          <TouchableOpacity
            style={styles.adminCardAttendance}
            onPress={() => navigation.navigate('AttendanceDashboard')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Attendance and salary register"
            testID="dashboard-admin-attendance"
          >
            <View style={styles.attendanceWatermark}>
              <LeafWatermarkGraphic width={100} height={70} />
            </View>
            <View style={styles.adminIconCircleAttendance}>
              <Icon name="calendar" size={22} color="#059669" />
            </View>
            <View style={styles.adminCardText}>
              <Text style={styles.adminAttendanceTitle} numberOfLines={1}>
                Attendance & Salary
              </Text>
              <Text style={styles.adminAttendanceSubtitle} numberOfLines={2}>
                {'Monthly staff register\n& salary calculations'}
              </Text>
            </View>
            <View style={styles.adminArrowCircleAttendance}>
              <Icon name="chevron-right" size={12} color="#059669" />
            </View>
          </TouchableOpacity>

          {/* Users and Companies row */}
          <View style={styles.adminTwoColRow}>
            {/* Users Card */}
            <TouchableOpacity
              style={styles.adminCardUsers}
              onPress={() => navigation.navigate('Users')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Manage user accounts"
            >
              <View style={styles.adminIconCircleUsers}>
                <Icon name="users" size={18} color="#2563EB" />
              </View>
              <View style={styles.adminCardSmallText}>
                <Text style={styles.adminSmallTitle} numberOfLines={1}>
                  Users
                </Text>
                <Text style={styles.adminSmallSubtitle} numberOfLines={2}>
                  {'Manage\nusers and access'}
                </Text>
              </View>
              <View style={styles.adminArrowCircleUsers}>
                <Icon name="chevron-right" size={11} color="#2563EB" />
              </View>
            </TouchableOpacity>

            {/* Companies Card */}
            <TouchableOpacity
              style={styles.adminCardCompanies}
              onPress={() => navigation.navigate('CommercialDetails')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Pricing and schemes"
            >
              <View style={styles.adminIconCircleCompanies}>
                <Icon name="commercial" size={18} color="#D97706" />
              </View>
              <View style={styles.adminCardSmallText}>
                <Text style={styles.adminSmallTitle} numberOfLines={1}>
                  Companies
                </Text>
                <Text style={styles.adminSmallSubtitle} numberOfLines={2}>
                  {'Pricing &\ncompany details'}
                </Text>
              </View>
              <View style={styles.adminArrowCircleCompanies}>
                <Icon name="chevron-right" size={11} color="#D97706" />
              </View>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* 5. Recently Added Section (Reference 2) */}
      <SectionHeader
        icon="document-text"
        title="Recently Added"
        actionTitle="View All"
        actionIcon="arrow-forward"
        onAction={() => navigation.navigate('MainTabs', { screen: 'MedicinesTab' })}
        style={styles.sectionHeader}
      />
      <View style={styles.recentlyAddedCard}>
        {recentItems.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && <View style={styles.cardDivider} />}
            <TouchableOpacity
              style={styles.recentlyAddedItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.recentlyAddedIconSquare, { backgroundColor: item.iconBg }]}>
                {item.initials ? (
                  <Text style={styles.recentInitialsText}>{item.initials}</Text>
                ) : (
                  <Icon name={item.icon} size={18} color={item.iconColor} />
                )}
              </View>
              <View style={styles.recentlyAddedItemBody}>
                <Text style={styles.recentlyAddedItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recentlyAddedItemSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <View style={styles.recentlyAddedItemRight}>
                <View
                  style={
                    item.tagStyle === 'purple'
                      ? styles.recentTagPurple
                      : styles.recentTagGreen
                  }
                >
                  <Text
                    style={
                      item.tagStyle === 'purple'
                        ? styles.recentTagPurpleText
                        : styles.recentTagGreenText
                    }
                  >
                    {item.tag}
                  </Text>
                </View>
                <Icon name="chevron-right" size={14} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* 6. Last Updated Banner Card (Reference 2) */}
      <View style={styles.lastUpdatedBanner}>
        <View style={styles.lastUpdatedLeft}>
          <View style={styles.lastUpdatedClockCircle}>
            <Icon name="time" size={18} color="#059669" />
          </View>
          <View style={styles.lastUpdatedTextCol}>
            <Text style={styles.lastUpdatedTitle} numberOfLines={1}>
              Last updated: {lastUpdatedText}
            </Text>
            <Text style={styles.lastUpdatedSubtitle} numberOfLines={2}>
              Keep your catalogue up to date for better management.
            </Text>
          </View>
        </View>
        <View style={styles.lastUpdatedGraphicCol}>
          <LastUpdatedGraphic width={72} height={48} />
        </View>
      </View>

      {/* 7. Footer Quote (Reference 2) */}
      <View style={styles.footerContainer}>
        <Icon name="leaf" size={18} color="#10B981" />
        <Text style={styles.footerQuote}>
          &quot;Better Care Through Knowledge&quot;
        </Text>
        <View style={styles.footerDividerLine} />
      </View>

      {/* Profile Account Menu */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        user={user}
        isAdmin={isAdmin}
        onNavigateMyAccount={() => {
          setShowProfileMenu(false);
          navigation.navigate('MyAccount');
        }}
        onNavigateSettings={() => {
          // Prepared for dedicated Settings route if added
        }}
        onNavigateAdminPanel={() => {
          setShowProfileMenu(false);
          navigation.navigate('Users');
        }}
        onSignOut={() => {
          setShowLogoutConfirm(true);
        }}
        testID="dashboard-profile-menu"
      />

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of the Medicine Catalogue app?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDestructive
        testID="dashboard-logout-dialog"
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#134636',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#A7D7C5',
    fontWeight: fontWeights.normal,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 3,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarButton: {
    padding: 1,
  },
  topCurveBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: '#134636',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2F0E8',
    shadowColor: '#134636',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 2,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  welcomeLeftCol: {
    flex: 1,
    paddingRight: 4,
  },
  welcomeGreeting: {
    fontSize: 14.5,
    color: '#1B6A53',
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.2,
  },
  welcomeUserName: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginTop: 1,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E6F8EF',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#1B6A53',
  },
  welcomeIllustrationCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: -8,
  },
  welcomeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  welcomeSlogan: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: fontWeights.medium,
    flexShrink: 1,
  },
  weatherDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  weatherDateCol: {
    justifyContent: 'center',
  },
  weatherDateText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#1E293B',
  },
  weatherSubtext: {
    fontSize: 9.5,
    color: '#64748B',
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickCard: {
    width: '31.4%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 7,
    minHeight: 142,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    justifyContent: 'space-between',
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  quickCardTextArea: {
    width: '100%',
  },
  quickCardTitle: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    textAlign: 'left',
    lineHeight: 15,
  },
  quickCardSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'left',
    lineHeight: 13,
  },
  quickCardArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E6F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  recentActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  recentActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  recentActivityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentActivityBody: {
    flex: 1,
  },
  recentActivityTitle: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  recentActivitySubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  recentActivityTime: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginLeft: 8,
  },
  adminCardAttendance: {
    backgroundColor: '#F0FAF5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  attendanceWatermark: {
    position: 'absolute',
    right: 20,
    bottom: -10,
    opacity: 0.5,
  },
  adminIconCircleAttendance: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adminCardText: {
    flex: 1,
  },
  adminAttendanceTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  adminAttendanceSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  adminArrowCircleAttendance: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E6F7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTwoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  adminCardUsers: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  adminIconCircleUsers: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  adminCardSmallText: {
    flex: 1,
  },
  adminSmallTitle: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  adminSmallSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  adminArrowCircleUsers: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardCompanies: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  adminIconCircleCompanies: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  adminArrowCircleCompanies: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentlyAddedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  recentlyAddedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  recentlyAddedIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentInitialsText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#7C3AED',
  },
  recentlyAddedItemBody: {
    flex: 1,
  },
  recentlyAddedItemTitle: {
    fontSize: 13.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  recentlyAddedItemSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  recentlyAddedItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  recentTagGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: borderRadius.full,
  },
  recentTagGreenText: {
    fontSize: 10.5,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  recentTagPurple: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: borderRadius.full,
  },
  recentTagPurpleText: {
    fontSize: 10.5,
    fontWeight: fontWeights.semibold,
    color: '#6D28D9',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
  },
  lastUpdatedBanner: {
    backgroundColor: '#F0FAF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  lastUpdatedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  lastUpdatedClockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  lastUpdatedTextCol: {
    flex: 1,
  },
  lastUpdatedTitle: {
    fontSize: 12.5,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  lastUpdatedSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  lastUpdatedGraphicCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 28,
  },
  footerQuote: {
    fontStyle: 'italic',
    fontSize: 13,
    color: '#475569',
    fontWeight: fontWeights.medium,
    marginTop: 6,
  },
  footerDividerLine: {
    width: 54,
    height: 2.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginTop: 10,
  },
});
