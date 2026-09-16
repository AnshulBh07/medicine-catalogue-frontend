export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface PublicUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  profileImageUrl?: string | null;
  monthlySalary?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MedicineForm =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'LIQUID'
  | 'SUSPENSION'
  | 'OINTMENT'
  | 'CREAM'
  | 'GEL'
  | 'POWDER'
  | 'INJECTION'
  | 'DROPS'
  | 'SPRAY'
  | 'INHALER'
  | 'LOTION'
  | 'SOLUTION'
  | 'OTHER';

export type MedicinePackUnit =
  | 'TABLET'
  | 'CAPSULE'
  | 'ML'
  | 'MG'
  | 'G'
  | 'PIECE'
  | 'VIAL'
  | 'AMPULE'
  | 'BOTTLE'
  | 'TUBE'
  | 'SACHET'
  | 'OTHER';

export type CompositionSaltUnit =
  | 'MG'
  | 'MCG'
  | 'G'
  | 'ML'
  | 'IU'
  | 'PERCENT'
  | 'OTHER';

export interface PublicSalt {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  compositionsCount?: number;
  medicinesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaltImpactReport {
  salt: PublicSalt;
  compositionsCount: number;
  medicinesCount: number;
  compositions: Array<{ id: string; displayText: string; active: boolean }>;
  medicines: Array<{ id: string; name: string; active: boolean }>;
}

export interface PublicCompositionSalt {
  id: string;
  salt: {
    id: string;
    name: string;
  };
  amount: number;
  unit: CompositionSaltUnit;
  createdAt: string;
  updatedAt: string;
}

export interface PublicComposition {
  id: string;
  displayText: string;
  description: string | null;
  active: boolean;
  medicinesCount?: number;
  compositionSalts: Array<{
    id: string;
    salt: {
      id: string;
      name: string;
    };
    amount: number;
    unit: CompositionSaltUnit;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CompositionImpactReport {
  composition: PublicComposition;
  medicinesCount: number;
  medicines: Array<{ id: string; name: string; active: boolean }>;
}

export interface PublicManufacturer {
  id: string;
  name: string;
  active: boolean;
  medicinesCount?: number;
  medicines?: Array<{
    id: string;
    name: string;
    form: MedicineForm;
    packQuantity: number;
    packUnit: MedicinePackUnit;
    active: boolean;
    composition?: {
      id: string;
      displayText: string;
    } | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMr {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  medicinesCount?: number;
  medicines?: Array<{
    id: string;
    name: string;
    form: MedicineForm;
    manufacturer: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMedicine {
  id: string;
  name: string;
  composition: {
    id: string;
    displayText: string;
  };
  form: MedicineForm;
  packQuantity: number;
  packUnit: MedicinePackUnit;
  shortDescription: string | null;
  imageUrl: string | null;
  uses: string | null;
  recommendedAgeGroup: string | null;
  directions: string | null;
  warnings: string | null;
  storageInstructions: string | null;
  barcode: string | null;
  prescriptionRequired: boolean;
  manufacturer: {
    id: string;
    name: string;
  };
  mr: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
  } | null;
  commercialDetails?: PublicCommercialDetails | null;
  active: boolean;
  mrp?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCommercialDetails {
  id: string;
  batchId?: string;
  batch?: {
    id: string;
    batchNumber: string;
    manufacturingDate: string | null;
    expiryDate: string;
  };
  medicineId?: string;
  medicine?: {
    id: string;
    name: string;
  };
  purchaseRate: number;
  mrp: number;
  discountPercent: number;
  gstPercent?: number;
  scheme?: string | Record<string, unknown> | null;
  privateNotes?: string | null;
  updatedAt?: string;
  updatedBy?: {
    id: string;
    name: string;
  };
}

export interface PublicBatch {
  id: string;
  medicine: {
    id: string;
    name: string;
  };
  batchNumber: string;
  manufacturingDate: string | null;
  expiryDate: string;
  commercialDetails?: PublicCommercialDetails | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeMonthlySummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  profileImageUrl: string | null;
  monthlySalary: number | null;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  payableDays: number;
  attendancePercentage: number;
  estimatedSalary: number;
}

export interface AttendanceDashboardSummary {
  year: number;
  month: number;
  totalEmployees: number;
  workingDays: number;
  today: {
    date: string;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    late: number;
  };
  overall: {
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDays: number;
    payableDays: number;
    attendancePercentage: number;
    payablePercentage: number;
    totalEstimatedPayroll: number;
  };
  employees: EmployeeMonthlySummary[];
}

export interface EmployeeAttendanceDetailResult {
  user: PublicUser;
  year: number;
  month: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  payableDays: number;
  attendancePercentage: number;
  dailySalary: number;
  estimatedSalary: number;
  records: AttendanceRecord[];
}

export type ShortageStatus = 'PENDING' | 'ORDERED' | 'COMPLETED';
export type ShortageUnit = 'PACK' | 'STRIP' | 'BOX' | 'PIECE' | 'BOTTLE' | 'CRATE';

export interface ShortageItem {
  id: string;
  medicineId: string;
  date: string;
  quantity: number;
  currentQuantity: number | null;
  unit: ShortageUnit;
  status: ShortageStatus;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  medicine: {
    id: string;
    name: string;
    form: string;
    packQuantity: number;
    packUnit: string;
    imageUrl: string | null;
    shortDescription: string | null;
    composition: {
      id: string;
      displayText: string;
    };
    manufacturer: {
      id: string;
      name: string;
    };
    mr: {
      id: string;
      name: string;
      company: string | null;
      phone: string | null;
      email: string | null;
      active: boolean;
    } | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string | null;
    role: string;
  } | null;
}

export interface DailyShortageSummary {
  total: number;
  pending: number;
  ordered: number;
  completed: number;
}

export interface DailyShortageResult {
  date: string;
  summary: DailyShortageSummary;
  items: ShortageItem[];
}

export interface CreateShortageItemPayload {
  medicineId: string;
  date?: string;
  quantity: number;
  currentQuantity?: number | null;
  unit?: ShortageUnit;
  note?: string | null;
  status?: ShortageStatus;
}

export interface PatchShortageItemPayload {
  quantity?: number;
  currentQuantity?: number | null;
  unit?: ShortageUnit;
  status?: ShortageStatus;
  note?: string | null;
}

export type DealStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PublicDeal {
  id: string;
  medicineId: string;
  medicine: {
    id: string;
    name: string;
    form: string;
    packQuantity: number;
    packUnit: string;
    manufacturer: {
      id: string;
      name: string;
    } | null;
  };
  mrId: string;
  mr: {
    id: string;
    name: string;
    company: string | null;
    phone: string | null;
    email: string | null;
  };
  dealDate: string;
  agreedMrp: number;
  agreedScheme: string;
  agreedBillDiscount: number;
  mrPhoneSnapshot: string | null;
  status: DealStatus;
  notes: string | null;
  createdById: string | null;
  createdBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealsSummary {
  total: number;
  pending: number;
  received: number;
  cancelled: number;
}

export interface DealsListResult {
  deals: PublicDeal[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: DealsSummary;
}

export interface CreateDealPayload {
  medicineId: string;
  mrId: string;
  dealDate?: string;
  agreedMrp: number;
  agreedScheme: string;
  agreedBillDiscount: number;
  mrPhoneSnapshot?: string | null;
  status?: DealStatus;
  notes?: string | null;
}

export interface UpdateDealPayload {
  medicineId?: string;
  mrId?: string;
  dealDate?: string;
  agreedMrp?: number;
  agreedScheme?: string;
  agreedBillDiscount?: number;
  mrPhoneSnapshot?: string | null;
  status?: DealStatus;
  notes?: string | null;
}


