/** User-facing product name — always Datamart in the mobile app. */
export const APP_NAME = 'Datamart';

export const DEFAULT_SUPPORT_EMAIL = 'help@datamart.ng';

/** Ignore legacy API values (e.g. PrivateVTU) for display. */
export function resolveAppName(_fromApi?: string | null): string {
  return APP_NAME;
}
