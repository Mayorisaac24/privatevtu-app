/** User-safe checkout error — raw Payvessel/provider details stay in logs only. */
export const PAYVESSEL_CHECKOUT_USER_ERROR =
  'Unable to start checkout. Please try again later or use another funding method.';

export function sanitizePayvesselCheckoutError(raw?: string): string {
  // Use console.log (not console.error) so React Native LogBox does not show a red error screen.
  if (raw && __DEV__) {
    console.log('[Payvessel checkout] provider error:', raw);
  }
  return PAYVESSEL_CHECKOUT_USER_ERROR;
}
