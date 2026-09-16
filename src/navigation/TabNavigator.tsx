import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '../components/Icon';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { MedicinesScreen } from '../screens/medicines/MedicinesScreen';
import { MrsScreen } from '../screens/mrs/MrsScreen';
import { MoreScreen } from '../screens/more/MoreScreen';
import { fontWeights } from '../theme';
import type { AppTabsParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#134636',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => {
          let iconName: IconName = 'dashboard';
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'dashboard-active' : 'dashboard';
          } else if (route.name === 'MedicinesTab') {
            iconName = focused ? 'medicines-active' : 'medicines';
          } else if (route.name === 'MrsTab') {
            iconName = focused ? 'mr-registry-active' : 'mr-registry';
          } else if (route.name === 'MoreTab') {
            iconName = focused ? 'more-active' : 'more';
          }
          return (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActivePill]}>
              <Icon
                name={iconName}
                size={focused ? 20 : 22}
                color={focused ? '#134636' : '#64748B'}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="MedicinesTab"
        component={MedicinesScreen}
        options={{ tabBarLabel: 'Medicines' }}
      />
      <Tab.Screen
        name="MrsTab"
        component={MrsScreen}
        options={{ tabBarLabel: 'MR Registry' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 68,
    paddingBottom: 8,
    paddingTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    marginTop: 2,
  },
  tabIconWrapper: {
    width: 52,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabIconActivePill: {
    backgroundColor: '#DCFCE7',
  },
});
