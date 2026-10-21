import type { NavigatorScreenParams } from '@react-navigation/native';
import type { PublicMedicine } from './models';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabsParamList = {
  DashboardTab: undefined;
  MedicinesTab: undefined;
  MrsTab: undefined;
  MoreTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<AppTabsParamList>;
  Medicines: undefined;
  MedicineDetails: { id: string };
  AddMedicine: { returnDealParams?: boolean } | undefined;
  EditMedicine: { id: string };
  MRs: undefined;
  MrDetails: { id: string };
  AddMr: { returnDealParams?: boolean } | undefined;
  EditMr: { id: string };
  ManageMrMedicines: { mrId: string; mrName: string };
  Manufacturers: undefined;
  Compositions: undefined;
  CompositionSalts: undefined;
  Salts: undefined;
  Batches: { medicineId?: string; medicineName?: string } | undefined;
  Users: undefined;
  UserDetails: { id: string };
  AddUser: undefined;
  EditUser: { id: string };
  CommercialDetails: undefined;
  AttendanceDashboard: undefined;
  AttendanceCalendar: { userId?: string; year?: number; month?: number } | undefined;
  EditAttendance: {
    userId: string;
    date: string;
    userName: string;
    userRole?: string;
    monthlySalary?: number | null;
    shiftType?: 'FULL_DAY' | 'HALF_DAY';
    initialStatus?: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    initialWorkUnits?: number | null;
    initialNotes?: string | null;
    year?: number;
    month?: number;
  };
  ShortageNotebook: { initialDate?: string } | undefined;
  AddShortageMedicine: { date?: string } | undefined;
  ShortageDetails: { shortageId: string };
  Deals: { medicineId?: string; mrId?: string; medicineName?: string; mrName?: string } | undefined;
  DealDetails: { dealId: string };
  AddDeal: {
    prefillMedicineId?: string;
    prefillMrId?: string;
    createdMedicineId?: string;
    createdMrId?: string;
  } | undefined;
  EditDeal: { dealId: string };
  MyAccount: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  MedicineAlternatives: undefined;
  AddEditAlternative: { sourceMedicineId?: string; initialSourceMedicine?: PublicMedicine } | undefined;
};
