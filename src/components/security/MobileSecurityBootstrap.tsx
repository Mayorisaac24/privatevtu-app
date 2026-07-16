import { useEffect } from 'react';
import { initializeMobileSecurity } from '../../lib/mobile-security';

export function MobileSecurityBootstrap() {
  useEffect(() => {
    void initializeMobileSecurity();
  }, []);

  return null;
}
