import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../src/features/auth';
import { storage } from '../src/lib/storage';
import { DashboardScreen } from '../src/screens/dashboard/DashboardScreen';
import { NotificationsScreen } from '../src/screens/notifications/NotificationsScreen';
import * as notifService from '../src/services/notification.service';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
    }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      actualReact.useEffect(() => {
        const c = cb();
        return typeof c === 'function' ? c : undefined;
      }, [cb]);
    },
  };
});

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin Master',
  email: 'admin@example.com',
  phone: '+919876543210',
  role: 'ADMIN' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockNotifications: notifService.NotificationItem[] = [
  {
    id: 'n-1',
    userId: 'admin-1',
    type: 'MEDICINE_EXPIRED',
    priority: 'CRITICAL',
    title: 'Medicine expired',
    message: 'Paracetamol 500mg (Batch #P5001)\nexpired on 12 Sep 2026.',
    entityType: 'MEDICINE_BATCH',
    entityId: 'batch-1',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { medicineId: 'med-1' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'n-2',
    userId: 'admin-1',
    type: 'MEDICINE_EXPIRING_SOON',
    priority: 'CRITICAL',
    title: 'Medicine expiring soon',
    message: 'Aspirin 75mg (Batch #A7530) expires\non 05 Nov 2026 (in 45 days).',
    entityType: 'MEDICINE_BATCH',
    entityId: 'batch-2',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { medicineId: 'med-2' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-3',
    userId: 'admin-1',
    type: 'DEAL_INACTIVE_30_DAYS',
    priority: 'ATTENTION',
    title: 'Deal needs attention',
    message: 'Paracetamol 500mg deal has had no\nstatus change for 30 days.',
    entityType: 'MEDICINE_DEAL',
    entityId: 'deal-1',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { dealId: 'deal-1' },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-4',
    userId: 'admin-1',
    type: 'MEDICINE_CREATED',
    priority: 'UPDATE',
    title: 'Medicine added',
    message: 'Amoxicillin 500mg was added to the\ncatalogue.',
    entityType: 'MEDICINE',
    entityId: 'med-3',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { medicineId: 'med-3' },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-5',
    userId: 'admin-1',
    type: 'MR_CREATED',
    priority: 'UPDATE',
    title: 'Representative added',
    message: 'Rajesh Kumar was added as a\nmedical representative.',
    entityType: 'MR',
    entityId: 'mr-1',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { mrId: 'mr-1' },
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-6',
    userId: 'admin-1',
    type: 'DEAL_CREATED',
    priority: 'UPDATE',
    title: 'Deal created',
    message: 'A deal was recorded for Azithromycin\n500mg with Sun Pharma.',
    entityType: 'MEDICINE_DEAL',
    entityId: 'deal-2',
    isRead: false,
    readAt: null,
    isResolved: false,
    resolvedAt: null,
    metadata: { dealId: 'deal-2' },
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-7',
    userId: 'admin-1',
    type: 'MEDICINE_UPDATED',
    priority: 'UPDATE',
    title: 'Medicine updated',
    message: 'Cetirizine 10mg information\nwas updated.',
    entityType: 'MEDICINE',
    entityId: 'med-4',
    isRead: true,
    readAt: new Date().toISOString(),
    isResolved: false,
    resolvedAt: null,
    metadata: { medicineId: 'med-4' },
    createdAt: '2026-09-16T12:47:00.000Z',
    updatedAt: '2026-09-16T12:47:00.000Z',
  },
  {
    id: 'n-8',
    userId: 'admin-1',
    type: 'MEDICINE_DELETED',
    priority: 'UPDATE',
    title: 'Medicine removed',
    message: 'Dolo 650mg was removed\nfrom the catalogue.',
    entityType: 'MEDICINE',
    entityId: 'med-5',
    isRead: true,
    readAt: new Date().toISOString(),
    isResolved: false,
    resolvedAt: null,
    metadata: { medicineId: 'med-5' },
    createdAt: '2026-09-15T09:13:00.000Z',
    updatedAt: '2026-09-15T09:13:00.000Z',
  },
];

describe('Notifications System Mobile Tests', () => {
  beforeEach(async () => {
    await storage.clearAuth();
    await storage.setToken('test-token');
    await storage.setUser(mockAdminUser);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Dashboard Bell Integration', () => {
    it('does not display badge when unreadCount is 0', async () => {
      jest.spyOn(notifService, 'fetchUnreadNotificationCount').mockResolvedValue(0);

      const { queryByTestId } = await render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(queryByTestId('dashboard-notification-badge')).toBeNull();
      });
    });

    it('displays unread badge with exact count when unreadCount > 0', async () => {
      jest.spyOn(notifService, 'fetchUnreadNotificationCount').mockResolvedValue(3);

      const { getByTestId, getByText } = await render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('dashboard-notification-badge')).toBeTruthy();
        expect(getByText('3')).toBeTruthy();
      });
    });

    it('displays "9+" when unreadCount exceeds 9', async () => {
      jest.spyOn(notifService, 'fetchUnreadNotificationCount').mockResolvedValue(15);

      const { getByTestId, getByText } = await render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('dashboard-notification-badge')).toBeTruthy();
        expect(getByText('9+')).toBeTruthy();
      });
    });

    it('navigates to Notifications screen on bell press', async () => {
      jest.spyOn(notifService, 'fetchUnreadNotificationCount').mockResolvedValue(2);

      const { getByTestId } = await render(
        <AuthProvider>
          <DashboardScreen />
        </AuthProvider>,
      );

      await waitFor(() => {
        const bell = getByTestId('dashboard-notification-bell');
        fireEvent.press(bell);
        expect(mockNavigate).toHaveBeenCalledWith('Notifications');
      });
    });
  });

  describe('NotificationsScreen UI & Interactions', () => {
    beforeEach(() => {
      jest.spyOn(notifService, 'fetchNotifications').mockResolvedValue({
        notifications: mockNotifications,
        pagination: {
          total: mockNotifications.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasMore: false,
        },
        unreadCount: 6,
      });
      jest.spyOn(notifService, 'markNotificationAsRead').mockResolvedValue({
        ...mockNotifications[0],
        isRead: true,
        readAt: new Date().toISOString(),
      });
      jest.spyOn(notifService, 'markAllNotificationsAsRead').mockResolvedValue({ count: 6 });
    });

    it('renders Notifications screen header, title, and "Mark all read" button', async () => {
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Notifications')).toBeTruthy();
        expect(getByText('Mark all read')).toBeTruthy();
      });
    });

    it('renders filter pills (All, Unread, Critical, Updates)', async () => {
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('All')).toBeTruthy();
        expect(getByText('Unread')).toBeTruthy();
        expect(getByText('Critical')).toBeTruthy();
        expect(getByText('Updates')).toBeTruthy();
      });
    });

    it('renders all notification card titles matching the visual reference', async () => {
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        expect(getByText('Medicine expired')).toBeTruthy();
        expect(getByText('Medicine expiring soon')).toBeTruthy();
        expect(getByText('Deal needs attention')).toBeTruthy();
        expect(getByText('Medicine added')).toBeTruthy();
        expect(getByText('Representative added')).toBeTruthy();
        expect(getByText('Deal created')).toBeTruthy();
        expect(getByText('Medicine updated')).toBeTruthy();
        expect(getByText('Medicine removed')).toBeTruthy();
      });
    });

    it('taps "Mark all read" and updates read state', async () => {
      const markAllSpy = jest.spyOn(notifService, 'markAllNotificationsAsRead');
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        const markAllBtn = getByText('Mark all read');
        fireEvent.press(markAllBtn);
        expect(markAllSpy).toHaveBeenCalled();
      });
    });

    it('taps notification card, marks read and deep-links to MedicineDetails', async () => {
      const markSpy = jest.spyOn(notifService, 'markNotificationAsRead');
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        const expiredCard = getByText('Medicine expired');
        fireEvent.press(expiredCard);
        expect(markSpy).toHaveBeenCalledWith('n-1');
        expect(mockNavigate).toHaveBeenCalledWith('MedicineDetails', { id: 'med-1' });
      });
    });

    it('taps deal notification and deep-links to DealDetails', async () => {
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        const dealCard = getByText('Deal needs attention');
        fireEvent.press(dealCard);
        expect(mockNavigate).toHaveBeenCalledWith('DealDetails', { dealId: 'deal-1' });
      });
    });

    it('taps MR notification and deep-links to MrDetails', async () => {
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        const mrCard = getByText('Representative added');
        fireEvent.press(mrCard);
        expect(mockNavigate).toHaveBeenCalledWith('MrDetails', { id: 'mr-1' });
      });
    });

    it('switches filter pill and fetches filtered notifications', async () => {
      const fetchSpy = jest.spyOn(notifService, 'fetchNotifications');
      const { getByText } = await render(<NotificationsScreen />);

      await waitFor(() => {
        const criticalPill = getByText('Critical');
        fireEvent.press(criticalPill);
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ filter: 'critical' }),
        );
      });
    });
  });
});
