import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, type IconName } from '../../components';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationFilter,
  type NotificationItem,
} from '../../services/notification.service';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FILTER_PILLS: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'critical', label: 'Critical' },
  { key: 'updates', label: 'Updates' },
];

function formatCardTimestamp(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const timeStr = `${formattedHours}:${minutes} ${ampm}`;

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${timeStr}`;
  } catch {
    return '';
  }
}

function getDateGroupHeader(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Earlier';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Yesterday';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'Earlier';
  }
}

interface NotificationCardConfig {
  bgColor: string;
  borderColor: string;
  unreadDotColor: string;
  iconBg: string;
  iconColor: string;
  iconName: IconName;
}

function getCardConfig(item: NotificationItem): NotificationCardConfig {
  const isRead = item.isRead;

  // 1. Critical Expiry Notifications
  if (item.type === 'MEDICINE_EXPIRED') {
    return {
      bgColor: '#FEF2F2',
      borderColor: '#FECDD3',
      unreadDotColor: isRead ? '#94A3B8' : '#EF4444',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      iconName: 'warning',
    };
  }

  if (item.type === 'MEDICINE_EXPIRING_SOON') {
    return {
      bgColor: '#FEF2F2',
      borderColor: '#FECDD3',
      unreadDotColor: isRead ? '#94A3B8' : '#EF4444',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      iconName: 'calendar',
    };
  }

  // 2. Attention: Deal Inactivity (30 days)
  if (item.type === 'DEAL_INACTIVE_30_DAYS') {
    return {
      bgColor: '#FFFBEB',
      borderColor: '#FEF3C7',
      unreadDotColor: isRead ? '#94A3B8' : '#F59E0B',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      iconName: 'handshake',
    };
  }

  // 3. Updates (Clean white background)
  if (item.type === 'MEDICINE_CREATED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: isRead ? '#94A3B8' : '#10B981',
      iconBg: isRead ? '#F1F5F9' : '#ECFDF5',
      iconColor: isRead ? '#64748B' : '#059669',
      iconName: 'bottle',
    };
  }

  if (item.type === 'MR_CREATED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: isRead ? '#94A3B8' : '#3B82F6',
      iconBg: isRead ? '#F1F5F9' : '#EFF6FF',
      iconColor: isRead ? '#64748B' : '#2563EB',
      iconName: 'person',
    };
  }

  if (item.type === 'DEAL_CREATED' || item.type === 'DEAL_STATUS_CHANGED' || item.type === 'DEAL_RECEIVED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: isRead ? '#94A3B8' : '#6366F1',
      iconBg: isRead ? '#F1F5F9' : '#EEF2FF',
      iconColor: isRead ? '#64748B' : '#4F46E5',
      iconName: 'handshake',
    };
  }

  if (item.type === 'MEDICINE_UPDATED' || item.type === 'MR_UPDATED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: '#94A3B8',
      iconBg: '#F1F5F9',
      iconColor: '#64748B',
      iconName: 'edit',
    };
  }

  if (item.type === 'MEDICINE_ALTERNATIVE_CREATED' || item.type === 'MEDICINE_ALTERNATIVE_UPDATED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: isRead ? '#94A3B8' : '#10B981',
      iconBg: isRead ? '#F1F5F9' : '#ECFDF5',
      iconColor: isRead ? '#64748B' : '#059669',
      iconName: 'sync',
    };
  }

  if (item.type === 'MEDICINE_DELETED' || item.type === 'MR_DELETED' || item.type === 'MEDICINE_ALTERNATIVE_DELETED') {
    return {
      bgColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      unreadDotColor: '#94A3B8',
      iconBg: '#F1F5F9',
      iconColor: '#64748B',
      iconName: 'delete',
    };
  }

  // Default fallback
  return {
    bgColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    unreadDotColor: isRead ? '#94A3B8' : '#3B82F6',
    iconBg: '#F1F5F9',
    iconColor: '#64748B',
    iconName: 'notifications',
  };
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [_unreadCount, setUnreadCount] = useState<number>(0);

  const loadNotifications = useCallback(
    async (targetPage: number = 1, filter: NotificationFilter = activeFilter, append: boolean = false) => {
      try {
        if (!append) setIsLoading(true);
        const res = await fetchNotifications({ page: targetPage, limit: 20, filter });
        setNotifications((prev) => (append ? [...prev, ...res.notifications] : res.notifications));
        setHasMore(res.pagination.hasMore);
        setPage(targetPage);
        setUnreadCount(res.unreadCount);
      } catch {
        // Graceful error fallback
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [activeFilter],
  );

  useEffect(() => {
    void loadNotifications(1, activeFilter, false);
  }, [activeFilter, loadNotifications]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadNotifications(1, activeFilter, false);
  }, [activeFilter, loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoading) return;
    setIsLoadingMore(true);
    void loadNotifications(page + 1, activeFilter, true);
  }, [activeFilter, hasMore, isLoading, isLoadingMore, loadNotifications, page]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark notifications as read. Please try again.');
    }
  }, []);

  const handlePressNotification = useCallback(
    async (item: NotificationItem) => {
      // Mark as read locally and in backend
      if (!item.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        void markNotificationAsRead(item.id).catch(() => {});
      }

      // Deep linking to relevant entities
      try {
        if (item.entityType === 'MEDICINE_BATCH') {
          const medicineId = (item.metadata as { medicineId?: string })?.medicineId;
          if (medicineId) {
            navigation.navigate('MedicineDetails', { id: medicineId });
          } else {
            navigation.navigate('Batches');
          }
          return;
        }

        if (item.entityType === 'MEDICINE') {
          if (item.type === 'MEDICINE_DELETED') {
            Alert.alert('Medicine Removed', 'This medicine has been removed from the catalogue.');
            return;
          }
          if (item.entityId) {
            navigation.navigate('MedicineDetails', { id: item.entityId });
          }
          return;
        }

        if (item.entityType === 'MEDICINE_DEAL') {
          if (item.entityId) {
            navigation.navigate('DealDetails', { dealId: item.entityId });
          }
          return;
        }

        if (item.entityType === 'MR') {
          if (item.type === 'MR_DELETED') {
            Alert.alert('Representative Removed', 'This representative has been removed.');
            return;
          }
          if (item.entityId) {
            navigation.navigate('MrDetails', { id: item.entityId });
          }
          return;
        }

        if (item.entityType === 'MEDICINE_ALTERNATIVE') {
          navigation.navigate('MedicineAlternatives');
          return;
        }
      } catch {
        Alert.alert('Notice', 'Unable to open referenced details.');
      }
    },
    [navigation],
  );

  // Group notifications chronologically
  const groupedData = useMemo(() => {
    type FlatListItem =
      | { type: 'header'; dateGroup: string }
      | { type: 'card'; notification: NotificationItem };

    const items: FlatListItem[] = [];
    let currentGroup = '';

    for (const notif of notifications) {
      const group = getDateGroupHeader(notif.createdAt);
      if (group !== currentGroup) {
        currentGroup = group;
        items.push({ type: 'header', dateGroup: group });
      }
      items.push({ type: 'card', notification: notif });
    }

    return items;
  }, [notifications]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header matching Reference Image */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <TouchableOpacity
          style={styles.markAllReadButton}
          onPress={handleMarkAllRead}
          accessibilityRole="button"
          accessibilityLabel="Mark all read"
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="check" size={16} color="#059669" />
          <Text style={styles.markAllReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Filter Pills matching Reference Image */}
      <View style={styles.filterPillsRow}>
        {FILTER_PILLS.map((pill) => {
          const isActive = activeFilter === pill.key;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[styles.filterPill, isActive ? styles.filterPillActive : styles.filterPillInactive]}
              onPress={() => setActiveFilter(pill.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${pill.label}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                ]}
              >
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Notifications List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#059669" />
        </View>
      ) : groupedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon name="notifications" size={32} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'all' ? 'No notifications' : 'No notifications here'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all' ? "You're all caught up." : 'There are no notifications in this filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.dateGroup}-${index}` : `notif-${item.notification.id}`
          }
          initialNumToRender={50}
          maxToRenderPerBatch={50}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupHeaderText}>{item.dateGroup}</Text>
                </View>
              );
            }

            const notif = item.notification;
            const config = getCardConfig(notif);
            const timeStr = formatCardTimestamp(notif.createdAt);

            return (
              <TouchableOpacity
                style={[
                  styles.notificationCard,
                  { backgroundColor: config.bgColor, borderColor: config.borderColor },
                ]}
                onPress={() => handlePressNotification(notif)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={notif.title}
              >
                {/* Unread indicator dot */}
                <View style={[styles.unreadDot, { backgroundColor: config.unreadDotColor }]} />

                {/* Category Icon Container */}
                <View style={[styles.iconBox, { backgroundColor: config.iconBg }]}>
                  <Icon name={config.iconName} size={20} color={config.iconColor} />
                </View>

                {/* Card Text Information */}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    {timeStr ? <Text style={styles.cardTimestamp}>{timeStr}</Text> : null}
                  </View>
                  <Text style={styles.cardMessage}>{notif.message}</Text>
                </View>

                {/* Chevron */}
                <View style={styles.chevronBox}>
                  <Icon name="chevron-right" size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#D1FAE5',
  },
  filterPillInactive: {
    backgroundColor: '#F1F5F9',
  },
  filterPillText: {
    fontSize: 14,
  },
  filterPillTextActive: {
    fontWeight: '700',
    color: '#065F46',
  },
  filterPillTextInactive: {
    fontWeight: '500',
    color: '#475569',
  },
  listContent: {
    paddingBottom: 24,
  },
  dateGroupHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  dateGroupHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
    marginRight: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  cardTimestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginLeft: 8,
  },
  cardMessage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#475569',
    lineHeight: 18,
  },
  chevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
