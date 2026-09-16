import { useAuth } from '../features/auth';
import type { UserRole } from '../types/models';

export interface UseRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  isEmployee: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

export const useRole = (): UseRoleReturn => {
  const { user, isAdmin, isEmployee } = useAuth();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.role === requiredRole;
  };

  return {
    role: user?.role ?? null,
    isAdmin,
    isEmployee,
    hasRole,
  };
};
