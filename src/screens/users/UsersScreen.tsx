import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  Icon,
  LoadingIndicator,
  SearchInput,
  UserSortModal,
  type SortOrder,
  type UserSortField,
} from '../../components';
import { useAuth } from '../../features/auth';
import { userAdminService } from '../../services/user-admin.service';
import { colors, fontSizes, fontWeights, theme } from '../../theme';
import type { PublicUser, UserRole } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterOption = 'ALL' | 'ADMIN' | 'EMPLOYEE' | 'ACTIVE' | 'INACTIVE';

const FILTER_TABS: Array<{ key: FilterOption; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'EMPLOYEE', label: 'Staff' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
];

export const UsersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [sortBy, setSortBy] = useState<UserSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);
  const requestSeqRef = React.useRef(0);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    try {
      if (!isMountedRef.current) return;
      setError(null);
      let roleParam: UserRole | undefined;
      let activeParam: boolean | undefined;

      if (activeFilter === 'ADMIN') roleParam = 'ADMIN';
      if (activeFilter === 'EMPLOYEE') roleParam = 'EMPLOYEE';
      if (activeFilter === 'ACTIVE') activeParam = true;
      if (activeFilter === 'INACTIVE') activeParam = false;

      const response = await userAdminService.listUsers({
        search: debouncedSearch.trim() || undefined,
        role: roleParam,
        active: activeParam,
        sortBy,
        sortOrder,
      });

      if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;
      setUsers(response.users);
    } catch (err) {
      if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load user accounts';
      setError(msg);
    } finally {
      if (isMountedRef.current && requestSeq === requestSeqRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearch, activeFilter, sortBy, sortOrder]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchUsers();
      }
    }, [fetchUsers, isAdmin]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  const handleSelectSort = (newSortBy: UserSortField, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const getSortDisplayLabel = () => {
    if (sortBy === 'name') return sortOrder === 'asc' ? 'Name (A-Z)' : 'Name (Z-A)';
    if (sortBy === 'createdAt') return sortOrder === 'desc' ? 'Newest First' : 'Oldest First';
    if (sortBy === 'monthlySalary') return sortOrder === 'desc' ? 'Salary (High-Low)' : 'Salary (Low-High)';
    if (sortBy === 'role') return 'Role';
    return 'Sorted';
  };

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: 'User Administration',
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

  return (
    <AppScreen
      headerProps={{
        title: 'User Administration',
        subtitle: 'System Staff & Admin Accounts',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.topSection}>
        {/* Search Bar + Sort Action */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search users by name, email, phone..."
              testID="users-search-input"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy !== 'name' || sortOrder !== 'asc' ? styles.sortButtonActive : null,
            ]}
            onPress={() => setIsSortModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Sort users, current is ${getSortDisplayLabel()}`}
            testID="users-sort-button"
          >
            <Icon
              name="sort"
              size={18}
              color={sortBy !== 'name' || sortOrder !== 'asc' ? colors.primary : '#475569'}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
          style={styles.filterScrollView}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isSelected ? styles.filterChipActive : null]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tab.label}`}
                testID={`user-filter-${tab.key.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextActive : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading && !isRefreshing ? (
        <LoadingIndicator message="Loading user accounts..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Users"
          message={error}
          onRetry={fetchUsers}
        />
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          description={
            search.trim() || activeFilter !== 'ALL'
              ? 'No user accounts match the selected search or filter criteria.'
              : 'No user accounts are currently configured in the catalogue system.'
          }
          actionTitle={search || activeFilter !== 'ALL' ? 'Reset Filters' : 'Create User'}
          onAction={
            search || activeFilter !== 'ALL'
              ? () => {
                  setSearch('');
                  setActiveFilter('ALL');
                }
              : () => navigation.navigate('AddUser')
          }
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.listScrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listHeader}>
            <Text style={styles.resultsCountText}>
              Showing {users.length} {users.length === 1 ? 'user' : 'users'} • {getSortDisplayLabel()}
            </Text>
          </View>

          {users.map((item) => {
            const initials = item.name.trim()
              ? item.name.trim().slice(0, 2).toUpperCase()
              : 'US';
            const isUserAdmin = item.role === 'ADMIN';

            return (
              <Card
                key={item.id}
                style={styles.userCard}
                onPress={() => navigation.navigate('UserDetails', { id: item.id })}
                testID={`user-card-${item.id}`}
              >
                <View style={styles.cardContentRow}>
                  {/* Avatar */}
                  <Avatar
                    imageUrl={item.profileImageUrl}
                    initials={initials}
                    colorVariant={isUserAdmin ? 'purple' : 'blue'}
                    size="md"
                    testID={`user-avatar-${item.id}`}
                  />

                  {/* Details */}
                  <View style={styles.userInfoCol}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <Text style={styles.userContact} numberOfLines={1}>
                      {item.email || item.phone || 'No contact specified'}
                    </Text>

                    <View style={styles.badgeRow}>
                      <Badge
                        label={item.role}
                        variant={isUserAdmin ? 'admin' : 'employee'}
                        testID={`user-role-badge-${item.id}`}
                      />

                      <View
                        style={[
                          styles.statusDotBadge,
                          item.active ? styles.statusActive : styles.statusInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: item.active ? '#10B981' : '#94A3B8' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: item.active ? '#065F46' : '#64748B' },
                          ]}
                        >
                          {item.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>

                      {item.monthlySalary !== null && item.monthlySalary !== undefined ? (
                        <View style={styles.salaryBadge}>
                          <Text style={styles.salaryBadgeText}>
                            ₹{Number(item.monthlySalary).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Chevron Right */}
                  <View style={styles.chevronBox}>
                    <Icon name="chevron-right" size={18} color="#94A3B8" />
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Add User Floating Action Button: fixed bottom-right outside scroll content */}
      <FloatingActionButton
        onPress={() => navigation.navigate('AddUser')}
        accessibilityLabel="Add New User"
        testID="add-user-fab"
      />

      {/* User Sort Modal */}
      <UserSortModal
        visible={isSortModalVisible}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelectSort={handleSelectSort}
        onClose={() => setIsSortModalVisible(false)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.primary,
  },
  filterScrollView: {
    marginTop: 8,
    marginBottom: 8,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 88,
  },
  listHeader: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  resultsCountText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
  },
  userCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  userContact: {
    fontSize: fontSizes.xs,
    color: '#64748B',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    fontSize: 11,
    fontWeight: fontWeights.medium,
  },
  salaryBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  salaryBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#334155',
  },
  chevronBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
