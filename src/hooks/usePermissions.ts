import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    const userPermissions = user.permissions.split(',');
    return userPermissions.includes(permission);
  };

  return {
    hasPermission,
  };
}; 