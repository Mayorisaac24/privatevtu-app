import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSecurityStore } from '../../src/stores';

/**
 * Legacy unlock route — lock UI is shown by AppLockHost overlay.
 * Redirect under the main app shell and ensure lock state is active.
 */
export default function UnlockScreen() {
  useEffect(() => {
    const state = useSecurityStore.getState();
    if (!state.isLocked) {
      state.lock(state.lockReturnPath || '/(tabs)');
    }
    const destination = state.lockReturnPath || '/(tabs)';
    router.replace(destination as '/(tabs)');
  }, []);

  return null;
}
