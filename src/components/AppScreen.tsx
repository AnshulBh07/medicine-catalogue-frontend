import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { AppHeader, type AppHeaderProps } from './AppHeader';

export interface AppScreenProps {
  children: ReactNode;
  headerProps?: AppHeaderProps;
  headerContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  testID?: string;
}

export const AppScreen: React.FC<AppScreenProps> = ({
  children,
  headerProps,
  headerContainerStyle,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  backgroundColor = colors.background,
  testID,
}) => {
  const hasDarkHeader = Boolean(headerProps);
  const safeAreaBg = hasDarkHeader ? colors.headerBackground : backgroundColor;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: safeAreaBg }, style]}
      edges={hasDarkHeader ? ['top'] : ['top', 'bottom']}
      testID={testID}
    >
      {headerProps ? (
        <View style={headerContainerStyle}>
          <AppHeader {...headerProps} />
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, { backgroundColor }]}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.staticContent, contentContainerStyle]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
    padding: spacing.base,
  },
});
