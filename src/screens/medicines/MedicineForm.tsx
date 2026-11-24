import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { ocrService } from '../../services/ocrService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppScreen,
  AutocompleteInput,
  Card,
  ConfirmDialog,
  DropdownSelect,
  ErrorState,
  FormField,
  Icon,
  LoadingIndicator,
  MonthYearSelector,
  PrimaryButton,
  SectionHeader,
  TextInput,
  type DropdownOption,
} from '../../components';
import { useAuth } from '../../features/auth';
import { storage, type MedicineDraft } from '../../lib/storage';
import { apiClient, ApiError } from '../../services/api-client';
import {
  cleanupMedicinePackagingImage,
  uploadMedicinePackagingImage,
  type SelectedMedicineImage,
} from '../../services/image-upload.service';
import {
  borderRadius,
  colors,
  fontSizes,
  fontWeights,
  spacing,
} from '../../theme';
import type {
  CompositionSaltUnit,
  MedicineForm as MedicineFormType,
  MedicinePackUnit,
  PublicCommercialDetails,
  PublicComposition,
  PublicManufacturer,
  PublicMedicine,
  PublicMr,
  PublicSalt,
} from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import { MedicineScannerModal } from './MedicineScannerModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Offline / Fallback sample data
const FALLBACK_MANUFACTURERS: PublicManufacturer[] = [
  { id: 'mfg-1', name: 'Acme Pharma Ltd.', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mfg-2', name: 'Global Pharma', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mfg-3', name: 'HealthCare Labs', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mfg-4', name: 'LifeCare Pharma', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mfg-5', name: 'Medico Health Pvt. Ltd.', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

const FALLBACK_SALTS: PublicSalt[] = [
  { id: 'salt-1', name: 'Paracetamol', description: 'Analgesic / Antipyretic', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-2', name: 'Caffeine', description: 'Stimulant', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-3', name: 'Amoxicillin', description: 'Antibiotic', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-4', name: 'Clavulanic Acid', description: 'Beta-lactamase inhibitor', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-5', name: 'Cetirizine', description: 'Antihistamine', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-6', name: 'Omeprazole', description: 'Proton-pump inhibitor', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-7', name: 'Ibuprofen', description: 'NSAID', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-8', name: 'Atorvastatin', description: 'Statin', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-9', name: 'Domperidone', description: 'Antiemetic', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'salt-10', name: 'Pantoprazole', description: 'Proton-pump inhibitor', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

const FALLBACK_MRS: PublicMr[] = [
  { id: 'mr-1', name: 'Ravi Kumar', company: 'Acme Pharma Ltd.', phone: '+919876543210', email: 'ravi@acme.com', notes: null, active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'mr-2', name: 'Priya Sharma', company: 'Global Pharma', phone: '+919876543211', email: 'priya@global.com', notes: null, active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

const SAMPLE_MEDICINES: Record<string, PublicMedicine> = {
  'med-1': {
    id: 'med-1',
    name: 'Paracetamol 500mg Tablet',
    composition: { id: 'comp-1', displayText: 'Paracetamol 500mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Analgesic / Antipyretic',
    imageUrl: null,
    uses: 'Pain relief and fever reduction',
    recommendedAgeGroup: 'Adults and children over 12',
    directions: 'Take 1-2 tablets every 4-6 hours as needed',
    warnings: 'Do not exceed 4g in 24 hours',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-2': {
    id: 'med-2',
    name: 'Amoxicillin 500mg Capsule',
    composition: { id: 'comp-2', displayText: 'Amoxicillin 500mg' },
    form: 'CAPSULE',
    packQuantity: 15,
    packUnit: 'CAPSULE',
    shortDescription: 'Antibiotic',
    imageUrl: null,
    uses: 'Bacterial infections',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule 3 times daily',
    warnings: 'Complete full course of antibiotics',
    storageInstructions: 'Store in a dry place',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-3': {
    id: 'med-3',
    name: 'Cetirizine 10mg Tablet',
    composition: { id: 'comp-3', displayText: 'Cetirizine 10mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Antihistamine',
    imageUrl: null,
    uses: 'Allergies and hay fever',
    recommendedAgeGroup: 'Adults and children over 6',
    directions: 'Take 1 tablet daily',
    warnings: 'May cause drowsiness',
    storageInstructions: 'Store below 30°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-4': {
    id: 'med-4',
    name: 'Omeprazole 20mg Capsule',
    composition: { id: 'comp-4', displayText: 'Omeprazole 20mg' },
    form: 'CAPSULE',
    packQuantity: 14,
    packUnit: 'CAPSULE',
    shortDescription: 'Anti-ulcer',
    imageUrl: null,
    uses: 'Acid reflux and stomach ulcers',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 capsule before breakfast',
    warnings: 'Swallow whole with water',
    storageInstructions: 'Store in original blister',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-5': {
    id: 'med-5',
    name: 'Ibuprofen 400mg Tablet',
    composition: { id: 'comp-5', displayText: 'Ibuprofen 400mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'NSAID',
    imageUrl: null,
    uses: 'Inflammation and pain relief',
    recommendedAgeGroup: 'Adults',
    directions: 'Take with food or milk',
    warnings: 'Avoid if stomach ulcers present',
    storageInstructions: 'Keep in a cool dry place',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-2', name: 'Global Pharma' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-6': {
    id: 'med-6',
    name: 'Amlodipine 5mg Tablet',
    composition: { id: 'comp-6', displayText: 'Amlodipine 5mg' },
    form: 'TABLET',
    packQuantity: 30,
    packUnit: 'TABLET',
    shortDescription: 'Calcium Channel Blocker',
    imageUrl: null,
    uses: 'High blood pressure and angina',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 tablet once daily',
    warnings: 'Monitor blood pressure regularly',
    storageInstructions: 'Protect from light',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-7': {
    id: 'med-7',
    name: 'Atorvastatin 10mg Tablet',
    composition: { id: 'comp-7', displayText: 'Atorvastatin 10mg' },
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    shortDescription: 'Lipid Lowering Agent',
    imageUrl: null,
    uses: 'Cholesterol management',
    recommendedAgeGroup: 'Adults',
    directions: 'Take 1 tablet at night',
    warnings: 'Avoid excessive grapefruit juice',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: true,
    manufacturer: { id: 'mfg-3', name: 'HealthCare Labs' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'med-8': {
    id: 'med-8',
    name: 'Panadol Extra 500mg/65mg Tablet',
    composition: { id: 'comp-8', displayText: 'Paracetamol 500mg + Caffeine 65mg' },
    form: 'TABLET',
    packQuantity: 20,
    packUnit: 'TABLET',
    shortDescription: 'Dual Action Analgesic',
    imageUrl: null,
    uses: 'Severe headache and migraine relief',
    recommendedAgeGroup: 'Adults and children over 12',
    directions: 'Take 1-2 tablets every 4-6 hours',
    warnings: 'Contains caffeine. Do not exceed 8 tablets daily',
    storageInstructions: 'Store below 25°C',
    barcode: null,
    prescriptionRequired: false,
    manufacturer: { id: 'mfg-1', name: 'Acme Pharma Ltd.' },
    mr: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

// Form Options
const MEDICINE_FORM_OPTIONS: DropdownOption<MedicineFormType>[] = [
  { label: 'Tablet', value: 'TABLET' },
  { label: 'Capsule', value: 'CAPSULE' },
  { label: 'Syrup', value: 'SYRUP' },
  { label: 'Liquid', value: 'LIQUID' },
  { label: 'Suspension', value: 'SUSPENSION' },
  { label: 'Ointment', value: 'OINTMENT' },
  { label: 'Cream', value: 'CREAM' },
  { label: 'Gel', value: 'GEL' },
  { label: 'Powder', value: 'POWDER' },
  { label: 'Injection', value: 'INJECTION' },
  { label: 'Drops', value: 'DROPS' },
  { label: 'Spray', value: 'SPRAY' },
  { label: 'Inhaler', value: 'INHALER' },
  { label: 'Lotion', value: 'LOTION' },
  { label: 'Solution', value: 'SOLUTION' },
  { label: 'Other', value: 'OTHER' },
];

const PACK_UNIT_OPTIONS: DropdownOption<MedicinePackUnit>[] = [
  { label: 'Tablet', value: 'TABLET' },
  { label: 'Capsule', value: 'CAPSULE' },
  { label: 'Bottle', value: 'BOTTLE' },
  { label: 'Tube', value: 'TUBE' },
  { label: 'Sachet', value: 'SACHET' },
  { label: 'Vial', value: 'VIAL' },
  { label: 'Ampoule', value: 'AMPULE' },
  { label: 'ML', value: 'ML' },
  { label: 'MG', value: 'MG' },
  { label: 'G', value: 'G' },
  { label: 'Piece', value: 'PIECE' },
  { label: 'Other', value: 'OTHER' },
];

const SALT_UNIT_OPTIONS: DropdownOption<CompositionSaltUnit>[] = [
  { label: 'mg (Milligram)', value: 'MG' },
  { label: 'mcg (Microgram)', value: 'MCG' },
  { label: 'g (Gram)', value: 'G' },
  { label: 'ml (Milliliter)', value: 'ML' },
  { label: 'IU (International Unit)', value: 'IU' },
  { label: '% (Percentage)', value: 'PERCENT' },
  { label: 'Other', value: 'OTHER' },
];

const AGE_GROUP_OPTIONS: DropdownOption<string>[] = [
  { label: 'Adults', value: 'Adults' },
  { label: 'Adults and children over 12', value: 'Adults and children over 12' },
  { label: 'Adults and children over 6', value: 'Adults and children over 6' },
  { label: 'Children', value: 'Children' },
  { label: 'Pediatric (under 6)', value: 'Pediatric' },
  { label: 'Elderly', value: 'Elderly' },
  { label: 'All Ages', value: 'All Ages' },
];

export interface FormSaltRow {
  id: string;
  saltId: string;
  name: string;
  amount: string;
  unit: CompositionSaltUnit;
}

export type { SelectedMedicineImage };

export interface MedicineFormProps {
  mode: 'create' | 'edit';
  medicineId?: string;
  onSuccess?: (medicine: PublicMedicine) => void;
  onDeleteSuccess?: () => void;
  onCancel?: () => void;
}

export const MedicineForm: React.FC<MedicineFormProps> = ({
  mode,
  medicineId,
  onSuccess,
  onDeleteSuccess,
  onCancel,
}) => {
  const navigation = useNavigation<NavigationProp>();

  // Reference Metadata State
  const [manufacturers, setManufacturers] = useState<PublicManufacturer[]>(FALLBACK_MANUFACTURERS);
  const [mrs, setMrs] = useState<PublicMr[]>(FALLBACK_MRS);
  const [salts, setSalts] = useState<PublicSalt[]>(FALLBACK_SALTS);

  // Form Initial Fetch State (for Edit mode)
  const [isLoadingInitial, setIsLoadingInitial] = useState(mode === 'edit');
  const [initialFetchError, setInitialFetchError] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [form, setForm] = useState<MedicineFormType | null>('TABLET');
  const [shortDescription, setShortDescription] = useState('');
  const [barcode, setBarcode] = useState('');

  // Selected Packaging Image State (Kept in local frontend form state)
  const [selectedImage, setSelectedImage] = useState<SelectedMedicineImage | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Multi-Salt Composition State
  const [saltRows, setSaltRows] = useState<FormSaltRow[]>([
    {
      id: 'salt-row-1',
      saltId: FALLBACK_SALTS[0]?.id || 'salt-1',
      name: FALLBACK_SALTS[0]?.name || 'Paracetamol',
      amount: '500',
      unit: 'MG',
    },
  ]);

  // Packaging State
  const [packQuantity, setPackQuantity] = useState('10');
  const [packUnit, setPackUnit] = useState<MedicinePackUnit | null>('TABLET');

  // Medical Information State
  const [uses, setUses] = useState('');
  const [recommendedAgeGroup, setRecommendedAgeGroup] = useState('Adults');
  const [directions, setDirections] = useState('');
  const [warnings, setWarnings] = useState('');
  const [storageInstructions, setStorageInstructions] = useState('');
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);

  // Manufacturer & MR State
  const [manufacturerName, setManufacturerName] = useState(
    FALLBACK_MANUFACTURERS[0]?.name || 'Acme Pharma Ltd.',
  );
  const [manufacturerId, setManufacturerId] = useState<string | null>(
    FALLBACK_MANUFACTURERS[0]?.id || 'mfg-1',
  );
  const [mrId, setMrId] = useState<string | null>(null);

  // First Batch State (For initial medicine creation)
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Commercial Details State
  const [mrp, setMrp] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [scheme, setScheme] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  // Feature 3: Medicine Photo Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedPhotos, setScannedPhotos] = useState<
    Array<{ uri: string; base64?: string | null; label: string }>
  >([]);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'warning';
    message: string;
    conflicts?: string[];
  } | null>(null);

  // Dynamic Autocomplete Recommendations & Loading states
  const [saltRecommendations, setSaltRecommendations] = useState<Record<string, PublicSalt[]>>({});
  const [isLoadingSalts, setIsLoadingSalts] = useState<Record<string, boolean>>({});
  const [mfgRecommendations, setMfgRecommendations] = useState<PublicManufacturer[]>(FALLBACK_MANUFACTURERS);
  const [isLoadingMfg, setIsLoadingMfg] = useState(false);

  // Field focus refs for seamless form navigation
  const saltAmountRefs = useRef<Record<string, { focus: () => void } | null>>({});

  // Auth check for permissions
  const { isAdmin, isLoading: isAuthLoading } = useAuth();

  // Draft State (for Add Medicine mode)
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [showDiscardDraftDialog, setShowDiscardDraftDialog] = useState(false);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDraftCheckedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  // Restore Draft on Mount (Create Mode & Admin)
  useEffect(() => {
    if (mode !== 'create' || !isAdmin || isAuthLoading) return;

    let isMounted = true;

    async function restoreDraft() {
      try {
        const draft = await storage.getMedicineDraft();
        if (!draft || !isMounted) return;

        if (draft.name) setName(draft.name);
        if (draft.form) setForm(draft.form as MedicineFormType);
        if (draft.shortDescription) setShortDescription(draft.shortDescription);
        if (draft.barcode) setBarcode(draft.barcode);
        if (draft.saltRows && Array.isArray(draft.saltRows) && draft.saltRows.length > 0) {
          setSaltRows(draft.saltRows as FormSaltRow[]);
        }
        if (draft.packQuantity) setPackQuantity(draft.packQuantity);
        if (draft.packUnit) setPackUnit(draft.packUnit as MedicinePackUnit);
        if (draft.uses) setUses(draft.uses);
        if (draft.recommendedAgeGroup) setRecommendedAgeGroup(draft.recommendedAgeGroup);
        if (draft.directions) setDirections(draft.directions);
        if (draft.warnings) setWarnings(draft.warnings);
        if (draft.storageInstructions) setStorageInstructions(draft.storageInstructions);
        if (draft.prescriptionRequired !== undefined) setPrescriptionRequired(draft.prescriptionRequired);
        if (draft.manufacturerName) setManufacturerName(draft.manufacturerName);
        if (draft.manufacturerId) setManufacturerId(draft.manufacturerId);
        if (draft.mrId) setMrId(draft.mrId);
        if (draft.batchNumber) setBatchNumber(draft.batchNumber);
        if (draft.manufacturingDate) setManufacturingDate(draft.manufacturingDate);
        if (draft.expiryDate) setExpiryDate(draft.expiryDate);
        if (draft.mrp) setMrp(draft.mrp);
        if (draft.purchaseRate) setPurchaseRate(draft.purchaseRate);
        if (draft.discountPercent) setDiscountPercent(draft.discountPercent);
        if (draft.gstPercent) setGstPercent(draft.gstPercent);
        if (draft.scheme) setScheme(draft.scheme);
        if (draft.privateNotes) setPrivateNotes(draft.privateNotes);

        if (draft.selectedImage && draft.selectedImage.uri) {
          setSelectedImage(draft.selectedImage);
        }

        setIsDraftRestored(true);
      } catch (err) {
        console.warn('Unable to load medicine draft:', err);
      } finally {
        if (isMounted) {
          initialDraftCheckedRef.current = true;
        }
      }
    }

    void restoreDraft();

    return () => {
      isMounted = false;
    };
  }, [mode, isAdmin, isAuthLoading]);

  // Dropdown overlay & UI State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [persistedMedicine, setPersistedMedicine] = useState<PublicMedicine | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Auto-Save Draft on Change (Create Mode)
  const saveDraft = useCallback(() => {
    if (
      mode !== 'create' ||
      !isAdmin ||
      isAuthLoading ||
      !initialDraftCheckedRef.current ||
      !isMountedRef.current ||
      (!isDirty && !isDraftRestored)
    ) {
      return;
    }

    const hasContent = Boolean(
      name.trim() ||
      shortDescription.trim() ||
      barcode.trim() ||
      selectedImage ||
      mrp.trim() ||
      purchaseRate.trim() ||
      batchNumber.trim() ||
      manufacturingDate.trim() ||
      expiryDate.trim() ||
      uses.trim() ||
      directions.trim() ||
      warnings.trim() ||
      storageInstructions.trim() ||
      privateNotes.trim() ||
      scheme.trim() ||
      (saltRows.length > 1 || (saltRows[0] && saltRows[0].name !== 'Paracetamol'))
    );

    if (!hasContent) return;

    const draft: MedicineDraft = {
      name,
      form,
      shortDescription,
      barcode,
      selectedImage: selectedImage
        ? {
            uri: selectedImage.uri,
            mimeType: selectedImage.mimeType,
            fileName: selectedImage.fileName,
            fileSize: selectedImage.fileSize,
            width: selectedImage.width,
            height: selectedImage.height,
          }
        : null,
      saltRows,
      packQuantity,
      packUnit,
      uses,
      recommendedAgeGroup,
      directions,
      warnings,
      storageInstructions,
      prescriptionRequired,
      manufacturerName,
      manufacturerId,
      mrId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      mrp,
      purchaseRate,
      discountPercent,
      gstPercent,
      scheme,
      privateNotes,
      savedAt: new Date().toISOString(),
    };

    void storage.saveMedicineDraft(draft);
  }, [
    mode,
    name,
    form,
    shortDescription,
    barcode,
    selectedImage,
    saltRows,
    packQuantity,
    packUnit,
    uses,
    recommendedAgeGroup,
    directions,
    warnings,
    storageInstructions,
    prescriptionRequired,
    manufacturerName,
    manufacturerId,
    mrId,
    batchNumber,
    manufacturingDate,
    expiryDate,
    mrp,
    purchaseRate,
    discountPercent,
    gstPercent,
    scheme,
    privateNotes,
  ]);

  useEffect(() => {
    if (mode !== 'create') return;

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 300);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [mode, saveDraft]);

  const handleConfirmDiscardDraft = () => {
    setShowDiscardDraftDialog(true);
  };

  const handleExecuteDiscardDraft = async () => {
    await storage.clearMedicineDraft();
    setIsDraftRestored(false);
    setShowDiscardDraftDialog(false);
    setName('');
    setForm('TABLET');
    setShortDescription('');
    setBarcode('');
    setSelectedImage(null);
    setExistingImageUrl(null);
    setSaltRows([
      {
        id: 'salt-row-1',
        saltId: FALLBACK_SALTS[0]?.id || 'salt-1',
        name: FALLBACK_SALTS[0]?.name || 'Paracetamol',
        amount: '500',
        unit: 'MG',
      },
    ]);
    setPackQuantity('10');
    setPackUnit('TABLET');
    setUses('');
    setRecommendedAgeGroup('Adults');
    setDirections('');
    setWarnings('');
    setStorageInstructions('');
    setPrescriptionRequired(false);
    setManufacturerName(FALLBACK_MANUFACTURERS[0]?.name || 'Acme Pharma Ltd.');
    setManufacturerId(FALLBACK_MANUFACTURERS[0]?.id || 'mfg-1');
    setMrId(null);
    setBatchNumber('');
    setManufacturingDate('');
    setExpiryDate('');
    setMrp('');
    setPurchaseRate('');
    setDiscountPercent('');
    setGstPercent('');
    setScheme('');
    setPrivateNotes('');
    setFieldErrors({});
    setGeneralError(null);
    setIsDirty(false);
  };

  // Debounced search for salts per row
  const saltSearchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mfgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      Object.values(saltSearchTimers.current).forEach((t) => clearTimeout(t));
      if (mfgSearchTimer.current) clearTimeout(mfgSearchTimer.current);
    };
  }, []);

  const searchSaltsForRow = useCallback((rowId: string, query: string) => {
    if (saltSearchTimers.current[rowId]) {
      clearTimeout(saltSearchTimers.current[rowId]);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSaltRecommendations((prev) => ({ ...prev, [rowId]: salts.slice(0, 10) }));
      setIsLoadingSalts((prev) => ({ ...prev, [rowId]: false }));
      return;
    }

    setIsLoadingSalts((prev) => ({ ...prev, [rowId]: true }));
    saltSearchTimers.current[rowId] = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ salts: PublicSalt[] }>(
          `/salts?search=${encodeURIComponent(trimmed)}`,
        );
        if (res && Array.isArray(res.salts)) {
          setSaltRecommendations((prev) => ({ ...prev, [rowId]: res.salts }));
        } else {
          const filtered = salts.filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase()));
          setSaltRecommendations((prev) => ({ ...prev, [rowId]: filtered }));
        }
      } catch {
        const filtered = salts.filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase()));
        setSaltRecommendations((prev) => ({ ...prev, [rowId]: filtered }));
      } finally {
        setIsLoadingSalts((prev) => ({ ...prev, [rowId]: false }));
      }
    }, 150);
  }, [salts]);

  const searchManufacturers = useCallback((query: string) => {
    if (mfgSearchTimer.current) {
      clearTimeout(mfgSearchTimer.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setMfgRecommendations(manufacturers.slice(0, 10));
      setIsLoadingMfg(false);
      return;
    }

    setIsLoadingMfg(true);
    mfgSearchTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ manufacturers: PublicManufacturer[] }>(
          `/manufacturers?search=${encodeURIComponent(trimmed)}`,
        );
        if (res && Array.isArray(res.manufacturers)) {
          setMfgRecommendations(res.manufacturers);
        } else {
          const filtered = manufacturers.filter((m) => m.name.toLowerCase().includes(trimmed.toLowerCase()));
          setMfgRecommendations(filtered);
        }
      } catch {
        const filtered = manufacturers.filter((m) => m.name.toLowerCase().includes(trimmed.toLowerCase()));
        setMfgRecommendations(filtered);
      } finally {
        setIsLoadingMfg(false);
      }
    }, 150);
  }, [manufacturers]);

  // Fetch reference metadata and existing medicine (if in edit mode)
  const loadData = async () => {
    try {
      if (mode === 'edit') {
        setIsLoadingInitial(true);
        setInitialFetchError(null);
      }

      const [mfgRes, mrRes, saltRes] = await Promise.allSettled([
        apiClient.get<{ manufacturers: PublicManufacturer[] }>('/manufacturers'),
        apiClient.get<{ mrs: PublicMr[] }>('/mrs'),
        apiClient.get<{ salts: PublicSalt[] }>('/salts'),
      ]);

      if (mfgRes.status === 'fulfilled' && Array.isArray(mfgRes.value?.manufacturers) && mfgRes.value.manufacturers.length > 0) {
        setManufacturers(mfgRes.value.manufacturers);
        setMfgRecommendations(mfgRes.value.manufacturers);
        if (mode === 'create') {
          setManufacturerName(mfgRes.value.manufacturers[0].name);
          setManufacturerId(mfgRes.value.manufacturers[0].id);
        }
      }
      if (mrRes.status === 'fulfilled' && Array.isArray(mrRes.value?.mrs) && mrRes.value.mrs.length > 0) {
        setMrs(mrRes.value.mrs);
      }
      if (saltRes.status === 'fulfilled' && Array.isArray(saltRes.value?.salts) && saltRes.value.salts.length > 0) {
        setSalts(saltRes.value.salts);
        if (mode === 'create') {
          setSaltRows([
            { id: 'salt-row-1', saltId: saltRes.value.salts[0].id, name: saltRes.value.salts[0].name, amount: '500', unit: 'MG' },
          ]);
        }
      }

      if (mode === 'edit' && medicineId) {
        let med: PublicMedicine | null = null;
        try {
          const medicineRes = await apiClient.get<{ medicine: PublicMedicine }>(`/medicines/${medicineId}`);
          if (medicineRes && medicineRes.medicine) {
            med = medicineRes.medicine;
          }
        } catch {
          // Check fallback sample medicines
          if (SAMPLE_MEDICINES[medicineId]) {
            med = SAMPLE_MEDICINES[medicineId];
          }
        }

        if (!med && SAMPLE_MEDICINES[medicineId]) {
          med = SAMPLE_MEDICINES[medicineId];
        }

        if (!med) {
          throw new Error('Medicine record not found');
        }
        setPersistedMedicine(med);
        setName(med.name || '');
        setForm(med.form || 'TABLET');
        setShortDescription(med.shortDescription || '');
        setBarcode(med.barcode || '');
        setExistingImageUrl(med.imageUrl || null);
        setPackQuantity(med.packQuantity ? String(med.packQuantity) : '10');
        setPackUnit(med.packUnit || 'TABLET');
        setUses(med.uses || '');
        setRecommendedAgeGroup(med.recommendedAgeGroup || 'Adults');
        setDirections(med.directions || '');
        setWarnings(med.warnings || '');
        setStorageInstructions(med.storageInstructions || '');
        setPrescriptionRequired(Boolean(med.prescriptionRequired));
        setManufacturerName(med.manufacturer?.name || '');
        setManufacturerId(med.manufacturer?.id || null);
        setMrId(med.mr?.id || null);
        setMrp(med.mrp !== null && med.mrp !== undefined ? String(med.mrp) : '');

        // Fetch detailed composition if available
        if (med.composition?.id) {
          try {
            const compRes = await apiClient.get<{ composition: PublicComposition }>(
              `/compositions/${med.composition.id}`,
            );
            if (
              compRes &&
              compRes.composition &&
              Array.isArray(compRes.composition.compositionSalts) &&
              compRes.composition.compositionSalts.length > 0
            ) {
              setSaltRows(
                compRes.composition.compositionSalts.map((cs, idx) => ({
                  id: `salt-row-${idx + 1}`,
                  saltId: cs.salt.id,
                  name: cs.salt.name,
                  amount: String(cs.amount),
                  unit: cs.unit,
                })),
              );
            }
          } catch {
            // Keep default salt row if composition detail not available
          }
        }

        // Fetch commercial details if accessible
        try {
          const commRes = await apiClient.get<{ commercialDetails: PublicCommercialDetails }>(
            `/medicines/${medicineId}/commercial-details`,
          );
          if (commRes && commRes.commercialDetails) {
            const cd = commRes.commercialDetails;
            if (cd.purchaseRate !== undefined && cd.purchaseRate !== null) {
              setPurchaseRate(String(cd.purchaseRate));
            }
            if (cd.mrp !== undefined && cd.mrp !== null) {
              setMrp(String(cd.mrp));
            }
            if (cd.discountPercent !== undefined && cd.discountPercent !== null) {
              setDiscountPercent(String(cd.discountPercent));
            }
            if (cd.gstPercent !== undefined && cd.gstPercent !== null) {
              setGstPercent(String(cd.gstPercent));
            }
            if (cd.scheme !== undefined && cd.scheme !== null) {
              if (typeof cd.scheme === 'object' && 'description' in cd.scheme) {
                setScheme(String((cd.scheme as { description: string }).description));
              } else if (typeof cd.scheme === 'string') {
                setScheme(cd.scheme);
              }
            }
            if (cd.privateNotes) {
              setPrivateNotes(cd.privateNotes);
            }
          }
        } catch {
          // Commercial details are admin-only; ignore 403/errors for staff
        }
      }
    } catch (err) {
      if (mode === 'edit') {
        const msg = err instanceof Error ? err.message : 'Failed to load medicine details.';
        setInitialFetchError(msg);
      }
    } finally {
      if (mode === 'edit') {
        setIsLoadingInitial(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, medicineId]);

  const saltCounterRef = useRef(1);

  // Multi-Salt Row Handlers
  const handleAddSaltRow = () => {
    saltCounterRef.current += 1;
    const newRowId = `salt-row-${saltCounterRef.current}`;
    setSaltRows((prev) => [
      ...prev,
      {
        id: newRowId,
        saltId: '',
        name: '',
        amount: '',
        unit: 'MG',
      },
    ]);
  };

  const handleRemoveSaltRow = (index: number) => {
    if (saltRows.length <= 1) {
      // Clear current row instead of removing last
      setSaltRows([{ id: 'salt-row-1', saltId: '', name: '', amount: '', unit: 'MG' }]);
      return;
    }
    setSaltRows((prev) => prev.filter((_, i) => i !== index));
    setOpenDropdown(null);
  };

  const handleUpdateSaltName = (index: number, val: string) => {
    markDirty();
    const row = saltRows[index];
    if (!row) return;

    const match = salts.find((s) => s.name.toLowerCase() === val.trim().toLowerCase());
    const newSaltId = match ? match.id : (row.saltId && val.trim() === row.name.trim() ? row.saltId : '');

    setSaltRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: val, saltId: newSaltId };
      return updated;
    });

    if (fieldErrors[`salt-${index}`]) {
      setFieldErrors((prev) => ({ ...prev, [`salt-${index}`]: '' }));
    }
    if (fieldErrors.salts) {
      setFieldErrors((prev) => ({ ...prev, salts: '' }));
    }

    searchSaltsForRow(row.id, val);
  };

  const handleSelectSaltRecommendation = (index: number, item: { id: string; name: string }) => {
    markDirty();
    setSaltRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: item.name, saltId: item.id };
      return updated;
    });
    if (fieldErrors[`salt-${index}`]) {
      setFieldErrors((prev) => ({ ...prev, [`salt-${index}`]: '' }));
    }
    if (fieldErrors.salts) {
      setFieldErrors((prev) => ({ ...prev, salts: '' }));
    }
  };

  const handleUpdateSaltAmount = (index: number, val: string) => {
    markDirty();
    setSaltRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: val };
      return updated;
    });
    if (fieldErrors[`salt-amount-${index}`]) {
      setFieldErrors((prev) => ({ ...prev, [`salt-amount-${index}`]: '' }));
    }
    if (fieldErrors.salts) {
      setFieldErrors((prev) => ({ ...prev, salts: '' }));
    }
  };

  const handleUpdateSaltUnit = (index: number, unit: CompositionSaltUnit) => {
    markDirty();
    setSaltRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit };
      return updated;
    });
  };

  const handleUpdateManufacturerName = (val: string) => {
    markDirty();
    const match = manufacturers.find((m) => m.name.toLowerCase() === val.trim().toLowerCase());
    setManufacturerName(val);
    setManufacturerId(match ? match.id : null);
    if (fieldErrors.manufacturer) {
      setFieldErrors((prev) => ({ ...prev, manufacturer: '' }));
    }
    if (fieldErrors.manufacturerId) {
      setFieldErrors((prev) => ({ ...prev, manufacturerId: '' }));
    }
    searchManufacturers(val);
  };

  const handleSelectManufacturerRecommendation = (item: { id: string; name: string }) => {
    markDirty();
    setManufacturerName(item.name);
    setManufacturerId(item.id);
    if (fieldErrors.manufacturer) {
      setFieldErrors((prev) => ({ ...prev, manufacturer: '' }));
    }
    if (fieldErrors.manufacturerId) {
      setFieldErrors((prev) => ({ ...prev, manufacturerId: '' }));
    }
  };

  // Image Picker Handlers
  const [scannerError, setScannerError] = useState<string | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      ocrAbortControllerRef.current?.abort();
    };
  }, []);

  const promptOpenSettings = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]);
  };

  const handlePickImage = async () => {
    try {
      setGeneralError(null);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted && Platform.OS !== 'web') {
        if (permissionResult.canAskAgain === false) {
          const msg =
            'Photo gallery permission is disabled in device settings. Open Settings to allow access, or continue entering medicine details manually.';
          setGeneralError(msg);
          promptOpenSettings('Gallery Permission Needed', msg);
        } else {
          setGeneralError(
            'Permission to access photo gallery was denied. You can try again or continue entering medicine details manually.',
          );
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64 || null,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || null,
          fileSize: asset.fileSize || null,
          width: asset.width || null,
          height: asset.height || null,
        });
        if (fieldErrors.image) {
          setFieldErrors((prev) => ({ ...prev, image: '' }));
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      setGeneralError('Failed to open image gallery. Please try again.');
    }
  };

  const handleRemoveImage = () => {
    markDirty();
    setSelectedImage(null);
    setExistingImageUrl(null);
  };

  // Feature 3: Photo Scanner Handlers
  const handleOpenScanner = () => {
    setScannerError(null);
    setScannedPhotos([]);
    setShowScannerModal(true);
  };

  const handleCloseScanner = () => {
    if (isScanningOcr) return;
    setScannerError(null);
    setScannedPhotos([]);
    setShowScannerModal(false);
  };

  const handleCancelOcrScan = () => {
    ocrAbortControllerRef.current?.abort();
    ocrAbortControllerRef.current = null;
    setIsScanningOcr(false);
    setScannerError(null);
    setScannedPhotos([]);
    setShowScannerModal(false);
  };

  const handleCaptureScannerPhoto = async (source: 'camera' | 'library') => {
    try {
      setScannerError(null);
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted && Platform.OS !== 'web') {
          if (perm.canAskAgain === false) {
            const msg =
              'Camera permission is disabled in device settings. Open Settings to enable camera access, or enter details manually.';
            setScannerError(msg);
            promptOpenSettings('Camera Permission Needed', msg);
          } else {
            setScannerError(
              'Camera permission is required to photograph medicine packaging. You can allow access or enter details manually.',
            );
          }
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted && Platform.OS !== 'web') {
          if (perm.canAskAgain === false) {
            const msg =
              'Gallery permission is disabled in device settings. Open Settings to allow access, or enter details manually.';
            setScannerError(msg);
            promptOpenSettings('Gallery Permission Needed', msg);
          } else {
            setScannerError(
              'Gallery permission is required to select packaging photos. You can allow access or enter details manually.',
            );
          }
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const count = scannedPhotos.length;
        const label =
          count === 0
            ? 'Front Packaging'
            : count === 1
              ? 'Back / Composition'
              : 'Side Flap / MRP & Batch';

        setScannedPhotos((prev) => [
          ...prev,
          {
            uri: asset.uri,
            base64: asset.base64 || null,
            label,
          },
        ]);
      }
    } catch (err) {
      console.warn('Scanner capture error:', err);
      setScannerError('Failed to capture photo. Please try again or enter details manually.');
    }
  };

  const handleRemoveScannedPhoto = (index: number) => {
    if (isScanningOcr) return;
    setScannedPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProcessScannedPhotos = async () => {
    if (scannedPhotos.length === 0 || isScanningOcr) return;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    ocrAbortControllerRef.current = controller;

    try {
      setScannerError(null);
      setIsScanningOcr(true);
      const ocrResult = await ocrService.scanMedicinePhotos(
        scannedPhotos,
        controller ? { signal: controller.signal } : undefined,
      );

      // Ignore result if user cancelled while in flight
      if (controller?.signal.aborted) {
        return;
      }

      const ext = ocrResult.extracted || {};

      // If no text/fields were extracted, do not corrupt existing form state or claim success
      if (!ocrResult.fieldsExtractedCount || ocrResult.fieldsExtractedCount <= 0) {
        setShowScannerModal(false);
        setScannedPhotos([]);
        setScanFeedback({
          type: 'warning',
          message:
            'No packaging details could be extracted from the selected photos. Existing form fields were left unchanged—please review and enter details manually.',
        });
        return;
      }

      markDirty();

      // 1. Medicine Name
      if (ext.name) {
        setName(ext.name);
        if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
      }

      // 2. Manufacturer
      if (ext.manufacturer) {
        setManufacturerName(ext.manufacturer);
        const match = manufacturers.find(
          (m) => m.name.toLowerCase() === ext.manufacturer!.toLowerCase(),
        );
        setManufacturerId(match ? match.id : null);
        if (fieldErrors.manufacturer) setFieldErrors((p) => ({ ...p, manufacturer: '' }));
      }

      // 3. MRP
      if (ext.mrp) {
        setMrp(ext.mrp);
        if (fieldErrors.mrp) setFieldErrors((p) => ({ ...p, mrp: '' }));
      }

      // 4. Batch Number
      if (ext.batchNumber) {
        setBatchNumber(ext.batchNumber);
      }

      // 5. Manufacturing Date
      if (ext.manufacturingDate) {
        setManufacturingDate(ext.manufacturingDate);
      }

      // 6. Expiry Date
      if (ext.expiryDate) {
        setExpiryDate(ext.expiryDate);
      }

      // 7. Form
      if (ext.form) {
        const matchedForm = MEDICINE_FORM_OPTIONS.find(
          (o) => o.value === ext.form,
        );
        if (matchedForm) {
          setForm(matchedForm.value);
        }
      }

      // 8. Pack Quantity & Pack Unit
      if (ext.packQuantity) {
        setPackQuantity(ext.packQuantity);
      }
      if (ext.packUnit) {
        const matchedUnit = PACK_UNIT_OPTIONS.find(
          (o) => o.value === ext.packUnit,
        );
        if (matchedUnit) {
          setPackUnit(matchedUnit.value);
        }
      }

      // 9. Salts
      if (ext.salts && ext.salts.length > 0) {
        const newSaltRows: FormSaltRow[] = ext.salts.map((s, idx) => {
          const matchedMasterSalt = salts.find(
            (ms) => ms.name.toLowerCase() === s.name.toLowerCase(),
          );
          return {
            id: `salt-row-${idx + 1}`,
            saltId: matchedMasterSalt ? matchedMasterSalt.id : '',
            name: matchedMasterSalt ? matchedMasterSalt.name : s.name,
            amount: s.amount,
            unit: (s.unit as CompositionSaltUnit) || 'MG',
          };
        });
        saltCounterRef.current = Math.max(saltCounterRef.current, newSaltRows.length);
        setSaltRows(newSaltRows);
      }

      // 10. Automatically select first photo as packaging preview image if not already selected
      if (scannedPhotos[0] && !selectedImage) {
        setSelectedImage({
          uri: scannedPhotos[0].uri,
          base64: scannedPhotos[0].base64 || null,
          mimeType: 'image/jpeg',
          fileName: `packaging-scan-${Date.now()}.jpg`,
          fileSize: null,
          width: null,
          height: null,
        });
      }

      setShowScannerModal(false);
      setScannedPhotos([]);

      if (ocrResult.conflicts && ocrResult.conflicts.length > 0) {
        setScanFeedback({
          type: 'warning',
          message: 'Packaging details extracted with potential discrepancies to verify.',
          conflicts: ocrResult.conflicts.map((c) => c.message),
        });
      } else {
        setScanFeedback({
          type: 'success',
          message: `Form successfully populated from ${ocrResult.photosProcessed} packaging ${ocrResult.photosProcessed === 1 ? 'photo' : 'photos'}! Review fields below before saving.`,
        });
      }
    } catch (err) {
      if (controller?.signal.aborted) {
        return;
      }
      console.warn('OCR scan processing error:', err);
      const errMessage =
        err instanceof ApiError && err.code === 'REQUEST_TIMEOUT'
          ? 'Scanning timed out. Please try again or enter details manually.'
          : 'Failed to process medicine packaging photos. Please enter manually or try again.';
      setScannerError(errMessage);
    } finally {
      if (ocrAbortControllerRef.current === controller) {
        ocrAbortControllerRef.current = null;
      }
      setIsScanningOcr(false);
    }
  };

  // Dynamic Composition Summary Preview
  const compositionSummary = useMemo(() => {
    const valid = saltRows.filter((r) => r.name.trim() && r.amount.trim());
    if (valid.length === 0) return null;
    return valid
      .map((r) => `${r.name.trim()} (${r.amount} ${r.unit})`)
      .join(' + ');
  }, [saltRows]);

  // Client Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const nameStr = String(name || '').trim();
    if (!nameStr) {
      errors.name = 'Medicine Name is required';
    } else if (nameStr.length > 255) {
      errors.name = 'Name must be 255 characters or less';
    }

    if (!form) {
      errors.form = 'Dosage form is required';
    }

    const mfgStr = String(manufacturerName || '').trim();
    if (!mfgStr) {
      errors.manufacturer = 'Manufacturer is required';
      errors.manufacturerId = 'Manufacturer is required';
    } else if (mfgStr.length > 255) {
      errors.manufacturer = 'Manufacturer name must be 255 characters or less';
    }

    const qtyStr = String(packQuantity || '').trim();
    const qty = parseFloat(qtyStr);
    if (!qtyStr || isNaN(qty) || qty <= 0) {
      errors.packQuantity = 'Pack quantity must be a positive number';
    }

    if (!packUnit) {
      errors.packUnit = 'Pack unit is required';
    }

    // Validate Salt Rows
    if (saltRows.length === 0) {
      errors.salts = 'At least one active salt with strength is required';
    } else {
      let hasAtLeastOneComplete = false;
      for (let i = 0; i < saltRows.length; i++) {
        const row = saltRows[i];
        const hasName = Boolean(String(row.name || '').trim());
        const amtStr = String(row.amount || '').trim();
        const amt = parseFloat(amtStr);
        const hasValidAmt = Boolean(amtStr && !isNaN(amt) && amt > 0);

        if (!hasName) {
          errors[`salt-${i}`] = 'Salt name is required';
        }
        if (!hasValidAmt) {
          errors[`salt-amount-${i}`] = 'Enter a valid strength amount';
        }

        if (hasName && hasValidAmt) {
          hasAtLeastOneComplete = true;
        }
      }

      if (!hasAtLeastOneComplete && !errors.salts) {
        errors.salts = 'At least one active salt with strength is required';
      }

      // Check for duplicate salts by entered name
      const enteredSaltNames = saltRows
        .map((r) => r.name.trim().toLowerCase())
        .filter(Boolean);
      if (new Set(enteredSaltNames).size !== enteredSaltNames.length) {
        errors.salts = 'Duplicate salts entered. Each salt in the composition must be unique.';
      }
    }

    // Validate Commercial Details
    const mrpStr = String(mrp || '').trim();
    const mrpValue = parseFloat(mrpStr);
    if (!mrpStr || isNaN(mrpValue) || mrpValue < 0) {
      errors.mrp = 'MRP is required and must be 0 or greater';
    }

    const prStr = String(purchaseRate || '').trim();
    if (prStr) {
      const prValue = parseFloat(prStr);
      if (isNaN(prValue) || prValue < 0) {
        errors.purchaseRate = 'Purchase rate must be 0 or greater';
      }
    }

    const discStr = String(discountPercent || '').trim();
    if (discStr) {
      const disc = parseFloat(discStr);
      if (isNaN(disc) || disc < 0 || disc > 100) {
        errors.discountPercent = 'Discount must be between 0% and 100%';
      }
    }

    const gstStr = String(gstPercent || '').trim();
    if (gstStr) {
      const gstVal = parseFloat(gstStr);
      if (isNaN(gstVal) || gstVal < 0 || gstVal > 100) {
        errors.gstPercent = 'GST must be between 0% and 100%';
      }
    }

    // Validate First Batch in Create Mode
    if (mode === 'create') {
      const expStr = String(expiryDate || '').trim();
      const mfgStrDate = String(manufacturingDate || '').trim();
      if (expStr) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expStr)) {
          errors.expiryDate = 'Expiry date must use YYYY-MM-DD format';
        }
      }
      if (mfgStrDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(mfgStrDate)) {
          errors.manufacturingDate = 'Manufacturing date must use YYYY-MM-DD format';
        }
      }
      if (expStr && mfgStrDate && expStr <= mfgStrDate) {
        errors.expiryDate = 'Expiry date must be after manufacturing date';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission Handler
  const handleSubmit = async () => {
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setGeneralError('Please resolve the highlighted validation errors above.');
      return;
    }

    setIsSubmitting(true);

    let newlyUploadedKey: string | undefined;
    let newlyUploadedPublicUrl: string | undefined;

    try {
      let finalImageUrl: string | null = existingImageUrl;

      if (selectedImage) {
        try {
          const uploadRes = await uploadMedicinePackagingImage(selectedImage);
          finalImageUrl = uploadRes.publicUrl;
          newlyUploadedKey = uploadRes.objectKey;
          newlyUploadedPublicUrl = uploadRes.publicUrl;
        } catch (uploadErr) {
          const uploadErrMsg =
            uploadErr instanceof Error ? uploadErr.message : 'Image upload failed';
          setGeneralError(`Image Upload Failed: ${uploadErrMsg}. Please try again.`);
          setIsSubmitting(false);
          return;
        }
      } else if (!existingImageUrl) {
        finalImageUrl = null;
      }

      const firstBatchObj = mode === 'create' ? {
        batchNumber: batchNumber.trim() || 'BATCH-2026-001',
        manufacturingDate: manufacturingDate.trim() || null,
        expiryDate: expiryDate.trim() || '2028-12-31',
        commercialDetails: {
          mrp: parseFloat(mrp),
          purchaseRate: purchaseRate.trim() ? parseFloat(purchaseRate) : 0,
          discountPercent: discountPercent.trim() ? parseFloat(discountPercent) : 0,
          gstPercent: gstPercent.trim() ? parseFloat(gstPercent) : 0,
          scheme: scheme.trim() ? { description: scheme.trim() } : null,
          privateNotes: privateNotes.trim() || null,
        },
      } : undefined;

      const payload = {
        name: name.trim(),
        form: form!,
        packQuantity: parseFloat(packQuantity),
        packUnit: packUnit!,
        shortDescription: shortDescription.trim() || null,
        imageUrl: finalImageUrl,
        uses: uses.trim() || null,
        recommendedAgeGroup: recommendedAgeGroup.trim() || null,
        directions: directions.trim() || null,
        warnings: warnings.trim() || null,
        storageInstructions: storageInstructions.trim() || null,
        barcode: barcode.trim() || null,
        prescriptionRequired,
        manufacturerId: manufacturerId || undefined,
        manufacturerName: manufacturerName.trim(),
        mrId: mrId || null,
        salts: saltRows.map((s) => ({
          saltId: s.saltId || undefined,
          name: s.name.trim(),
          amount: parseFloat(s.amount),
          unit: s.unit,
        })),
        ...(firstBatchObj ? { firstBatch: firstBatchObj } : {}),
        commercialDetails: {
          mrp: parseFloat(mrp),
          purchaseRate: purchaseRate.trim() ? parseFloat(purchaseRate) : 0,
          discountPercent: discountPercent.trim() ? parseFloat(discountPercent) : 0,
          gstPercent: gstPercent.trim() ? parseFloat(gstPercent) : 0,
          scheme: scheme.trim() ? { description: scheme.trim() } : null,
          privateNotes: privateNotes.trim() || null,
        },
      };

      let resultMedicine: PublicMedicine;

      if (mode === 'create') {
        const response = await apiClient.post<{ medicine: PublicMedicine }>('/medicines', payload);
        resultMedicine = response.medicine;
        setSuccessMessage(`"${resultMedicine.name}" created successfully!`);
        await storage.clearMedicineDraft();
        setIsDraftRestored(false);
      } else {
        const response = await apiClient.patch<{ medicine: PublicMedicine }>(
          `/medicines/${medicineId}`,
          payload,
        );
        resultMedicine = response.medicine;
        setSuccessMessage(`"${resultMedicine.name}" updated successfully!`);
      }

      setIsDirty(false);

      if (onSuccess) {
        onSuccess(resultMedicine);
      }

      navTimeoutRef.current = setTimeout(() => {
        if (onCancel) {
          onCancel();
        } else {
          navigation.goBack();
        }
      }, 500);
    } catch (err: unknown) {
      if (newlyUploadedKey || newlyUploadedPublicUrl) {
        await cleanupMedicinePackagingImage({
          objectKey: newlyUploadedKey,
          publicUrl: newlyUploadedPublicUrl,
        });
      }

      const apiCode = (err as { code?: string })?.code;
      const apiMsg = (err as { message?: string })?.message;

      if (err instanceof ApiError || apiCode) {
        if (apiCode === 'DUPLICATE_BARCODE') {
          setFieldErrors((prev) => ({
            ...prev,
            barcode: 'A medicine with this barcode already exists.',
          }));
          setGeneralError('Barcode already in use. Please provide a unique barcode.');
        } else if (apiCode === 'VALIDATION_ERROR') {
          setGeneralError(apiMsg || 'Validation error from server. Please review your entries.');
        } else {
          setGeneralError(apiMsg || `Failed to ${mode} medicine. Please try again.`);
        }
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setGeneralError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteMedicine = async () => {
    if (!medicineId || isDeleting) return;

    setIsDeleting(true);
    setGeneralError(null);

    try {
      await apiClient.delete(`/medicines/${medicineId}`);

      setShowDeleteDialog(false);
      setIsDirty(false);

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigation.navigate('Medicines');
      }
    } catch (err: unknown) {
      setShowDeleteDialog(false);
      const apiCode = (err as { code?: string })?.code;
      const apiMsg = (err as { message?: string })?.message;

      if (err instanceof ApiError || apiCode) {
        if (apiCode === 'MEDICINE_NOT_FOUND' || (err as ApiError).statusCode === 404) {
          setGeneralError('Medicine was not found or has already been deleted.');
          setTimeout(() => {
            navigation.navigate('Medicines');
          }, 1200);
        } else if (apiCode === 'FORBIDDEN' || (err as ApiError).statusCode === 403) {
          setGeneralError('You do not have permission to delete this medicine.');
        } else {
          setGeneralError(apiMsg || 'Failed to delete medicine. Please try again.');
        }
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred while deleting.';
        setGeneralError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  const handleBackPress = () => {
    if (isDirty && !isSubmitting && !successMessage) {
      setShowDiscardDialog(true);
    } else if (onCancel) {
      onCancel();
    } else {
      navigation.goBack();
    }
  };

  if (isLoadingInitial || isAuthLoading) {
    return (
      <AppScreen
        headerProps={{
          title: mode === 'create' ? 'Add Medicine' : 'Edit Medicine',
          showBack: true,
          onBack: handleBackPress,
        }}
      >
        <LoadingIndicator message={isLoadingInitial ? 'Loading medicine details...' : 'Checking access permissions...'} />
      </AppScreen>
    );
  }

  if (initialFetchError) {
    return (
      <AppScreen
        headerProps={{
          title: mode === 'create' ? 'Add Medicine' : 'Edit Medicine',
          showBack: true,
          onBack: handleBackPress,
        }}
      >
        <ErrorState
          title="Failed to Load Medicine"
          message={initialFetchError}
          onRetry={loadData}
        />
      </AppScreen>
    );
  }

  if (!isAdmin) {
    return (
      <AppScreen
        headerProps={{
          title: mode === 'create' ? 'Add Medicine' : 'Edit Medicine',
          showBack: true,
          onBack: handleBackPress,
        }}
      >
        <ErrorState
          title="Access Restricted"
          message={
            mode === 'create'
              ? 'Adding new medicines is restricted to ADMIN accounts only.'
              : 'Editing medicines is restricted to ADMIN accounts only.'
          }
        />
      </AppScreen>
    );
  }

  const currentPreviewUri = selectedImage?.uri || existingImageUrl;

  return (
    <AppScreen
      headerProps={{
        title: mode === 'create' ? 'Add Medicine' : 'Edit Medicine',
        subtitle: mode === 'create' ? 'New Catalogue Product' : 'Update Catalogue Product',
        showBack: true,
        onBack: handleBackPress,
      }}
      scrollable={true}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Draft Restored Banner (Create Mode) */}
      {isDraftRestored ? (
        <View style={styles.draftBanner} testID="draft-restored-banner">
          <View style={styles.draftBannerLeft}>
            <Icon name="document-text" size={18} color={colors.primary} />
            <Text style={styles.draftBannerText}>Draft restored from previous session</Text>
          </View>
          <TouchableOpacity
            onPress={handleConfirmDiscardDraft}
            style={styles.discardDraftButton}
            testID="discard-draft-button"
            accessibilityRole="button"
            accessibilityLabel="Discard Draft"
          >
            <Text style={styles.discardDraftButtonText}>Discard Draft</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Error / Success Feedback Banner */}
      {generalError ? (
        <View style={styles.errorBanner} testID="form-error-banner">
          <Icon name="warning" size={20} color={colors.error} />
          <Text style={styles.errorBannerText}>{generalError}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBanner} testID="form-success-banner">
          <Icon name="check" size={20} color="#15803D" />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Feature 3: Scan Medicine / Fill Using Photo Card (Create Mode Only) */}
      {mode === 'create' ? (
        <Card style={styles.scanHeroCard} testID="scan-medicine-hero-card">
          <View style={styles.scanHeroContent}>
            <View style={styles.scanHeroIconContainer}>
              <Icon name="camera" size={24} color="#059669" />
            </View>
            <View style={styles.scanHeroTextCol}>
              <Text style={styles.scanHeroTitle}>Scan Medicine / Fill Using Photo</Text>
              <Text style={styles.scanHeroSubtitle}>
                Photograph packaging (front, back, side) to autofill name, manufacturer, salts, MRP, batch & dates.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.scanHeroButton}
            onPress={handleOpenScanner}
            testID="btn-scan-medicine"
            accessibilityRole="button"
            accessibilityLabel="Scan Medicine / Fill Using Photo"
          >
            <Icon name="camera" size={18} color="#FFFFFF" />
            <Text style={styles.scanHeroButtonText}>Scan Medicine / Fill Using Photo</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {/* Scan Feedback Banner (Success / Warnings) */}
      {scanFeedback ? (
        <View
          style={
            scanFeedback.type === 'warning'
              ? styles.scanWarningBanner
              : styles.scanSuccessBanner
          }
          testID="scan-feedback-banner"
        >
          <Icon
            name={scanFeedback.type === 'warning' ? 'warning' : 'checkmark-circle'}
            size={20}
            color={scanFeedback.type === 'warning' ? '#D97706' : '#059669'}
          />
          <View style={styles.scanFeedbackTextCol}>
            <Text
              style={
                scanFeedback.type === 'warning'
                  ? styles.scanWarningBannerText
                  : styles.scanSuccessBannerText
              }
            >
              {scanFeedback.message}
            </Text>
            {scanFeedback.conflicts && scanFeedback.conflicts.length > 0 ? (
              <View style={styles.conflictsList}>
                {scanFeedback.conflicts.map((conflict, cIdx) => (
                  <Text key={cIdx} style={styles.conflictItemText}>
                    • {conflict}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setScanFeedback(null)}
            style={styles.dismissScanFeedbackBtn}
            testID="btn-dismiss-scan-feedback"
          >
            <Icon name="close" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ) : null}

        {/* 1. Basic Information */}
        <SectionHeader title="1. Basic Information" />
        <Card style={[styles.card, { zIndex: openDropdown === 'form' ? 100 : 10 }]}>
          <FormField label="Medicine Name" required error={fieldErrors.name}>
            <TextInput
              placeholder="e.g. Paracetamol 500mg Tablet"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
              }}
              testID="input-medicine-name"
              editable={!isSubmitting}
            />
          </FormField>

          <View style={[styles.fieldWrapper, { zIndex: openDropdown === 'form' ? 100 : 5 }]}>
            <DropdownSelect
              label="Dosage Form *"
              placeholder="Select Medicine Form"
              options={MEDICINE_FORM_OPTIONS}
              selectedValue={form}
              onSelect={(val) => {
                setForm(val);
                setOpenDropdown(null);
                if (fieldErrors.form) setFieldErrors((p) => ({ ...p, form: '' }));
              }}
              isOpen={openDropdown === 'form'}
              onToggle={() => toggleDropdown('form')}
              testID="select-medicine-form"
              disabled={isSubmitting}
            />
            {fieldErrors.form ? (
              <Text style={styles.inlineErrorText}>{fieldErrors.form}</Text>
            ) : null}
          </View>

          {/* Medicine Packaging Image Picker (Interactive Gallery Picker) */}
          <View style={styles.imageSection}>
            <Text style={styles.subFieldLabel}>Medicine Packaging Image</Text>
            {currentPreviewUri ? (
              <View style={styles.selectedImageContainer} testID="image-preview-container">
                <Pressable
                  style={({ pressed }) => [
                    styles.selectedImageWrapper,
                    pressed && styles.selectedImageWrapperPressed,
                  ]}
                  onPress={handlePickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Tap to change image"
                  testID="image-picker-box"
                  disabled={isSubmitting}
                >
                  <Image
                    source={{ uri: currentPreviewUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                    accessibilityLabel="Selected medicine packaging preview"
                    testID="image-preview"
                  />
                  <View style={styles.changeImageBanner}>
                    <Icon name="camera" size={14} color="#FFFFFF" />
                    <Text style={styles.changeImageText}>Tap to change image</Text>
                  </View>
                </Pressable>

                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  accessibilityRole="button"
                  accessibilityLabel="Remove image"
                  testID="remove-image-button"
                  disabled={isSubmitting}
                >
                  <Icon name="delete" size={14} color="#EF4444" />
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.imagePickerBox,
                  pressed && styles.imagePickerBoxPressed,
                  fieldErrors.image && styles.imagePickerBoxError,
                ]}
                onPress={handlePickImage}
                accessibilityRole="button"
                accessibilityLabel="Tap to select image from gallery"
                testID="image-picker-box"
                disabled={isSubmitting}
              >
                <View style={styles.pickerEmptyContent}>
                  <View style={styles.cameraIconCircle}>
                    <Icon name="camera" size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.pickerPromptText}>Tap to select image</Text>
                  <Text style={styles.pickerSubPromptText}>from gallery</Text>
                  <Text style={styles.pickerFormatHint}>JPG, PNG or WEBP (Optional)</Text>
                </View>
              </Pressable>
            )}
            {fieldErrors.image ? (
              <Text style={styles.inlineErrorText}>{fieldErrors.image}</Text>
            ) : null}
          </View>

          <FormField label="Short Description / Category" helperText="e.g. Analgesic / Antipyretic, Broad-spectrum antibiotic">
            <TextInput
              placeholder="e.g. Analgesic / Antipyretic"
              value={shortDescription}
              onChangeText={setShortDescription}
              testID="input-short-description"
              editable={!isSubmitting}
            />
          </FormField>

          <FormField label="Barcode" error={fieldErrors.barcode} helperText="Scan or enter unique product barcode / GTIN">
            <TextInput
              placeholder="e.g. 8901234567890"
              value={barcode}
              onChangeText={(val) => {
                setBarcode(val);
                if (fieldErrors.barcode) setFieldErrors((p) => ({ ...p, barcode: '' }));
              }}
              testID="input-barcode"
              editable={!isSubmitting}
              autoCapitalize="none"
            />
          </FormField>
        </Card>

        {/* 2. Composition (Salts & Strength) */}
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="2. Composition (Salts & Strength)" />
          <Text style={styles.saltCountBadge}>
            {saltRows.length} {saltRows.length === 1 ? 'Salt' : 'Salts'}
          </Text>
        </View>
        <Card style={[styles.card, { zIndex: openDropdown?.startsWith('salt') ? 100 : 9 }]}>
          <Text style={styles.cardHelpText}>
            Define active pharmaceutical ingredients (APIs) and their respective strength.
          </Text>

          {/* Dynamic Composition Summary */}
          {compositionSummary ? (
            <View style={styles.compositionSummaryBox} testID="composition-summary-preview">
              <Text style={styles.compositionSummaryLabel}>Combined Formula:</Text>
              <Text style={styles.compositionSummaryText}>{compositionSummary}</Text>
            </View>
          ) : null}

          {fieldErrors.salts ? (
            <Text style={[styles.inlineErrorText, { marginBottom: spacing.md }]}>
              {fieldErrors.salts}
            </Text>
          ) : null}

          {saltRows.map((row, index) => {
            return (
              <View
                key={row.id}
                style={styles.saltRowCard}
                testID={`salt-row-${index}`}
              >
                <View style={styles.saltRowHeader}>
                  <View style={styles.saltNumberBadge}>
                    <Text style={styles.saltNumberText}>Salt #{index + 1}</Text>
                  </View>
                  {saltRows.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveSaltRow(index)}
                      style={styles.removeSaltButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove Salt ${index + 1}`}
                      testID={`remove-salt-${index}`}
                      disabled={isSubmitting}
                    >
                      <Icon name="delete" size={16} color={colors.error} />
                      <Text style={styles.removeSaltText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Salt Autocomplete Text Input */}
                <View style={[styles.fieldWrapper, { zIndex: openDropdown === `salt-${index}` ? 100 : 5 }]}>
                  <AutocompleteInput
                    label="Salt Name *"
                    placeholder="e.g. Paracetamol"
                    value={row.name}
                    onChangeText={(val) => handleUpdateSaltName(index, val)}
                    recommendations={(saltRecommendations[row.id] || salts).map((s) => ({
                      id: s.id,
                      name: s.name,
                      subtitle: s.description || undefined,
                    }))}
                    onSelectRecommendation={(item) => {
                      handleSelectSaltRecommendation(index, item);
                      setOpenDropdown(null);
                    }}
                    isOpen={openDropdown === `salt-${index}`}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setOpenDropdown(`salt-${index}`);
                        searchSaltsForRow(row.id, row.name);
                      } else if (openDropdown === `salt-${index}`) {
                        setOpenDropdown(null);
                      }
                    }}
                    onClose={() => {
                      if (openDropdown === `salt-${index}`) setOpenDropdown(null);
                    }}
                    isLoading={Boolean(isLoadingSalts[row.id]) && openDropdown === `salt-${index}`}
                    error={fieldErrors[`salt-${index}`]}
                    testID={`select-salt-${index}`}
                    disabled={isSubmitting}
                    maxHeight={180}
                    nextInputRef={{
                      get current() {
                        return saltAmountRefs.current[row.id] || null;
                      },
                    }}
                  />
                </View>

                {/* Strength & Unit in Row */}
                <View style={styles.saltStrengthRow}>
                  <View style={styles.saltAmountCol}>
                    <FormField label="Strength Amount *" error={fieldErrors[`salt-amount-${index}`]}>
                      <TextInput
                        ref={(el) => {
                          saltAmountRefs.current[row.id] = el;
                        }}
                        placeholder="e.g. 500"
                        value={row.amount}
                        onChangeText={(val) => handleUpdateSaltAmount(index, val)}
                        keyboardType="decimal-pad"
                        testID={`input-salt-amount-${index}`}
                        editable={!isSubmitting}
                      />
                    </FormField>
                  </View>

                  <View style={[styles.saltUnitCol, { zIndex: openDropdown === `unit-${index}` ? 100 : 4 }]}>
                    <DropdownSelect
                      label="Unit *"
                      placeholder="Unit"
                      options={SALT_UNIT_OPTIONS}
                      selectedValue={row.unit}
                      onSelect={(val) => {
                        handleUpdateSaltUnit(index, (val as CompositionSaltUnit) || 'MG');
                        setOpenDropdown(null);
                      }}
                      isOpen={openDropdown === `unit-${index}`}
                      onToggle={() => toggleDropdown(`unit-${index}`)}
                      testID={`select-salt-unit-${index}`}
                      disabled={isSubmitting}
                      maxHeight={160}
                    />
                  </View>
                </View>
              </View>
            );
          })}

          {/* Add Another Salt Action */}
          <TouchableOpacity
            style={styles.addSaltButton}
            onPress={handleAddSaltRow}
            accessibilityRole="button"
            accessibilityLabel="Add another active salt"
            testID="add-salt-button"
            disabled={isSubmitting}
          >
            <Icon name="add" size={16} color={colors.primary} />
            <Text style={styles.addSaltButtonText}>+ Add Another Salt</Text>
          </TouchableOpacity>
        </Card>

        {/* 3. Packaging Information */}
        <SectionHeader title="3. Packaging Information" />
        <Card style={[styles.card, { zIndex: openDropdown === 'packUnit' ? 100 : 8 }]}>
          <View style={styles.rowTwoCols}>
            <View style={styles.colHalf}>
              <FormField label="Pack Quantity *" error={fieldErrors.packQuantity} helperText="e.g. 10, 100, 1">
                <TextInput
                  placeholder="e.g. 10"
                  value={packQuantity}
                  onChangeText={(val) => {
                    setPackQuantity(val);
                    if (fieldErrors.packQuantity) setFieldErrors((p) => ({ ...p, packQuantity: '' }));
                  }}
                  keyboardType="decimal-pad"
                  testID="input-pack-quantity"
                  editable={!isSubmitting}
                />
              </FormField>
            </View>

            <View style={[styles.colHalf, { zIndex: openDropdown === 'packUnit' ? 100 : 5 }]}>
              <DropdownSelect
                label="Pack Unit *"
                placeholder="Select Unit"
                options={PACK_UNIT_OPTIONS}
                selectedValue={packUnit}
                onSelect={(val) => {
                  setPackUnit(val);
                  setOpenDropdown(null);
                  if (fieldErrors.packUnit) setFieldErrors((p) => ({ ...p, packUnit: '' }));
                }}
                isOpen={openDropdown === 'packUnit'}
                onToggle={() => toggleDropdown('packUnit')}
                testID="select-pack-unit"
                disabled={isSubmitting}
                maxHeight={180}
              />
              {fieldErrors.packUnit ? (
                <Text style={styles.inlineErrorText}>{fieldErrors.packUnit}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* 4. Medical & Safety Information */}
        <SectionHeader title="4. Medical & Safety Information" />
        <Card style={[styles.card, { zIndex: openDropdown === 'ageGroup' ? 100 : 7 }]}>
          <FormField label="Therapeutic Uses / Indications" helperText="Conditions or symptoms treated">
            <TextInput
              placeholder="e.g. Pain relief, fever reduction, arthritis symptom management"
              value={uses}
              onChangeText={setUses}
              multiline
              numberOfLines={2}
              testID="input-uses"
              editable={!isSubmitting}
            />
          </FormField>

          <View style={[styles.fieldWrapper, { zIndex: openDropdown === 'ageGroup' ? 100 : 5 }]}>
            <DropdownSelect
              label="Recommended Age Group"
              placeholder="Select Target Age Group"
              options={AGE_GROUP_OPTIONS}
              selectedValue={recommendedAgeGroup}
              onSelect={(val) => {
                setRecommendedAgeGroup(val || 'Adults');
                setOpenDropdown(null);
              }}
              isOpen={openDropdown === 'ageGroup'}
              onToggle={() => toggleDropdown('ageGroup')}
              testID="select-age-group"
              disabled={isSubmitting}
              maxHeight={180}
            />
          </View>

          <FormField label="Directions for Use / Dosage">
            <TextInput
              placeholder="e.g. 1 tablet twice daily after meals or as directed by physician"
              value={directions}
              onChangeText={setDirections}
              multiline
              numberOfLines={2}
              testID="input-directions"
              editable={!isSubmitting}
            />
          </FormField>

          <FormField label="Warnings & Precautions">
            <TextInput
              placeholder="e.g. Do not exceed recommended dose. Consult physician if pregnant."
              value={warnings}
              onChangeText={setWarnings}
              multiline
              numberOfLines={2}
              testID="input-warnings"
              editable={!isSubmitting}
            />
          </FormField>

          <FormField label="Storage Instructions">
            <TextInput
              placeholder="e.g. Store below 25°C in a dry place protected from light"
              value={storageInstructions}
              onChangeText={setStorageInstructions}
              testID="input-storage"
              editable={!isSubmitting}
            />
          </FormField>

          {/* Prescription Required Toggle */}
          <View style={styles.prescriptionSection}>
            <Text style={styles.subFieldLabel}>Prescription Requirement *</Text>
            <View style={styles.prescriptionToggleRow} testID="prescription-toggle">
              <TouchableOpacity
                style={[
                  styles.rxOption,
                  !prescriptionRequired && styles.rxOptionActiveOTC,
                ]}
                onPress={() => setPrescriptionRequired(false)}
                disabled={isSubmitting}
                testID="rx-option-otc"
              >
                <Icon
                  name="check"
                  size={16}
                  color={!prescriptionRequired ? '#15803D' : '#64748B'}
                />
                <Text
                  style={[
                    styles.rxOptionText,
                    !prescriptionRequired && styles.rxOptionTextActiveOTC,
                  ]}
                >
                  OTC (Over-the-Counter)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rxOption,
                  prescriptionRequired && styles.rxOptionActiveRx,
                ]}
                onPress={() => setPrescriptionRequired(true)}
                disabled={isSubmitting}
                testID="rx-option-rx"
              >
                <Icon
                  name="medicines"
                  size={16}
                  color={prescriptionRequired ? '#DC2626' : '#64748B'}
                />
                <Text
                  style={[
                    styles.rxOptionText,
                    prescriptionRequired && styles.rxOptionTextActiveRx,
                  ]}
                >
                  Rx (Prescription Required)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* 5. Manufacturer & 6. Medical Representative */}
        <SectionHeader title="5 & 6. Production & Representation" />
        <Card
          style={[
            styles.card,
            {
              zIndex:
                openDropdown === 'mfg' || openDropdown === 'mr' ? 100 : 6,
            },
          ]}
        >
          {/* Manufacturer Autocomplete Text Input */}
          <View style={[styles.fieldWrapper, { zIndex: openDropdown === 'mfg' ? 100 : 6 }]}>
            <AutocompleteInput
              label="Manufacturer *"
              placeholder="e.g. Torrent Pharmaceuticals Ltd."
              value={manufacturerName}
              onChangeText={handleUpdateManufacturerName}
              recommendations={mfgRecommendations.map((m) => ({
                id: m.id,
                name: m.name,
              }))}
              onSelectRecommendation={(item) => {
                handleSelectManufacturerRecommendation(item);
                setOpenDropdown(null);
              }}
              isOpen={openDropdown === 'mfg'}
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setOpenDropdown('mfg');
                  searchManufacturers(manufacturerName);
                } else if (openDropdown === 'mfg') {
                  setOpenDropdown(null);
                }
              }}
              onClose={() => {
                if (openDropdown === 'mfg') setOpenDropdown(null);
              }}
              isLoading={isLoadingMfg && openDropdown === 'mfg'}
              error={fieldErrors.manufacturer || fieldErrors.manufacturerId}
              testID="select-manufacturer"
              disabled={isSubmitting}
              maxHeight={200}
            />
          </View>

          {/* Medical Representative (MR) Selector */}
          <View style={[styles.fieldWrapper, { zIndex: openDropdown === 'mr' ? 100 : 5 }]}>
            <DropdownSelect
              label="Medical Representative (MR)"
              placeholder="Select MR (Optional)"
              options={[
                { label: 'None (Unassigned)', value: null },
                ...mrs.map((mr) => ({
                  label: `${mr.name}${mr.company ? ` (${mr.company})` : ''}`,
                  value: mr.id,
                })),
              ]}
              selectedValue={mrId}
              onSelect={(val) => {
                setMrId(val);
                setOpenDropdown(null);
              }}
              isOpen={openDropdown === 'mr'}
              onToggle={() => toggleDropdown('mr')}
              testID="select-mr"
              disabled={isSubmitting}
              maxHeight={200}
            />
          </View>
        </Card>

        {/* 7. First Batch Information (Create Mode Only) */}
        {mode === 'create' ? (
          <>
            <SectionHeader title="7. First Batch Information" />
            <Card style={[styles.card, { zIndex: 5 }]}>
              <FormField label="Batch Number" error={fieldErrors.batchNumber} helperText="e.g. BATCH-2026-001 (Optional, defaults to BATCH-2026-001)">
                <TextInput
                  placeholder="e.g. BATCH-2026-001"
                  value={batchNumber}
                  onChangeText={(val) => {
                    setBatchNumber(val);
                    if (fieldErrors.batchNumber) setFieldErrors((p) => ({ ...p, batchNumber: '' }));
                  }}
                  testID="input-batch-number"
                  editable={!isSubmitting}
                />
              </FormField>

              <View style={styles.rowTwoCols}>
                <View style={styles.colHalf}>
                  <MonthYearSelector
                    label="Mfg Date (Month / Year)"
                    value={manufacturingDate}
                    onChange={(val) => {
                      setManufacturingDate(val || '');
                      if (fieldErrors.manufacturingDate) setFieldErrors((p) => ({ ...p, manufacturingDate: '' }));
                    }}
                    placeholder="Select Month & Year"
                    error={fieldErrors.manufacturingDate}
                    helperText="e.g. Jan 2026 (Optional)"
                    disabled={isSubmitting}
                    testID="input-manufacturing-date"
                    modalTestID="mfg-month-picker-modal"
                  />
                </View>

                <View style={styles.colHalf}>
                  <MonthYearSelector
                    label="Expiry Date (Month / Year)"
                    value={expiryDate}
                    onChange={(val) => {
                      setExpiryDate(val || '');
                      if (fieldErrors.expiryDate) setFieldErrors((p) => ({ ...p, expiryDate: '' }));
                    }}
                    placeholder="Select Month & Year"
                    error={fieldErrors.expiryDate}
                    helperText="e.g. Dec 2028"
                    disabled={isSubmitting}
                    testID="input-expiry-date"
                    modalTestID="exp-month-picker-modal"
                  />
                </View>
              </View>
            </Card>
          </>
        ) : null}

        {/* Commercial Details */}
        <SectionHeader title={mode === 'create' ? '8. Commercial Details (First Batch)' : '7. Commercial Details'} />
        <Card style={[styles.card, { zIndex: 5 }]}>
          <View style={styles.rowTwoCols}>
            <View style={styles.colHalf}>
              <FormField label="MRP (₹) *" error={fieldErrors.mrp} helperText="Maximum Retail Price">
                <TextInput
                  placeholder="e.g. 150.00"
                  value={mrp}
                  onChangeText={(val) => {
                    setMrp(val);
                    if (fieldErrors.mrp) setFieldErrors((p) => ({ ...p, mrp: '' }));
                  }}
                  keyboardType="decimal-pad"
                  testID="input-mrp"
                  editable={!isSubmitting}
                />
              </FormField>
            </View>

            <View style={styles.colHalf}>
              <FormField label="Purchase Rate (₹)" error={fieldErrors.purchaseRate} helperText="Cost from distributor">
                <TextInput
                  placeholder="e.g. 110.00"
                  value={purchaseRate}
                  onChangeText={(val) => {
                    setPurchaseRate(val);
                    if (fieldErrors.purchaseRate) setFieldErrors((p) => ({ ...p, purchaseRate: '' }));
                  }}
                  keyboardType="decimal-pad"
                  testID="input-purchase-rate"
                  editable={!isSubmitting}
                />
              </FormField>
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={styles.colHalf}>
              <FormField label="Trade Discount (%)" error={fieldErrors.discountPercent}>
                <TextInput
                  placeholder="e.g. 10.0"
                  value={discountPercent}
                  onChangeText={(val) => {
                    setDiscountPercent(val);
                    if (fieldErrors.discountPercent) setFieldErrors((p) => ({ ...p, discountPercent: '' }));
                  }}
                  keyboardType="decimal-pad"
                  testID="input-discount-percent"
                  editable={!isSubmitting}
                />
              </FormField>
            </View>

            <View style={styles.colHalf}>
              <FormField label="GST (%)" error={fieldErrors.gstPercent} helperText="GST rate">
                <TextInput
                  placeholder="e.g. 12.0"
                  value={gstPercent}
                  onChangeText={(val) => {
                    setGstPercent(val);
                    if (fieldErrors.gstPercent) setFieldErrors((p) => ({ ...p, gstPercent: '' }));
                  }}
                  keyboardType="decimal-pad"
                  testID="input-gst-percent"
                  editable={!isSubmitting}
                />
              </FormField>
            </View>
          </View>

          <FormField label="Scheme / Bonus">
            <TextInput
              placeholder="e.g. 10 + 1 Free"
              value={scheme}
              onChangeText={setScheme}
              testID="input-scheme"
              editable={!isSubmitting}
            />
          </FormField>

          <FormField label="Commercial Private Notes" helperText="Confidential dealer terms and notes">
            <TextInput
              placeholder="e.g. Special distributor credit term 30 days"
              value={privateNotes}
              onChangeText={setPrivateNotes}
              multiline
              numberOfLines={2}
              testID="input-private-notes"
              editable={!isSubmitting}
            />
          </FormField>
        </Card>

        {/* Submit Action */}
        <View style={styles.footer}>
          <PrimaryButton
            title={
              isSubmitting
                ? mode === 'create'
                  ? 'Adding Medicine...'
                  : 'Saving Changes...'
                : mode === 'create'
                ? 'Add Medicine'
                : 'Save Changes'
            }
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isDeleting}
            size="lg"
            testID={mode === 'create' ? 'submit-add-medicine-button' : 'submit-edit-medicine-button'}
          />
        </View>

        {/* Destructive Delete Action (Edit Mode Only) */}
        {mode === 'edit' && medicineId ? (
          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={[styles.deleteButton, (isSubmitting || isDeleting) && styles.deleteButtonDisabled]}
              onPress={() => setShowDeleteDialog(true)}
              accessibilityRole="button"
              accessibilityLabel="Delete Medicine"
              disabled={isSubmitting || isDeleting}
              testID="delete-medicine-button"
            >
              <Icon name="delete" size={18} color="#DC2626" />
              <Text style={styles.deleteButtonText}>Delete Medicine</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Discard Changes Confirmation Dialog */}
        <ConfirmDialog
          visible={showDiscardDialog}
          title="Discard Changes?"
          message="You have unsaved modifications on this medicine. Are you sure you want to discard them and leave?"
          confirmText="Discard Changes"
          cancelText="Keep Editing"
          isDestructive={true}
          onConfirm={() => {
            setShowDiscardDialog(false);
            if (onCancel) onCancel();
            else navigation.goBack();
          }}
          onCancel={() => setShowDiscardDialog(false)}
        />

        {/* Discard Draft Confirmation Dialog (Create Mode) */}
        <ConfirmDialog
          visible={showDiscardDraftDialog}
          title="Discard Draft?"
          message="Are you sure you want to discard your saved draft? All filled medicine details will be reset."
          confirmText="Discard Draft"
          cancelText="Keep Draft"
          isDestructive={true}
          onConfirm={handleExecuteDiscardDraft}
          onCancel={() => setShowDiscardDraftDialog(false)}
          testID="discard-draft-dialog"
          confirmTestID="confirm-discard-draft-button"
          cancelTestID="cancel-discard-draft-button"
        />

        {/* Delete Medicine Confirmation Dialog */}
        <ConfirmDialog
          visible={showDeleteDialog}
          title="Delete Medicine"
          message={`Do you want to delete ${persistedMedicine?.name || name || 'this medicine'}?`}
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive={true}
          loading={isDeleting}
          onConfirm={handleDeleteMedicine}
          onCancel={() => {
            if (!isDeleting) setShowDeleteDialog(false);
          }}
          testID="delete-medicine-dialog"
          confirmTestID="confirm-delete-button"
          cancelTestID="cancel-delete-button"
        />
        {/* Feature 3: Photo Scanner Modal */}
        <MedicineScannerModal
          visible={showScannerModal}
          onClose={handleCloseScanner}
          scannedPhotos={scannedPhotos}
          isScanningOcr={isScanningOcr}
          onCapturePhoto={handleCaptureScannerPhoto}
          onRemovePhoto={handleRemoveScannedPhoto}
          onProcessPhotos={handleProcessScannedPhotos}
          onCancelScan={handleCancelOcrScan}
          errorMessage={scannerError}
        />
      </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    padding: spacing.base,
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'visible',
  },
  cardHelpText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  fieldWrapper: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  inlineErrorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
    marginTop: 4,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colHalf: {
    flex: 1,
  },
  saltCountBadge: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  compositionSummaryBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  compositionSummaryLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#15803D',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  compositionSummaryText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#166534',
  },
  saltRowCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  saltRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  saltNumberBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  saltNumberText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  removeSaltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  removeSaltText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.error,
  },
  saltStrengthRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  saltAmountCol: {
    flex: 1.2,
  },
  saltUnitCol: {
    flex: 1,
  },
  addSaltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
    marginTop: spacing.xs,
  },
  addSaltButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  imageSection: {
    marginBottom: spacing.base,
  },
  imagePickerBox: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    backgroundColor: '#F8FAFC',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  imagePickerBoxPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.primary,
  },
  imagePickerBoxError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  pickerEmptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pickerPromptText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  pickerSubPromptText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  pickerFormatHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  selectedImageContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedImageWrapper: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedImageWrapperPressed: {
    opacity: 0.9,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  changeImageBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8, 84, 68, 0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 6,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: '#FEE2E2',
    alignSelf: 'center',
  },
  removeImageText: {
    color: '#DC2626',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  subFieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  prescriptionSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  prescriptionToggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  rxOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  rxOptionActiveOTC: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  rxOptionActiveRx: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  rxOptionText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  rxOptionTextActiveOTC: {
    color: '#15803D',
    fontWeight: fontWeights.bold,
  },
  rxOptionTextActiveRx: {
    color: '#DC2626',
    fontWeight: fontWeights.bold,
  },
  footer: {
    marginTop: spacing.base,
    marginBottom: spacing.xxl,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.base,
  },
  draftBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  draftBannerText: {
    flex: 1,
    fontSize: fontSizes.xs + 1,
    color: '#065F46',
    fontWeight: fontWeights.semibold,
  },
  discardDraftButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  discardDraftButtonText: {
    fontSize: fontSizes.xs,
    color: '#DC2626',
    fontWeight: fontWeights.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.error,
    fontWeight: fontWeights.medium,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  successBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: '#15803D',
    fontWeight: fontWeights.semibold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  deleteSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minWidth: 200,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#DC2626',
  },
  // Feature 3: Scanner Styles
  scanHeroCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  scanHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scanHeroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHeroTextCol: {
    flex: 1,
  },
  scanHeroTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    marginBottom: 2,
  },
  scanHeroSubtitle: {
    fontSize: fontSizes.xs,
    color: '#047857',
    lineHeight: 16,
  },
  scanHeroButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
  },
  scanHeroButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  scanSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  scanSuccessBannerText: {
    fontSize: fontSizes.sm,
    color: '#15803D',
    fontWeight: fontWeights.semibold,
  },
  scanWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  scanWarningBannerText: {
    fontSize: fontSizes.sm,
    color: '#B45309',
    fontWeight: fontWeights.bold,
  },
  scanFeedbackTextCol: {
    flex: 1,
  },
  dismissScanFeedbackBtn: {
    padding: 2,
  },
  conflictsList: {
    marginTop: spacing.xs,
  },
  conflictItemText: {
    fontSize: fontSizes.xs,
    color: '#B45309',
    lineHeight: 16,
  },
});
