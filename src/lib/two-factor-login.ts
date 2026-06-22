import { router } from 'expo-router';
import { api, isResponseSuccess, type TwoFactorMethodType } from './api';

export type TwoFactorLoginChallenge = {
  userId: string;
  twoFactorMethod: TwoFactorMethodType;
  destination?: string;
};

let pendingChallenge: TwoFactorLoginChallenge | null = null;

export function stashTwoFactorLoginChallenge(challenge: TwoFactorLoginChallenge) {
  pendingChallenge = challenge;
}

export function peekTwoFactorLoginChallenge(userId?: string): TwoFactorLoginChallenge | null {
  if (!pendingChallenge) return null;
  if (userId && pendingChallenge.userId !== userId) return null;
  return pendingChallenge;
}

export function clearTwoFactorLoginChallenge() {
  pendingChallenge = null;
}

export function readRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function normalizeTwoFactorMethod(raw?: string): TwoFactorMethodType {
  const upper = String(raw || '').toUpperCase();
  if (upper === 'EMAIL' || upper === 'SMS' || upper === 'AUTHENTICATOR') {
    return upper;
  }
  return 'EMAIL';
}

export async function resolveLoginTwoFactorChallenge(
  userId: string,
  methodParam?: string,
  destinationParam?: string,
): Promise<TwoFactorLoginChallenge> {
  const stashed = peekTwoFactorLoginChallenge(userId);
  if (stashed) {
    return stashed;
  }

  const paramMethod = readRouteParam(methodParam);
  if (paramMethod) {
    return {
      userId,
      twoFactorMethod: normalizeTwoFactorMethod(paramMethod),
      destination: destinationParam || undefined,
    };
  }

  try {
    const ctx = await api.getLoginTwoFactorContext(userId);
    if (isResponseSuccess(ctx) && ctx.data?.twoFactorMethod) {
      return {
        userId,
        twoFactorMethod: ctx.data.twoFactorMethod,
        destination: ctx.data.destination,
      };
    }
  } catch {
    // Fall back to route params below.
  }

  return {
    userId,
    twoFactorMethod: normalizeTwoFactorMethod(paramMethod),
    destination: destinationParam || undefined,
  };
}

export function navigateToTwoFactorVerify(challenge: TwoFactorLoginChallenge) {
  stashTwoFactorLoginChallenge(challenge);
  router.push({
    pathname: '/auth/verify-2fa',
    params: {
      userId: challenge.userId,
      method: challenge.twoFactorMethod,
      destination: challenge.destination || '',
    },
  });
}

export async function prepareTwoFactorLoginChallenge(input: {
  userId: string;
  twoFactorMethod?: TwoFactorMethodType;
  destination?: string;
}): Promise<TwoFactorLoginChallenge> {
  if (input.twoFactorMethod) {
    const challenge = {
      userId: input.userId,
      twoFactorMethod: input.twoFactorMethod,
      destination: input.destination,
    };
    stashTwoFactorLoginChallenge(challenge);
    return challenge;
  }

  const challenge = await resolveLoginTwoFactorChallenge(
    input.userId,
    input.twoFactorMethod,
    input.destination,
  );
  stashTwoFactorLoginChallenge(challenge);
  return challenge;
}
