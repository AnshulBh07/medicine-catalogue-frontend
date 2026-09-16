import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Animated, Linking, Text } from 'react-native';
import {
  DealsListScreen,
  DealDetailsScreen,
  AddDealScreen,
  EditDealScreen,
  SelectionBottomSheetModal,
} from '../src/screens/deals';
import { MoreScreen } from '../src/screens/more/MoreScreen';
import { DashboardScreen } from '../src/screens/dashboard/DashboardScreen';
import { apiClient } from '../src/services/api-client';
import { dealService } from '../src/services/dealService';
import type { DealsListResult, PublicDeal } from '../src/types/models';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {};
const mockSetParams = jest.fn((params: Record<string, unknown>) => {
  Object.assign(mockRouteParams, params);
});

const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setParams: mockSetParams,
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      actualReact.useEffect(() => {
        const c = cb();
        return typeof c === 'function' ? c : undefined;
      }, [cb]);
    },
  };
});

let mockIsAdmin = true;

jest.mock('../src/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin User', role: mockIsAdmin ? 'ADMIN' : 'EMPLOYEE' },
    isAdmin: mockIsAdmin,
    isEmployee: !mockIsAdmin,
    isAuthenticated: true,
    refreshUser: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('../src/services/dealService', () => ({
  dealService: {
    listDeals: jest.fn(),
    getDealById: jest.fn(),
    createDeal: jest.fn(),
    updateDeal: jest.fn(),
    updateDealStatus: jest.fn(),
    deleteDeal: jest.fn(),
    checkPendingDeal: jest.fn(),
  },
}));

jest.mock('../src/services/api-client', () => {
  const actual = jest.requireActual('../src/services/api-client');
  return {
    ...actual,
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  };
});

const mockDeal1: PublicDeal = {
  id: 'deal-1',
  medicineId: 'med-1',
  medicine: {
    id: 'med-1',
    name: 'Augmentin 625 Duo',
    form: 'TABLET',
    packQuantity: 10,
    packUnit: 'TABLET',
    manufacturer: { id: 'mfg-1', name: 'GSK Pharma' },
  },
  mrId: 'mr-1',
  mr: {
    id: 'mr-1',
    name: 'Suresh Sharma',
    company: 'GSK',
    phone: '+919876543210',
    email: 'suresh@gsk.com',
  },
  dealDate: '2026-09-10T10:00:00.000Z',
  agreedMrp: 255.0,
  agreedScheme: '10+3',
  agreedBillDiscount: 5.0,
  mrPhoneSnapshot: '+919876543210',
  status: 'PENDING',
  notes: 'Agreed directly at counter',
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Admin Pharmacist' },
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
};

const mockDeal2: PublicDeal = {
  id: 'deal-2',
  medicineId: 'med-2',
  medicine: {
    id: 'med-2',
    name: 'Azithral 500mg',
    form: 'TABLET',
    packQuantity: 5,
    packUnit: 'TABLET',
    manufacturer: { id: 'mfg-2', name: 'Alembic' },
  },
  mrId: 'mr-2',
  mr: {
    id: 'mr-2',
    name: 'Rajesh Verma',
    company: 'Alembic',
    phone: null,
    email: null,
  },
  dealDate: '2026-09-08T10:00:00.000Z',
  agreedMrp: 120.0,
  agreedScheme: '9+1',
  agreedBillDiscount: 7.5,
  mrPhoneSnapshot: null,
  status: 'RECEIVED',
  notes: 'Festival special deal',
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Admin Pharmacist' },
  createdAt: '2026-09-08T10:00:00.000Z',
  updatedAt: '2026-09-08T10:00:00.000Z',
};

const mockDealsListResult: DealsListResult = {
  deals: [mockDeal1, mockDeal2],
  pagination: {
    total: 2,
    page: 1,
    limit: 50,
    totalPages: 1,
  },
  summary: {
    total: 2,
    pending: 1,
    received: 1,
    cancelled: 0,
  },
};

describe('Medicine Deals Mobile Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockIsAdmin = true;

    (dealService.listDeals as jest.Mock).mockResolvedValue(mockDealsListResult);
    (dealService.getDealById as jest.Mock).mockResolvedValue({ deal: mockDeal1 });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders DealsListScreen with deal cards and commercial metrics', async () => {
    const { getByText } = await render(<DealsListScreen />);

    await waitFor(() => {
      expect(getByText('Medicine Deals')).toBeTruthy();
      expect(getByText('Augmentin 625 Duo')).toBeTruthy();
      expect(getByText('₹255.00')).toBeTruthy();
      expect(getByText('10+3')).toBeTruthy();
      expect(getByText('5.0%')).toBeTruthy();
      expect(getByText('Pending Delivery')).toBeTruthy();
      expect(getByText('Call MR')).toBeTruthy();
    });
  });

  it('calls MR when Call MR button is tapped', async () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

    const { getByText } = await render(<DealsListScreen />);

    await waitFor(() => {
      expect(getByText('Call MR')).toBeTruthy();
    });

    fireEvent.press(getByText('Call MR'));

    expect(openUrlSpy).toHaveBeenCalledWith('tel:+919876543210');
    openUrlSpy.mockRestore();
  });

  it('toggles deal status from list screen', async () => {
    (dealService.updateDealStatus as jest.Mock).mockResolvedValue({
      deal: { ...mockDeal1, status: 'RECEIVED' },
    });

    const { getByText } = await render(<DealsListScreen />);

    await waitFor(() => {
      expect(getByText('Mark Received')).toBeTruthy();
    });

    fireEvent.press(getByText('Mark Received'));
  });

  it('filters deals by tab', async () => {
    const { getByText } = await render(<DealsListScreen />);

    await waitFor(() => {
      expect(getByText('Pending (1)')).toBeTruthy();
    });

    fireEvent.press(getByText('Pending (1)'));

    await waitFor(() => {
      expect(dealService.listDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        }),
      );
    });
  });

  it('renders DealDetailsScreen with full commercial terms and metadata', async () => {
    mockRouteParams = { dealId: 'deal-1' };

    const { getByText } = await render(<DealDetailsScreen />);

    await waitFor(() => {
      expect(getByText('Deal Agreement')).toBeTruthy();
      expect(getByText('AGREED COMMERCIAL TERMS')).toBeTruthy();
      expect(getByText('₹255.00')).toBeTruthy();
      expect(getByText('10+3')).toBeTruthy();
      expect(getByText('5.00%')).toBeTruthy();
      expect(getByText('Suresh Sharma • GSK')).toBeTruthy();
      expect(getByText('+919876543210')).toBeTruthy();
      expect(getByText('Agreed directly at counter')).toBeTruthy();
    });
  });

  it('renders AddDealScreen and selects medicine and MR', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('commercial-details')) {
        return Promise.resolve({
          commercialDetails: {
            mrp: 255,
            scheme: '10+3',
            discountPercent: 5,
          },
        });
      }
      if (url.startsWith('/medicines')) {
        return Promise.resolve({
          medicines: [
            {
              id: 'med-1',
              name: 'Augmentin 625 Duo',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              manufacturer: { id: 'mfg-1', name: 'GSK' },
            },
          ],
        });
      }
      if (url.startsWith('/mrs')) {
        return Promise.resolve({
          mrs: [
            {
              id: 'mr-1',
              name: 'Suresh Sharma',
              company: 'GSK',
              phone: '+919876543210',
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    (dealService.checkPendingDeal as jest.Mock).mockResolvedValue({
      hasPendingDeal: false,
      deal: null,
    });

    (dealService.createDeal as jest.Mock).mockResolvedValue({
      deal: mockDeal1,
    });

    const { getByText, getByTestId } = await render(<AddDealScreen />);

    await waitFor(() => {
      expect(getByText('Add Medicine Deal')).toBeTruthy();
      expect(getByTestId('deal-select-medicine-btn')).toBeTruthy();
      expect(getByTestId('deal-select-mr-btn')).toBeTruthy();
    });

    // Open medicine picker
    await act(async () => {
      fireEvent.press(getByTestId('deal-select-medicine-btn'));
    });
    await waitFor(() => {
      expect(getByTestId('picker-med-med-1')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('picker-med-med-1'));
    });

    // Open MR picker
    await act(async () => {
      fireEvent.press(getByTestId('deal-select-mr-btn'));
    });
    await waitFor(() => {
      expect(getByTestId('picker-mr-mr-1')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('picker-mr-mr-1'));
    });

    await waitFor(() => {
      expect(getByTestId('deal-phone-input').props.value).toBe('+919876543210');
    });

    // Enter commercial details
    await act(async () => {
      fireEvent.changeText(getByTestId('deal-mrp-input'), '255');
      fireEvent.changeText(getByTestId('deal-scheme-input'), '10+3');
      fireEvent.changeText(getByTestId('deal-discount-input'), '5');
    });

    // Save
    await act(async () => {
      fireEvent.press(getByTestId('save-deal-btn'));
    });

    await waitFor(() => {
      expect(dealService.createDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          medicineId: 'med-1',
          mrId: 'mr-1',
          agreedMrp: 255,
          agreedScheme: '10+3',
          agreedBillDiscount: 5,
        }),
      );
    });
  });

  it('renders EditDealScreen and allows updating commercial terms', async () => {
    mockRouteParams = { dealId: 'deal-1' };
    (dealService.updateDeal as jest.Mock).mockResolvedValue({
      deal: { ...mockDeal1, agreedMrp: 260 },
    });

    const { getByText, getByTestId } = await render(<EditDealScreen />);

    await waitFor(() => {
      expect(getByText('Edit Medicine Deal')).toBeTruthy();
      expect(getByTestId('edit-deal-mrp-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('edit-deal-mrp-input'), '260');
    });
    await act(async () => {
      fireEvent.press(getByTestId('update-deal-btn'));
    });

    await waitFor(() => {
      expect(dealService.updateDeal).toHaveBeenCalledWith(
        'deal-1',
        expect.objectContaining({
          agreedMrp: 260,
        }),
      );
    });
  });

  it('renders Medicine Deals in MoreScreen for Admin and navigates to Deals', async () => {
    const { getByText } = await render(<MoreScreen />);

    await waitFor(() => {
      expect(getByText('Medicine Deals')).toBeTruthy();
    });

    fireEvent.press(getByText('Medicine Deals'));
    expect(mockNavigate).toHaveBeenCalledWith('Deals');
  });

  it('hides Medicine Deals in MoreScreen for non-admin employee user', async () => {
    mockIsAdmin = false;
    const { queryByText } = await render(<MoreScreen />);

    await waitFor(() => {
      expect(queryByText('Daily Shortage Notebook')).toBeTruthy();
    });
    expect(queryByText('Medicine Deals')).toBeNull();
  });

  it('renders Medicine Deals quick action in DashboardScreen for Admin', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ medicines: [], mrs: [] });

    const { getByText } = await render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Medicine Deals')).toBeTruthy();
    });

    fireEvent.press(getByText('Medicine Deals'));
    expect(mockNavigate).toHaveBeenCalledWith('Deals');
  });

  it('completely hides Medicine Deals quick action tile in DashboardScreen for non-admin and reflows', async () => {
    mockIsAdmin = false;
    (apiClient.get as jest.Mock).mockResolvedValue({ medicines: [], mrs: [] });

    const { queryByText, getByText } = await render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Shortage Notes')).toBeTruthy();
    });

    // Medicine Deals should be completely absent
    expect(queryByText('Medicine Deals')).toBeNull();
    // Remaining quick actions remain intact
    expect(getByText('Medicines')).toBeTruthy();
    expect(getByText('MR Registry')).toBeTruthy();
    expect(getByText('Manufacturers')).toBeTruthy();
    expect(getByText('Compositions')).toBeTruthy();
    expect(getByText('Salts')).toBeTruthy();
  });

  it('shows access restricted on DealsListScreen for non-admin user', async () => {
    mockIsAdmin = false;
    const { getByTestId, queryByText } = await render(<DealsListScreen />);

    await waitFor(() => {
      expect(getByTestId('deals-access-restricted')).toBeTruthy();
    });
    expect(queryByText('Augmentin 625 Duo')).toBeNull();
  });

  it('opens AddMedicine flow with returnDealParams when + Create New Medicine is pressed', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ medicines: [], mrs: [] });

    const { getByTestId } = await render(<AddDealScreen />);

    await waitFor(() => {
      expect(getByTestId('deal-select-medicine-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('deal-select-medicine-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('picker-create-medicine-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('picker-create-medicine-btn'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('AddMedicine', {
      returnDealParams: true,
    });
  });

  it('opens AddMr flow with returnDealParams when + Create New Representative is pressed', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ medicines: [], mrs: [] });

    const { getByTestId } = await render(<AddDealScreen />);

    await waitFor(() => {
      expect(getByTestId('deal-select-mr-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('deal-select-mr-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('picker-create-mr-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('picker-create-mr-btn'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('AddMr', {
      returnDealParams: true,
    });
  });

  it('preserves user-entered commercial terms when medicine is selected with different master terms', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('commercial-details')) {
        return Promise.resolve({
          commercialDetails: {
            mrp: 350,
            scheme: '10+1',
            discountPercent: 10,
          },
        });
      }
      if (url.startsWith('/medicines')) {
        return Promise.resolve({
          medicines: [
            {
              id: 'med-100',
              name: 'Cefixime 200mg',
              form: 'TABLET',
              packQuantity: 10,
              packUnit: 'TABLET',
              manufacturer: { id: 'mfg-1', name: 'GSK' },
            },
          ],
        });
      }
      return Promise.resolve({ medicines: [], mrs: [] });
    });

    const { getByTestId } = await render(<AddDealScreen />);

    // User types commercial terms FIRST
    await act(async () => {
      fireEvent.changeText(getByTestId('deal-mrp-input'), '299');
      fireEvent.changeText(getByTestId('deal-scheme-input'), '8+2');
      fireEvent.changeText(getByTestId('deal-discount-input'), '6.5');
    });

    // User opens medicine picker and selects med-100
    await act(async () => {
      fireEvent.press(getByTestId('deal-select-medicine-btn'));
    });
    await waitFor(() => {
      expect(getByTestId('picker-med-med-100')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('picker-med-med-100'));
    });

    // Form should preserve user's typed values and NOT overwrite them with master commercial details
    expect(getByTestId('deal-mrp-input').props.value).toBe('299');
    expect(getByTestId('deal-scheme-input').props.value).toBe('8+2');
    expect(getByTestId('deal-discount-input').props.value).toBe('6.5');
  });

  it('auto-selects newly created medicine and MR, clearing route params', async () => {
    mockRouteParams = { createdMedicineId: 'med-created-1', createdMrId: 'mr-created-1' };

    const createdMed = {
      id: 'med-created-1',
      name: 'Amoxicillin 500mg',
      form: 'CAPSULE',
      packQuantity: 10,
      packUnit: 'CAPSULE',
      manufacturer: { id: 'mfg-1', name: 'GSK' },
    };
    const createdMr = {
      id: 'mr-created-1',
      name: 'Pooja Mehta',
      company: 'Sun Pharma',
      phone: '+919123456780',
    };

    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/medicines/med-created-1') {
        return Promise.resolve({ medicine: createdMed });
      }
      if (url === '/mrs/mr-created-1') {
        return Promise.resolve({ mr: createdMr });
      }
      return Promise.resolve({ medicines: [], mrs: [] });
    });

    const { getByText, getByTestId } = await render(<AddDealScreen />);

    await waitFor(() => {
      expect(getByText('Amoxicillin 500mg')).toBeTruthy();
      expect(getByText('Pooja Mehta')).toBeTruthy();
      expect(getByTestId('deal-phone-input').props.value).toBe('+919123456780');
      expect(mockSetParams).toHaveBeenCalledWith({ createdMedicineId: undefined });
      expect(mockSetParams).toHaveBeenCalledWith({ createdMrId: undefined });
    });
  });

  it('SelectionBottomSheetModal renders stationary backdrop and animated panel independently', async () => {
    const mockOnClose = jest.fn();
    const { getByTestId, getByText } = await render(
      <SelectionBottomSheetModal
        visible={true}
        onClose={mockOnClose}
        testID="modal-test"
      >
        <Text>Modal Inner Content</Text>
      </SelectionBottomSheetModal>,
    );

    expect(getByText('Modal Inner Content')).toBeTruthy();

    // Verify backdrop container covers edge-to-edge and is stationary
    const backdrop = getByTestId('modal-test-backdrop-container');
    expect(backdrop).toBeTruthy();
    const backdropStyles = Array.isArray(backdrop.props.style)
      ? Object.assign({}, ...backdrop.props.style)
      : backdrop.props.style;
    expect(backdropStyles.position).toBe('absolute');
    expect(backdropStyles.top).toBe(0);
    expect(backdropStyles.bottom).toBe(0);
    expect(backdropStyles.left).toBe(0);
    expect(backdropStyles.right).toBe(0);
    expect(backdropStyles.backgroundColor).toBe('rgba(15, 23, 42, 0.5)');
    // Backdrop must NEVER have transform translation
    expect(backdropStyles.transform).toBeUndefined();

    // Verify modal content panel has translateY transform
    const content = getByTestId('modal-test-content');
    expect(content).toBeTruthy();
    const contentStyles = Array.isArray(content.props.style)
      ? Object.assign({}, ...content.props.style)
      : content.props.style;
    expect(contentStyles.transform).toBeDefined();

    // Press backdrop to close
    fireEvent.press(getByTestId('modal-test-backdrop'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('SelectionBottomSheetModal triggers opening and closing sequences in order', async () => {
    const sequenceSpy = jest.spyOn(Animated, 'sequence');
    const mockOnClose = jest.fn();

    const { rerender } = await render(
      <SelectionBottomSheetModal
        visible={true}
        onClose={mockOnClose}
        testID="seq-modal-test"
      >
        <Text>Content</Text>
      </SelectionBottomSheetModal>,
    );

    // Opening animation sequence triggered
    expect(sequenceSpy).toHaveBeenCalled();

    // Now close
    await act(async () => {
      rerender(
        <SelectionBottomSheetModal
          visible={false}
          onClose={mockOnClose}
          testID="seq-modal-test"
        >
          <Text>Content</Text>
        </SelectionBottomSheetModal>,
      );
    });

    // Closing animation sequence triggered
    expect(sequenceSpy).toHaveBeenCalledTimes(2);
    sequenceSpy.mockRestore();
  });
});
