import { useAuth } from '../context/AuthContext';

export function useAdmin() {
  const { user } = useAuth();
  return { isAdmin: user?.role === 'admin' };
}
