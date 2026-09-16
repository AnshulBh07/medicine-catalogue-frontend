import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppScreen,
  EmptyState,
  ErrorState,
  Icon,
  LoadingIndicator,
  SearchInput,
} from '../../components';
import { apiClient } from '../../services/api-client';
import { borderRadius, colors, fontWeights, spacing } from '../../theme';
import type { PublicCompositionSalt } from '../../types/models';

export const CompositionSaltsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [compositionSalts, setCompositionSalts] = useState<PublicCompositionSalt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchCompositionSalts = useCallback(async (searchQuery: string = search) => {
    try {
      setErrorMessage(null);
      const response = await apiClient.get<{ compositionSalts: PublicCompositionSalt[] }>(
        '/composition-salts',
      );
      if (isMountedRef.current) {
        if (response && Array.isArray(response.compositionSalts)) {
          let list = response.compositionSalts;
          if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((cs) => cs.salt.name.toLowerCase().includes(q));
          }
          setCompositionSalts(list);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load composition salts';
        setErrorMessage(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [search]);

  useEffect(() => {
    fetchCompositionSalts(search);
  }, []);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCompositionSalts(text);
    }, 200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCompositionSalts(search);
  };

  return (
    <AppScreen
      headerProps={{
        title: 'Composition Salts',
        subtitle: 'Salt Ingredient Strengths & Dosages',
        showBack: true,
        onBack: () => navigation.goBack(),
      }}
      scrollable={false}
    >
      <SearchInput
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Search ingredient strengths by salt name..."
        testID="composition-salts-search-input"
        style={styles.searchBar}
      />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {compositionSalts.length} {compositionSalts.length === 1 ? 'Strength Combination' : 'Strength Combinations'}
        </Text>
      </View>

      {isLoading ? (
        <LoadingIndicator message="Loading ingredient strengths..." />
      ) : errorMessage && compositionSalts.length === 0 ? (
        <ErrorState
          title="Error Loading Composition Salts"
          message={errorMessage}
          onRetry={() => fetchCompositionSalts(search)}
        />
      ) : compositionSalts.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="No Ingredient Strengths Found"
          description={
            search
              ? 'No matching strengths found for your search.'
              : 'No composition salt combinations created yet.'
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          testID="composition-salts-scroll"
        >
          <View style={styles.cardsList}>
            {compositionSalts.map((item) => (
              <View
                key={item.id}
                style={styles.card}
                testID={`comp-salt-card-${item.id}`}
              >
                <View style={styles.avatarCircle}>
                  <Icon name="salts" size={16} color="#D97706" />
                </View>
                <View style={styles.cardMain}>
                  <Text style={styles.titleText}>
                    {item.salt.name} {item.amount} {item.unit}
                  </Text>
                  <Text style={styles.subText}>
                    Active API: {item.salt.name}
                  </Text>
                </View>
                <View style={styles.strengthBadge}>
                  <Text style={styles.strengthBadgeText}>
                    {item.amount} {item.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    height: 42,
  },
  summaryRow: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  summaryText: {
    fontSize: 11.5,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
  },
  cardsList: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      } as object,
    }),
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardMain: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  strengthBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  strengthBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
});
