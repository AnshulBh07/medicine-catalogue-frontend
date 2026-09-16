import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../features/auth';
import { BatchesScreen } from '../screens/batches/BatchesScreen';
import { CommercialDetailsScreen } from '../screens/commercial-details/CommercialDetailsScreen';
import { CompositionSaltsScreen } from '../screens/compositions/CompositionSaltsScreen';
import { CompositionsScreen } from '../screens/compositions/CompositionsScreen';
import { ManufacturersScreen } from '../screens/manufacturers/ManufacturersScreen';
import { AddMedicineScreen } from '../screens/medicines/AddMedicineScreen';
import { EditMedicineScreen } from '../screens/medicines/EditMedicineScreen';
import { MedicineDetailsScreen } from '../screens/medicines/MedicineDetailsScreen';
import { MedicinesScreen } from '../screens/medicines/MedicinesScreen';
import {
  AddMrScreen,
  EditMrScreen,
  ManageMrMedicinesScreen,
  MrDetailsScreen,
  MrsScreen,
} from '../screens/mrs';
import { SaltsScreen } from '../screens/salts/SaltsScreen';
import {
  UsersScreen,
  UserDetailsScreen,
  AddUserScreen,
  EditUserScreen,
} from '../screens/users';
import {
  AttendanceDashboardScreen,
  AttendanceCalendarScreen,
  EditAttendanceScreen,
} from '../screens/attendance';
import {
  ShortageListScreen,
  AddShortageMedicineScreen,
  ShortageDetailsScreen,
} from '../screens/shortage';
import {
  DealsListScreen,
  DealDetailsScreen,
  AddDealScreen,
  EditDealScreen,
} from '../screens/deals';
import { MyAccountScreen, EditProfileScreen } from '../screens/account';
import type { RootStackParamList } from '../types/navigation';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Medicines" component={MedicinesScreen} />
      <Stack.Screen name="MedicineDetails" component={MedicineDetailsScreen} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
      <Stack.Screen name="EditMedicine" component={EditMedicineScreen} />
      <Stack.Screen name="MRs" component={MrsScreen} />
      <Stack.Screen name="MrDetails" component={MrDetailsScreen} />
      <Stack.Screen name="AddMr" component={AddMrScreen} />
      <Stack.Screen name="EditMr" component={EditMrScreen} />
      <Stack.Screen name="ManageMrMedicines" component={ManageMrMedicinesScreen} />
      <Stack.Screen name="Manufacturers" component={ManufacturersScreen} />
      <Stack.Screen name="Compositions" component={CompositionsScreen} />
      <Stack.Screen name="CompositionSalts" component={CompositionSaltsScreen} />
      <Stack.Screen name="Salts" component={SaltsScreen} />
      <Stack.Screen name="Batches" component={BatchesScreen} />
      <Stack.Screen name="ShortageNotebook" component={ShortageListScreen} />
      <Stack.Screen name="AddShortageMedicine" component={AddShortageMedicineScreen} />
      <Stack.Screen name="ShortageDetails" component={ShortageDetailsScreen} />
      <Stack.Screen name="Deals" component={DealsListScreen} />
      <Stack.Screen name="DealDetails" component={DealDetailsScreen} />
      <Stack.Screen name="AddDeal" component={AddDealScreen} />
      <Stack.Screen name="EditDeal" component={EditDealScreen} />
      <Stack.Screen name="MyAccount" component={MyAccountScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />

      {/* ADMIN-only routes */}
      {isAdmin ? (
        <>
          <Stack.Screen name="Users" component={UsersScreen} />
          <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
          <Stack.Screen name="AddUser" component={AddUserScreen} />
          <Stack.Screen name="EditUser" component={EditUserScreen} />
          <Stack.Screen name="CommercialDetails" component={CommercialDetailsScreen} />
          <Stack.Screen name="AttendanceDashboard" component={AttendanceDashboardScreen} />
          <Stack.Screen name="AttendanceCalendar" component={AttendanceCalendarScreen} />
          <Stack.Screen name="EditAttendance" component={EditAttendanceScreen} />
        </>
      ) : null}
    </Stack.Navigator>
  );
};
