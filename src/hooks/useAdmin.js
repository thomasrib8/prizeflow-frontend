import { useAuth } from '../context/AuthContext';

const ADMIN_EMAIL = 'contact@imagineoproduction.com';

export function useAdmin() {
  const { user } = useAuth();
  return { isAdmin: user?.email === ADMIN_EMAIL };
}
