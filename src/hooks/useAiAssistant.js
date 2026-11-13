import { useAuth } from '../context/AuthContext';

// The "AI assistant" option of the signed-in account (switched by a SPARK administrator): it also unlocks the e-mail writer.
// Unknown (not loaded yet) counts as off: the safe side.
export function useAiAssistant() {
  const { user } = useAuth();
  return user?.aiAssistant === true;
}
