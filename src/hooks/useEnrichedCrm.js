import { useAuth } from '../context/AuthContext';

// The "enriched CRM" option (Hunter, Bouncer, Apollo, badge scan, AI assistant) of the signed-in account.
// Unknown (not loaded yet) counts as off: the safe side.
export function useEnrichedCrm() {
  const { user } = useAuth();
  return user?.enrichedCrm === true;
}
